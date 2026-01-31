import type { APIRoute } from 'astro';
import { userService, userMetaService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { UserServiceError, UserMetaServiceError } from '@/services/service-errors';
import { db } from '@/db';
import { z } from 'zod';
import { SUPPORTED_CURRENCIES } from '@/lib/constants/user-meta-keys';

/**
 * Schema for PUT request body - all profile fields in one request
 */
const updateFullProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  email: z.string().email('Invalid email format'),
  phone: z.string().max(50, 'Phone must be at most 50 characters').optional().default(''),
  bio: z.string().max(500, 'Bio must be at most 500 characters').optional().default(''),
  currency: z.enum(SUPPORTED_CURRENCIES).optional(),
});

/**
 * GET /api/user/profile
 *
 * Retrieves the current authenticated user's profile data including meta.
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, auth.userId),
    });

    if (!user) {
      return errorResponse('User not found', 404, 'USER_NOT_FOUND');
    }

    // Get user settings from meta
    const settings = await userMetaService.getUserSettings(auth.userId);

    return successResponse({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: settings.phone,
      bio: settings.bio,
      currency: settings.currency,
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
 * Updates all profile fields in one request:
 * - name, email -> users table
 * - phone, bio, currency -> user_meta table
 *
 * @example
 * Request:
 * ```json
 * {
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "phone": "+1234567890",
 *   "bio": "Developer",
 *   "currency": "USD"
 * }
 * ```
 */
export const PUT: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    const validation = await validateBody(context.request, updateFullProfileSchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const { name, email, phone, bio, currency } = validation.data;

    // Update user table (name, email)
    const user = await userService.updateProfile(auth.userId, { name, email });

    // Update meta values (phone, bio, currency)
    const metaPromises: Promise<void>[] = [];

    if (phone !== undefined) {
      metaPromises.push(userMetaService.setUserMeta(auth.userId, 'phone', phone));
    }
    if (bio !== undefined) {
      metaPromises.push(userMetaService.setUserMeta(auth.userId, 'bio', bio));
    }
    if (currency !== undefined) {
      metaPromises.push(userMetaService.setUserMeta(auth.userId, 'currency', currency));
    }

    await Promise.all(metaPromises);

    // Get updated settings
    const settings = await userMetaService.getUserSettings(auth.userId);

    return successResponse({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: settings.phone,
      bio: settings.bio,
      currency: settings.currency,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }

    if (error instanceof UserServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }

    if (error instanceof UserMetaServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }

    logError('Error updating user profile', error);
    return errorResponse('Failed to update profile', 500);
  }
};
