import { afterEach, describe, expect, test } from 'bun:test';
import { getIP } from 'better-auth/api';
import { setTestEnv } from '@/lib/env';
import {
  INTERNAL_IP_HEADER,
  getClientIpHeader,
  resolveClientIp,
  withClientIpHeader,
} from './client-ip';

afterEach(() => {
  setTestEnv(null);
});

/** Resolve the IP the way Better Auth's rate limiter does with our config. */
function resolveIp(request: Request): string | null {
  return getIP(request, { advanced: { ipAddress: { ipAddressHeaders: [INTERNAL_IP_HEADER] } } });
}

function signInRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ email: 'demo@example.com', password: 'secret' }),
  });
}

describe('getClientIpHeader', () => {
  test('is undefined when CLIENT_IP_HEADER is unset or blank', () => {
    setTestEnv({ CLIENT_IP_HEADER: undefined });
    expect(getClientIpHeader()).toBeUndefined();
    setTestEnv({ CLIENT_IP_HEADER: '  ' });
    expect(getClientIpHeader()).toBeUndefined();
  });

  test('trims and lowercases the header name', () => {
    setTestEnv({ CLIENT_IP_HEADER: ' CF-Connecting-IP ' });
    expect(getClientIpHeader()).toBe('cf-connecting-ip');
  });
});

describe('resolveClientIp', () => {
  test('uses the connection address when no header is configured', () => {
    const headers = new Headers({ 'cf-connecting-ip': '198.51.100.7' });
    expect(resolveClientIp(headers, '203.0.113.9', undefined)).toBe('203.0.113.9');
  });

  test('uses the configured header when present', () => {
    const headers = new Headers({ 'cf-connecting-ip': ' 198.51.100.7 ' });
    expect(resolveClientIp(headers, '172.18.0.1', 'cf-connecting-ip')).toBe('198.51.100.7');
  });

  test('falls back to the connection address when the configured header is missing', () => {
    expect(resolveClientIp(new Headers(), '203.0.113.9', 'cf-connecting-ip')).toBe('203.0.113.9');
  });

  test('falls back to the connection address when the configured header holds a list', () => {
    const headers = new Headers({ 'x-forwarded-for': '1.2.3.4, 198.51.100.7' });
    expect(resolveClientIp(headers, '172.18.0.1', 'x-forwarded-for')).toBe('172.18.0.1');
  });
});

describe('withClientIpHeader', () => {
  test('drops a client-supplied internal header and sets the connection address', () => {
    const request = withClientIpHeader(
      signInRequest({ [INTERNAL_IP_HEADER]: '198.51.100.1' }),
      '203.0.113.9',
      undefined
    );
    expect(request.headers.get(INTERNAL_IP_HEADER)).toBe('203.0.113.9');
  });

  test('leaves the header unset when no client IP can be resolved', () => {
    const request = withClientIpHeader(
      signInRequest({ [INTERNAL_IP_HEADER]: '198.51.100.1' }),
      undefined,
      undefined
    );
    expect(request.headers.has(INTERNAL_IP_HEADER)).toBe(false);
  });

  test('drops a client-supplied internal header from a request without a body', () => {
    const request = withClientIpHeader(
      new Request('http://localhost/api/auth/get-session', {
        headers: { [INTERNAL_IP_HEADER]: '198.51.100.1' },
      }),
      undefined,
      undefined
    );
    expect(request.headers.has(INTERNAL_IP_HEADER)).toBe(false);
  });

  test('keeps the method, URL and body readable', async () => {
    const request = withClientIpHeader(signInRequest(), '203.0.113.9', undefined);
    expect(request.method).toBe('POST');
    expect(request.url).toBe('http://localhost/api/auth/sign-in/email');
    expect(await request.json()).toEqual({ email: 'demo@example.com', password: 'secret' });
  });
});

describe('Better Auth resolves the client IP from withClientIpHeader', () => {
  test('spoofed cf-connecting-ip and x-forwarded-for are ignored without CLIENT_IP_HEADER', () => {
    const spoofed = signInRequest({
      'cf-connecting-ip': '198.51.100.1',
      'x-forwarded-for': '198.51.100.2',
    });
    expect(resolveIp(withClientIpHeader(spoofed, '203.0.113.9', undefined))).toBe('203.0.113.9');
  });

  test('uses cf-connecting-ip when CLIENT_IP_HEADER names it', () => {
    const viaCloudflare = signInRequest({ 'cf-connecting-ip': '198.51.100.7' });
    expect(resolveIp(withClientIpHeader(viaCloudflare, '172.18.0.1', 'cf-connecting-ip'))).toBe(
      '198.51.100.7'
    );
  });

  test('ignores other forwarding headers when CLIENT_IP_HEADER names one', () => {
    const viaCloudflare = signInRequest({
      'cf-connecting-ip': '198.51.100.7',
      'x-forwarded-for': '198.51.100.2',
      [INTERNAL_IP_HEADER]: '198.51.100.3',
    });
    expect(resolveIp(withClientIpHeader(viaCloudflare, '172.18.0.1', 'cf-connecting-ip'))).toBe(
      '198.51.100.7'
    );
  });
});
