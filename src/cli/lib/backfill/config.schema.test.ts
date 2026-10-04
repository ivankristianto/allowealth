import { describe, expect, it } from 'bun:test';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig, ConfigError } from './config.schema';
import { thrown } from './test-helpers/throws';

function withConfig(contents: string | null): string {
  const dir = mkdtempSync(join(tmpdir(), 'bf-'));
  if (contents !== null) {
    mkdirSync(join(dir, '.aw-backfill'), { recursive: true });
    writeFileSync(join(dir, '.aw-backfill', 'config.json'), contents);
  }
  return dir;
}

const MINIMAL = JSON.stringify({
  filenames: {
    transactions: '[{year}] Sheet - {mon}-{year}.csv',
    balance: '[{year}] Sheet - Balance {mon}-{year}.csv',
  },
  members: { primary: 'OwnerA', secondary: 'OwnerB', fallback: 'OwnerA' },
  accounts: [
    { name: 'Bank1 OwnerA', currency: 'IDR', owner: 'OwnerA', category: 'Bank Account' },
    { name: 'Bank1 OwnerB', currency: 'IDR', owner: 'OwnerB', category: 'Bank Account' },
    { name: 'Bank2 OwnerA USD', currency: 'USD', owner: 'OwnerA', category: 'Bank Account' },
  ],
  accountAliases: [],
  duplicateRules: [],
  expenseAccounts: { OwnerA: 'Bank1 OwnerA', OwnerB: 'Bank1 OwnerB' },
  categories: { expense: ['Cat1'], income: [{ name: 'Inc1', sourceType: 'active' }] },
  categoryRenames: [],
  expenseOwners: [],
  salaryRouting: [{ category: 'Inc1', account: 'Bank1 OwnerA' }],
  incomeRouting: [],
  suppressedRows: [],
  dateRules: { incomeDayOfMonth: 10, earliestMonth: '2099-01' },
});

describe('loadConfig', () => {
  it('parses a minimal valid config', () => {
    const cfg = loadConfig(withConfig(MINIMAL));
    expect(cfg.members.primary).toBe('OwnerA');
    expect(cfg.accounts[0]?.currency).toBe('IDR');
  });

  it('reads the account category each account is filed under', () => {
    const cfg = loadConfig(withConfig(MINIMAL));
    expect(cfg.accounts[0]?.category).toBe('Bank Account');
  });

  it('rejects an account with no category rather than guessing one', () => {
    const config = JSON.parse(MINIMAL);
    delete config.accounts[0].category;
    expect(thrown(() => loadConfig(withConfig(JSON.stringify(config))))).toBeInstanceOf(
      ConfigError
    );
  });

  it('aborts with a directive message when the config is absent', () => {
    expect(thrown(() => loadConfig(withConfig(null)))).toBeInstanceOf(ConfigError);
    expect(() => loadConfig(withConfig(null))).toThrow(/config\.json/);
  });

  it('rejects an unknown currency rather than coercing it', () => {
    const bad = MINIMAL.replace('"IDR"', '"XYZ"');
    expect(thrown(() => loadConfig(withConfig(bad)))).toBeInstanceOf(ConfigError);
  });

  it('rejects a scaffold skeleton whose fields are still blank', () => {
    const skeleton = JSON.parse(MINIMAL);
    skeleton.members.primary = '';
    const error = thrown(() => loadConfig(withConfig(JSON.stringify(skeleton))));
    expect(error).toBeInstanceOf(ConfigError);
    expect((error as Error).message).toMatch(/members\.primary/);
  });

  it('rejects a duplicate account name in the roster', () => {
    const bad = JSON.parse(MINIMAL);
    bad.accounts.push({
      name: 'Bank1 OwnerA',
      currency: 'IDR',
      owner: 'OwnerA',
      category: 'Bank Account',
    });
    expect(() => loadConfig(withConfig(JSON.stringify(bad)))).toThrow(/duplicate/i);
  });

  it('reads expense ownership rules keyed by category or by description word', () => {
    const config = JSON.parse(MINIMAL);
    config.expenseOwners = [
      { category: 'Cat1', owner: 'OwnerB' },
      { match: 'Word', owner: 'OwnerB' },
    ];
    const cfg = loadConfig(withConfig(JSON.stringify(config)));
    expect(cfg.expenseOwners).toEqual([
      { category: 'Cat1', owner: 'OwnerB' },
      { match: 'Word', owner: 'OwnerB' },
    ]);
  });

  it('rejects an expense ownership rule whose owner is not a member', () => {
    const config = JSON.parse(MINIMAL);
    config.expenseOwners = [{ category: 'Cat1', owner: 'Nobody' }];
    expect(() => loadConfig(withConfig(JSON.stringify(config)))).toThrow(/expenseOwners.*Nobody/s);
  });

  it('rejects a fallback owner that is not a member', () => {
    const config = JSON.parse(MINIMAL);
    config.members.fallback = 'Nobody';
    expect(() => loadConfig(withConfig(JSON.stringify(config)))).toThrow(
      /members\.fallback.*Nobody/s
    );
  });

  it('rejects an expense ownership rule naming an unknown expense category', () => {
    const config = JSON.parse(MINIMAL);
    config.expenseOwners = [{ category: 'CatTypo', owner: 'OwnerB' }];
    expect(() => loadConfig(withConfig(JSON.stringify(config)))).toThrow(/CatTypo/);
  });

  it('rejects an expense ownership rule with both a category and a match', () => {
    const config = JSON.parse(MINIMAL);
    config.expenseOwners = [{ category: 'Cat1', match: 'Word', owner: 'OwnerB' }];
    expect(thrown(() => loadConfig(withConfig(JSON.stringify(config))))).toBeInstanceOf(
      ConfigError
    );
  });

  it('reads the account each member pays expenses from', () => {
    const cfg = loadConfig(withConfig(MINIMAL));
    expect(cfg.expenseAccounts).toEqual({ OwnerA: 'Bank1 OwnerA', OwnerB: 'Bank1 OwnerB' });
  });

  it('rejects a member with no expense account', () => {
    const config = JSON.parse(MINIMAL);
    delete config.expenseAccounts.OwnerB;
    expect(() => loadConfig(withConfig(JSON.stringify(config)))).toThrow(
      /expenseAccounts.*OwnerB/s
    );
  });

  it('rejects an expense account keyed by a non-member', () => {
    const config = JSON.parse(MINIMAL);
    config.expenseAccounts.Nobody = 'Bank1 OwnerA';
    expect(() => loadConfig(withConfig(JSON.stringify(config)))).toThrow(
      /expenseAccounts.*Nobody/s
    );
  });

  it('rejects an expense account that is not in the roster', () => {
    const config = JSON.parse(MINIMAL);
    config.expenseAccounts.OwnerA = 'BankTypo';
    expect(() => loadConfig(withConfig(JSON.stringify(config)))).toThrow(/BankTypo/);
  });

  it('rejects a foreign-currency expense account, since expenses post in local currency', () => {
    const config = JSON.parse(MINIMAL);
    config.expenseAccounts.OwnerA = 'Bank2 OwnerA USD';
    expect(() => loadConfig(withConfig(JSON.stringify(config)))).toThrow(/Bank2 OwnerA USD/);
  });

  it('reads income routing rules keyed by category, by description terms, or both', () => {
    const config = JSON.parse(MINIMAL);
    config.incomeRouting = [
      { match: ['Coupon', 'OwnerA'], account: 'Bank2 OwnerA USD', convert: true },
      { category: 'Inc1', account: 'Bank1 OwnerA' },
    ];
    const cfg = loadConfig(withConfig(JSON.stringify(config)));
    expect(cfg.incomeRouting[0]).toEqual({
      match: ['Coupon', 'OwnerA'],
      account: 'Bank2 OwnerA USD',
      convert: true,
    });
  });

  it('rejects an income routing rule with neither a category nor a match', () => {
    const config = JSON.parse(MINIMAL);
    config.incomeRouting = [{ account: 'Bank1 OwnerA' }];
    expect(thrown(() => loadConfig(withConfig(JSON.stringify(config))))).toBeInstanceOf(
      ConfigError
    );
  });

  it('rejects a match term that cannot start a word, so it never silently fails to match', () => {
    const config = JSON.parse(MINIMAL);
    config.incomeRouting = [{ match: ['(Coupon)'], account: 'Bank1 OwnerA' }];
    expect(() => loadConfig(withConfig(JSON.stringify(config)))).toThrow(
      /incomeRouting.*\(Coupon\)/s
    );
  });

  it('rejects an income routing rule pointing at an account not in the roster', () => {
    const config = JSON.parse(MINIMAL);
    config.incomeRouting = [{ category: 'Inc1', account: 'BankTypo' }];
    expect(() => loadConfig(withConfig(JSON.stringify(config)))).toThrow(/BankTypo/);
  });
});
