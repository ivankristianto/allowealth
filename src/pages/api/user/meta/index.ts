import type { APIRoute } from 'astro';
import { userMetaService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { UserMetaServiceError, ServiceErrorCode } from '@/services/service-errors';

/**
 * GET /api/user/meta
 *
 * Retrieves all meta values for the authenticated user.
 * Returns defaults for any unset meta keys.
 *
 * @authentication Requires valid session
 *
 * @example
 * Response (200):
 * ```json
 * {
 *   "success": true,
 *   "data": {
 *     "currency": "IDR",
 *     "show_converted_totals": "true",
 *     "show_individual_currencies": "true"
 *   }
 * }
 * ```
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const metaAll = await userMetaService.getUserMetaAll(auth.userId);
    return successResponse(metaAll);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }
    if (error instanceof UserMetaServiceError) {
      if (error.code === ServiceErrorCode.USER_NOT_FOUND) {
        return errorResponse(error.message, error.statusCode, error.code);
      }
    }
    logError('Error fetching user meta', error);
    return errorResponse('Failed to fetch user meta', 500);
  }
};
