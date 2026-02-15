import type { APIRoute } from 'astro';
import { db, auditLogs, users } from '@/db';
import { desc, sql, and, eq } from 'drizzle-orm';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/logger';

/**
 * GET /api/admin/audit-logs
 *
 * Returns paginated audit log entries with actor information.
 * Super admin only.
 *
 * Query params:
 * - action: Filter by action type (optional)
 * - entityType: Filter by entity type (optional)
 * - workspaceId: Filter by workspace ID (optional)
 * - limit: Page size (default 50, max 100)
 * - offset: Pagination offset (default 0)
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    if (auth.role !== 'super_admin') {
      return errorResponse('Super admin access required', 403);
    }

    const { url } = context;
    const action = url.searchParams.get('action') || undefined;
    const entityType = url.searchParams.get('entityType') || undefined;
    const workspaceId = url.searchParams.get('workspaceId') || undefined;
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10), 1), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);

    // Build filter conditions
    const conditions = [];
    if (action) {
      conditions.push(eq(auditLogs.action, action));
    }
    if (entityType) {
      conditions.push(eq(auditLogs.entity_type, entityType));
    }
    if (workspaceId) {
      conditions.push(eq(auditLogs.workspace_id, workspaceId));
    }
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count total matching records
    let countQuery = (db as any).select({ count: sql<number>`count(*)` }).from(auditLogs);
    if (whereClause) {
      countQuery = countQuery.where(whereClause);
    }
    const [countResult] = await countQuery;
    const total = countResult?.count ?? 0;

    if (total === 0) {
      return successResponse({ logs: [], total: 0 });
    }

    // Fetch logs with actor name via left join
    let logsQuery = (db as any)
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entity_type,
        entityId: auditLogs.entity_id,
        createdAt: auditLogs.created_at,
        userId: auditLogs.user_id,
        workspaceId: auditLogs.workspace_id,
        oldValue: auditLogs.old_value,
        newValue: auditLogs.new_value,
        actorName: users.name,
        actorEmail: users.email,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.user_id, users.id));

    if (whereClause) {
      logsQuery = logsQuery.where(whereClause);
    }

    const logs = await logsQuery.orderBy(desc(auditLogs.created_at)).limit(limit).offset(offset);

    return successResponse({ logs, total });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error fetching audit logs', error);
    return errorResponse('Failed to fetch audit logs', 500);
  }
};
