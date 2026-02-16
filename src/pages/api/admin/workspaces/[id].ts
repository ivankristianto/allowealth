import type { APIRoute } from 'astro';
import { superAdminService } from '@/services';
import { SuperAdminServiceError } from '@/services/service-errors';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/logger';

/**
 * GET /api/admin/workspaces/:id
 *
 * Returns detailed workspace information including members, counts,
 * and settings. Super admin only.
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    if (auth.role !== 'super_admin') {
      return errorResponse('Super admin access required', 403);
    }

    const workspaceId = context.params.id;
    if (!workspaceId) {
      return errorResponse('Workspace ID required', 400);
    }

    const details = await superAdminService.getWorkspaceDetails(workspaceId);
    return successResponse(details);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof SuperAdminServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error fetching workspace details', error);
    return errorResponse('Failed to fetch workspace details', 500);
  }
};
