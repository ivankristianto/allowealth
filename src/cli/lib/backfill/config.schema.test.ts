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
  accounts: [{ name: 'Bank1 OwnerA', currency: 'IDR', owner: 'OwnerA', category: 'Bank Account' }],
  accountAliases: [],
  duplicateRules: [],
  syntheticAccounts: {
    expense: 'Household (historical)',
    passiveIncome: { OwnerA: 'Passive Income (OwnerA)', OwnerB: 'Passive Income (OwnerB)' },
    category: 'Other',
  },
  categories: { expense: ['Cat1'], income: [{ name: 'Inc1', sourceType: 'active' }] },
  categoryRenames: [],
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
    expect(cfg.syntheticAccounts.category).toBe('Other');
  });

  it('rejects an account with no category rather than guessing one', () => {
    const config = JSON.parse(MINIMAL);
    delete config.accounts[0].category;
    expect(thrown(() => loadConfig(withConfig(JSON.stringify(config))))).toBeInstanceOf(
      ConfigError
    );
  });

  it('rejects synthetic accounts with no category', () => {
    const config = JSON.parse(MINIMAL);
    delete config.syntheticAccounts.category;
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
});
