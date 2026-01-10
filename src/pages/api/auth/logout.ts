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

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Get session ID from cookie
    const cookies = request.headers.get('cookie') || '';
    const sessionMatch = cookies.match(/sid=([^;]+)/);

    if (!sessionMatch || !sessionMatch[1]) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: AUTH_ERRORS.NOT_AUTHENTICATED,
            message: 'Not authenticated',
          },
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const sessionId = sessionMatch[1] as string;

    // Invalidate session
    await logout(sessionId);

    // Create blank session cookie to clear the existing one
    const blankSessionCookie = auth.createBlankSessionCookie();

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          message: 'Logged out successfully',
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': blankSessionCookie.serialize(),
        },
      }
    );
  } catch (error) {
    // Handle auth errors
    if (error instanceof Error && 'code' in error) {
      const authError = error as AuthError;

      if (authError.code === AUTH_ERRORS.NOT_AUTHENTICATED) {
        return new Response(
          JSON.stringify({
            success: false,
            error: {
              code: AUTH_ERRORS.NOT_AUTHENTICATED,
              message: 'Not authenticated',
            },
          }),
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      }
    }

    // Handle unexpected errors
    console.error('Logout error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        },
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
