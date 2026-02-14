import type { APIRoute } from 'astro';
import { superAdminService } from '@/services';
import { SuperAdminServiceError } from '@/services/service-errors';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/logger';

/**
 * GET /api/admin/overview
 *
 * Returns aggregate platform statistics: total workspaces, total users,
 * and active workspace count. Super admin only.
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    if (auth.role !== 'super_admin') {
      return errorResponse('Super admin access required', 403);
    }

    const overview = await superAdminService.getPlatformOverview();
    return successResponse(overview);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof SuperAdminServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error fetching platform overview', error);
    return errorResponse('Failed to fetch platform overview', 500);
  }
};
