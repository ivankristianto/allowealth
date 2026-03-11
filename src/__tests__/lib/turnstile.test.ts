import { describe, test, expect, mock, beforeEach, afterEach } from 'bun:test';
import { verifyTurnstileToken } from '@/lib/turnstile';
import { setTestEnv } from '@/lib/env';

describe('verifyTurnstileToken', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    setTestEnv(null);
  });

  test('returns success when siteverify responds with success: true', async () => {
    setTestEnv({ TURNSTILE_SECRET_KEY: 'test-secret-key' });
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }))
    ) as unknown as typeof fetch;

    const result = await verifyTurnstileToken('valid-token', '127.0.0.1');

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  test('returns error when siteverify responds with success: false', async () => {
    setTestEnv({ TURNSTILE_SECRET_KEY: 'test-secret-key' });
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }),
          { status: 200 }
        )
      )
    ) as unknown as typeof fetch;

    const result = await verifyTurnstileToken('bad-token', '127.0.0.1');

    expect(result.success).toBe(false);
    expect(result.error).toContain('verification failed');
  });

  test('returns error when token is empty and secret key is configured', async () => {
    setTestEnv({ TURNSTILE_SECRET_KEY: 'test-secret-key' });
    const fetchMock = mock(() => Promise.resolve(new Response())) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    const result = await verifyTurnstileToken('', '127.0.0.1');

    expect(result.success).toBe(false);
    expect(result.error).toContain('missing');
    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

  test('skips verification when secret key is not configured', async () => {
    setTestEnv({ NODE_ENV: 'test', TURNSTILE_SECRET_KEY: undefined });
    const fetchMock = mock(() => Promise.resolve(new Response())) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    const result = await verifyTurnstileToken('any-token', '127.0.0.1');

    expect(result.success).toBe(true);
    // fetch should NOT have been called — verification was skipped
    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

  test('fails closed when secret key is missing outside dev and test', async () => {
    setTestEnv({ NODE_ENV: 'production', TURNSTILE_SECRET_KEY: undefined });
    const fetchMock = mock(() => Promise.resolve(new Response())) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    const result = await verifyTurnstileToken('any-token', '127.0.0.1');

    expect(result.success).toBe(false);
    expect(result.error).toContain('not configured');
    expect(fetchMock).toHaveBeenCalledTimes(0);
  });

  test('returns error when fetch to siteverify fails (fail-closed)', async () => {
    setTestEnv({ TURNSTILE_SECRET_KEY: 'test-secret-key' });
    globalThis.fetch = mock(() =>
      Promise.reject(new Error('Network error'))
    ) as unknown as typeof fetch;

    const result = await verifyTurnstileToken('valid-token', '127.0.0.1');

    expect(result.success).toBe(false);
    expect(result.error).toContain('verification service unavailable');
  });

  test('returns error when siteverify returns non-OK status', async () => {
    setTestEnv({ TURNSTILE_SECRET_KEY: 'test-secret-key' });
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response('Server Error', { status: 500 }))
    ) as unknown as typeof fetch;

    const result = await verifyTurnstileToken('valid-token', '127.0.0.1');

    expect(result.success).toBe(false);
    expect(result.error).toContain('verification service unavailable');
  });

  test('sends correct payload to siteverify endpoint', async () => {
    setTestEnv({ TURNSTILE_SECRET_KEY: 'my-secret' });
    const fetchMock = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }))
    ) as unknown as typeof fetch;
    globalThis.fetch = fetchMock;

    await verifyTurnstileToken('my-token', '192.168.1.1');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = (fetchMock as unknown as { mock: { calls: [Parameters<typeof fetch>] } })
      .mock.calls[0];
    expect(url).toBe('https://challenges.cloudflare.com/turnstile/v0/siteverify');
    expect(options).toBeDefined();
    expect(options!.method).toBe('POST');
    const headers = options!.headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/x-www-form-urlencoded');

    const body = options!.body as URLSearchParams;
    expect(body.get('secret')).toBe('my-secret');
    expect(body.get('response')).toBe('my-token');
    expect(body.get('remoteip')).toBe('192.168.1.1');
  });
});
