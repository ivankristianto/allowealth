import { afterEach, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users, workspaces } from '@/db/schema';

const getSessionMock = mock(async () => null);

(mock as any).module('@/lib/auth/server', () => ({
  auth: {
    api: {
      getSession: getSessionMock,
    },
  },
  AUTH_PATH_PREFIX: '/api/auth',
  AUTH_SESSION_COOKIE_NAME: 'better-auth.session_token',
  getAuthBaseURL: () =>
    process.env.PUBLIC_URL ??
    `http://${process.env.DEV_HOST ?? 'localhost'}:${process.env.PORT ?? '4321'}`,
  getTrustedOrigins: () => [
    process.env.PUBLIC_URL ??
      `http://${process.env.DEV_HOST ?? 'localhost'}:${process.env.PORT ?? '4321'}`,
  ],
}));

let authentication: typeof import('./auth').authentication;
const TEST_USER_ID = 'middleware-auth-user';
const TEST_WORKSPACE_ID = 'middleware-auth-workspace';

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

  beforeEach(async () => {
    getSessionMock.mockReset();
    await db.delete(users).where(eq(users.id, TEST_USER_ID));
    await db.delete(workspaces).where(eq(workspaces.id, TEST_WORKSPACE_ID));
  });

  afterEach(async () => {
    await db.delete(users).where(eq(users.id, TEST_USER_ID));
    await db.delete(workspaces).where(eq(workspaces.id, TEST_WORKSPACE_ID));
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
        userId: TEST_USER_ID,
        token: 'token-1',
        expiresAt: new Date('2030-01-01T00:00:00.000Z'),
        createdAt: new Date('2030-01-01T00:00:00.000Z'),
        updatedAt: new Date('2030-01-01T00:00:00.000Z'),
      },
      user: {
        id: TEST_USER_ID,
        email: 'user@example.com',
        name: 'Example User',
      },
    });

    await db.insert(workspaces).values({
      id: TEST_WORKSPACE_ID,
      name: 'Middleware Test Workspace',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });

    await db.insert(users).values({
      id: TEST_USER_ID,
      workspace_id: TEST_WORKSPACE_ID,
      email: 'user@example.com',
      name: 'Example User',
      role: 'member',
      avatar_url: null,
      deleted_at: null,
      password_hash: null,
      email_verified_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
    });

    const context = createContext('/dashboard', 'signed-cookie');

    await authentication(context as never, async () => new Response('ok'));

    expect(getSessionMock).toHaveBeenCalled();
    expect(context.locals.session?.id).toBe('session-1');
    expect(context.locals.user?.id).toBe(TEST_USER_ID);
    expect(context.locals.user?.workspaceId).toBe(TEST_WORKSPACE_ID);
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
    expect(context.cookies.delete).toHaveBeenCalledWith('better-auth.session_token', { path: '/' });
  });

  test('deletes stale session cookies when better-auth returns no session', async () => {
    getSessionMock.mockResolvedValue(null);
    const context = createContext('/dashboard', 'expired-cookie');

    const response = expectResponse(
      await authentication(context as never, async () => new Response('ok'))
    );

    expect(response.status).toBe(200);
    expect(context.locals.user).toBeNull();
    expect(context.locals.session).toBeNull();
    expect(context.cookies.delete).toHaveBeenCalledWith('better-auth.session_token', { path: '/' });
  });
});
