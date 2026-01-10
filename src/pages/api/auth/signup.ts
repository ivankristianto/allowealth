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
 * - 500: Server error
 */

import type { APIRoute } from 'astro';
import { register } from '@/services/auth.service';
import { AUTH_ERRORS, type AuthError } from '@/services/auth.service';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse request body
    const body = await request.json();
    const { email, password, name } = body;

    // Register user
    const user = await register(email, password, name);

    // Return success response
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
        status: 201,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    // Handle auth errors
    if (error instanceof Error && 'code' in error) {
      const authError = error as AuthError;

      switch (authError.code) {
        case AUTH_ERRORS.USER_EXISTS:
          return new Response(
            JSON.stringify({
              success: false,
              error: {
                code: AUTH_ERRORS.USER_EXISTS,
                message: 'An account with this email already exists',
              },
            }),
            {
              status: 409,
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
    console.error('Signup error:', error);
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
