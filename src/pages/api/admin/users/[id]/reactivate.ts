import type { APIRoute } from 'astro';
import { superAdminService } from '@/services';
import { SuperAdminServiceError } from '@/services/service-errors';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logAuditEvent } from '@/lib/audit-log';
import { logError } from '@/lib/logger';

/**
 * POST /api/admin/users/:id/reactivate
 *
 * Restores a deactivated user by clearing deleted_at.
 * Super admin only. Logs an audit event.
 */
export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    if (auth.role !== 'super_admin') {
      return errorResponse('Super admin access required', 403);
    }

    const userId = context.params.id;
    if (!userId) {
      return errorResponse('User ID required', 400);
    }

    const user = await superAdminService.getUserDetails(userId);

    await superAdminService.reactivateUser(userId);

    // Note: audit_logs.workspace_id has a FK constraint. For users without
    // a workspace, the audit insert will silently fail (logAuditEvent catches).
    // TODO: Make workspace_id nullable in audit_logs for system-level actions.
    if (user.workspaceId) {
      await logAuditEvent({
        workspaceId: user.workspaceId,
        userId: auth.userId,
        action: 'admin_reactivate',
        entityType: 'user',
        entityId: userId,
        newValue: { name: user.name, email: user.email },
      });
    }

    return successResponse({ message: 'User reactivated successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof SuperAdminServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error reactivating user', error);
    return errorResponse('Failed to reactivate user', 500);
  }
};
