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
import {
  createErrorResponse,
  createSuccessResponse,
  type ApiSuccessResponse,
  type ApiError,
} from '@/types/api';

export const prerender = false;

// TODO: Add rate limiting to prevent abuse
// Consider implementing IP-based rate limiting for signup endpoint

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse request body
    const body = await request.json();
    const { email, password, name } = body;

    // Register user
    const user = await register(email, password, name);

    // Return success response with typed structure
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
      status: 201,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    // Handle auth errors
    if (error instanceof Error && 'code' in error) {
      const authError = error as AuthError;

      switch (authError.code) {
        case AUTH_ERRORS.USER_EXISTS:
          return new Response(
            JSON.stringify(
              createErrorResponse(
                AUTH_ERRORS.USER_EXISTS,
                'An account with this email already exists'
              )
            ),
            {
              status: 409,
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

        case AUTH_ERRORS.INVALID_INPUT:
          return new Response(
            JSON.stringify(createErrorResponse(AUTH_ERRORS.INVALID_INPUT, authError.message)),
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
      JSON.stringify(createErrorResponse('INTERNAL_SERVER_ERROR', 'An unexpected error occurred')),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
};
