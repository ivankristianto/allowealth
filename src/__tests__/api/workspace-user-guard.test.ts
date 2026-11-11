import { beforeAll, beforeEach, describe, expect, it, mock } from 'bun:test';
import type { APIContext, APIRoute } from 'astro';
import { mockModuleForFile } from '@/lib/test-helpers/mock-module';
import * as realServices from '@/services';

const getWorkspaceCurrenciesMock = mock(() => Promise.resolve({ primary: 'IDR', secondary: null }));
const findAllClosedMock = mock(() => Promise.resolve([]));

mockModuleForFile('@/services', realServices, () => ({
  workspaceMetaService: { getWorkspaceCurrencies: getWorkspaceCurrenciesMock },
  accountService: { findAllClosed: findAllClosedMock },
}));

let GET: APIRoute;

function createApiContext(user: {
  id: string;
  workspaceId: string | null;
  role: 'admin' | 'member' | 'super_admin';
}): APIContext {
  const url = 'http://localhost/api/accounts/closed';
  return {
    request: new Request(url, { method: 'GET' }),
    url: new URL(url),
    locals: { user, session: { token: 'session-token' } },
  } as unknown as APIContext;
}

describe('workspace-scoped API routes', () => {
  beforeAll(async () => {
    ({ GET } = await import('@/pages/api/accounts/closed'));
  });

  beforeEach(() => {
    getWorkspaceCurrenciesMock.mockClear();
    findAllClosedMock.mockClear();
  });

  it('rejects a super admin, who has no workspace, before any service call', async () => {
    const response = await GET(
      createApiContext({ id: 'root', workspaceId: null, role: 'super_admin' })
    );

    expect(response.status).toBe(401);
    expect(getWorkspaceCurrenciesMock).not.toHaveBeenCalled();
    expect(findAllClosedMock).not.toHaveBeenCalled();
  });

  it('serves a workspace member with their workspace id', async () => {
    const response = await GET(createApiContext({ id: 'u1', workspaceId: 'ws-1', role: 'member' }));

    expect(response.status).toBe(200);
    expect(findAllClosedMock).toHaveBeenCalledWith('ws-1', {});
  });
});
