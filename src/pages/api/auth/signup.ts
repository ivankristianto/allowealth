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
 * Response:
 * - 201: User created successfully
 * - 400: Invalid input
 * - 409: Email already exists
 * - 429: Too many requests (rate limited)
 * - 500: Server error
 */

import type { APIRoute } from 'astro';
import { register } from '@/services/auth.service';
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

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const { request, clientAddress } = context;
  const auditContext = getAuditContext(context);
  let email: string | undefined;

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

    // Register user
    const user = await register(email, password, name);

    // Log successful signup
    await logAuthEvent('SIGNUP', user.id, auditContext);

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
