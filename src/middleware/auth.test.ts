import { beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test';

const getSessionMock = mock(async () => null);
const findDomainUserMock = mock(async () => null);

(mock as any).module('@/lib/auth/server', () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
  AUTH_PATH_PREFIX: '/api/auth',
  AUTH_SESSION_COOKIE_NAME: 'better-auth.session_token',
}));

(mock as any).module('@/db', () => ({
  db: {
    query: {
      users: {
        findFirst: findDomainUserMock,
      },
    },
  },
}));

(mock as any).module('@/db/schema', () => ({
  users: {
    id: 'id',
  },
}));

let authentication: typeof import('./auth').authentication;

type MockContext = {
  locals: App.Locals;
  request: Request;
  url: URL;
  cookies: {
    get: (name: string) => { value: string } | undefined;
    set: ReturnType<typeof mock>;
    delete: ReturnType<typeof mock>;
  };
  isPrerendered: boolean;
};

function createContext(pathname: string, cookieValue?: string): MockContext {
  const cookies = new Map<string, string>();

  if (cookieValue) {
    cookies.set('better-auth.session_token', cookieValue);
  }

  return {
    locals: {
      user: undefined,
      session: undefined,
      perf: undefined,
      serverTimings: undefined,
    },
    request: new Request(`http://localhost${pathname}`, {
      headers: cookieValue ? { cookie: `better-auth.session_token=${cookieValue}` } : {},
    }),
    url: new URL(`http://localhost${pathname}`),
    cookies: {
      get: (name: string) => {
        const value = cookies.get(name);
        return value ? { value } : undefined;
      },
      set: mock(() => {}),
      delete: mock((name: string) => {
        cookies.delete(name);
      }),
    },
    isPrerendered: false,
  };
}

function expectResponse(response: Response | void): Response {
  expect(response).toBeInstanceOf(Response);

  if (!(response instanceof Response)) {
    throw new Error('authentication middleware must return a Response in this test');
  }

  return response;
}

describe('authentication middleware', () => {
  beforeAll(async () => {
    ({ authentication } = await import('./auth'));
  });

  beforeEach(() => {
    getSessionMock.mockReset();
    findDomainUserMock.mockReset();
  });

  test('sets locals.user to null for unauthenticated requests', async () => {
    getSessionMock.mockResolvedValue(null);
    const context = createContext('/dashboard');

    const response = expectResponse(
      await authentication(context as never, async () => new Response('ok'))
    );

    expect(response.status).toBe(200);
    expect(context.locals.user).toBeNull();
    expect(context.locals.session).toBeNull();
  });

  test('resolves authenticated sessions through better-auth', async () => {
    getSessionMock.mockResolvedValue({
      session: {
        id: 'session-1',
        userId: 'user-1',
        token: 'token-1',
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        createdAt: new Date('2030-01-01T00:00:00.000Z'),
        updatedAt: new Date('2030-01-01T00:00:00.000Z'),
      },
      user: {
        id: 'user-1',
        email: 'user@example.com',
        name: 'Example User',
      },
    });
    findDomainUserMock.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'Example User',
      role: 'member',
      workspace_id: 'workspace-1',
      avatar_url: null,
      deleted_at: null,
    });
    const context = createContext('/dashboard', 'signed-cookie');

    await authentication(context as never, async () => new Response('ok'));

    expect(getSessionMock).toHaveBeenCalled();
    expect(findDomainUserMock).toHaveBeenCalled();
    expect(context.locals.session?.id).toBe('session-1');
    expect(context.locals.user?.id).toBe('user-1');
    expect(context.locals.user?.workspaceId).toBe('workspace-1');
  });

  test('clears stale auth state instead of throwing', async () => {
    getSessionMock.mockImplementation(async () => {
      throw new Error('stale session');
    });
    const context = createContext('/dashboard', 'stale-cookie');

    const response = expectResponse(
      await authentication(context as never, async () => new Response('ok'))
    );

    expect(response.status).toBe(200);
    expect(context.locals.user).toBeNull();
    expect(context.locals.session).toBeNull();
  });
});
