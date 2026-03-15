import { describe, expect, mock, test } from 'bun:test';
import { SecurityActivityService } from './security-activity.service';

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

  test('does not write an audit entry when the user is not attached to a workspace', async () => {
    const writeAuditEvent = mock(() => Promise.resolve());
    const service = new SecurityActivityService(createMockDb(null), writeAuditEvent);

    await service.logEvent({ type: 'login', userId: 'user-1' });

    expect(writeAuditEvent).not.toHaveBeenCalled();
  });
});
