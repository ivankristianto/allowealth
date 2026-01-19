import type { APIRoute } from 'astro';
import { userService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  requireAuth,
  isValidationError,
} from '@/lib/api-utils';
import { updateSettingsSchema } from '@/services/user.service';
import { logError } from '@/lib/utils';
import { UserServiceError, ServiceErrorCode } from '@/services/service-errors';

/**
 * GET /api/user/settings
 *
 * Retrieves the current authenticated user's settings with defaults applied
 * for any missing values.
 *
 * @authentication Requires valid session cookie (handled by requireAuth)
 *
 * @example
 * Response (200):
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "primaryCurrency": "IDR",
 *     "preferences": {}
 *   }
 * }
 * ```
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
 *
 * Updates the current authenticated user's settings. Creates settings record
 * if it doesn't exist (upsert operation).
 *
 * @authentication Requires valid session cookie (handled by requireAuth)
 * @param {Object} requestBody - Request body containing settings updates
 * @param {string} requestBody.primaryCurrency - Primary currency code (required, must be 'IDR' or 'USD')
 * @param {Object} [requestBody.preferences] - Optional user preferences object
 *
 * @example
 * Request:
 * ```json
 * {
 *   "primaryCurrency": "USD",
 *   "preferences": {}
 * }
 * ```
 *
 * @example
 * Response (200):
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "primaryCurrency": "USD",
 *     "preferences": {}
 *   }
 * }
 * ```
 *
 * @example
 * Response (400) - Validation Error:
 * ```json
 * {
 *   "success": false,
 *   "error": {
 *     "message": "Validation failed",
 *     "code": "VALIDATION_ERROR",
 *     "details": [
 *       {
 *         "path": ["primaryCurrency"],
 *         "message": "Invalid currency. Must be one of: IDR, USD"
 *       }
 *     ]
 *   }
 * }
 * ```
 */
export const PUT: APIRoute = async (context) => {
  try {
    const userId = await requireAuth(context);

    const validation = await validateBody(context.request, updateSettingsSchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
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
