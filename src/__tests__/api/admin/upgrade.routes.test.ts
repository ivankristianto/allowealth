import { afterAll, beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';

const getStatusMock = mock(async () => ({ pending: false, applied: 2, expected: 2 }));
const runMigrationsMock = mock(async () => ({ success: true as const }));

(mock as any).module('@/services/migration.service', () => ({
  MigrationService: {
    getStatus: getStatusMock,
    runMigrations: runMigrationsMock,
  },
}));

let GET: any;
let POST: any;

type UserRole = 'super_admin' | 'admin' | 'member';

function createUser(role: UserRole) {
  return {
    id: `user-${role}`,
    role,
    workspaceId: role === 'super_admin' ? null : 'workspace-1',
  };
}

function createGetContext(role: UserRole | null) {
  return {
    request: new Request('http://localhost/api/admin/upgrade/status', { method: 'GET' }),
    url: new URL('http://localhost/api/admin/upgrade/status'),
    locals: {
      user: role ? createUser(role) : null,
      session: role ? { token: 'session-token' } : null,
    },
  } as any;
}

function createPostContext(role: UserRole | null) {
  return {
    request: new Request('http://localhost/api/admin/upgrade/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: '{}',
    }),
    url: new URL('http://localhost/api/admin/upgrade/run'),
    locals: {
      user: role ? createUser(role) : null,
      session: role ? { token: 'session-token' } : null,
    },
  } as any;
}

describe('admin upgrade API routes', () => {
  beforeAll(async () => {
    ({ GET } = await import('@/pages/api/admin/upgrade/status'));
    ({ POST } = await import('@/pages/api/admin/upgrade/run'));
  });

  afterAll(() => {
    (mock as any).restore();
  });

  beforeEach(() => {
    getStatusMock.mockReset();
    getStatusMock.mockResolvedValue({ pending: false, applied: 2, expected: 2 });

    runMigrationsMock.mockReset();
    runMigrationsMock.mockResolvedValue({ success: true });
  });

  it('GET /api/admin/upgrade/status returns 401 when unauthenticated', async () => {
    const response = await GET(createGetContext(null));
    expect(response.status).toBe(401);
  });

  it('GET /api/admin/upgrade/status returns 403 for non-super-admin users', async () => {
    const response = await GET(createGetContext('admin'));
    expect(response.status).toBe(403);
  });

  it('GET /api/admin/upgrade/status returns migration status for super_admin', async () => {
    const response = await GET(createGetContext('super_admin'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data).toEqual({ pending: false, applied: 2, expected: 2 });
    expect(getStatusMock).toHaveBeenCalledTimes(1);
  });

  it('GET /api/admin/upgrade/status returns 500 when status lookup fails', async () => {
    getStatusMock.mockRejectedValue(new Error('db unavailable'));

    const response = await GET(createGetContext('super_admin'));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.success).toBe(false);
    expect(payload.error?.code).toBe('MIGRATION_STATUS_ERROR');
  });

  it('POST /api/admin/upgrade/run returns 401 when unauthenticated', async () => {
    const response = await POST(createPostContext(null));
    expect(response.status).toBe(401);
  });

  it('POST /api/admin/upgrade/run returns 403 for non-super-admin users', async () => {
    const response = await POST(createPostContext('member'));
    expect(response.status).toBe(403);
  });

  it('POST /api/admin/upgrade/run returns success for super_admin', async () => {
    const response = await POST(createPostContext('super_admin'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.data).toEqual({ success: true });
    expect(runMigrationsMock).toHaveBeenCalledTimes(1);
  });

  it('POST /api/admin/upgrade/run returns 501 for unsupported deployments', async () => {
    runMigrationsMock.mockResolvedValue({
      success: false,
      error:
        'Web-triggered migrations are not supported in this deployment. Run: bun run db:migrate',
    });

    const response = await POST(createPostContext('super_admin'));
    const payload = await response.json();

    expect(response.status).toBe(501);
    expect(payload.success).toBe(false);
    expect(payload.error?.code).toBe('NOT_IMPLEMENTED');
  });

  it('POST /api/admin/upgrade/run returns 500 for migration failures', async () => {
    runMigrationsMock.mockResolvedValue({
      success: false,
      error: 'migration failed',
    });

    const response = await POST(createPostContext('super_admin'));
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.success).toBe(false);
    expect(payload.error?.code).toBe('MIGRATION_RUN_ERROR');
  });
});
