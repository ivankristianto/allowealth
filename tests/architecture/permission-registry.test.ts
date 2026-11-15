import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ANY_VALID_TOKEN, APP_PASSWORD_REST_ROUTES } from '@/lib/app-password-rest-access';
import { APP_PASSWORD_PRESETS } from '@/lib/app-password-access';
import { APP_PASSWORD_SCOPES, type AppPasswordScope } from '@/lib/mcp-app-password';
import { bundleOpenApiDocument } from '@/lib/openapi/bundle';
import { PERMISSION_IDS, expandPermissionGrants, isPermission } from '@/lib/permissions/registry';
import { TOOL_PERMISSIONS, registerTools, toolAnnotations } from '@mcp-server/tools/index';

const restPairs = APP_PASSWORD_REST_ROUTES.flatMap((rule) =>
  rule.methods.map((method) => ({ rule, method, permission: rule.permissions[method] }))
);

describe('REST allowlist permissions', () => {
  test('every allowlisted route and method names a permission or the any-valid-token marker', () => {
    const unmapped = restPairs
      .filter(({ permission }) => permission !== ANY_VALID_TOKEN && !isPermission(permission))
      .map(({ rule, method }) => `${method} ${rule.path}`);
    expect(restPairs.length).toBeGreaterThan(30);
    expect(unmapped).toEqual([]);
  });

  test('only the OpenAPI document and the self description are open to any valid token', () => {
    const open = restPairs
      .filter(({ permission }) => permission === ANY_VALID_TOKEN)
      .map(({ rule, method }) => `${method} ${rule.path}`);
    expect(open).toEqual(['GET /api/openapi.json', 'GET /api/app-password/self']);
  });
});

describe('documented app password permissions', () => {
  const read = (path: string) => readFileSync(join(process.cwd(), path), 'utf8');

  test('the OpenAPI permission enum matches the registry', () => {
    const schemas = Bun.YAML.parse(read('openapi/schemas/AppPassword.yml')) as {
      AppPasswordPermission: { enum: string[] };
    };
    expect(schemas.AppPasswordPermission.enum).toEqual([...PERMISSION_IDS]);
  });

  test('x-required-permission on each operation matches the REST allowlist, in both directions', () => {
    const document = bundleOpenApiDocument(read) as {
      paths: Record<string, Record<string, { 'x-required-permission'?: string }>>;
    };
    const documented = Object.entries(document.paths).flatMap(([path, item]) =>
      Object.entries(item)
        .filter(([, operation]) => operation['x-required-permission'] !== undefined)
        .map(([method, operation]) => {
          return `${method.toUpperCase()} ${path} ${operation['x-required-permission']}`;
        })
    );
    const allowlisted = restPairs.map(({ rule, method, permission }) => {
      return `${method} ${rule.path} ${permission === ANY_VALID_TOKEN ? 'any' : permission}`;
    });

    expect(documented.sort()).toEqual(allowlisted.sort());
  });

  test('the REST agent guide lists every permission', () => {
    const guide = read('apps/docs/src/content/docs/reference/ai-agent-rest.md');
    const missing = PERMISSION_IDS.filter((permission) => !guide.includes(`| \`${permission}\``));
    expect(missing).toEqual([]);
  });
});

describe('MCP tool permissions', () => {
  const toolNames = registerTools().map((tool) => tool.name);

  test('every registered tool names known permissions or the any-valid-token marker', () => {
    expect(toolNames).toHaveLength(9);
    const unmapped = toolNames.filter((name) => {
      const required = TOOL_PERMISSIONS[name];
      if (required === ANY_VALID_TOKEN) return false;
      const permissions: readonly unknown[] = required ?? [];
      return permissions.length === 0 || !permissions.every(isPermission);
    });
    expect(unmapped).toEqual([]);
    expect(Object.keys(TOOL_PERMISSIONS).sort()).toEqual([...toolNames].sort());
  });

  test('only get_token_info is open to any valid token', () => {
    const open = Object.entries(TOOL_PERMISSIONS)
      .filter(([, required]) => required === ANY_VALID_TOKEN)
      .map(([name]) => name);
    expect(open).toEqual(['get_token_info']);
  });

  test('each scope preset sees exactly the tools it saw before permissions', () => {
    const toolsFor = (scope: AppPasswordScope) =>
      registerTools({ permissions: expandPermissionGrants(APP_PASSWORD_PRESETS[scope].grants) })
        .map((tool) => tool.name)
        .sort();
    const readTools = [
      'get_account_summary',
      'get_budget_summary',
      'get_dashboard',
      'get_token_info',
      'list_accounts',
      'list_categories',
      'list_transactions',
    ];

    expect(APP_PASSWORD_SCOPES).toEqual(['read', 'read-write']);
    expect(toolsFor('read')).toEqual(readTools);
    expect(toolsFor('read-write')).toEqual([...readTools, 'add_expense', 'add_income'].sort());
  });
});

describe('MCP tool annotations', () => {
  test('a tool whose permissions are all reads is read-only', () => {
    expect(toolAnnotations(['accounts:read', 'budgets:read'])).toEqual({ readOnlyHint: true });
  });

  test('a tool that only adds data is a non-destructive write', () => {
    expect(toolAnnotations(['transactions:create'])).toEqual({
      readOnlyHint: false,
      destructiveHint: false,
    });
    expect(toolAnnotations(['recurring:read', 'recurring:confirm'])).toEqual({
      readOnlyHint: false,
      destructiveHint: false,
    });
  });

  test('a tool that can change or remove data is destructive', () => {
    for (const permission of [
      'transactions:update',
      'transactions:delete',
      'recurring:write',
    ] as const) {
      expect(toolAnnotations(['transactions:create', permission])).toEqual({
        readOnlyHint: false,
        destructiveHint: true,
      });
    }
  });

  test('each registered tool advertises the hints its permissions imply', () => {
    const write = { readOnlyHint: false, destructiveHint: false };
    const annotations = Object.fromEntries(
      registerTools().map((tool) => [tool.name, tool.annotations])
    );

    expect(annotations).toEqual({
      list_categories: { readOnlyHint: true },
      list_accounts: { readOnlyHint: true },
      list_transactions: { readOnlyHint: true },
      add_expense: write,
      add_income: write,
      get_budget_summary: { readOnlyHint: true },
      get_dashboard: { readOnlyHint: true },
      get_account_summary: { readOnlyHint: true },
      get_token_info: { readOnlyHint: true },
    });
  });
});
