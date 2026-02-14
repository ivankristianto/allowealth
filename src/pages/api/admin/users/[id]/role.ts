import type { APIRoute } from 'astro';
import { superAdminService } from '@/services';
import { SuperAdminServiceError } from '@/services/service-errors';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logAuditEvent } from '@/lib/audit-log';
import { logError } from '@/lib/logger';

/**
 * PATCH /api/admin/users/:id/role
 *
 * Changes a user's role between 'admin' and 'member'.
 * Super admin only. Logs an audit event.
 *
 * Request body: { role: 'admin' | 'member' }
 */
export const PATCH: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    if (auth.role !== 'super_admin') {
      return errorResponse('Super admin access required', 403);
    }

    const userId = context.params.id;
    if (!userId) {
      return errorResponse('User ID required', 400);
    }

    let body: { role?: string };
    try {
      body = await context.request.json();
    } catch {
      return errorResponse('Invalid JSON in request body', 400);
    }

    const newRole = body?.role;
    if (!newRole || !['admin', 'member'].includes(newRole)) {
      return errorResponse('Role must be "admin" or "member"', 400);
    }

    // Get user details before change for audit log
    const user = await superAdminService.getUserDetails(userId);

    await superAdminService.changeUserRole(userId, newRole as 'admin' | 'member');

    await logAuditEvent({
      workspaceId: user.workspaceId || 'system',
      userId: auth.userId,
      action: 'admin_role_change',
      entityType: 'user',
      entityId: userId,
      oldValue: { role: user.role },
      newValue: { role: newRole },
    });

    return successResponse({ message: `User role changed to ${newRole}` });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof SuperAdminServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error changing user role', error);
    return errorResponse('Failed to change user role', 500);
  }
};
