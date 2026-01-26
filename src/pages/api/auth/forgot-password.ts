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
 * - 429: Too many requests (rate limited)
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

  // Parse request body first (before consuming rate limit)
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    // JSON parse error - return 400 without consuming rate limit
    return createErrorResponseResponse('INVALID_INPUT', 'Invalid JSON in request body', 400);
  }

  const { email } = body;

  // Check rate limit (3 attempts per hour per IP)
  // Pass clientAddress from Astro context for trusted IP (prevents spoofing)
  const rateLimitResult = checkRateLimit(request, RATE_LIMIT_PRESETS.passwordReset, clientAddress);
  if (!rateLimitResult.allowed) {
    return createRateLimitResponse(rateLimitResult, RATE_LIMIT_PRESETS.passwordReset.message);
  }

  try {
    // Request password reset
    await requestPasswordReset(email);

    // Log password reset request (hash email for privacy, userId is null to prevent enumeration)
    await logAuthEvent('PASSWORD_RESET_REQUEST', null, auditContext, {
      emailHash: hashSensitiveValue(email),
    });

    // Always return success to prevent email enumeration
    const responseData = {
      message:
        'If an account exists with this email, we have sent a password reset link. Please check your inbox.',
    };

    const response = new Response(JSON.stringify({ success: true, data: responseData }), {
      status: 200,
      headers: STANDARD_RESPONSE_HEADERS,
    });

    // Add rate limit headers to successful response
    return applyRateLimitHeaders(response, rateLimitResult);
  } catch (error) {
    // Handle validation errors
    if (error instanceof PasswordResetError) {
      if (error.code === PASSWORD_RESET_ERRORS.INVALID_INPUT) {
        const errorResponse = createErrorResponseResponse(
          PASSWORD_RESET_ERRORS.INVALID_INPUT,
          error.message,
          400
        );
        return applyRateLimitHeaders(errorResponse, rateLimitResult);
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

    const response = new Response(JSON.stringify({ success: true, data: responseData }), {
      status: 200,
      headers: STANDARD_RESPONSE_HEADERS,
    });

    // Add rate limit headers even for error cases
    return applyRateLimitHeaders(response, rateLimitResult);
  }
};
