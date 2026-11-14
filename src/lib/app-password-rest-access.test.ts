import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { Glob } from 'bun';
import {
  APP_PASSWORD_REST_ROUTES,
  authorizeAppPasswordRequest,
} from '@/lib/app-password-rest-access';

const API_DIR = join(process.cwd(), 'src/pages/api');
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

interface FileRoute {
  template: string;
  concretePath: string;
  methods: string[];
}

/** Every Astro API route on disk, as an OpenAPI-style template plus a sample concrete path. */
function listFileRoutes(): FileRoute[] {
  const routes: FileRoute[] = [];
  for (const file of new Glob('**/*.ts').scanSync(API_DIR)) {
    if (file.endsWith('.test.ts')) continue;
    const source = readFileSync(join(API_DIR, file), 'utf8');
    const exported = [...source.matchAll(/export const (GET|POST|PUT|PATCH|DELETE|ALL)\b/g)].map(
      (match) => match[1]
    );
    const methods = exported.includes('ALL') ? [...HTTP_METHODS] : exported;
    const routePath = `/api/${relative('.', file)
      .replace(/\.ts$/, '')
      .replace(/(^|\/)index$/, '')}`.replace(/\/$/, '');
    routes.push({
      template: routePath.replace(/\[\.\.\.[^\]]+\]/g, '{rest}').replace(/\[[^\]]+\]/g, '{id}'),
      concretePath: routePath
        .replace(/\[\.\.\.[^\]]+\]/g, 'sign-in/email')
        .replace(/\[[^\]]+\]/g, 'abc123XYZ_-'),
      methods,
    });
  }
  return routes;
}

describe('authorizeAppPasswordRequest', () => {
  test('a read token may GET an allowlisted route', () => {
    expect(authorizeAppPasswordRequest('GET', '/api/transactions', 'read')).toEqual({
      allowed: true,
    });
    expect(authorizeAppPasswordRequest('HEAD', '/api/budget/overview', 'read').allowed).toBe(true);
  });

  test('a read token may not write, even where read-write could', () => {
    const decision = authorizeAppPasswordRequest('POST', '/api/transactions', 'read');
    expect(decision).toMatchObject({ allowed: false, code: 'APP_PASSWORD_SCOPE_INSUFFICIENT' });
  });

  test('a read-write token may write to allowlisted write routes', () => {
    expect(authorizeAppPasswordRequest('POST', '/api/transactions', 'read-write').allowed).toBe(
      true
    );
    expect(
      authorizeAppPasswordRequest('POST', '/api/recurring/occurrences/occ_1/confirm', 'read-write')
        .allowed
    ).toBe(true);
  });

  test('routes outside the allowlist are denied for every scope', () => {
    for (const path of [
      '/api/user/app-passwords',
      '/api/user/password',
      '/api/admin/overview',
      '/api/auth/sign-in/email',
      '/api/security/activity',
      '/api/installer/setup',
      '/api/onboarding/budgets',
      '/api/workspace/members',
      '/api/workspace/invitations',
      '/api/mcp',
    ]) {
      expect(authorizeAppPasswordRequest('GET', path, 'read-write')).toMatchObject({
        allowed: false,
        code: 'APP_PASSWORD_ROUTE_NOT_ALLOWED',
      });
    }
  });

  test('workspace settings are read-only', () => {
    expect(authorizeAppPasswordRequest('GET', '/api/workspace/settings', 'read').allowed).toBe(
      true
    );
    expect(
      authorizeAppPasswordRequest('PUT', '/api/workspace/settings', 'read-write')
    ).toMatchObject({ allowed: false, code: 'APP_PASSWORD_ROUTE_NOT_ALLOWED' });
  });

  test('an {id} rule does not open a static sibling route', () => {
    for (const [method, path] of [
      ['DELETE', '/api/transactions/bulk'],
      ['PUT', '/api/transactions/import'],
      ['GET', '/api/accounts/transfer'],
      ['GET', '/api/budgets/initialize'],
      ['PUT', '/api/recurring/calendar'],
    ] as const) {
      expect(authorizeAppPasswordRequest(method, path, 'read-write').allowed).toBe(false);
    }
  });

  test('IDs with dots or encoded separators do not match', () => {
    expect(
      authorizeAppPasswordRequest('GET', '/api/transactions/..%2Fuser', 'read-write').allowed
    ).toBe(false);
    expect(authorizeAppPasswordRequest('GET', '/api/transactions/a.b', 'read-write').allowed).toBe(
      false
    );
  });

  test('a trailing slash matches the same rule', () => {
    expect(authorizeAppPasswordRequest('GET', '/api/transactions/', 'read').allowed).toBe(true);
  });
});

describe('allowlist against the routes on disk', () => {
  const fileRoutes = listFileRoutes();

  test('every allowlist entry is a real route exporting those methods', () => {
    const missing = APP_PASSWORD_REST_ROUTES.flatMap((rule) => {
      const fileRoute = fileRoutes.find((route) => route.template === rule.path);
      return rule.methods
        .filter((method) => !fileRoute?.methods.includes(method))
        .map((method) => `${method} ${rule.path}`);
    });
    expect(missing).toEqual([]);
  });

  test('a read-write token reaches exactly the allowlisted route and method pairs', () => {
    const mismatches = fileRoutes.flatMap((route) => {
      const rule = APP_PASSWORD_REST_ROUTES.find((candidate) => candidate.path === route.template);
      return route.methods
        .filter((method) => {
          const listed =
            (rule?.methods as readonly string[] | undefined)?.includes(method) ?? false;
          return (
            authorizeAppPasswordRequest(method, route.concretePath, 'read-write').allowed !== listed
          );
        })
        .map((method) => `${method} ${route.concretePath}`);
    });
    expect(fileRoutes.length).toBeGreaterThan(50);
    expect(mismatches).toEqual([]);
  });
});
