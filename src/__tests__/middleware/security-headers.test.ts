import { describe, test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import type { APIContext } from 'astro';
import { securityHeaders } from '@/middleware/security-headers';

function createMockContext(): APIContext {
  return {
    locals: {},
    request: new Request('http://localhost/test'),
    url: new URL('http://localhost/test'),
    params: {},
    cookies: {
      get: () => undefined,
      set: () => {},
      delete: () => {},
      has: () => false,
      headers: () => new Headers(),
    },
    redirect: () => new Response(null, { status: 302 }),
    rewrite: () => new Request('http://localhost/test'),
    clientAddress: '127.0.0.1',
    site: new URL('http://localhost'),
    generator: 'Astro',
    props: {},
    routePattern: '/',
    isPrerendered: false,
    currentLocale: undefined,
    preferredLocale: undefined,
    preferredLocaleList: undefined,
    getActionResult: () => undefined,
    callAction: async () => ({ data: undefined, error: undefined }),
    originPathname: '/',
  } as unknown as APIContext;
}

describe('CSP directives for Turnstile', () => {
  test('production CSP includes challenges.cloudflare.com in script-src', () => {
    const content = readFileSync('src/middleware/security-headers.ts', 'utf-8');
    expect(content).toContain('challenges.cloudflare.com');
  });

  test('CSP includes frame-src for Turnstile iframes', () => {
    const content = readFileSync('src/middleware/security-headers.ts', 'utf-8');
    expect(content).toContain('frame-src');
  });

  test('CSP includes connect-src for Turnstile API', () => {
    const content = readFileSync('src/middleware/security-headers.ts', 'utf-8');
    expect(content).toContain("'connect-src'");
    expect(content).toContain('challenges.cloudflare.com');
  });

  test('production CSP does not allow unsafe-eval', () => {
    const content = readFileSync('src/middleware/security-headers.ts', 'utf-8');
    const prodBlock = content.match(/const CSP_DIRECTIVES_PROD[\s\S]*?as const;/);
    expect(prodBlock).not.toBeNull();
    if (prodBlock) {
      expect(prodBlock[0]).not.toContain('unsafe-eval');
    }
  });

  test('HTML responses do not buffer through response.text()', async () => {
    const context = createMockContext();
    const originalResponse = new Response(
      '<!doctype html><html><head></head><body><script nonce="existing">console.log("ok")</script></body></html>',
      {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
        },
      }
    );
    let textCalled = false;
    (originalResponse as Response & { text: () => Promise<string> }).text = async () => {
      textCalled = true;
      throw new Error('response.text() should not be called for HTML responses');
    };

    const response = await securityHeaders(context as any, async () => originalResponse);
    expect(response).toBeInstanceOf(Response);
    if (!(response instanceof Response)) {
      throw new Error('securityHeaders middleware must return a Response');
    }

    expect(response.headers.get('Content-Security-Policy')).toContain(
      `'nonce-${context.locals.cspNonce}'`
    );
    expect(textCalled).toBe(false);
    expect(await response.text()).toContain('<script nonce="existing">');
  });

  test('explicit inline scripts read the nonce from Astro locals', () => {
    const registrationForm = readFileSync(
      'src/components/molecules/RegistrationForm.astro',
      'utf-8'
    );
    const turnstile = readFileSync('src/components/atoms/Turnstile.astro', 'utf-8');

    expect(registrationForm).toContain("const cspNonce = Astro.locals.cspNonce || ''");
    expect(registrationForm).toContain('nonce={cspNonce}');
    expect(turnstile).toContain("const cspNonce = Astro.locals.cspNonce || ''");
    expect(turnstile).toContain('nonce={cspNonce}');
  });
});
