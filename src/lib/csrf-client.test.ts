import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { csrfFetch, getCsrfHeaders } from './csrf-client';

describe('csrf-client', () => {
  const originalDocument = globalThis.document;
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        cookie: 'csrf_token=test-token',
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: originalDocument,
    });
    globalThis.fetch = originalFetch;
  });

  test('getCsrfHeaders always includes XMLHttpRequest header', () => {
    expect(getCsrfHeaders()).toEqual({
      'X-CSRF-Token': 'test-token',
      'X-Requested-With': 'XMLHttpRequest',
    });
  });

  test('csrfFetch adds XMLHttpRequest header for GET requests', async () => {
    const fetchMock = mock(() => Promise.resolve(new Response(JSON.stringify({ ok: true }))));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await csrfFetch('/api/example?_render=html');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = (fetchMock as any).mock.calls[0]!;
    const headers = new Headers(init?.headers);
    expect(headers.get('X-Requested-With')).toBe('XMLHttpRequest');
    expect(headers.get('X-CSRF-Token')).toBeNull();
  });

  test('csrfFetch adds csrf and XMLHttpRequest headers for POST requests', async () => {
    const fetchMock = mock(() => Promise.resolve(new Response(JSON.stringify({ ok: true }))));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await csrfFetch('/api/example', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ok: true }),
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = (fetchMock as any).mock.calls[0]!;
    const headers = new Headers(init?.headers);
    expect(headers.get('X-Requested-With')).toBe('XMLHttpRequest');
    expect(headers.get('X-CSRF-Token')).toBe('test-token');
    expect(headers.get('Content-Type')).toBe('application/json');
  });

  test('csrfFetch respects Request method and preserves Request headers', async () => {
    const fetchMock = mock(() => Promise.resolve(new Response(JSON.stringify({ ok: true }))));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await csrfFetch(
      new Request('http://localhost/api/example', {
        method: 'DELETE',
        headers: {
          Authorization: 'Bearer token',
        },
      })
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = (fetchMock as any).mock.calls[0]!;
    const headers = new Headers(init?.headers);
    expect(headers.get('Authorization')).toBe('Bearer token');
    expect(headers.get('X-Requested-With')).toBe('XMLHttpRequest');
    expect(headers.get('X-CSRF-Token')).toBe('test-token');
  });
});
