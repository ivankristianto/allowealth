import type { APIRoute } from 'astro';
import { getAuthenticatedUser, errorResponse, successResponse } from '@/lib/api-utils';
import { MigrationService } from '@/services/migration.service';
import { logError } from '@/lib/logger';

/**
 * GET /api/admin/upgrade/status
 *
 * Returns current migration status. Used by the /upgrade page on load
 * to determine whether the database needs upgrading.
 *
 * Super admin only.
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    if (auth.role !== 'super_admin') {
      return errorResponse('Super admin access required', 403, 'SUPER_ADMIN_REQUIRED');
    }

    const status = await MigrationService.getStatus();
    return successResponse(status);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }

    logError('Failed to get migration status', error);
    return errorResponse('Failed to get migration status', 500, 'MIGRATION_STATUS_ERROR');
  }
};
