import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

function read(path: string): string {
  return readFileSync(path, 'utf-8');
}

function getHeadersBlock(content: string, route: string): string {
  const escapedRoute = route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = content.match(new RegExp(`(^|\\n)${escapedRoute}\\n((?:\\s{2}.+\\n?)*)`, 'm'));
  return match?.[0] ?? '';
}

describe('marketing site route isolation', () => {
  test('defines only the homepage and legal pages', () => {
    const pages = readdirSync('apps/site/src/pages')
      .filter((file) => file.endsWith('.astro'))
      .sort();

    expect(pages).toEqual(['index.astro', 'privacy.astro', 'terms.astro']);
    expect(pages).not.toContain('login.astro');
    expect(pages).not.toContain('dashboard.astro');
  });

  test('static headers protect public routes', () => {
    expect(existsSync('apps/site/public/_headers')).toBe(true);

    const headersFile = read('apps/site/public/_headers');

    for (const route of ['/', '/privacy', '/terms']) {
      const routeBlock = getHeadersBlock(headersFile, route);

      expect(routeBlock).not.toBe('');
      expect(routeBlock).toContain('Content-Security-Policy:');
      expect(routeBlock).toContain("script-src 'self'");
      expect(routeBlock).toContain("frame-ancestors 'none'");
      expect(routeBlock).toContain('X-Frame-Options: DENY');
    }
  });

  test('root app no longer owns marketing route headers', () => {
    expect(existsSync('public/_headers')).toBe(false);
  });
});
