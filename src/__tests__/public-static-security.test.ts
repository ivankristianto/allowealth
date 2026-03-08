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
  test('landing and legal pages stay server-rendered for runtime APP_MODE redirects', () => {
    const runtimePages = [
      'src/pages/index.astro',
      'src/pages/privacy.astro',
      'src/pages/terms.astro',
    ];

    for (const pagePath of runtimePages) {
      expect(read(pagePath)).toContain('export const prerender = false;');
    }
  });

  test('BaseLayout uses an external theme bootstrap script', () => {
    const baseLayout = read('src/layouts/BaseLayout.astro');

    expect(baseLayout).toContain('src="/scripts/theme-init.js"');
    expect(baseLayout).not.toContain('<script is:inline nonce={cspNonce}>');
  });

  test('static headers still define CSP for public routes', () => {
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

  test('authentication middleware skips public marketing routes in full mode', () => {
    const authMiddleware = read('src/middleware/auth.ts');
    const csrfMiddleware = read('src/middleware/csrf.ts');

    expect(authMiddleware).toContain(
      'context.isPrerendered || (isPublicStaticPath && !isAppOnly())'
    );
    expect(authMiddleware).toContain('context.locals.user = null;');
    expect(authMiddleware).toContain('context.locals.session = null;');
    expect(authMiddleware).toContain('PUBLIC_STATIC_PATHS');
    expect(csrfMiddleware).toContain('PUBLIC_STATIC_PATHS');
  });
});
