/**
 * POST /api/auth/forgot-password
 *
 * Password reset request endpoint
 *
 * Request body:
 * - email: string (valid email format)
 *
 * Response:
 * - 200: Reset request processed successfully
 * - 400: Invalid input
 * - 500: Server error
 *
 * Security note: This endpoint always returns success to prevent email enumeration attacks.
 * If the email doesn't exist, it will still return success but won't send an email.
 */

import type { APIRoute } from 'astro';
import {
  requestPasswordReset,
  PASSWORD_RESET_ERRORS,
  PasswordResetError,
} from '@/services/password-reset.service';
import { createErrorResponseResponse, STANDARD_RESPONSE_HEADERS } from '@/types/api';
import { logError } from '@/lib/utils';

export const prerender = false;

// TODO: Add rate limiting to prevent abuse
// Consider implementing IP-based rate limiting for this endpoint

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse request body
    const body = await request.json();
    const { email } = body;

    // Request password reset
    await requestPasswordReset(email);

    // Always return success to prevent email enumeration
    const responseData = {
      message:
        'If an account exists with this email, we have sent a password reset link. Please check your inbox.',
    };

    return new Response(JSON.stringify({ success: true, data: responseData }), {
      status: 200,
      headers: STANDARD_RESPONSE_HEADERS,
    });
  } catch (error) {
    // Handle validation errors
    if (error instanceof PasswordResetError) {
      if (error.code === PASSWORD_RESET_ERRORS.INVALID_INPUT) {
        return createErrorResponseResponse(PASSWORD_RESET_ERRORS.INVALID_INPUT, error.message, 400);
      }
    }

    // Handle unexpected errors
    logError('Password reset request error', error);

    // Still return generic success to prevent email enumeration
    // In production, you might want to monitor these errors
    const responseData = {
      message:
        'If an account exists with this email, we have sent a password reset link. Please check your inbox.',
    };

    return new Response(JSON.stringify({ success: true, data: responseData }), {
      status: 200,
      headers: STANDARD_RESPONSE_HEADERS,
    });
  }
};
