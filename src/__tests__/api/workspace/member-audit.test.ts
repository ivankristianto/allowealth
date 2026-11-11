import { afterAll, afterEach, beforeAll, describe, expect, it, mock } from 'bun:test';
import { and, eq, inArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db, auditLogs, users, workspaces } from '@/db';
import { superAdminService, workspaceInvitationService } from '@/services';

const workspaceId = `ws-members-${nanoid(8)}`;
const founderId = `founder-${nanoid(8)}`;
const actingAdminId = `admin-${nanoid(8)}`;
const memberId = `member-${nanoid(8)}`;
const loneWorkspaceId = `ws-lone-${nanoid(8)}`;
const loneAdminId = `lone-${nanoid(8)}`;
const superAdminId = `sa-members-${nanoid(8)}`;
const allUserIds = [founderId, actingAdminId, memberId, loneAdminId, superAdminId];

function adminContext(method: 'DELETE' | 'POST', url: string, body?: unknown) {
  return {
    request: new Request(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    }),
    url: new URL(url),
    locals: { user: { id: actingAdminId, workspaceId, role: 'admin' } },
  } as any;
}

function removeMember(id: string) {
  return adminContext('DELETE', `http://localhost/api/workspace/members?memberId=${id}`);
}

async function auditRowsFor(action: string, entityId: string) {
  return db
    .select()
    .from(auditLogs)
    .where(and(eq(auditLogs.action, action), eq(auditLogs.entity_id, entityId)));
}

beforeAll(async () => {
  await db.insert(workspaces).values([
    { id: workspaceId, name: 'Members Household' },
    { id: loneWorkspaceId, name: 'Lone Household' },
  ]);
  const base = Date.now() - 60_000;
  const user = (
    id: string,
    ws: string | null,
    role: 'admin' | 'member' | 'super_admin',
    at: number
  ) => ({
    id,
    workspace_id: ws,
    email: `${id}@example.test`,
    name: id,
    role,
    created_at: new Date(base + at),
  });
  await db
    .insert(users)
    .values([
      user(founderId, workspaceId, 'admin', 0),
      user(actingAdminId, workspaceId, 'admin', 1000),
      user(memberId, workspaceId, 'member', 2000),
      user(loneAdminId, loneWorkspaceId, 'admin', 0),
      user(superAdminId, null, 'super_admin', 0),
    ]);
});

afterAll(async () => {
  await db.delete(auditLogs).where(inArray(auditLogs.workspace_id, [workspaceId, loneWorkspaceId]));
  await db.delete(auditLogs).where(inArray(auditLogs.user_id, allUserIds));
  await db.delete(workspaces).where(inArray(workspaces.id, [workspaceId, loneWorkspaceId]));
  await db.delete(users).where(eq(users.id, superAdminId));
});

describe('workspace member audit trail', () => {
  const originalCreate = workspaceInvitationService.create;

  afterEach(() => {
    workspaceInvitationService.create = originalCreate;
  });

  it('records member_invite when an admin invites someone', async () => {
    const invitationId = `invite-${nanoid(8)}`;
    workspaceInvitationService.create = mock(async (input: { email: string; role: string }) => ({
      id: invitationId,
      email: input.email,
      role: input.role,
      expires_at: new Date(Date.now() + 86_400_000),
      created_at: new Date(),
    })) as any;
    const { POST } = await import('@/pages/api/workspace/invitations');

    const response = await POST(
      adminContext('POST', 'http://localhost/api/workspace/invitations', {
        email: 'newcomer@example.com',
        role: 'member',
      })
    );

    expect(response.status).toBe(201);
    const rows = await auditRowsFor('member_invite', workspaceId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      workspace_id: workspaceId,
      user_id: actingAdminId,
      entity_type: 'workspace',
    });
    expect(JSON.parse(rows[0]!.new_value!)).toEqual({
      invitationId,
      email: 'newcomer@example.com',
      role: 'member',
    });
  });

  it('records member_remove when an admin removes a member', async () => {
    const { DELETE } = await import('@/pages/api/workspace/members');

    const response = await DELETE(removeMember(memberId));

    expect(response.status).toBe(200);
    const rows = await auditRowsFor('member_remove', memberId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ workspace_id: workspaceId, user_id: actingAdminId });
    expect(JSON.parse(rows[0]!.old_value!)).toMatchObject({
      role: 'member',
      foundingOwner: false,
    });
  });

  it('flags the removal of the founding owner in the audit row', async () => {
    const { DELETE } = await import('@/pages/api/workspace/members');

    const response = await DELETE(removeMember(founderId));

    expect(response.status).toBe(200);
    const rows = await auditRowsFor('member_remove', founderId);
    expect(rows).toHaveLength(1);
    expect(JSON.parse(rows[0]!.old_value!)).toMatchObject({ role: 'admin', foundingOwner: true });
  });
});

describe('the last admin of a workspace stays', () => {
  it('refuses to deactivate the only active admin', async () => {
    await expect(superAdminService.deactivateUser(loneAdminId)).rejects.toMatchObject({
      statusCode: 409,
    });
    const row = await db.query.users.findFirst({ where: eq(users.id, loneAdminId) });
    expect(row?.deleted_at).toBeNull();
  });

  it('refuses to demote the only active admin to member', async () => {
    await expect(superAdminService.changeUserRole(loneAdminId, 'member')).rejects.toMatchObject({
      statusCode: 409,
    });
    const row = await db.query.users.findFirst({ where: eq(users.id, loneAdminId) });
    expect(row?.role).toBe('admin');
  });

  it('still deactivates an admin who has a co-admin', async () => {
    await db.insert(users).values({
      id: `${loneAdminId}-co`,
      workspace_id: loneWorkspaceId,
      email: `${loneAdminId}-co@example.test`,
      name: 'Co Admin',
      role: 'admin',
    });

    await superAdminService.deactivateUser(loneAdminId);

    const row = await db.query.users.findFirst({ where: eq(users.id, loneAdminId) });
    expect(row?.deleted_at).not.toBeNull();
  });
});
