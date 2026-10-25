import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { setTestEnv } from '@/lib/env';

const authHandlerMock = mock(async (request: Request) =>
  Response.json({
    ok: true,
    pathname: new URL(request.url).pathname,
  })
);
(mock as any).module('@/lib/auth/server', () => ({
  auth: {
    handler: authHandlerMock,
  },
  AUTH_PATH_PREFIX: '/api/auth',
  getSessionCookieName: () => 'allowealth.session_token',
  getAuthBaseURL: () =>
    process.env.PUBLIC_URL ??
    `http://${process.env.DEV_HOST ?? 'localhost'}:${process.env.PORT ?? '4321'}`,
  getTrustedOrigins: () => [
    process.env.PUBLIC_URL ??
      `http://${process.env.DEV_HOST ?? 'localhost'}:${process.env.PORT ?? '4321'}`,
  ],
}));

async function importFreshRoute() {
  return import(`../../../pages/api/auth/[...all].ts?test=${Date.now()}-${Math.random()}`);
}

describe('Better Auth catch-all route', () => {
  beforeEach(() => {
    authHandlerMock.mockClear();
    setTestEnv({
      NODE_ENV: 'test',
      BETTER_AUTH_SECRET: 'test-better-auth-secret-1234567890',
      TURNSTILE_SECRET_KEY: 'turnstile-secret',
    });
  });

  test('passes credential sign-in requests directly to Better Auth', async () => {
    const { POST } = await importFreshRoute();
    const response = await POST({
      request: new Request('http://localhost/api/auth/sign-in/email', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'secret',
        }),
      }),
    } as never);

    expect(response.status).toBe(200);
    expect(authHandlerMock).toHaveBeenCalledTimes(1);
    expect((authHandlerMock as any).mock.calls[0]?.[0]).toBeInstanceOf(Request);
  });

  test('passes password reset requests directly to Better Auth', async () => {
    const { POST } = await importFreshRoute();
    const response = await POST({
      request: new Request('http://localhost/api/auth/request-password-reset', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: 'user@example.com',
        }),
      }),
    } as never);

    expect(response.status).toBe(200);
    expect(authHandlerMock).toHaveBeenCalledTimes(1);
  });

  test('passes GET requests directly to Better Auth', async () => {
    const { GET } = await importFreshRoute();
    const response = await GET({
      request: new Request('http://localhost/api/auth/session', {
        method: 'GET',
      }),
    } as never);

    expect(response.status).toBe(200);
    expect(authHandlerMock).toHaveBeenCalledTimes(1);
  });

  test('replaces a client-supplied client IP header with the connection address', async () => {
    const { POST } = await importFreshRoute();
    await POST({
      clientAddress: '203.0.113.9',
      request: new Request('http://localhost/api/auth/sign-in/email', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'cf-connecting-ip': '198.51.100.1',
          'x-allowealth-client-ip': '198.51.100.2',
        },
        body: JSON.stringify({ email: 'user@example.com', password: 'secret' }),
      }),
    } as never);

    const forwarded = (authHandlerMock as any).mock.calls[0]?.[0] as Request;
    expect(forwarded.headers.get('x-allowealth-client-ip')).toBe('203.0.113.9');
    expect(await forwarded.json()).toEqual({ email: 'user@example.com', password: 'secret' });
  });

  test('omits the client IP header when Astro cannot report a client address', async () => {
    const { POST } = await importFreshRoute();
    const context = {
      request: new Request('http://localhost/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'x-allowealth-client-ip': '198.51.100.2' },
      }),
      get clientAddress(): string {
        throw new Error('ClientAddressNotAvailable');
      },
    };

    const response = await POST(context as never);

    expect(response.status).toBe(200);
    const forwarded = (authHandlerMock as any).mock.calls[0]?.[0] as Request;
    expect(forwarded.headers.has('x-allowealth-client-ip')).toBe(false);
  });
});
