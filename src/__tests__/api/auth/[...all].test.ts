import { beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test';

const authHandlerMock = mock(async (request: Request) =>
  Response.json({
    ok: true,
    pathname: new URL(request.url).pathname,
  })
);
const verifyTurnstileTokenMock = mock(async () => ({ success: true }));

(mock as any).module('@/lib/auth/server', () => ({
  auth: {
    handler: authHandlerMock,
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

(mock as any).module('@/lib/turnstile', () => ({
  verifyTurnstileToken: verifyTurnstileTokenMock,
}));

let POST: typeof import('@/pages/api/auth/[...all]').POST;

describe('Better Auth catch-all route', () => {
  beforeAll(async () => {
    ({ POST } = await import('@/pages/api/auth/[...all]'));
  });

  beforeEach(() => {
    authHandlerMock.mockClear();
    verifyTurnstileTokenMock.mockReset();
    verifyTurnstileTokenMock.mockResolvedValue({ success: true });
  });

  test('passes credential sign-in requests through when Turnstile succeeds', async () => {
    const response = await POST({
      request: new Request('http://localhost/api/auth/sign-in/email', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '203.0.113.10',
        },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'secret',
          turnstileToken: 'valid-turnstile-token',
        }),
      }),
    } as never);

    expect(response.status).toBe(200);
    expect(verifyTurnstileTokenMock).toHaveBeenCalledWith('valid-turnstile-token', '203.0.113.10');
    expect(authHandlerMock).toHaveBeenCalledTimes(1);
  });

  test('blocks protected auth routes when Turnstile verification fails', async () => {
    verifyTurnstileTokenMock.mockResolvedValue({
      success: false,
      error: 'Bot protection verification failed.',
    });

    const response = await POST({
      request: new Request('http://localhost/api/auth/sign-up/email', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: 'user@example.com',
          password: 'secret',
          turnstileToken: 'invalid-turnstile-token',
        }),
      }),
    } as never);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe('TURNSTILE_VERIFICATION_FAILED');
    expect(authHandlerMock).not.toHaveBeenCalled();
  });

  test('does not require Turnstile for non-protected Better Auth endpoints', async () => {
    const response = await POST({
      request: new Request('http://localhost/api/auth/sign-in/social', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'google',
        }),
      }),
    } as never);

    expect(response.status).toBe(200);
    expect(verifyTurnstileTokenMock).not.toHaveBeenCalled();
    expect(authHandlerMock).toHaveBeenCalledTimes(1);
  });
});
