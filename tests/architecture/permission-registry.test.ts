import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ANY_VALID_TOKEN, APP_PASSWORD_REST_ROUTES } from '@/lib/app-password-rest-access';
import { APP_PASSWORD_PRESETS } from '@/lib/app-password-access';
import { APP_PASSWORD_SCOPES, type AppPasswordScope } from '@/lib/mcp-app-password';
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

  test('only the OpenAPI document is open to any valid token', () => {
    const open = restPairs
      .filter(({ permission }) => permission === ANY_VALID_TOKEN)
      .map(({ rule, method }) => `${method} ${rule.path}`);
    expect(open).toEqual(['GET /api/openapi.json']);
  });
});

describe('OpenAPI app password permissions', () => {
  test('the documented permission enum matches the registry', () => {
    const schemas = Bun.YAML.parse(
      readFileSync(join(process.cwd(), 'openapi/schemas/AppPassword.yml'), 'utf8')
    ) as { AppPasswordPermission: { enum: string[] } };
    expect(schemas.AppPasswordPermission.enum).toEqual([...PERMISSION_IDS]);
  });
});

describe('MCP tool permissions', () => {
  const toolNames = registerTools().map((tool) => tool.name);

  test('every registered tool names at least one known permission', () => {
    expect(toolNames).toHaveLength(8);
    const unmapped = toolNames.filter((name) => {
      const permissions: readonly unknown[] = TOOL_PERMISSIONS[name] ?? [];
      return permissions.length === 0 || !permissions.every(isPermission);
    });
    expect(unmapped).toEqual([]);
    expect(Object.keys(TOOL_PERMISSIONS).sort()).toEqual([...toolNames].sort());
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
    });
  });
});
