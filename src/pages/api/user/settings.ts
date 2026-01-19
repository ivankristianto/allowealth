import type { APIRoute } from 'astro';
import { userService } from '@/services';
import { successResponse, errorResponse, validateBody, requireAuth } from '@/lib/api-utils';
import { updateSettingsSchema } from '@/services/user.service';
import { logError } from '@/lib/utils';
import { UserServiceError, ServiceErrorCode } from '@/services/service-errors';

/**
 * GET /api/user/settings
 * Get current user settings with defaults applied
 */
export const GET: APIRoute = async (context) => {
  try {
    const userId = await requireAuth(context);
    const settings = await userService.getSettings(userId);
    return successResponse(settings);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof UserServiceError) {
      if (error.code === ServiceErrorCode.USER_NOT_FOUND) {
        return errorResponse(error.message, error.statusCode, error.code);
      }
    }
    logError('Error fetching user settings', error);
    return errorResponse('Failed to fetch settings', 500);
  }
};

/**
 * PUT /api/user/settings
 * Update user settings (primary currency, preferences)
 */
export const PUT: APIRoute = async (context) => {
  try {
    const userId = await requireAuth(context);

    const validation = await validateBody(context.request, updateSettingsSchema);

    if (!validation.success) {
      return errorResponse(
        'Validation failed',
        400,
        'VALIDATION_ERROR',
        (validation as any).error.issues
      );
    }

    const settings = await userService.updateSettings(userId, validation.data);

    return successResponse(settings);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }

    if (error instanceof UserServiceError) {
      switch (error.code) {
        case ServiceErrorCode.USER_NOT_FOUND:
          return errorResponse(error.message, error.statusCode, error.code);
        case ServiceErrorCode.VALIDATION_ERROR:
          return errorResponse(error.message, error.statusCode, error.code);
      }
    }

    logError('Error updating user settings', error);
    return errorResponse('Failed to update settings', 500);
  }
};
