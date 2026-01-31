/**
 * POST /api/auth/login
 *
 * User login endpoint
 *
 * Request body:
 * - email: string (valid email format)
 * - password: string
 *
 * Response:
 * - 200: Login successful, sets session cookie
 * - 400: Invalid input
 * - 401: Invalid credentials or user has been deleted
 * - 429: Too many requests (rate limited)
 * - 500: Server error
 */

import type { APIRoute } from 'astro';
import { login } from '@/services/auth.service';
import { auth } from '@/lib/auth/lucia';
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

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const { request, clientAddress } = context;
  let email: string | undefined;

  try {
    // Parse request body first (before consuming rate limit)
    const body = await request.json();
    email = body.email;
    const { password } = body;

    // Check rate limit (10 attempts per 15 minutes per IP)
    // Pass clientAddress from Astro context for trusted IP (prevents spoofing)
    const rateLimitResult = checkRateLimit(request, RATE_LIMIT_PRESETS.login, clientAddress);
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, RATE_LIMIT_PRESETS.login.message);
    }

    // Login user
    const { user, session, isDeleted } = await login(email, password);

    // Check if user has been soft-deleted
    if (isDeleted) {
      return createErrorResponseResponse(
        AUTH_ERRORS.INVALID_CREDENTIALS,
        'This account has been deleted',
        401
      );
    }

    // Create session cookie
    const sessionCookie = auth.createSessionCookie(session.id);

    // Return success response with session cookie using standardized response
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
      status: 200,
      headers: {
        ...STANDARD_RESPONSE_HEADERS,
        'Set-Cookie': sessionCookie.serialize(),
      },
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
        case AUTH_ERRORS.INVALID_CREDENTIALS:
          return createErrorResponseResponse(
            AUTH_ERRORS.INVALID_CREDENTIALS,
            'Invalid email or password',
            401
          );

        case AUTH_ERRORS.INVALID_INPUT:
          return createErrorResponseResponse(AUTH_ERRORS.INVALID_INPUT, authError.message, 400);

        default:
          break;
      }
    }

    // Handle unexpected errors
    logError('Login error', error);
    return createErrorResponseResponse(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred',
      500
    );
  }
};
