import { afterEach, beforeAll, describe, expect, it, mock } from 'bun:test';

import { superAdminService } from '@/services';

let POST: any;

const originalGetUserDetails = superAdminService.getUserDetails;
const originalDeactivateUser = superAdminService.deactivateUser;
const logAuditEventMock = mock(async () => {});

(mock as any).module?.('@/lib/audit-log', () => ({
  logAuditEvent: logAuditEventMock,
}));

function createApiContext(role: 'super_admin' | 'admin' = 'super_admin') {
  return {
    request: new Request('http://localhost/api/admin/users/user-2/deactivate', { method: 'POST' }),
    params: { id: 'user-2' },
    locals: {
      user: {
        id: 'super-admin-1',
        role,
        workspaceId: 'ws-admin',
      },
    },
  } as any;
}

describe('POST /api/admin/users/[id]/deactivate', () => {
  beforeAll(async () => {
    ({ POST } = await import('@/pages/api/admin/users/[id]/deactivate'));
  });

  afterEach(() => {
    superAdminService.getUserDetails = originalGetUserDetails;
    superAdminService.deactivateUser = originalDeactivateUser;
    logAuditEventMock.mockClear();
  });

  it('deactivates the user and logs an audit event for super admins', async () => {
    superAdminService.getUserDetails = mock(async () => ({
      id: 'user-2',
      name: 'Target User',
      email: 'target@example.com',
      workspaceId: 'ws-target',
    })) as any;
    superAdminService.deactivateUser = mock(async () => {}) as any;

    const response = await POST(createApiContext());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(superAdminService.deactivateUser).toHaveBeenCalledWith('user-2');
    expect(logAuditEventMock).toHaveBeenCalled();
  });

  it('rejects non-super-admin callers', async () => {
    const response = await POST(createApiContext('admin'));

    expect(response.status).toBe(403);
  });
});
