import { afterEach, beforeAll, describe, expect, it, mock } from 'bun:test';

import { userService, workspaceService } from '@/services';

let DELETE: any;

const originalGetMembers = workspaceService.getMembers;
const originalSoftDelete = userService.softDelete;

function createApiContext(role: 'admin' | 'member' = 'admin', memberId = 'user-2') {
  const url = `http://localhost/api/workspace/members?memberId=${memberId}`;
  return {
    request: new Request(url, { method: 'DELETE' }),
    url: new URL(url),
    locals: {
      user: {
        id: 'user-1',
        workspaceId: 'ws-1',
        role,
      },
    },
  } as any;
}

describe('DELETE /api/workspace/members', () => {
  beforeAll(async () => {
    ({ DELETE } = await import('@/pages/api/workspace/members'));
  });

  afterEach(() => {
    workspaceService.getMembers = originalGetMembers;
    userService.softDelete = originalSoftDelete;
  });

  it('soft deletes a workspace member for admins', async () => {
    workspaceService.getMembers = mock(async () => [
      {
        id: 'user-2',
        name: 'User Two',
        email: 'user2@example.com',
        role: 'member',
        created_at: new Date(),
      },
    ]) as any;
    userService.softDelete = mock(async () => {}) as any;

    const response = await DELETE(createApiContext());
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(userService.softDelete).toHaveBeenCalledWith('user-2');
  });

  it('rejects non-admin callers', async () => {
    const response = await DELETE(createApiContext('member'));

    expect(response.status).toBe(403);
  });
});
