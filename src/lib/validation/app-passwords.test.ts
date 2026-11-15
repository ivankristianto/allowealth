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
      limits: {},
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

describe('limits', () => {
  const base = { name: 'Nightly import', expiry: '30', scope: 'read-write' };

  test('stores category ids without duplicates and own_transactions_only only when true', () => {
    expect(
      v.parse(createAppPasswordSchema, {
        ...base,
        limits: { category_ids: ['cat_a', 'cat_b', 'cat_a'], own_transactions_only: true },
      }).limits
    ).toEqual({ category_ids: ['cat_a', 'cat_b'], own_transactions_only: true });
    expect(
      v.parse(createAppPasswordSchema, { ...base, limits: { own_transactions_only: false } }).limits
    ).toEqual({});
  });

  test('refuses an empty category list, which would read as no limit', () => {
    expect(issues(createAppPasswordSchema, { ...base, limits: { category_ids: [] } })).toEqual([
      'Choose at least one category',
    ]);
  });

  test('refuses unknown keys, so a misspelled limit cannot leave the token unlimited', () => {
    expect(
      issues(createAppPasswordSchema, { ...base, limits: { category_id: ['cat_a'] } })
    ).toEqual(['Limits take only category_ids and own_transactions_only']);
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

  test('accepts limits alone, and an empty object clears them', () => {
    expect(v.parse(updateAppPasswordSchema, { limits: { category_ids: ['cat_a'] } })).toEqual({
      limits: { category_ids: ['cat_a'] },
    });
    expect(v.parse(updateAppPasswordSchema, { limits: {} })).toEqual({ limits: {} });
  });

  test('rejects a body that changes nothing', () => {
    expect(issues(updateAppPasswordSchema, {})).toEqual([
      'Send a name, a scope, permissions or limits',
    ]);
  });
});
