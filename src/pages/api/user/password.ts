import type { APIRoute } from 'astro';
import { isAPIError } from 'better-auth/api';
import { auth } from '@/lib/auth/server';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { checkRateLimitByKey, createRateLimitResponse, RATE_LIMIT_PRESETS } from '@/lib/rate-limit';
import { updatePasswordSchema } from '@/services/user.service';
import { logError } from '@/lib/utils';
import { securityActivityService } from '@/services/security-activity.service';

const BETTER_AUTH_PASSWORD_ERRORS: Record<string, { message: string; code: string }> = {
  INVALID_PASSWORD: { message: 'Invalid old password', code: 'INVALID_PASSWORD' },
  CREDENTIAL_ACCOUNT_NOT_FOUND: {
    message: 'This account has no password yet. Use "Forgot password" to set one.',
    code: 'PASSWORD_NOT_SET',
  },
  PASSWORD_TOO_SHORT: { message: 'New password is too short', code: 'WEAK_PASSWORD' },
  PASSWORD_TOO_LONG: { message: 'Password is too long', code: 'VALIDATION_ERROR' },
};

/**
 * PUT /api/user/password: change the credential account password and sign out
 * every other session. The current device gets a fresh session cookie.
 */
export const PUT: APIRoute = async (context) => {
  try {
    const { userId } = getAuthenticatedUser(context);

    const rateLimitResult = checkRateLimitByKey(
      `password-change:${userId}`,
      RATE_LIMIT_PRESETS.passwordChange
    );
    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult, RATE_LIMIT_PRESETS.passwordChange.message);
    }

    const validation = await validateBody(context.request, updatePasswordSchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const { headers: authHeaders } = await auth.api.changePassword({
      headers: context.request.headers,
      body: {
        currentPassword: validation.data.oldPassword,
        newPassword: validation.data.newPassword,
        revokeOtherSessions: true,
      },
      returnHeaders: true,
    });

    await securityActivityService.logEvent({
      type: 'password_changed',
      userId,
    });

    const response = successResponse({ success: true, reauthRequired: false });
    for (const cookie of authHeaders.getSetCookie()) {
      response.headers.append('set-cookie', cookie);
    }
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }

    if (isAPIError(error)) {
      const mapped = BETTER_AUTH_PASSWORD_ERRORS[String(error.body?.code)];
      if (mapped) {
        return errorResponse(mapped.message, 400, mapped.code);
      }
      if (error.statusCode === 401) {
        return errorResponse('Unauthorized', 401);
      }
    }

    logError('Error updating user password', error);
    return errorResponse('Failed to update password', 500);
  }
};
