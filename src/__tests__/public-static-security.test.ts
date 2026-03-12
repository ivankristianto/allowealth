import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

function read(path: string): string {
  return readFileSync(path, 'utf-8');
}

describe('app-only security architecture', () => {
  test('middleware no longer special-cases marketing routes', () => {
    const authMiddleware = read('src/middleware/auth.ts');
    const csrfMiddleware = read('src/middleware/csrf.ts');
    const routeGuard = read('src/middleware/route-guard.ts');

    expect(authMiddleware).toContain('if (context.isPrerendered) {');
    expect(authMiddleware).not.toContain('PUBLIC_STATIC_PATHS');
    expect(authMiddleware).not.toContain('isAppOnly');
    expect(authMiddleware).toContain('context.locals.user = null;');
    expect(authMiddleware).toContain('context.locals.session = null;');
    expect(csrfMiddleware).toContain('if (context.isPrerendered) {');
    expect(csrfMiddleware).not.toContain('PUBLIC_STATIC_PATHS');
    expect(routeGuard).toContain("if (pathname === '/') {");
    expect(routeGuard).not.toContain('APP_ONLY_PUBLIC_ROUTES');
  });

  test('app config surfaces no longer declare APP_MODE', () => {
    const envTypes = read('src/env.d.ts');
    const envExample = read('.env.example');
    const wranglerExample = read('wrangler.toml.example');

    expect(envTypes).not.toContain('APP_MODE');
    expect(envExample).not.toContain('APP_MODE=');
    expect(wranglerExample).not.toContain('APP_MODE =');
  });
});
