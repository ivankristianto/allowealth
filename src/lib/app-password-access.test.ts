import { describe, expect, test } from 'bun:test';
import {
  PERMISSION_IDS,
  expandPermissionGrants,
  isReadPermission,
} from '@/lib/permissions/registry';
import {
  APP_PASSWORD_PRESETS,
  PERMISSION_GROUPS,
  deriveAppPasswordPreset,
  describeAppPasswordAccess,
} from './app-password-access';

const READ_PERMISSIONS = PERMISSION_IDS.filter(isReadPermission);

describe('APP_PASSWORD_PRESETS', () => {
  test('read expands to every read permission, read-write to everything', () => {
    expect(APP_PASSWORD_PRESETS.read.grants).toEqual(['*:read']);
    expect(APP_PASSWORD_PRESETS['read-write'].grants).toEqual(['*']);
    expect(expandPermissionGrants(APP_PASSWORD_PRESETS.read.grants)).toEqual(READ_PERMISSIONS);
    expect(expandPermissionGrants(APP_PASSWORD_PRESETS['read-write'].grants)).toEqual([
      ...PERMISSION_IDS,
    ]);
  });
});

describe('deriveAppPasswordPreset', () => {
  test('names a preset only for its exact stored wildcard', () => {
    expect(deriveAppPasswordPreset(['*:read'])).toBe('read');
    expect(deriveAppPasswordPreset(['*'])).toBe('read-write');
  });

  test('calls every other grant list custom, even one listing every permission', () => {
    expect(deriveAppPasswordPreset(['accounts:read'])).toBe('custom');
    expect(deriveAppPasswordPreset([...PERMISSION_IDS])).toBe('custom');
    expect(deriveAppPasswordPreset(READ_PERMISSIONS)).toBe('custom');
    expect(deriveAppPasswordPreset(['*', '*:read'])).toBe('custom');
    expect(deriveAppPasswordPreset(['*:read', '*'])).toBe('custom');
    expect(deriveAppPasswordPreset([])).toBe('custom');
  });
});

describe('PERMISSION_GROUPS', () => {
  test('lists every permission once, grouped by resource in registry order', () => {
    expect(PERMISSION_GROUPS.flatMap((group) => group.permissions.map((p) => p.id))).toEqual([
      ...PERMISSION_IDS,
    ]);
    for (const group of PERMISSION_GROUPS) {
      expect(group.label.length).toBeGreaterThan(0);
      expect(group.permissions.every((p) => p.id.startsWith(`${group.resource}:`))).toBe(true);
    }
  });
});

describe('describeAppPasswordAccess', () => {
  test('names a preset token by its preset', () => {
    expect(describeAppPasswordAccess(['*:read'])).toEqual({
      kind: 'preset',
      preset: 'read',
      label: 'Read only',
    });
    expect(describeAppPasswordAccess(['*'])).toEqual({
      kind: 'preset',
      preset: 'read-write',
      label: 'Read and write',
    });
  });

  test('lists a custom token by permission label in registry order', () => {
    expect(describeAppPasswordAccess(['accounts:read', 'transactions:create'])).toEqual({
      kind: 'custom',
      permissionLabels: ['Add transactions', 'Read accounts'],
    });
  });

  test('says so when a custom token grants nothing', () => {
    expect(describeAppPasswordAccess([])).toEqual({
      kind: 'custom',
      permissionLabels: ['No permissions'],
    });
  });
});
