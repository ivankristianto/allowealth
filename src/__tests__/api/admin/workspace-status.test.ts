import { afterAll, describe, expect, it } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db, auditLogs, users, workspaces } from '@/db';

const workspaceId = `ws-status-${nanoid(8)}`;
const superAdminId = `sa-status-${nanoid(8)}`;

function statusContext(action: 'archive' | 'reactivate', role = 'super_admin') {
  const url = `http://localhost/api/admin/workspaces/${workspaceId}/${action}`;
  return {
    request: new Request(url, { method: 'POST' }),
    url: new URL(url),
    params: { id: workspaceId },
    locals: { user: { id: superAdminId, role, workspaceId: role === 'admin' ? 'ws-x' : null } },
  } as any;
}

async function workspaceStatus() {
  const row = await db.query.workspaces.findFirst({ where: eq(workspaces.id, workspaceId) });
  return row?.status;
}

describe('POST /api/admin/workspaces/:id/archive and /reactivate', () => {
  afterAll(async () => {
    await db.delete(auditLogs).where(eq(auditLogs.user_id, superAdminId));
    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    await db.delete(users).where(eq(users.id, superAdminId));
  });

  it('archives and reactivates a workspace, auditing both', async () => {
    await db.insert(workspaces).values({ id: workspaceId, name: 'Status Household' });
    await db.insert(users).values({
      id: superAdminId,
      email: `${superAdminId}@example.test`,
      name: 'Super Admin',
      role: 'super_admin',
    });
    const { POST: archive } = await import('@/pages/api/admin/workspaces/[id]/archive');
    const { POST: reactivate } = await import('@/pages/api/admin/workspaces/[id]/reactivate');

    expect((await archive(statusContext('archive'))).status).toBe(200);
    expect(await workspaceStatus()).toBe('inactive');

    expect((await reactivate(statusContext('reactivate'))).status).toBe(200);
    expect(await workspaceStatus()).toBe('active');

    const restoreRows = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.entity_id, workspaceId), eq(auditLogs.action, 'restore')));
    expect(restoreRows).toHaveLength(1);
  });

  it('refuses reactivation from a workspace admin', async () => {
    const { POST: reactivate } = await import('@/pages/api/admin/workspaces/[id]/reactivate');

    expect((await reactivate(statusContext('reactivate', 'admin'))).status).toBe(403);
  });
});
