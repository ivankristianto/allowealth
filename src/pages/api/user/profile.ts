import type { APIRoute } from 'astro';
import { userService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { updateProfileSchema } from '@/services/user.service';
import { logError } from '@/lib/utils';
import { UserServiceError, ServiceErrorCode } from '@/services/service-errors';
import { db } from '@/db';

/**
 * GET /api/user/profile
 *
 * Retrieves the current authenticated user's profile data.
 *
 * @authentication Requires valid session (validated by middleware, accessed via getAuthenticatedUser)
 *
 * @example
 * Response (200):
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "id": "abc123",
 *     "name": "John Doe",
 *     "email": "john@example.com"
 *   }
 * }
 * ```
 *
 * @example
 * Response (401):
 * ```json
 * {
 *   "success": false,
 *   "error": {
 *     "message": "Unauthorized",
 *     "code": "UNAUTHORIZED"
 *   }
 * }
 * ```
 */
export const GET: APIRoute = async (context) => {
  try {
    const userId = getAuthenticatedUser(context);
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, userId),
    });

    if (!user) {
      return errorResponse('User not found', 404, 'USER_NOT_FOUND');
    }

    return successResponse({
      id: user.id,
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error fetching user profile', error);
    return errorResponse('Failed to fetch profile', 500);
  }
};

/**
 * PUT /api/user/profile
 *
 * Updates the current authenticated user's profile information.
 *
 * @authentication Requires valid session (validated by middleware, accessed via getAuthenticatedUser)
 * @param {Object} requestBody - Request body containing profile updates
 * @param {string} requestBody.name - User's display name (required, max 100 chars)
 * @param {string} requestBody.email - User's email address (required, must be valid email format)
 *
 * @example
 * Request:
 * ```json
 * {
 *   "name": "John Doe",
 *   "email": "john.doe@example.com"
 * }
 * ```
 *
 * @example
 * Response (200):
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "id": "abc123",
 *     "name": "John Doe",
 *     "email": "john.doe@example.com"
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
 *         "path": ["email"],
 *         "message": "Invalid email format"
 *       }
 *     ]
 *   }
 * }
 * ```
 *
 * @example
 * Response (409) - Email Already Exists:
 * ```json
 * {
 *   "success": false,
 *   "error": {
 *     "message": "Email already exists",
 *     "code": "EMAIL_ALREADY_EXISTS"
 *   }
 * }
 * ```
 */
export const PUT: APIRoute = async (context) => {
  try {
    const userId = getAuthenticatedUser(context);

    const validation = await validateBody(context.request, updateProfileSchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const user = await userService.updateProfile(userId, validation.data);

    return successResponse(user);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }

    if (error instanceof UserServiceError) {
      switch (error.code) {
        case ServiceErrorCode.USER_NOT_FOUND:
          return errorResponse(error.message, error.statusCode, error.code);
        case ServiceErrorCode.EMAIL_ALREADY_EXISTS:
          return errorResponse(error.message, error.statusCode, error.code);
        case ServiceErrorCode.VALIDATION_ERROR:
          return errorResponse(error.message, error.statusCode, error.code);
      }
    }

    logError('Error updating user profile', error);
    return errorResponse('Failed to update profile', 500);
  }
};
