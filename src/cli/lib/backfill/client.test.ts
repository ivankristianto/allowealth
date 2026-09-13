import { describe, expect, it } from 'bun:test';
import { BackfillClient } from './client';

function stubFetch(handler: (url: string, init?: RequestInit) => Response): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) =>
    handler(String(input), init)) as typeof fetch;
}

const signInOk = () =>
  new Response('{}', {
    status: 200,
    headers: { 'set-cookie': 'allowealth.session_token=abc; Path=/' },
  });

const csrfOk = (value = 't') =>
  new Response('', { status: 200, headers: { 'set-cookie': `csrf_token=${value}; Path=/` } });

const bootstrap = (url: string): Response | null => {
  if (url.endsWith('/api/auth/sign-in/email')) return signInOk();
  if (url.endsWith('/dashboard')) return csrfOk();
  return null;
};

describe('BackfillClient', () => {
  it('sends the CSRF token URL-decoded', async () => {
    let sent: string | undefined;
    const c = new BackfillClient({
      baseUrl: 'http://x',
      email: 'e',
      password: 'p',
      retryDelayMs: 0,
      fetchImpl: stubFetch((url, init) => {
        if (url.endsWith('/api/auth/sign-in/email')) return signInOk();
        if (url.endsWith('/dashboard')) return csrfOk('a%2Bb%3D');
        sent = new Headers(init?.headers).get('X-CSRF-Token') ?? undefined;
        return new Response('{"success":true,"data":{}}', { status: 200 });
      }),
    });
    await c.signIn();
    await c.post('/api/x', {});
    expect(sent).toBe('a+b=');
  });

  it('retries a 500 and then succeeds', async () => {
    let calls = 0;
    const c = new BackfillClient({
      baseUrl: 'http://x',
      email: 'e',
      password: 'p',
      retryDelayMs: 0,
      fetchImpl: stubFetch((url) => {
        const boot = bootstrap(url);
        if (boot) return boot;
        calls++;
        return calls < 2
          ? new Response('err', { status: 500 })
          : new Response('{"success":true,"data":{"ok":1}}', { status: 200 });
      }),
    });
    await c.signIn();
    expect(await c.post('/api/x', {})).toEqual({ ok: 1 });
    expect(calls).toBe(2);
  });

  it('does not retry a 400 and surfaces the body', async () => {
    let calls = 0;
    const c = new BackfillClient({
      baseUrl: 'http://x',
      email: 'e',
      password: 'p',
      retryDelayMs: 0,
      fetchImpl: stubFetch((url) => {
        const boot = bootstrap(url);
        if (boot) return boot;
        calls++;
        return new Response('{"error":{"message":"Validation failed"}}', { status: 400 });
      }),
    });
    await c.signIn();
    expect(c.post('/api/x', {})).rejects.toThrow(/Validation failed/);
    expect(calls).toBe(1);
  });

  it('re-signs in once on a 401 and retries', async () => {
    let signIns = 0;
    let calls = 0;
    const c = new BackfillClient({
      baseUrl: 'http://x',
      email: 'e',
      password: 'p',
      retryDelayMs: 0,
      fetchImpl: stubFetch((url) => {
        if (url.endsWith('/api/auth/sign-in/email')) {
          signIns++;
          return signInOk();
        }
        if (url.endsWith('/dashboard')) return csrfOk();
        calls++;
        return calls < 2
          ? new Response('nope', { status: 401 })
          : new Response('{"success":true,"data":{"ok":1}}', { status: 200 });
      }),
    });
    await c.signIn();
    expect(await c.get('/api/x')).toEqual({ ok: 1 });
    expect(signIns).toBe(2);
  });

  it('pages past the 100-row cap', async () => {
    const page = (n: number) =>
      JSON.stringify({
        success: true,
        data: { transactions: Array.from({ length: n }, (_, i) => ({ i })) },
      });
    let call = 0;
    const c = new BackfillClient({
      baseUrl: 'http://x',
      email: 'e',
      password: 'p',
      retryDelayMs: 0,
      fetchImpl: stubFetch((url) => {
        const boot = bootstrap(url);
        if (boot) return boot;
        call++;
        return new Response(page(call === 1 ? 100 : 20), { status: 200 });
      }),
    });
    await c.signIn();
    const rows = await c.getAll('/api/transactions?type=expense', 'transactions');
    expect(rows).toHaveLength(120);
  });

  it('appends paging params to a path that already has a query string', async () => {
    const seen: string[] = [];
    const c = new BackfillClient({
      baseUrl: 'http://x',
      email: 'e',
      password: 'p',
      retryDelayMs: 0,
      fetchImpl: stubFetch((url) => {
        const boot = bootstrap(url);
        if (boot) return boot;
        seen.push(url);
        return new Response('{"success":true,"data":{"rows":[]}}', { status: 200 });
      }),
    });
    await c.signIn();
    await c.getAll('/api/transactions?type=expense', 'rows');
    expect(seen[0]).toBe('http://x/api/transactions?type=expense&limit=100&offset=0');
  });
});
