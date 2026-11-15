import { describe, expect, test } from 'bun:test';
import {
  PERMISSIONS,
  PERMISSION_IDS,
  SCOPE_PERMISSION_GRANTS,
  expandPermissionGrants,
  isPermission,
  isReadPermission,
} from './registry';

const READ_PERMISSIONS = PERMISSION_IDS.filter(isReadPermission);

describe('permission registry', () => {
  test('every permission is resource:action with a label and description', () => {
    for (const permission of PERMISSIONS) {
      expect(permission.id).toMatch(/^[a-z]+:[a-z]+$/);
      expect(permission.label.length).toBeGreaterThan(0);
      expect(permission.description.length).toBeGreaterThan(0);
    }
    expect(new Set(PERMISSION_IDS).size).toBe(PERMISSION_IDS.length);
  });

  test('covers the resources the allowlist and tools use', () => {
    const resources = new Set(PERMISSION_IDS.map((id) => id.split(':')[0]));
    expect([...resources].sort()).toEqual([
      'accounts',
      'budgets',
      'categories',
      'forecast',
      'recurring',
      'reports',
      'settings',
      'transactions',
    ]);
  });

  test('isPermission accepts registry ids only', () => {
    expect(isPermission('transactions:read')).toBe(true);
    expect(isPermission('transactions:launch')).toBe(false);
    expect(isPermission('*')).toBe(false);
  });
});

describe('expandPermissionGrants', () => {
  test('"*" grants every permission', () => {
    expect(expandPermissionGrants(['*'])).toEqual([...PERMISSION_IDS]);
  });

  test('"*:read" grants every read permission and nothing else', () => {
    expect(expandPermissionGrants(['*:read'])).toEqual(READ_PERMISSIONS);
    expect(READ_PERMISSIONS.length).toBeGreaterThan(0);
  });

  test('explicit permissions come back in registry order without duplicates', () => {
    expect(
      expandPermissionGrants(['transactions:create', 'accounts:read', 'accounts:read'])
    ).toEqual(['transactions:create', 'accounts:read']);
  });

  test('a wildcard combined with explicit permissions grants their union', () => {
    const expanded = expandPermissionGrants(['*:read', 'transactions:create']);
    expect(expanded).toContain('transactions:create');
    expect(expanded.filter(isReadPermission)).toEqual(READ_PERMISSIONS);
  });

  test('ignores values the registry no longer knows instead of throwing', () => {
    expect(expandPermissionGrants(['transactions:launch', 'accounts:read'])).toEqual([
      'accounts:read',
    ]);
    expect(expandPermissionGrants([])).toEqual([]);
    expect(expandPermissionGrants('["*"]')).toEqual([]);
    expect(expandPermissionGrants(null)).toEqual([]);
    expect(expandPermissionGrants([42, { id: '*' }])).toEqual([]);
  });
});

describe('scope presets', () => {
  test('read expands to every read permission, read-write to everything', () => {
    expect(SCOPE_PERMISSION_GRANTS).toEqual({ read: ['*:read'], 'read-write': ['*'] });
    expect(expandPermissionGrants(SCOPE_PERMISSION_GRANTS.read)).toEqual(READ_PERMISSIONS);
    expect(expandPermissionGrants(SCOPE_PERMISSION_GRANTS['read-write'])).toEqual([
      ...PERMISSION_IDS,
    ]);
  });
});
