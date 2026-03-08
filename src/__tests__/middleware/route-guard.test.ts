import { afterEach, describe, expect, test } from 'bun:test';
import type { APIContext } from 'astro';
import { setTestEnv } from '@/lib/env';
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
  afterEach(() => {
    setTestEnv(null);
  });

  test('preserves default full-mode behavior for public routes', async () => {
    setTestEnv({ APP_MODE: 'full' });
    const context = createMockContext('/');

    const response = expectResponse(
      await routeGuard(context, async () => new Response(null, { status: 204 }))
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('Location')).toBeNull();
  });

  test('redirects app-only public routes to login for signed-out users', async () => {
    setTestEnv({ APP_MODE: 'app_only' });

    for (const pathname of ['/', '/terms', '/privacy']) {
      const context = createMockContext(pathname);
      const response = expectResponse(
        await routeGuard(context, async () => new Response(null, { status: 204 }))
      );

      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe('/login');
    }
  });

  test('redirects authenticated app-only homepage visits to dashboard', async () => {
    setTestEnv({ APP_MODE: 'app_only' });
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
});
