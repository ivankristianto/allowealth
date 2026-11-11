import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import {
  countRows,
  createMemoryDb,
  seedWorkspaceOwner,
  type MemoryDb,
} from '@/db/test-helpers/memory-db';
import { ServiceErrorCode } from './service-errors';
import { SuperAdminService } from './super-admin.service';

// Asserts outcomes and error codes only, so audit or enforcement added around these calls keeps them green

let memory: MemoryDb;
let service: SuperAdminService;

function addUser(id: string, workspaceId: string | null, role: string, name = id) {
  memory.raw.run(`INSERT INTO users (id, workspace_id, email, name, role) VALUES (?, ?, ?, ?, ?)`, [
    id,
    workspaceId,
    `${id}@example.test`,
    name,
    role,
  ]);
}

function addAccount(id: string, workspaceId: string, ownerId: string) {
  memory.raw.run(
    `INSERT INTO accounts (id, workspace_id, created_by_user_id, name, type, balance, currency)
     VALUES (?, ?, ?, 'Cash', 'cash', '0', 'IDR')`,
    [id, workspaceId, ownerId]
  );
}

function userRow(id: string) {
  return memory.raw.query('SELECT role, deleted_at FROM users WHERE id = ?').get(id) as {
    role: string;
    deleted_at: number | null;
  };
}

async function errorCode(promise: Promise<unknown>): Promise<string | undefined> {
  return promise.then(
    () => undefined,
    (error: { code?: string }) => error.code
  );
}

beforeEach(() => {
  memory = createMemoryDb();
  seedWorkspaceOwner(memory.raw, 'ws-a', 'owner-a');
  addUser('member-a', 'ws-a', 'member', 'Member Alpha');
  seedWorkspaceOwner(memory.raw, 'ws-b', 'owner-b');
  addUser('root', null, 'super_admin');
  addAccount('acc-a', 'ws-a', 'owner-a');
  addAccount('acc-b', 'ws-b', 'owner-b');
  service = new SuperAdminService(memory.db);
});

afterEach(() => memory.raw.close());

describe('SuperAdminService overview and listings', () => {
  it('counts workspaces and workspace users, leaving out super admins', async () => {
    expect(await service.getPlatformOverview()).toEqual({
      totalWorkspaces: 2,
      totalUsers: 3,
      activeWorkspaces: 2,
    });
  });

  it('lists workspaces with member and account counts', async () => {
    const { workspaces, total } = await service.listAllWorkspaces({ sortBy: 'name' });
    const byId = Object.fromEntries(workspaces.map((ws) => [ws.id, ws]));

    expect(total).toBe(2);
    expect(byId['ws-a']).toMatchObject({ memberCount: 2, accountCount: 1, status: 'active' });
    expect(byId['ws-b']).toMatchObject({ memberCount: 1, accountCount: 1 });
  });

  it('returns workspace details with its members', async () => {
    const details = await service.getWorkspaceDetails('ws-a');
    expect(details.members.map((member) => member.id).sort()).toEqual(['member-a', 'owner-a']);
  });

  it('filters users by workspace, role, status and search text', async () => {
    const ids = async (params: Parameters<SuperAdminService['listAllUsers']>[0]) =>
      (await service.listAllUsers(params)).users.map((user) => user.id).sort();

    expect(await ids({ workspaceId: 'ws-a' })).toEqual(['member-a', 'owner-a']);
    expect(await ids({ role: 'super_admin' })).toEqual(['root']);
    expect(await ids({ search: 'Alpha' })).toEqual(['member-a']);
    expect(await ids({ status: 'deactivated' })).toEqual([]);
  });

  it('reports unknown workspaces and users as not found', async () => {
    expect(await errorCode(service.getWorkspaceDetails('missing'))).toBe(
      ServiceErrorCode.WORKSPACE_NOT_FOUND
    );
    expect(await errorCode(service.getUserDetails('missing'))).toBe(
      ServiceErrorCode.USER_NOT_FOUND
    );
  });
});

describe('SuperAdminService workspace lifecycle', () => {
  it('archives a workspace as inactive and keeps its data', async () => {
    await service.archiveWorkspace('ws-a');

    expect((await service.getWorkspaceDetails('ws-a')).status).toBe('inactive');
    expect((await service.getPlatformOverview()).activeWorkspaces).toBe(1);
    expect(countRows(memory.raw, 'accounts', "workspace_id = 'ws-a'")).toBe(1);
  });

  it('deletes a workspace with its users and data, and nothing else', async () => {
    await service.deleteWorkspace('ws-a');

    expect(countRows(memory.raw, 'workspaces', "id = 'ws-a'")).toBe(0);
    expect(countRows(memory.raw, 'users', "workspace_id = 'ws-a'")).toBe(0);
    expect(countRows(memory.raw, 'accounts', "workspace_id = 'ws-a'")).toBe(0);
    expect(countRows(memory.raw, 'accounts', "workspace_id = 'ws-b'")).toBe(1);
    expect(countRows(memory.raw, 'users', "id = 'root'")).toBe(1);
  });

  it('reports an unknown workspace as not found on archive and delete', async () => {
    expect(await errorCode(service.archiveWorkspace('missing'))).toBe(
      ServiceErrorCode.WORKSPACE_NOT_FOUND
    );
    expect(await errorCode(service.deleteWorkspace('missing'))).toBe(
      ServiceErrorCode.WORKSPACE_NOT_FOUND
    );
  });
});

describe('SuperAdminService user management', () => {
  it('deactivates and reactivates a member', async () => {
    await service.deactivateUser('member-a');
    expect(userRow('member-a').deleted_at).not.toBeNull();
    expect((await service.listAllUsers({ status: 'deactivated' })).users.map((u) => u.id)).toEqual([
      'member-a',
    ]);

    await service.reactivateUser('member-a');
    expect(userRow('member-a').deleted_at).toBeNull();
  });

  it('refuses to deactivate a super admin', async () => {
    expect(await errorCode(service.deactivateUser('root'))).toBe(ServiceErrorCode.FORBIDDEN);
    expect(userRow('root').deleted_at).toBeNull();
  });

  it('rejects deactivating twice and reactivating an active user', async () => {
    await service.deactivateUser('member-a');

    expect(await errorCode(service.deactivateUser('member-a'))).toBe(
      ServiceErrorCode.VALIDATION_ERROR
    );
    expect(await errorCode(service.reactivateUser('owner-a'))).toBe(
      ServiceErrorCode.VALIDATION_ERROR
    );
  });

  it('changes a member to admin and back', async () => {
    await service.changeUserRole('member-a', 'admin');
    expect(userRow('member-a').role).toBe('admin');

    await service.changeUserRole('member-a', 'member');
    expect(userRow('member-a').role).toBe('member');
  });

  it('refuses to change a super admin role or set an unknown role', async () => {
    expect(await errorCode(service.changeUserRole('root', 'member'))).toBe(
      ServiceErrorCode.FORBIDDEN
    );
    expect(
      await errorCode(service.changeUserRole('member-a', 'super_admin' as unknown as 'admin'))
    ).toBe(ServiceErrorCode.VALIDATION_ERROR);
    expect(userRow('root').role).toBe('super_admin');
    expect(userRow('member-a').role).toBe('member');
  });

  it('reports unknown users as not found', async () => {
    for (const call of [
      service.deactivateUser('missing'),
      service.reactivateUser('missing'),
      service.changeUserRole('missing', 'admin'),
    ]) {
      expect(await errorCode(call)).toBe(ServiceErrorCode.USER_NOT_FOUND);
    }
  });
});
