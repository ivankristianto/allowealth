/**
 * POST /api/user/resend-email-change
 *
 * Resend the verification email for a pending email change.
 * Authenticated endpoint with per-user rate limiting (3/hour).
 */

import type { APIRoute } from 'astro';
import { emailVerificationService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { UserServiceError } from '@/services/service-errors';
import { checkRateLimitByKey, createRateLimitResponse, RATE_LIMIT_PRESETS } from '@/lib/rate-limit';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    // Rate limit: 3 per hour per user
    const rateLimitResult = checkRateLimitByKey(
      `resend-email-change:${auth.userId}`,
      RATE_LIMIT_PRESETS.resendEmailChange
    );
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, RATE_LIMIT_PRESETS.resendEmailChange.message);
    }

    const result = await emailVerificationService.resendEmailChangeVerification(auth.userId);

    return successResponse({
      message: `Verification email resent to ${result.pendingEmail}`,
      pendingEmail: result.pendingEmail,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }

    if (error instanceof UserServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }

    logError('Error resending email change verification', error);
    return errorResponse('Failed to resend verification email', 500);
  }
};
