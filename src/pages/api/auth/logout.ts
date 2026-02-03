/**
 * POST /api/auth/logout
 *
 * User logout endpoint
 *
 * Requires valid session cookie
 *
 * Response:
 * - 200: Logout successful, clears session cookie
 * - 401: Not authenticated
 * - 500: Server error
 */

import type { APIRoute } from 'astro';
import { logout } from '@/services/auth.service';
import { auth } from '@/lib/auth/lucia';
import { AUTH_ERRORS, type AuthError } from '@/services/auth.service';
import {
  createErrorResponseResponse,
  createSuccessResponse,
  STANDARD_RESPONSE_HEADERS,
  type ApiSuccessResponse,
} from '@/types/api';
import { logError } from '@/lib/utils';
import { invalidateSession } from '@/lib/auth/session-cache';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    // Get session ID from cookie using Astro's cookie API
    const sessionId = context.cookies.get('sid')?.value;

    if (!sessionId) {
      return createErrorResponseResponse(AUTH_ERRORS.NOT_AUTHENTICATED, 'Not authenticated', 401);
    }

    // Invalidate session from cache and database
    await invalidateSession(sessionId);
    await logout(sessionId);

    // Create blank session cookie to clear the existing one
    const blankSessionCookie = auth.createBlankSessionCookie();

    // Return success response with standardized headers
    const responseData: ApiSuccessResponse<{ message: string }> = createSuccessResponse({
      message: 'Logged out successfully',
    });

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: {
        ...STANDARD_RESPONSE_HEADERS,
        'Set-Cookie': blankSessionCookie.serialize(),
      },
    });
  } catch (error) {
    // Handle auth errors
    if (error instanceof Error && 'code' in error) {
      const authError = error as AuthError;

      if (authError.code === AUTH_ERRORS.NOT_AUTHENTICATED) {
        return createErrorResponseResponse(AUTH_ERRORS.NOT_AUTHENTICATED, 'Not authenticated', 401);
      }
    }

    // Handle unexpected errors
    logError('Logout error', error);
    return createErrorResponseResponse(
      'INTERNAL_SERVER_ERROR',
      'An unexpected error occurred',
      500
    );
  }
};
