import type { APIRoute } from 'astro';
import { userMetaService } from '@/services';
import {
  successResponse,
  errorResponse,
  getAuthenticatedUser,
  validateBody,
  isValidationError,
} from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { UserMetaServiceError } from '@/services/service-errors';
import { z } from 'zod';
import { isValidMetaKey, type UserMetaKey, META_DEFAULTS } from '@/lib/constants/user-meta-keys';

/**
 * Schema for PUT request body
 */
const updateMetaSchema = z.object({
  value: z.string().min(1, 'Value is required'),
});

/**
 * GET /api/user/meta/:key
 *
 * Retrieves a single meta value for the authenticated user.
 * Returns the default value if the key is not set.
 *
 * @authentication Requires valid session
 * @param key - Meta key (must be in allowlist)
 *
 * @example
 * Response (200):
 * ```json
 * {
 *   "success": true,
 *   "data": { "key": "currency", "value": "IDR" }
 * }
 * ```
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const key = context.params.key;

    if (!key || !isValidMetaKey(key)) {
      return errorResponse(
        `Invalid meta key: ${key}. Must be one of: currency, show_converted_totals, show_individual_currencies`,
        400,
        'INVALID_META_KEY'
      );
    }

    const value = await userMetaService.getUserMeta(auth.userId, key as UserMetaKey);

    return successResponse({
      key,
      value: value ?? META_DEFAULTS[key as UserMetaKey],
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }
    if (error instanceof UserMetaServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error fetching user meta', error);
    return errorResponse('Failed to fetch user meta', 500);
  }
};

/**
 * PUT /api/user/meta/:key
 *
 * Creates or updates a meta value for the authenticated user.
 *
 * @authentication Requires valid session
 * @param key - Meta key (must be in allowlist)
 * @body value - The meta value to set
 *
 * @example
 * Request:
 * ```json
 * { "value": "USD" }
 * ```
 *
 * Response (200):
 * ```json
 * {
 *   "success": true,
 *   "data": { "key": "currency", "value": "USD" }
 * }
 * ```
 */
export const PUT: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const key = context.params.key;

    if (!key || !isValidMetaKey(key)) {
      return errorResponse(
        `Invalid meta key: ${key}. Must be one of: currency, show_converted_totals, show_individual_currencies`,
        400,
        'INVALID_META_KEY'
      );
    }

    const validation = await validateBody(context.request, updateMetaSchema);
    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    await userMetaService.setUserMeta(auth.userId, key as UserMetaKey, validation.data.value);

    return successResponse({
      key,
      value: validation.data.value,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }
    if (error instanceof UserMetaServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error updating user meta', error);
    return errorResponse('Failed to update user meta', 500);
  }
};

/**
 * DELETE /api/user/meta/:key
 *
 * Deletes a meta value for the authenticated user.
 * After deletion, the key will return its default value.
 *
 * @authentication Requires valid session
 * @param key - Meta key (must be in allowlist)
 *
 * @example
 * Response (200):
 * ```json
 * {
 *   "success": true,
 *   "data": { "deleted": "currency" }
 * }
 * ```
 */
export const DELETE: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const key = context.params.key;

    if (!key || !isValidMetaKey(key)) {
      return errorResponse(
        `Invalid meta key: ${key}. Must be one of: currency, show_converted_totals, show_individual_currencies`,
        400,
        'INVALID_META_KEY'
      );
    }

    await userMetaService.deleteUserMeta(auth.userId, key as UserMetaKey);

    return successResponse({ deleted: key });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }
    if (error instanceof UserMetaServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error deleting user meta', error);
    return errorResponse('Failed to delete user meta', 500);
  }
};
