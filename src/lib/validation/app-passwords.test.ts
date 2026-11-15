import { describe, expect, test } from 'bun:test';
import * as v from 'valibot';
import { createAppPasswordSchema, updateAppPasswordSchema } from './app-passwords';

function issues(schema: v.GenericSchema, input: unknown): string[] {
  const result = v.safeParse(schema, input);
  return result.success ? [] : result.issues.map((issue) => issue.message);
}

describe('createAppPasswordSchema', () => {
  const base = { name: 'Nightly import', expiry: '30' };

  test('turns each scope into its stored wildcard', () => {
    expect(v.parse(createAppPasswordSchema, { ...base, scope: 'read' })).toEqual({
      ...base,
      permissions: ['*:read'],
    });
    expect(v.parse(createAppPasswordSchema, { ...base, scope: 'read-write' }).permissions).toEqual([
      '*',
    ]);
  });

  test('stores custom permissions in registry order without duplicates', () => {
    const parsed = v.parse(createAppPasswordSchema, {
      ...base,
      permissions: ['transactions:create', 'accounts:read', 'transactions:create'],
    });
    expect(parsed.permissions).toEqual(['transactions:create', 'accounts:read']);
  });

  test('rejects an unknown permission and names it', () => {
    expect(
      issues(createAppPasswordSchema, { ...base, permissions: ['transactions:launch'] })
    ).toEqual(['transactions:launch is not a permission']);
  });

  test('rejects wildcards in custom permissions', () => {
    expect(issues(createAppPasswordSchema, { ...base, permissions: ['*'] })).toEqual([
      '* is not a permission',
    ]);
    expect(
      issues(createAppPasswordSchema, { ...base, permissions: ['accounts:read', '*:read'] })
    ).toEqual(['*:read is not a permission']);
  });

  test('rejects an empty permission list', () => {
    expect(issues(createAppPasswordSchema, { ...base, permissions: [] })).toEqual([
      'Choose at least one permission',
    ]);
  });

  test('needs exactly one of scope or permissions', () => {
    expect(issues(createAppPasswordSchema, base)).toEqual(['Send either scope or permissions']);
    expect(
      issues(createAppPasswordSchema, { ...base, scope: 'read', permissions: ['accounts:read'] })
    ).toEqual(['Send either scope or permissions, not both']);
  });

  test('rejects an unknown scope', () => {
    expect(issues(createAppPasswordSchema, { ...base, scope: 'admin' })).toEqual([
      'Choose read or read-write',
    ]);
  });
});

describe('updateAppPasswordSchema', () => {
  test('accepts a name alone', () => {
    expect(v.parse(updateAppPasswordSchema, { name: '  Renamed  ' })).toEqual({ name: 'Renamed' });
  });

  test('accepts scope or permissions with the same rules as create', () => {
    expect(v.parse(updateAppPasswordSchema, { scope: 'read' })).toEqual({
      permissions: ['*:read'],
    });
    expect(v.parse(updateAppPasswordSchema, { permissions: ['budgets:read'] })).toEqual({
      permissions: ['budgets:read'],
    });
    expect(issues(updateAppPasswordSchema, { permissions: [] })).toEqual([
      'Choose at least one permission',
    ]);
    expect(issues(updateAppPasswordSchema, { permissions: ['*'] })).toEqual([
      '* is not a permission',
    ]);
    expect(
      issues(updateAppPasswordSchema, { scope: 'read', permissions: ['accounts:read'] })
    ).toEqual(['Send either scope or permissions, not both']);
  });

  test('rejects a body that changes nothing', () => {
    expect(issues(updateAppPasswordSchema, {})).toEqual(['Send a name, a scope or permissions']);
  });
});
