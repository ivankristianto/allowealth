import type { APIRoute } from 'astro';
import { errorResponse, getAuthenticatedUser, successResponse } from '@/lib/api-utils';
import { describeAppPasswordToken } from '@/lib/app-password-access';
import { logError } from '@/lib/logger';
import { TOKEN_RATE_LIMIT } from '@/lib/mcp-rate-limit';
import { mcpAppPasswordService } from '@/services/mcp-app-password.service';

/** GET /api/app-password/self: the calling app password's name, permissions, limits, expiry and rate limit. */
export const GET: APIRoute = async (context) => {
  try {
    const { userId } = getAuthenticatedUser(context);

    const appPassword = context.locals.appPassword;
    if (!appPassword) {
      return errorResponse(
        'This endpoint describes the app password sent as a Bearer token, and this request has none',
        400,
        'APP_PASSWORD_REQUIRED'
      );
    }

    const token = await mcpAppPasswordService.findForUser(userId, appPassword.tokenId);
    // Revoked after the middleware verified it, within this request.
    if (!token) {
      return errorResponse('Invalid, expired or revoked app password', 401, 'APP_PASSWORD_INVALID');
    }
    return successResponse(
      describeAppPasswordToken(token, appPassword.permissions, TOKEN_RATE_LIMIT)
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    const errorId = logError('Error describing an app password', error);
    return errorResponse('Failed to describe the app password', 500, 'INTERNAL_ERROR', {
      errorId,
    });
  }
};
