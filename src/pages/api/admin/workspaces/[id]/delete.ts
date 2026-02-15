import type { APIRoute } from 'astro';
import { superAdminService } from '@/services';
import { SuperAdminServiceError } from '@/services/service-errors';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logAuditEvent } from '@/lib/audit-log';
import { logError } from '@/lib/logger';

/**
 * DELETE /api/admin/workspaces/:id/delete
 *
 * Hard-deletes a workspace and all associated data (cascading).
 * Super admin only. Requires confirmation by matching the workspace name.
 *
 * The audit log entry is written BEFORE deletion because audit_logs has
 * a foreign key to workspaces with ON DELETE CASCADE, which would delete
 * the audit log entry along with the workspace.
 *
 * Request body:
 * - confirmName: string (must match the workspace name exactly)
 */
export const DELETE: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    if (auth.role !== 'super_admin') {
      return errorResponse('Super admin access required', 403);
    }

    const workspaceId = context.params.id;
    if (!workspaceId) {
      return errorResponse('Workspace ID required', 400);
    }

    // Parse confirmation from request body
    let body: { confirmName?: string };
    try {
      body = await context.request.json();
    } catch {
      return errorResponse('Invalid JSON in request body', 400);
    }

    const confirmName = body?.confirmName;
    if (!confirmName) {
      return errorResponse('Confirmation name is required', 400, 'CONFIRMATION_REQUIRED');
    }

    // Get workspace to verify name match
    const details = await superAdminService.getWorkspaceDetails(workspaceId);
    if (confirmName !== details.name) {
      return errorResponse('Workspace name does not match', 400, 'CONFIRMATION_FAILED');
    }

    // Log audit event BEFORE deletion (cascade would delete the log entry)
    await logAuditEvent({
      workspaceId,
      userId: auth.userId,
      action: 'delete',
      entityType: 'workspace',
      entityId: workspaceId,
      oldValue: { name: details.name, status: details.status },
    });

    await superAdminService.deleteWorkspace(workspaceId);

    return successResponse({ message: 'Workspace deleted successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof SuperAdminServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error deleting workspace', error);
    return errorResponse('Failed to delete workspace', 500);
  }
};
