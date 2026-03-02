import { describe, expect, test } from 'bun:test';
import {
  parseJournal,
  findPendingMigrations,
  filterDroppableTables,
  orderTablesForDrop,
} from './d1-migrate';

describe('parseJournal', () => {
  test('parses journal entries', () => {
    const journal = {
      version: '7',
      dialect: 'sqlite',
      entries: [
        {
          idx: 0,
          version: '6',
          when: 1771249670426,
          tag: '0000_woozy_steel_serpent',
          breakpoints: true,
        },
        {
          idx: 1,
          version: '6',
          when: 1771349670426,
          tag: '0001_next_migration',
          breakpoints: true,
        },
      ],
    };
    const result = parseJournal(journal);
    expect(result).toEqual([
      { idx: 0, tag: '0000_woozy_steel_serpent' },
      { idx: 1, tag: '0001_next_migration' },
    ]);
  });

  test('returns empty array for no entries', () => {
    const journal = { version: '7', dialect: 'sqlite', entries: [] };
    const result = parseJournal(journal);
    expect(result).toEqual([]);
  });
});

describe('findPendingMigrations', () => {
  test('returns all when none applied', () => {
    const all = [
      { idx: 0, tag: '0000_first' },
      { idx: 1, tag: '0001_second' },
    ];
    const applied: string[] = [];
    expect(findPendingMigrations(all, applied)).toEqual(all);
  });

  test('returns only unapplied', () => {
    const all = [
      { idx: 0, tag: '0000_first' },
      { idx: 1, tag: '0001_second' },
      { idx: 2, tag: '0002_third' },
    ];
    const applied = ['0000_first', '0001_second'];
    expect(findPendingMigrations(all, applied)).toEqual([{ idx: 2, tag: '0002_third' }]);
  });

  test('returns empty when all applied', () => {
    const all = [{ idx: 0, tag: '0000_first' }];
    const applied = ['0000_first'];
    expect(findPendingMigrations(all, applied)).toEqual([]);
  });
});

describe('filterDroppableTables', () => {
  test('excludes D1 internal and migrations tables from drop list', () => {
    const tables = ['__drizzle_migrations', '_cf_KV', 'users', 'transactions'];
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
