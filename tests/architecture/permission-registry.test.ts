import { describe, expect, test } from 'bun:test';
import {
  ANY_VALID_TOKEN,
  APP_PASSWORD_REST_ROUTES,
  authorizeAppPasswordRequest,
} from '@/lib/app-password-rest-access';
import { APP_PASSWORD_SCOPES } from '@/lib/mcp-app-password';
import {
  SCOPE_PERMISSION_GRANTS,
  expandPermissionGrants,
  isPermission,
} from '@/lib/permissions/registry';
import {
  READ_ONLY_TOOLS,
  TOOL_PERMISSIONS,
  isToolAllowed,
  registerTools,
} from '@mcp-server/tools/index';

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

  test('each scope preset allows exactly what the scope allowed before permissions', () => {
    const mismatches = APP_PASSWORD_SCOPES.flatMap((scope) => {
      const granted = expandPermissionGrants(SCOPE_PERMISSION_GRANTS[scope]);
      return restPairs
        .filter(({ rule, method }) => {
          const concretePath = rule.path.replaceAll('{id}', 'abc123');
          // Enforcement before #477: a read token could only GET (and HEAD).
          const allowedByScope = scope === 'read-write' || method === 'GET';
          const allowedByPreset = authorizeAppPasswordRequest(
            method,
            concretePath,
            granted
          ).allowed;
          return allowedByScope !== allowedByPreset;
        })
        .map(({ rule, method }) => `${scope}: ${method} ${rule.path}`);
    });
    expect(mismatches).toEqual([]);
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

  test('read-only tokens keep exactly the six tools they reach today', () => {
    expect([...READ_ONLY_TOOLS].sort()).toEqual([
      'get_account_summary',
      'get_budget_summary',
      'get_dashboard',
      'list_accounts',
      'list_categories',
      'list_transactions',
    ]);
  });

  test('each scope preset allows exactly the tools the scope allows today', () => {
    const mismatches = APP_PASSWORD_SCOPES.flatMap((scope) => {
      const granted = new Set<string>(expandPermissionGrants(SCOPE_PERMISSION_GRANTS[scope]));
      return toolNames
        .filter(
          (name) =>
            isToolAllowed(name, { scope }) !==
            TOOL_PERMISSIONS[name].every((permission) => granted.has(permission))
        )
        .map((name) => `${scope}: ${name}`);
    });
    expect(mismatches).toEqual([]);
  });
});
