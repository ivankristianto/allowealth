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
 * - token: string (optional invitation token)
 *
 * Behavior:
 * - If token is provided: validates invitation, creates user in the invited workspace with the invited role
 * - If no token: creates a new workspace and makes user the admin
 *
 * Response:
 * - 201: User created successfully
 * - 400: Invalid input or invalid/expired invitation token
 * - 409: Email already exists
 * - 429: Too many requests (rate limited)
 * - 500: Server error
 */

import type { APIRoute } from 'astro';
import type { User } from 'lucia';
import { register, registerWithInvitation } from '@/services/auth.service';
import { AUTH_ERRORS, type AuthError } from '@/services/auth.service';
import {
  createErrorResponseResponse,
  createSuccessResponse,
  STANDARD_RESPONSE_HEADERS,
  type ApiSuccessResponse,
} from '@/types/api';
import { logError } from '@/lib/utils';
import {
  checkRateLimit,
  createRateLimitResponse,
  applyRateLimitHeaders,
  RATE_LIMIT_PRESETS,
} from '@/lib/rate-limit';
import { logAuthEvent, getAuditContext, hashSensitiveValue } from '@/lib/audit-log';
import { workspaceInvitationService } from '@/services';
import { WorkspaceInvitationServiceError, ServiceErrorCode } from '@/services/service-errors';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const { request, clientAddress, url } = context;
  const auditContext = getAuditContext(context);
  let email: string | undefined;

  // Get invitation token from query parameter if present
  const invitationToken = url.searchParams.get('token');

  try {
    // Parse request body first (before consuming rate limit)
    const body = await request.json();
    email = body.email;
    const { password, name } = body;

    // Check rate limit (5 attempts per hour per IP)
    // Pass clientAddress from Astro context for trusted IP (prevents spoofing)
    const rateLimitResult = checkRateLimit(request, RATE_LIMIT_PRESETS.signup, clientAddress);
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, RATE_LIMIT_PRESETS.signup.message);
    }

    let user: User;

    if (invitationToken) {
      // Handle invitation-based signup
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

      // Log successful signup with invitation
      await logAuthEvent('SIGNUP', user.id, auditContext, {
        invitationId: invitation.id,
        workspaceId: invitation.workspace_id,
        role: invitation.role,
      });
    } else {
      // Standard signup - creates new workspace with user as admin
      user = await register(email, password, name);

      // Log successful signup
      await logAuthEvent('SIGNUP', user.id, auditContext);
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
        email: (user as any).email,
        name: (user as any).name,
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
          // Log signup attempt with existing email (potential enumeration attempt)
          // P3: Consider whether to log this - may be legitimate user confusion
          await logAuthEvent('AUTH_FAILURE', null, auditContext, {
            emailHash: hashSensitiveValue(email),
            error: 'Email already exists',
          });
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
