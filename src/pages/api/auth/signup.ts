/**
 * POST /api/auth/signup
 *
 * User registration endpoint
 *
 * Request body:
 * - email: string (valid email format)
 * - password: string (min 12 chars, letters + numbers/special chars)
 * - name: string (non-empty)
 *
 * Query parameters:
 * - token: string (optional invitation token, required when SIGNUP_MODE=invite_only)
 *
 * Behavior:
 * - If token is provided: validates invitation, creates user in the invited workspace with the invited role
 * - If token is missing and SIGNUP_MODE=public: creates a new workspace and makes user admin
 * - If token is missing and SIGNUP_MODE=invite_only: rejects signup
 *
 * Response:
 * - 201: User created successfully
 * - 400: Invalid input or invalid/expired invitation token
 * - 409: Email already exists
 * - 429: Too many requests (rate limited)
 * - 500: Server error
 */

import type { APIRoute } from 'astro';
import type { User } from '@/lib/auth/lucia';
import { register, registerWithInvitation } from '@/services/auth.service';
import { AUTH_ERRORS, type AuthError } from '@/services/auth.service';
import {
  createErrorResponseResponse,
  createSuccessResponse,
  STANDARD_RESPONSE_HEADERS,
  type ApiSuccessResponse,
} from '@/types/api';
import { logError } from '@/lib/utils';
import { verifyTurnstileToken } from '@/lib/turnstile';
import {
  checkRateLimit,
  createRateLimitResponse,
  applyRateLimitHeaders,
  RATE_LIMIT_PRESETS,
} from '@/lib/rate-limit';
import {
  workspaceInvitationService,
  emailVerificationService,
  assetCategoryService,
} from '@/services';
import { WorkspaceInvitationServiceError, ServiceErrorCode } from '@/services/service-errors';
import { getSignupMode, SIGNUP_MODES } from '@/lib/auth/signup-mode';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const { request, clientAddress, url } = context;
  let email: string | undefined;
  const signupMode = getSignupMode();

  // Get invitation token from query parameter if present
  const invitationToken = url.searchParams.get('token');

  try {
    // Parse request body first (before consuming rate limit)
    const body = await request.json();
    email = body.email;
    const { password, name } = body;
    const turnstileToken = typeof body.turnstileToken === 'string' ? body.turnstileToken : '';

    // Verify Turnstile token BEFORE rate limiting
    const turnstileResult = await verifyTurnstileToken(turnstileToken, clientAddress);
    if (!turnstileResult.success) {
      return createErrorResponseResponse(
        'TURNSTILE_FAILED',
        turnstileResult.error || 'Bot protection verification failed.',
        400
      );
    }

    if (signupMode === SIGNUP_MODES.INVITE_ONLY && !invitationToken) {
      return createErrorResponseResponse(
        'INVALID_INPUT',
        'Invitation token is required for signup',
        400
      );
    }

    // Check rate limit (5 attempts per hour per IP)
    // Pass clientAddress from Astro context for trusted IP (prevents spoofing)
    const rateLimitResult = checkRateLimit(request, RATE_LIMIT_PRESETS.signup, clientAddress);
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, RATE_LIMIT_PRESETS.signup.message);
    }

    let user: User;

    if (invitationToken) {
      // Validate and get invitation details
      const invitation = await workspaceInvitationService.validateAndGet(invitationToken);

      // Verify email matches invitation (case-insensitive)
      if (invitation.email.toLowerCase() !== email?.toLowerCase()) {
        return createErrorResponseResponse('INVALID_INPUT', 'Email does not match invitation', 400);
      }

      // Register user with invitation details
      user = await registerWithInvitation(
        email,
        password,
        name,
        invitation.workspace_id,
        invitation.role as 'admin' | 'member'
      );

      // Mark invitation as accepted
      await workspaceInvitationService.accept(invitationToken);

      // Seed default asset categories for admin users (idempotent - skips if already exist)
      if (invitation.role === 'admin') {
        try {
          await assetCategoryService.seedDefaultCategories(invitation.workspace_id, user.id);
        } catch (seedError) {
          logError('Failed to seed default categories for invited admin', seedError);
        }
      }
    } else {
      user = await register(email, password, name);
    }

    // Send verification email for public signups only
    // Invitation-based signups are auto-verified (token proves email ownership)
    if (!invitationToken) {
      try {
        await emailVerificationService.sendVerificationEmail(user.id);
      } catch (emailError) {
        logError('Failed to send verification email', emailError);
      }
    }

    // Return success response with standardized headers
    const responseData: ApiSuccessResponse<{
      user: {
        id: string;
        email: string;
        name: string;
      };
    }> = createSuccessResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });

    const response = new Response(JSON.stringify(responseData), {
      status: 201,
      headers: STANDARD_RESPONSE_HEADERS,
    });

    // Add rate limit headers to successful response
    return applyRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    // Handle JSON parse errors (before rate limit was consumed)
    if (error instanceof SyntaxError) {
      return createErrorResponseResponse('INVALID_INPUT', 'Invalid JSON in request body', 400);
    }

    // Handle workspace invitation errors
    if (error instanceof WorkspaceInvitationServiceError) {
      switch (error.code) {
        case ServiceErrorCode.INVITATION_NOT_FOUND:
          return createErrorResponseResponse('INVALID_INPUT', 'Invalid invitation token', 400);

        case ServiceErrorCode.INVITATION_EXPIRED:
          return createErrorResponseResponse('INVALID_INPUT', 'Invitation has expired', 400);

        case ServiceErrorCode.INVITATION_ALREADY_ACCEPTED:
          return createErrorResponseResponse(
            'INVALID_INPUT',
            'Invitation has already been used',
            400
          );

        default:
          break;
      }
    }

    // Handle auth errors
    if (error instanceof Error && 'code' in error) {
      const authError = error as AuthError;

      switch (authError.code) {
        case AUTH_ERRORS.USER_EXISTS:
          return createErrorResponseResponse(
            AUTH_ERRORS.USER_EXISTS,
            'An account with this email already exists',
            409
          );

        case AUTH_ERRORS.INVALID_INPUT:
          return createErrorResponseResponse(AUTH_ERRORS.INVALID_INPUT, authError.message, 400);

        default:
          break;
      }
    }

    // Handle unexpected errors
    logError('Signup error', error);
    return createErrorResponseResponse(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred',
      500
    );
  }
};
