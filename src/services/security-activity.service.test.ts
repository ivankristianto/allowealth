import { afterAll, describe, expect, mock, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db, auditLogs, users } from '@/db';
import { SecurityActivityService, securityActivityService } from './security-activity.service';

function createMockDb(workspaceId: string | null) {
  return {
    query: {
      users: {
        findFirst: mock(() =>
          Promise.resolve(workspaceId ? { id: 'user-1', workspace_id: workspaceId } : undefined)
        ),
      },
    },
  } as any;
}

describe('SecurityActivityService', () => {
  test('logs sign-in and sign-out events against the user workspace', async () => {
    const writeAuditEvent = mock(() => Promise.resolve());
    const service = new SecurityActivityService(createMockDb('ws-1'), writeAuditEvent);

    await service.logEvent({ type: 'login', userId: 'user-1' });
    await service.logEvent({ type: 'logout', userId: 'user-1' });

    const auditCalls = (writeAuditEvent as any).mock.calls as Array<[Record<string, unknown>]>;

    expect(auditCalls[0]?.[0]).toMatchObject({
      workspaceId: 'ws-1',
      userId: 'user-1',
      action: 'login',
      entityType: 'session',
    });
    expect(auditCalls[1]?.[0]).toMatchObject({
      workspaceId: 'ws-1',
      userId: 'user-1',
      action: 'logout',
      entityType: 'session',
    });
  });

  test('logs passkey and MCP token activity as entity-specific audit entries', async () => {
    const writeAuditEvent = mock(() => Promise.resolve());
    const service = new SecurityActivityService(createMockDb('ws-1'), writeAuditEvent);

    await service.logEvent({ type: 'passkey_created', userId: 'user-1', entityId: 'pk-1' });
    await service.logEvent({ type: 'mcp_token_revoked', userId: 'user-1', entityId: 'tok-1' });

    const auditCalls = (writeAuditEvent as any).mock.calls as Array<[Record<string, unknown>]>;

    expect(auditCalls[0]?.[0]).toMatchObject({
      action: 'create',
      entityType: 'passkey',
      entityId: 'pk-1',
    });
    expect(auditCalls[1]?.[0]).toMatchObject({
      action: 'mcp_token_revoke',
      entityType: 'mcp_token',
      entityId: 'tok-1',
    });
  });

  test('records events for users without a workspace, such as super admins', async () => {
    const writeAuditEvent = mock(() => Promise.resolve());
    const service = new SecurityActivityService(createMockDb(null), writeAuditEvent);

    await service.logEvent({ type: 'login', userId: 'user-1' });

    const auditCalls = (writeAuditEvent as any).mock.calls as Array<[Record<string, unknown>]>;
    expect(auditCalls[0]?.[0]).toMatchObject({
      workspaceId: null,
      userId: 'user-1',
      action: 'login',
    });
  });
});

describe('SecurityActivityService against the database', () => {
  const superAdminId = `sa-${nanoid(8)}`;

  afterAll(async () => {
    await db.delete(auditLogs).where(eq(auditLogs.user_id, superAdminId));
    await db.delete(users).where(eq(users.id, superAdminId));
  });

  test('stores a super-admin sign-in', async () => {
    await db.insert(users).values({
      id: superAdminId,
      email: `${superAdminId}@example.test`,
      name: 'Super Admin',
      role: 'super_admin',
      workspace_id: null,
    });

    await securityActivityService.logEvent({ type: 'login', userId: superAdminId });

    const rows = await db.select().from(auditLogs).where(eq(auditLogs.user_id, superAdminId));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ action: 'login', entity_type: 'session', workspace_id: null });
  });
});
