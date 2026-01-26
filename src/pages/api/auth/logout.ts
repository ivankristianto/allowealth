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
import { logAuthEvent, getAuditContext, hashSensitiveValue } from '@/lib/audit-log';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const auditContext = getAuditContext(context);

  try {
    // Get session ID from cookie using Astro's cookie API
    const sessionId = context.cookies.get('sid')?.value;

    if (!sessionId) {
      return createErrorResponseResponse(AUTH_ERRORS.NOT_AUTHENTICATED, 'Not authenticated', 401);
    }

    // Get user ID from locals before logout (set by middleware)
    const userId = context.locals.user?.id ?? null;

    // Invalidate session
    await logout(sessionId);

    // Log successful logout (hash session ID for security)
    if (userId) {
      await logAuthEvent('LOGOUT', userId, auditContext, {
        sessionHash: hashSensitiveValue(sessionId),
      });
    }

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
