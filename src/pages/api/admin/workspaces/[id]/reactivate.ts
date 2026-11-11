import type { APIRoute } from 'astro';
import { superAdminService } from '@/services';
import { SuperAdminServiceError } from '@/services/service-errors';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logAuditEvent } from '@/lib/audit-log';
import { logError } from '@/lib/logger';

/**
 * POST /api/admin/workspaces/:id/reactivate
 *
 * Restores an archived workspace so its members can sign in again.
 * Super admin only. Logs an audit event.
 */
export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    if (auth.role !== 'super_admin') {
      return errorResponse('Super admin access required', 403);
    }

    const workspaceId = context.params.id;
    if (!workspaceId) {
      return errorResponse('Workspace ID required', 400);
    }

    await superAdminService.reactivateWorkspace(workspaceId);

    await logAuditEvent({
      workspaceId,
      userId: auth.userId,
      action: 'restore',
      entityType: 'workspace',
      entityId: workspaceId,
    });

    return successResponse({ message: 'Workspace reactivated successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof SuperAdminServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error reactivating workspace', error);
    return errorResponse('Failed to reactivate workspace', 500);
  }
};
