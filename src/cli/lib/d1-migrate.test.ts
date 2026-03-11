import { describe, expect, test } from 'bun:test';
import { filterDroppableTables, orderTablesForDrop } from './d1-migrate';

describe('filterDroppableTables', () => {
  test('excludes D1 internal tables from drop list', () => {
    const tables = ['_cf_KV', 'users', 'transactions'];
    expect(filterDroppableTables(tables)).toEqual(['users', 'transactions']);
  });

  test('keeps user tables that start with underscores but are not reserved', () => {
    const tables = ['_custom_table', '_cf_KV', 'accounts'];
    expect(filterDroppableTables(tables)).toEqual(['_custom_table', 'accounts']);
  });
});

describe('orderTablesForDrop', () => {
  test('drops children before parents based on FK dependencies', () => {
    const tables = ['account_categories', 'accounts', 'transactions'];
    const dependencies = {
      account_categories: [],
      accounts: ['account_categories'],
      transactions: ['accounts'],
    };

    expect(orderTablesForDrop(tables, dependencies)).toEqual([
      'transactions',
      'accounts',
      'account_categories',
    ]);
  });

  test('keeps deterministic order for independent tables', () => {
    const tables = ['z_table', 'a_table', 'm_table'];
    const dependencies = {
      z_table: [],
      a_table: [],
      m_table: [],
    };

    expect(orderTablesForDrop(tables, dependencies)).toEqual(['a_table', 'm_table', 'z_table']);
  });
});
