import { describe, expect, test } from 'bun:test';
import { PERMISSION_IDS } from '@/lib/permissions/registry';
import {
  PERMISSION_OAUTH_SCOPES,
  describeOAuthPermissions,
  getConsentScopeChoices,
  oauthPermissionsFromScopes,
  parseStoredScopes,
  resolveConsentScopes,
} from './mcp-oauth-scopes';

describe('PERMISSION_OAUTH_SCOPES', () => {
  test('names one allowealth: scope per registry permission, in registry order', () => {
    expect(PERMISSION_OAUTH_SCOPES).toEqual(PERMISSION_IDS.map((id) => `allowealth:${id}`));
  });
});

describe('parseStoredScopes', () => {
  test('reads the JSON text the SQLite adapter stores', () => {
    expect(parseStoredScopes('["openid","mcp"]')).toEqual(['openid', 'mcp']);
  });

  test('returns no scopes for malformed or non-array values', () => {
    expect(parseStoredScopes('openid mcp')).toEqual([]);
    expect(parseStoredScopes('{"mcp":true}')).toEqual([]);
    expect(parseStoredScopes(null)).toEqual([]);
    expect(parseStoredScopes('[1,"mcp"]')).toEqual(['mcp']);
  });
});

describe('oauthPermissionsFromScopes', () => {
  test('gives no permissions when no allowealth: scope was granted', () => {
    expect(oauthPermissionsFromScopes(['openid', 'mcp'])).toEqual([]);
  });

  test('gives every permission only when every allowealth: scope was granted', () => {
    expect(oauthPermissionsFromScopes(['openid', 'mcp', ...PERMISSION_OAUTH_SCOPES])).toEqual(
      PERMISSION_IDS
    );
  });

  test('gives exactly the granted permissions, in registry order', () => {
    expect(
      oauthPermissionsFromScopes([
        'openid',
        'mcp',
        'allowealth:budgets:read',
        'allowealth:transactions:create',
      ])
    ).toEqual(['transactions:create', 'budgets:read']);
  });

  test('gives nothing when the only allowealth: scope is not in the registry', () => {
    expect(oauthPermissionsFromScopes(['mcp', 'allowealth:transactions:launch'])).toEqual([]);
  });

  test('does not read a bare permission id as a granted scope', () => {
    expect(oauthPermissionsFromScopes(['mcp', 'allowealth:accounts:read', 'budgets:read'])).toEqual(
      ['accounts:read']
    );
  });
});

describe('describeOAuthPermissions', () => {
  test('lists the labels of the granted permissions', () => {
    expect(
      describeOAuthPermissions(['mcp', 'allowealth:accounts:read', 'allowealth:transactions:read'])
    ).toEqual(['Read transactions', 'Read accounts']);
  });

  test('says No permissions for a token without current permission scopes', () => {
    expect(describeOAuthPermissions(['openid', 'mcp'])).toEqual(['No permissions']);
    expect(describeOAuthPermissions(['mcp', 'allowealth:transactions:launch'])).toEqual([
      'No permissions',
    ]);
  });
});

describe('getConsentScopeChoices', () => {
  test('lists non-permission scopes as required and permissions grouped by resource', () => {
    const choices = getConsentScopeChoices([
      'openid',
      'mcp',
      'allowealth:transactions:create',
      'allowealth:budgets:read',
      'allowealth:transactions:read',
    ]);

    expect(choices.required.map((choice) => choice.scope)).toEqual(['openid', 'mcp']);
    expect(
      choices.groups.map((group) => ({
        label: group.label,
        scopes: group.permissions.map((permission) => permission.scope),
      }))
    ).toEqual([
      {
        label: 'Transactions',
        scopes: ['allowealth:transactions:read', 'allowealth:transactions:create'],
      },
      { label: 'Budgets', scopes: ['allowealth:budgets:read'] },
    ]);
    expect(choices.groups[1].permissions[0]).toMatchObject({
      label: 'Read budgets',
      description: 'View budgets, budget history and category spending trends.',
    });
  });

  test('offers no permission groups for a request without permission scopes', () => {
    expect(getConsentScopeChoices(['openid', 'mcp']).groups).toEqual([]);
  });

  test('keeps other requested scopes visible as required', () => {
    const choices = getConsentScopeChoices(['openid', 'offline_access', 'mcp']);

    expect(choices.required.map((choice) => choice.scope)).toEqual([
      'openid',
      'offline_access',
      'mcp',
    ]);
    expect(choices.required.every((choice) => choice.label.length > 0)).toBe(true);
  });
});

describe('resolveConsentScopes', () => {
  const requested = [
    'openid',
    'mcp',
    'allowealth:transactions:read',
    'allowealth:transactions:create',
  ];

  test('re-adds the required scopes to the ticked permissions, in request order', () => {
    expect(resolveConsentScopes(requested, ['allowealth:transactions:create'])).toEqual([
      'openid',
      'mcp',
      'allowealth:transactions:create',
    ]);
  });

  test('ignores a required scope sent as a ticked box', () => {
    expect(resolveConsentScopes(requested, ['mcp', 'allowealth:transactions:read'])).toEqual([
      'openid',
      'mcp',
      'allowealth:transactions:read',
    ]);
  });

  test('drops ticked scopes that were not in the signed request', () => {
    expect(
      resolveConsentScopes(requested, ['allowealth:transactions:read', 'allowealth:reports:read'])
    ).toEqual(['openid', 'mcp', 'allowealth:transactions:read']);
  });

  test('keeps only the required scopes when every permission is unticked', () => {
    expect(resolveConsentScopes(requested, [])).toEqual(['openid', 'mcp']);
    expect(resolveConsentScopes(requested, ['mcp', 'allowealth:reports:read'])).toEqual([
      'openid',
      'mcp',
    ]);
  });
});
