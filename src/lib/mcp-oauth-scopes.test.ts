import { describe, expect, test } from 'bun:test';
import { PERMISSION_IDS } from '@/lib/permissions/registry';
import {
  PERMISSION_OAUTH_SCOPES,
  getConsentScopeChoices,
  oauthPermissionsFromScopes,
  parseStoredScopes,
  permissionLabelsFromScopes,
  resolveConsentScopes,
  splitScopes,
} from './mcp-oauth-scopes';

describe('PERMISSION_OAUTH_SCOPES', () => {
  test('names one allowealth: scope per registry permission, in registry order', () => {
    expect(PERMISSION_OAUTH_SCOPES).toEqual(PERMISSION_IDS.map((id) => `allowealth:${id}`));
  });
});

describe('splitScopes', () => {
  test('splits on spaces and drops blanks and repeats', () => {
    expect(splitScopes('openid  mcp openid allowealth:accounts:read ')).toEqual([
      'openid',
      'mcp',
      'allowealth:accounts:read',
    ]);
  });

  test('returns no scopes for a missing value', () => {
    expect(splitScopes(null)).toEqual([]);
    expect(splitScopes('')).toEqual([]);
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

describe('permissionLabelsFromScopes', () => {
  test('lists the registry labels of the granted permissions', () => {
    expect(
      permissionLabelsFromScopes([
        'mcp',
        'allowealth:accounts:read',
        'allowealth:transactions:read',
      ])
    ).toEqual(['Read transactions', 'Read accounts']);
  });

  test('lists nothing for a token without current permission scopes', () => {
    expect(permissionLabelsFromScopes(['openid', 'mcp', 'allowealth:x:launch'])).toEqual([]);
  });
});

describe('getConsentScopeChoices', () => {
  test('splits required, optional and permission scopes, grouping permissions by resource', () => {
    const choices = getConsentScopeChoices([
      'openid',
      'email',
      'mcp',
      'offline_access',
      'allowealth:transactions:create',
      'allowealth:budgets:read',
      'allowealth:transactions:read',
    ]);

    expect(choices.required).toEqual(['openid', 'mcp']);
    expect(choices.optional).toEqual(['email', 'offline_access']);
    expect(
      choices.permissionGroups.map((group) => ({
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
    expect(choices.permissionGroups[1].permissions[0]).toMatchObject({
      label: 'Read budgets',
      description: 'View budgets, budget history and category spending trends.',
    });
  });

  test('lists a repeated scope once', () => {
    expect(getConsentScopeChoices(['openid', 'mcp', 'openid', 'email', 'email'])).toMatchObject({
      required: ['openid', 'mcp'],
      optional: ['email'],
    });
  });

  test('offers no permission groups for a request without permission scopes', () => {
    expect(getConsentScopeChoices(['openid', 'mcp']).permissionGroups).toEqual([]);
  });
});

describe('resolveConsentScopes', () => {
  const requested = [
    'openid',
    'email',
    'mcp',
    'allowealth:transactions:read',
    'allowealth:transactions:create',
  ];

  test('re-adds the required scopes to the ticked ones, in request order', () => {
    expect(resolveConsentScopes(requested, ['allowealth:transactions:create', 'email'])).toEqual([
      'openid',
      'email',
      'mcp',
      'allowealth:transactions:create',
    ]);
  });

  test('leaves out optional scopes the user unticked', () => {
    expect(resolveConsentScopes(requested, ['allowealth:transactions:read'])).toEqual([
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

  test('keeps only the required scopes when everything is unticked', () => {
    expect(resolveConsentScopes(requested, [])).toEqual(['openid', 'mcp']);
  });

  test('grants each repeated scope once', () => {
    expect(resolveConsentScopes(['openid', 'mcp', 'mcp', 'email', 'email'], ['email'])).toEqual([
      'openid',
      'mcp',
      'email',
    ]);
  });
});
