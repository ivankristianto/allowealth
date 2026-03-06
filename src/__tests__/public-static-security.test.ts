import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';

function read(path: string): string {
  return readFileSync(path, 'utf-8');
}

function getHeadersBlock(content: string, route: string): string {
  const escapedRoute = route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = content.match(new RegExp(`(^|\\n)${escapedRoute}\\n((?:\\s{2}.+\\n?)*)`, 'm'));
  return match?.[0] ?? '';
}

describe('static public security architecture', () => {
  test('landing and legal pages are explicitly prerendered', () => {
    const staticPages = [
      'src/pages/index.astro',
      'src/pages/privacy.astro',
      'src/pages/terms.astro',
    ];

    for (const pagePath of staticPages) {
      expect(read(pagePath)).toContain('export const prerender = true;');
    }
  });

  test('BaseLayout uses an external theme bootstrap script', () => {
    const baseLayout = read('src/layouts/BaseLayout.astro');

    expect(baseLayout).toContain('src="/scripts/theme-init.js"');
    expect(baseLayout).not.toContain('<script is:inline nonce={cspNonce}>');
  });

  test('static headers define CSP for prerendered public routes', () => {
    expect(existsSync('public/_headers')).toBe(true);

    const headersFile = read('public/_headers');
    const staticRoutes = ['/', '/privacy', '/terms'];

    for (const route of staticRoutes) {
      const routeBlock = getHeadersBlock(headersFile, route);

      expect(routeBlock).not.toBe('');
      expect(routeBlock).toContain('Content-Security-Policy:');
      expect(routeBlock).toContain("script-src 'self'");
      expect(routeBlock).toContain("frame-ancestors 'none'");
      expect(routeBlock).toContain('X-Frame-Options: DENY');
    }
  });

  test('authentication middleware skips prerendered routes', () => {
    const authMiddleware = read('src/middleware/auth.ts');

    expect(authMiddleware).toContain('if (context.isPrerendered)');
    expect(authMiddleware).toContain('context.locals.user = null;');
    expect(authMiddleware).toContain('context.locals.session = null;');
  });
});
