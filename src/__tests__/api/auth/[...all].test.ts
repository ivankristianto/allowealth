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
});
