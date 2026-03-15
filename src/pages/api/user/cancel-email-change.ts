/**
 * POST /api/user/cancel-email-change
 *
 * Cancel a pending email change, clearing the pending email and verification tokens.
 */

import type { APIRoute } from 'astro';
import { emailVerificationService, securityActivityService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    const pendingEmail = await emailVerificationService.getPendingEmailChange(auth.userId);

    if (!pendingEmail) {
      return successResponse({ message: 'No pending email change to cancel' });
    }

    await emailVerificationService.clearPendingEmailAndTokens(auth.userId);

    await securityActivityService.logEvent({
      type: 'email_change_cancelled',
      userId: auth.userId,
      oldValue: { pendingEmail },
    });

    return successResponse({ message: 'Pending email change cancelled' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }

    logError('Error cancelling email change', error);
    return errorResponse('Failed to cancel email change', 500);
  }
};
