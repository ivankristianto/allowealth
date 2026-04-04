import { describe, expect, test } from 'bun:test';
import type { APIContext } from 'astro';
import { routeGuard } from '@/middleware/route-guard';

type MockUser = NonNullable<App.Locals['user']>;

function createMockContext(pathname: string, user: MockUser | null = null): APIContext {
  return {
    locals: {
      user,
      session: user ? ({} as App.Locals['session']) : null,
    },
    request: new Request(`http://localhost${pathname}`),
    url: new URL(`http://localhost${pathname}`),
    params: {},
    cookies: {
      get: () => undefined,
      set: () => {},
      delete: () => {},
      has: () => false,
      headers: () => new Headers(),
    },
    redirect: (path: string, status = 302) =>
      new Response(null, {
        status,
        headers: {
          Location: path,
        },
      }),
    rewrite: () => new Request(`http://localhost${pathname}`),
    clientAddress: '127.0.0.1',
    site: new URL('http://localhost'),
    generator: 'Astro',
    props: {},
    routePattern: pathname,
    isPrerendered: false,
    currentLocale: undefined,
    preferredLocale: undefined,
    preferredLocaleList: undefined,
    getActionResult: () => undefined,
    callAction: async () => ({ data: undefined, error: undefined }),
    originPathname: pathname,
  } as unknown as APIContext;
}

function expectResponse(response: Response | void): Response {
  expect(response).toBeInstanceOf(Response);

  if (!(response instanceof Response)) {
    throw new Error('routeGuard must return a Response in this test');
  }

  return response;
}

describe('routeGuard app-only public routes', () => {
  test('redirects signed-out homepage visits to login', async () => {
    const context = createMockContext('/');

    const response = expectResponse(
      await routeGuard(context, async () => new Response(null, { status: 204 }))
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/login');
  });

  test('redirects authenticated homepage visits to dashboard', async () => {
    const context = createMockContext('/', {
      id: 'user-1',
      email: 'user@example.com',
      name: 'Example User',
      role: 'member',
      workspaceId: 'workspace-1',
      avatarUrl: null,
      deletedAt: null,
    } as MockUser);

    const response = expectResponse(
      await routeGuard(context, async () => new Response(null, { status: 204 }))
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/dashboard');
  });

  test('redirects authenticated super admin homepage visits to admin', async () => {
    const context = createMockContext('/', {
      id: 'user-2',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'super_admin',
      workspaceId: null,
      avatarUrl: null,
      deletedAt: null,
    } as MockUser);

    const response = expectResponse(
      await routeGuard(context, async () => new Response(null, { status: 204 }))
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/admin');
  });
});

const memberUser = {
  id: 'user-1',
  email: 'user@example.com',
  name: 'Member User',
  role: 'member',
  workspaceId: 'workspace-1',
  avatarUrl: null,
  deletedAt: null,
} as MockUser;

const adminUser = {
  id: 'user-3',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'admin',
  workspaceId: 'workspace-1',
  avatarUrl: null,
  deletedAt: null,
} as MockUser;

const superAdminUser = {
  id: 'user-4',
  email: 'super-admin@example.com',
  name: 'Super Admin User',
  role: 'super_admin',
  workspaceId: null,
  avatarUrl: null,
  deletedAt: null,
} as MockUser;

describe('routeGuard upgrade and admin restrictions', () => {
  const passthrough = async () => new Response(null, { status: 204 });

  test('blocks member from /api/admin/upgrade/status', async () => {
    const context = createMockContext('/api/admin/upgrade/status', memberUser);
    const response = expectResponse(await routeGuard(context, passthrough));
    expect(response.status).toBe(403);
  });

  test('blocks member from /api/admin/upgrade/run', async () => {
    const context = createMockContext('/api/admin/upgrade/run', memberUser);
    const response = expectResponse(await routeGuard(context, passthrough));
    expect(response.status).toBe(403);
  });

  test('blocks admin from /api/admin/upgrade/status', async () => {
    const context = createMockContext('/api/admin/upgrade/status', adminUser);
    const response = expectResponse(await routeGuard(context, passthrough));
    expect(response.status).toBe(403);
  });

  test('allows super admin to access /api/admin/upgrade/status', async () => {
    const context = createMockContext('/api/admin/upgrade/status', superAdminUser);
    const response = expectResponse(await routeGuard(context, passthrough));
    expect(response.status).toBe(204);
  });

  test('still blocks member from other /api/admin routes', async () => {
    const context = createMockContext('/api/admin/users', memberUser);
    const response = expectResponse(await routeGuard(context, passthrough));
    expect(response.status).toBe(403);
  });

  test('still blocks admin from /admin page routes', async () => {
    const context = createMockContext('/admin', adminUser);
    const response = expectResponse(await routeGuard(context, passthrough));
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/dashboard');
  });

  test('blocks member from /upgrade page', async () => {
    const context = createMockContext('/upgrade', memberUser);
    const response = expectResponse(await routeGuard(context, passthrough));
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/dashboard');
  });

  test('redirects signed-out /upgrade visits to login', async () => {
    const context = createMockContext('/upgrade');
    const response = expectResponse(await routeGuard(context, passthrough));
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toContain('/login?redirect=');
  });
});
