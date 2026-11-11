import { afterAll, describe, expect, it } from 'bun:test';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db, auditLogs, users, workspaces } from '@/db';

const workspaceId = `ws-del-${nanoid(8)}`;
const memberId = `member-${nanoid(8)}`;
const superAdminId = `sa-${nanoid(8)}`;
const memberAuditId = `audit-${nanoid(8)}`;

function deleteContext(confirmName: string) {
  const url = `http://localhost/api/admin/workspaces/${workspaceId}/delete`;
  return {
    request: new Request(url, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ confirmName }),
    }),
    url: new URL(url),
    params: { id: workspaceId },
    locals: { user: { id: superAdminId, role: 'super_admin', workspaceId: null } },
  } as any;
}

describe('DELETE /api/admin/workspaces/:id/delete audit trail', () => {
  afterAll(async () => {
    await db.delete(auditLogs).where(eq(auditLogs.id, memberAuditId));
    await db.delete(auditLogs).where(eq(auditLogs.user_id, superAdminId));
    await db.delete(users).where(eq(users.id, superAdminId));
  });

  it('keeps the delete record and the members history after the workspace is gone', async () => {
    await db.insert(workspaces).values({ id: workspaceId, name: 'Doomed Household' });
    await db.insert(users).values([
      {
        id: memberId,
        email: `${memberId}@example.test`,
        name: 'Member',
        role: 'admin',
        workspace_id: workspaceId,
      },
      {
        id: superAdminId,
        email: `${superAdminId}@example.test`,
        name: 'Super Admin',
        role: 'super_admin',
        workspace_id: null,
      },
    ]);
    await db.insert(auditLogs).values({
      id: memberAuditId,
      workspace_id: workspaceId,
      user_id: memberId,
      action: 'login',
      entity_type: 'session',
    });

    const { DELETE } = await import('@/pages/api/admin/workspaces/[id]/delete');
    const response = await DELETE(deleteContext('Doomed Household'));

    expect(response.status).toBe(200);
    expect(await db.query.workspaces.findFirst({ where: eq(workspaces.id, workspaceId) })).toBe(
      undefined
    );

    const deleteRows = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.entity_id, workspaceId));
    expect(deleteRows).toHaveLength(1);
    expect(deleteRows[0]).toMatchObject({
      action: 'delete',
      entity_type: 'workspace',
      user_id: superAdminId,
      workspace_id: null,
    });

    const memberRow = await db.query.auditLogs.findFirst({
      where: eq(auditLogs.id, memberAuditId),
    });
    expect(memberRow).toMatchObject({ action: 'login', workspace_id: null, user_id: null });
  });
});
