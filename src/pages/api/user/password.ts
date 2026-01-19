import type { APIRoute } from 'astro';
import { userService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  requireAuth,
  isValidationError,
} from '@/lib/api-utils';
import { updatePasswordSchema } from '@/services/user.service';
import { logError } from '@/lib/utils';
import { UserServiceError, ServiceErrorCode } from '@/services/service-errors';

/**
 * PUT /api/user/password
 *
 * Updates the current authenticated user's password after verifying the old password.
 * The user's session remains active after password change (no re-authentication required).
 *
 * @authentication Requires valid session cookie (handled by requireAuth)
 * @param {Object} requestBody - Request body containing password change data
 * @param {string} requestBody.oldPassword - Current password (required)
 * @param {string} requestBody.newPassword - New password (required, min 12 chars, must contain letter + number/special)
 * @returns {Promise<Response>} JSON response indicating success
 * @returns {Object} data.message - Success message
 * @returns {number} status - 200 on success, 400 on validation error, 401 if unauthorized, 404 if user not found, 500 on server error
 *
 * @example
 * Request:
 * ```json
 * {
 *   "oldPassword": "CurrentPass123!",
 *   "newPassword": "NewSecurePass456@"
 * }
 * ```
 *
 * @example
 * Response (200):
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "message": "Password changed successfully"
 *   }
 * }
 * ```
 *
 * @example
 * Response (400) - Invalid Old Password:
 * ```json
 * {
 *   "success": false,
 *   "error": {
 *     "message": "Invalid password",
 *     "code": "INVALID_PASSWORD"
 *   }
 * }
 * ```
 *
 * @example
 * Response (400) - Weak Password:
 * ```json
 * {
 *   "success": false,
 *   "error": {
 *     "message": "Password must be at least 12 characters long and contain at least one letter and one number or special character",
 *     "code": "WEAK_PASSWORD"
 *   }
 * }
 * ```
 */
export const PUT: APIRoute = async (context) => {
  try {
    const userId = await requireAuth(context);

    const validation = await validateBody(context.request, updatePasswordSchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const result = await userService.updatePassword(userId, validation.data);

    return successResponse(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }

    if (error instanceof UserServiceError) {
      switch (error.code) {
        case ServiceErrorCode.USER_NOT_FOUND:
          return errorResponse(error.message, error.statusCode, error.code);
        case ServiceErrorCode.INVALID_PASSWORD:
          return errorResponse(error.message, error.statusCode, error.code);
        case ServiceErrorCode.WEAK_PASSWORD:
          return errorResponse(error.message, error.statusCode, error.code);
        case ServiceErrorCode.VALIDATION_ERROR:
          return errorResponse(error.message, error.statusCode, error.code);
      }
    }

    logError('Error updating user password', error);
    return errorResponse('Failed to update password', 500);
  }
};
