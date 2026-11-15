import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { Glob } from 'bun';
import {
  APP_PASSWORD_REST_ROUTES,
  authorizeAppPasswordRequest,
} from '@/lib/app-password-rest-access';
import { expandPermissionGrants } from '@/lib/permissions/registry';

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

const READ_PERMISSIONS = expandPermissionGrants(['*:read']);
const ALL_PERMISSIONS = expandPermissionGrants(['*']);

describe('authorizeAppPasswordRequest', () => {
  test('a read token may GET an allowlisted route', () => {
    expect(authorizeAppPasswordRequest('GET', '/api/transactions', READ_PERMISSIONS)).toEqual({
      allowed: true,
    });
    expect(
      authorizeAppPasswordRequest('HEAD', '/api/budget/overview', READ_PERMISSIONS).allowed
    ).toBe(true);
  });

  test('a missing permission is denied and named', () => {
    expect(authorizeAppPasswordRequest('POST', '/api/transactions', READ_PERMISSIONS)).toEqual({
      allowed: false,
      code: 'APP_PASSWORD_PERMISSION_MISSING',
      message: 'This app password does not have the transactions:create permission',
      details: { permission: 'transactions:create' },
    });
  });

  test('HEAD needs the permission of GET', () => {
    expect(authorizeAppPasswordRequest('HEAD', '/api/budgets', ['budgets:read']).allowed).toBe(
      true
    );
    expect(authorizeAppPasswordRequest('HEAD', '/api/budgets', ['accounts:read'])).toMatchObject({
      allowed: false,
      code: 'APP_PASSWORD_PERMISSION_MISSING',
      details: { permission: 'budgets:read' },
    });
  });

  test('each method needs its own permission, whatever else the token holds', () => {
    const permissions = ['transactions:create', 'budgets:read'] as const;
    expect(authorizeAppPasswordRequest('POST', '/api/transactions', permissions).allowed).toBe(
      true
    );
    expect(authorizeAppPasswordRequest('GET', '/api/budgets/abc123', permissions).allowed).toBe(
      true
    );
    expect(authorizeAppPasswordRequest('GET', '/api/transactions', permissions)).toMatchObject({
      details: { permission: 'transactions:read' },
    });
    expect(
      authorizeAppPasswordRequest('PUT', '/api/transactions/abc123', permissions)
    ).toMatchObject({ details: { permission: 'transactions:update' } });
  });

  test('the OpenAPI document needs no permission', () => {
    expect(authorizeAppPasswordRequest('GET', '/api/openapi.json', []).allowed).toBe(true);
    expect(authorizeAppPasswordRequest('GET', '/api/accounts', [])).toMatchObject({
      code: 'APP_PASSWORD_PERMISSION_MISSING',
    });
  });

  test('a read-write token may write to allowlisted write routes', () => {
    expect(authorizeAppPasswordRequest('POST', '/api/transactions', ALL_PERMISSIONS).allowed).toBe(
      true
    );
    expect(
      authorizeAppPasswordRequest(
        'POST',
        '/api/recurring/occurrences/occ_1/confirm',
        ALL_PERMISSIONS
      ).allowed
    ).toBe(true);
  });

  test('routes outside the allowlist are denied for every permission set', () => {
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
      expect(authorizeAppPasswordRequest('GET', path, ALL_PERMISSIONS)).toMatchObject({
        allowed: false,
        code: 'APP_PASSWORD_ROUTE_NOT_ALLOWED',
      });
    }
  });

  test('an unlisted method is a route error, not a missing permission', () => {
    expect(authorizeAppPasswordRequest('DELETE', '/api/accounts/abc123', [])).toMatchObject({
      allowed: false,
      code: 'APP_PASSWORD_ROUTE_NOT_ALLOWED',
    });
  });

  test('workspace settings are read-only', () => {
    expect(
      authorizeAppPasswordRequest('GET', '/api/workspace/settings', READ_PERMISSIONS).allowed
    ).toBe(true);
    expect(
      authorizeAppPasswordRequest('PUT', '/api/workspace/settings', ALL_PERMISSIONS)
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
      expect(authorizeAppPasswordRequest(method, path, ALL_PERMISSIONS).allowed).toBe(false);
    }
  });

  test('IDs with dots or encoded separators do not match', () => {
    expect(
      authorizeAppPasswordRequest('GET', '/api/transactions/..%2Fuser', ALL_PERMISSIONS).allowed
    ).toBe(false);
    expect(
      authorizeAppPasswordRequest('GET', '/api/transactions/a.b', ALL_PERMISSIONS).allowed
    ).toBe(false);
  });

  test('a trailing slash matches the same rule', () => {
    expect(authorizeAppPasswordRequest('GET', '/api/transactions/', READ_PERMISSIONS).allowed).toBe(
      true
    );
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
            authorizeAppPasswordRequest(method, route.concretePath, ALL_PERMISSIONS).allowed !==
            listed
          );
        })
        .map((method) => `${method} ${route.concretePath}`);
    });
    expect(fileRoutes.length).toBeGreaterThan(50);
    expect(mismatches).toEqual([]);
  });
});
