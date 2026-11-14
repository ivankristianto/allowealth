import { afterAll, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { mcpAppPasswords, users, workspaces } from '@/db/schema';
import { mockModuleForFile } from '@/lib/test-helpers/mock-module';
import * as realAuthServer from '@/lib/auth/server';
import * as realOpenApiSources from '@/lib/openapi/sources';
import { McpAppPasswordService } from '@/services/mcp-app-password.service';
import type { AppPasswordScope } from '@/lib/mcp-app-password';
import { APP_PASSWORD_REST_ROUTES } from '@/lib/app-password-rest-access';

const SESSION_COOKIE = 'allowealth.session_token';
const getSessionMock = mock(async (): Promise<unknown> => null);

mockModuleForFile('@/lib/auth/server', realAuthServer, () => ({
  auth: { api: { getSession: getSessionMock } },
  AUTH_PATH_PREFIX: '/api/auth',
  getSessionCookieName: () => SESSION_COOKIE,
}));

// import.meta.glob only exists under Vite; read the same files from disk instead.
mockModuleForFile('@/lib/openapi/sources', realOpenApiSources, () => ({
  loadOpenApiSources: () => {
    const files = ['openapi.yml', ...new Bun.Glob('openapi/**/*.yml').scanSync(process.cwd())];
    return Object.fromEntries(
      files.map((file) => [file, readFileSync(join(process.cwd(), file), 'utf8')])
    );
  },
}));

let appPasswordAuthentication: typeof import('@/middleware/app-password').appPasswordAuthentication;
let authentication: typeof import('@/middleware/auth').authentication;
let csrf: typeof import('@/middleware/csrf').csrf;
let openApiGet: typeof import('@/pages/api/openapi.json').GET;

const WORKSPACE_ID = 'app-pw-rest-workspace';
const USER_ID = 'app-pw-rest-user';
const service = new McpAppPasswordService(db);

interface TestContext {
  locals: App.Locals;
  request: Request;
  url: URL;
  cookies: {
    get: (name: string) => { value: string } | undefined;
    set: ReturnType<typeof mock>;
    delete: ReturnType<typeof mock>;
  };
  isPrerendered: boolean;
  redirect: (location: string, status?: number) => Response;
}

interface RequestOptions {
  method?: string;
  bearer?: string;
  cookies?: Record<string, string>;
  headers?: Record<string, string>;
}

function createContext(pathname: string, options: RequestOptions = {}): TestContext {
  const cookies = new Map(Object.entries(options.cookies ?? {}));
  const headers: Record<string, string> = { ...options.headers };
  if (options.bearer !== undefined) headers.Authorization = `Bearer ${options.bearer}`;
  if (cookies.size > 0) {
    headers.cookie = [...cookies].map(([name, value]) => `${name}=${value}`).join('; ');
  }
  const url = new URL(`http://localhost${pathname}`);

  return {
    locals: {},
    request: new Request(url, { method: options.method ?? 'GET', headers }),
    url,
    cookies: {
      get: (name) => (cookies.has(name) ? { value: cookies.get(name)! } : undefined),
      set: mock(() => {}),
      delete: mock((name: string) => {
        cookies.delete(name);
      }),
    },
    isPrerendered: false,
    redirect: (location, status = 302) =>
      new Response(null, { status, headers: { Location: location } }),
  };
}

const routeHandler = mock(async () => Response.json({ success: true, data: { reached: true } }));

/** Runs the auth-related middleware in production order, ending in `handler`. */
async function runChain(
  context: TestContext,
  handler: (context: TestContext) => Promise<Response> = routeHandler
): Promise<Response> {
  const ctx = context as never;
  const response = await appPasswordAuthentication(
    ctx,
    () =>
      authentication(
        ctx,
        () => csrf(ctx, () => handler(context)) as Promise<Response>
      ) as Promise<Response>
  );
  if (!(response instanceof Response)) throw new Error('middleware chain returned no Response');
  return response;
}

async function createToken(
  scope: AppPasswordScope,
  tokenService = service
): Promise<{ token: string; id: string }> {
  const { token, appPassword } = await tokenService.create({
    userId: USER_ID,
    name: `test ${scope} ${crypto.randomUUID()}`,
    scope,
    expiry: '30',
  });
  return { token, id: appPassword.id };
}

async function resetFixtures(): Promise<void> {
  await db.delete(mcpAppPasswords).where(eq(mcpAppPasswords.user_id, USER_ID));
  await db.delete(users).where(eq(users.id, USER_ID));
  await db.delete(workspaces).where(eq(workspaces.id, WORKSPACE_ID));
}

function mockCookieSession(): void {
  getSessionMock.mockResolvedValue({
    session: {
      id: 'cookie-session',
      userId: USER_ID,
      token: 'cookie-session-token',
      expiresAt: new Date(Date.now() + 86_400_000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    user: { id: USER_ID, email: 'agent-owner@example.com', name: 'Agent Owner' },
  });
}

describe('app password authentication on the REST API', () => {
  let readToken: string;
  let readTokenId: string;
  let readWriteToken: string;

  beforeAll(async () => {
    ({ appPasswordAuthentication } = await import('@/middleware/app-password'));
    ({ authentication } = await import('@/middleware/auth'));
    ({ csrf } = await import('@/middleware/csrf'));
    ({ GET: openApiGet } = await import('@/pages/api/openapi.json'));
  });

  beforeEach(async () => {
    await resetFixtures();
    getSessionMock.mockReset();
    getSessionMock.mockResolvedValue(null);
    routeHandler.mockClear();
    await db
      .insert(workspaces)
      .values({ id: WORKSPACE_ID, name: 'Agent Workspace', status: 'active' });
    await db.insert(users).values({
      id: USER_ID,
      workspace_id: WORKSPACE_ID,
      email: 'agent-owner@example.com',
      name: 'Agent Owner',
      role: 'admin',
    });
    ({ token: readToken, id: readTokenId } = await createToken('read'));
    ({ token: readWriteToken } = await createToken('read-write'));
  });

  afterAll(resetFixtures);

  test('a read token can GET an allowlisted route and locals carry the token user', async () => {
    const context = createContext('/api/transactions', { bearer: readToken });

    const response = await runChain(context);

    expect(response.status).toBe(200);
    expect(routeHandler).toHaveBeenCalledTimes(1);
    expect(context.locals.user?.id).toBe(USER_ID);
    expect(context.locals.user?.workspaceId).toBe(WORKSPACE_ID);
    expect(context.locals.session).toBeNull();
    expect(context.locals.appPassword?.scope).toBe('read');
    expect(response.headers.get('X-RateLimit-Limit')).toBe('60');
  });

  test('a successful request records last use', async () => {
    await runChain(createContext('/api/accounts', { bearer: readToken }));

    const [row] = await db
      .select({ lastUsedAt: mcpAppPasswords.last_used_at })
      .from(mcpAppPasswords)
      .where(eq(mcpAppPasswords.id, readTokenId));
    expect(row?.lastUsedAt).toBeInstanceOf(Date);
  });

  test('a read token cannot POST', async () => {
    const response = await runChain(
      createContext('/api/transactions', { method: 'POST', bearer: readToken })
    );

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe('APP_PASSWORD_SCOPE_INSUFFICIENT');
    expect(routeHandler).not.toHaveBeenCalled();
  });

  test('a read-write token can POST without a CSRF token', async () => {
    const context = createContext('/api/transactions', { method: 'POST', bearer: readWriteToken });

    const response = await runChain(context);

    expect(response.status).toBe(200);
    expect(routeHandler).toHaveBeenCalledTimes(1);
    expect(context.locals.appPassword?.scope).toBe('read-write');
  });

  test('routes outside the allowlist return 403 even for read-write', async () => {
    const results: string[] = [];
    for (const [method, path] of [
      ['GET', '/api/user/app-passwords'],
      ['POST', '/api/user/app-passwords'],
      ['GET', '/api/admin/overview'],
      ['POST', '/api/workspace/invitations'],
      ['PUT', '/api/workspace/settings'],
      ['DELETE', '/api/transactions/bulk'],
    ] as const) {
      const response = await runChain(createContext(path, { method, bearer: readWriteToken }));
      results.push(`${method} ${path} ${response.status} ${(await response.json()).error.code}`);
      expect(response.status).toBe(403);
    }
    expect(results.every((line) => line.endsWith('403 APP_PASSWORD_ROUTE_NOT_ALLOWED'))).toBe(true);
    expect(routeHandler).not.toHaveBeenCalled();
  });

  test('an app password on an auth route is denied, not handed to Better Auth', async () => {
    const response = await runChain(
      createContext('/api/auth/get-session', { bearer: readWriteToken })
    );
    expect(response.status).toBe(403);
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  test('garbage, expired and revoked app passwords return 401', async () => {
    const past = new Date(Date.now() - 60 * 86_400_000);
    const expired = await createToken('read', new McpAppPasswordService(db, () => past));
    const revoked = await createToken('read');
    await service.revoke(USER_ID, revoked.id);

    for (const token of ['aw_pat_not-a-real-token', expired.token, revoked.token, '']) {
      const response = await runChain(createContext('/api/transactions', { bearer: token }));
      expect(response.status).toBe(401);
      expect((await response.json()).success).toBe(false);
    }
    expect(routeHandler).not.toHaveBeenCalled();
  });

  test('an OAuth access token is rejected on REST but left alone on /api/mcp and auth routes', async () => {
    const oauthToken = 'oauth-access-token-value';

    const rest = await runChain(createContext('/api/transactions', { bearer: oauthToken }));
    expect(rest.status).toBe(401);

    await runChain(createContext('/api/mcp', { method: 'POST', bearer: oauthToken }));
    await runChain(createContext('/api/auth/oauth2/userinfo', { bearer: oauthToken }));
    expect(routeHandler).toHaveBeenCalledTimes(2);
  });

  test('an invalid bearer does not fall back to a valid session cookie', async () => {
    mockCookieSession();
    const response = await runChain(
      createContext('/api/transactions', {
        bearer: 'aw_pat_not-a-real-token',
        cookies: { [SESSION_COOKIE]: 'signed-cookie' },
      })
    );

    expect(response.status).toBe(401);
    expect(getSessionMock).not.toHaveBeenCalled();
  });

  test('a valid bearer ignores cookies and needs no CSRF token', async () => {
    mockCookieSession();
    const context = createContext('/api/transactions', {
      method: 'POST',
      bearer: readWriteToken,
      cookies: { [SESSION_COOKIE]: 'signed-cookie', csrf_token: 'cookie-value' },
    });

    const response = await runChain(context);

    expect(response.status).toBe(200);
    expect(getSessionMock).not.toHaveBeenCalled();
    expect(context.locals.session).toBeNull();
  });

  test('a cookie request without a CSRF token still fails', async () => {
    mockCookieSession();
    const response = await runChain(
      createContext('/api/transactions', {
        method: 'POST',
        cookies: { [SESSION_COOKIE]: 'signed-cookie', csrf_token: 'cookie-value' },
      })
    );

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe('CSRF_VALIDATION_FAILED');
    expect(routeHandler).not.toHaveBeenCalled();
  });

  test('an archived workspace returns 403', async () => {
    await db.update(workspaces).set({ status: 'inactive' }).where(eq(workspaces.id, WORKSPACE_ID));

    const response = await runChain(createContext('/api/transactions', { bearer: readToken }));

    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe('WORKSPACE_INACTIVE');
  });

  test('a deactivated user returns 401', async () => {
    await db.update(users).set({ deleted_at: new Date() }).where(eq(users.id, USER_ID));

    const response = await runChain(createContext('/api/transactions', { bearer: readToken }));

    expect(response.status).toBe(401);
  });

  test('each token is limited to 60 REST requests a minute', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 61; i++) {
      statuses.push(
        (await runChain(createContext('/api/categories', { bearer: readToken }))).status
      );
    }
    expect(statuses.slice(0, 60).every((status) => status === 200)).toBe(true);
    expect(statuses[60]).toBe(429);
  });

  describe('GET /api/openapi.json', () => {
    test('requires authentication', async () => {
      const response = await runChain(
        createContext('/api/openapi.json'),
        (ctx) => openApiGet(ctx as never) as Promise<Response>
      );
      expect(response.status).toBe(401);
    });

    test('serves the bundled spec to a read token, with every allowlisted path', async () => {
      const response = await runChain(
        createContext('/api/openapi.json', { bearer: readToken }),
        (ctx) => openApiGet(ctx as never) as Promise<Response>
      );

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      const spec = (await response.json()) as {
        openapi: string;
        paths: Record<string, Record<string, unknown>>;
        components: { securitySchemes: Record<string, unknown> };
      };
      expect(spec.openapi).toStartWith('3.');
      expect(spec.components.securitySchemes.bearerAuth).toBeDefined();
      const undocumented = APP_PASSWORD_REST_ROUTES.flatMap((rule) =>
        rule.methods
          .filter((method) => !spec.paths[rule.path]?.[method.toLowerCase()])
          .map((method) => `${method} ${rule.path}`)
      );
      expect(undocumented).toEqual([]);
    });

    test('serves the spec to a session user', async () => {
      mockCookieSession();
      const response = await runChain(
        createContext('/api/openapi.json', { cookies: { [SESSION_COOKIE]: 'signed-cookie' } }),
        (ctx) => openApiGet(ctx as never) as Promise<Response>
      );
      expect(response.status).toBe(200);
    });
  });
});
