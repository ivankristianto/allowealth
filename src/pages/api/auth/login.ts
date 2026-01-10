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
 * - 401: Invalid credentials
 * - 500: Server error
 */

import type { APIRoute } from 'astro';
import { login } from '@/services/auth.service';
import { auth } from '@/lib/auth/lucia';
import { AUTH_ERRORS, type AuthError } from '@/services/auth.service';
import {
  createErrorResponse,
  createErrorResponseResponse,
  createSuccessResponse,
  createSuccessResponseResponse,
  STANDARD_RESPONSE_HEADERS,
  type ApiSuccessResponse,
  type ApiError,
} from '@/types/api';

export const prerender = false;

// TODO: Add rate limiting to prevent brute force attacks
// Consider implementing IP-based rate limiting for login endpoint

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse request body
    const body = await request.json();
    const { email, password } = body;

    // Login user
    const { user, session } = await login(email, password);

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

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        ...STANDARD_RESPONSE_HEADERS,
        'Set-Cookie': sessionCookie.serialize(),
      },
    });
  } catch (error) {
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
    console.error('Login error:', error);
    return createErrorResponseResponse(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred',
      500
    );
  }
};
