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

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse request body
    const body = await request.json();
    const { email, password } = body;

    // Login user
    const { user, session } = await login(email, password);

    // Create session cookie
    const sessionCookie = auth.createSessionCookie(session.id);

    // Return success response with session cookie
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          user: {
            id: user.id,
            email: (user as any).email,
            name: (user as any).name,
          },
        },
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': sessionCookie.serialize(),
        },
      }
    );
  } catch (error) {
    // Handle auth errors
    if (error instanceof Error && 'code' in error) {
      const authError = error as AuthError;

      switch (authError.code) {
        case AUTH_ERRORS.INVALID_CREDENTIALS:
          return new Response(
            JSON.stringify({
              success: false,
              error: {
                code: AUTH_ERRORS.INVALID_CREDENTIALS,
                message: 'Invalid email or password',
              },
            }),
            {
              status: 401,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

        case AUTH_ERRORS.INVALID_INPUT:
          return new Response(
            JSON.stringify({
              success: false,
              error: {
                code: AUTH_ERRORS.INVALID_INPUT,
                message: authError.message,
              },
            }),
            {
              status: 400,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

        default:
          break;
      }
    }

    // Handle unexpected errors
    console.error('Login error:', error);
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
