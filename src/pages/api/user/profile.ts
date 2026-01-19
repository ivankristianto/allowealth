import type { APIRoute } from 'astro';
import { userService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  requireAuth,
  isValidationError,
} from '@/lib/api-utils';
import { updateProfileSchema } from '@/services/user.service';
import { logError } from '@/lib/utils';
import { UserServiceError, ServiceErrorCode } from '@/services/service-errors';
import { db } from '@/db';

/**
 * GET /api/user/profile
 * Get current user profile data
 */
export const GET: APIRoute = async (context) => {
  try {
    const userId = await requireAuth(context);
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
 * Update user profile (name and email)
 */
export const PUT: APIRoute = async (context) => {
  try {
    const userId = await requireAuth(context);

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
