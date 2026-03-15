import type { APIRoute } from 'astro';
import { auditLogService } from '@/services';
import { errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/logger';

/**
 * GET /api/security/audit-logs
 *
 * Returns the current user's audit log as a CSV download.
 * Filename includes the current date: security-audit-YYYY-MM-DD.csv
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    if (!auth.workspaceId) {
      return errorResponse('Workspace context required', 403);
    }

    const csv = await auditLogService.exportToCsv(auth.userId, auth.workspaceId);
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `security-audit-${dateStr}.csv`;

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error exporting audit logs', error);
    return errorResponse('Failed to export audit logs', 500);
  }
};
