import { describe, expect, it } from 'bun:test';
import { resolveAccounts, assertCategoriesKnown, DetectionError } from './resolve';
import { thrown } from './test-helpers/throws';
import type { BackfillConfig } from './config.schema';
import type { RawAccountRow, RawMonth } from './parse';

const base = {
  accounts: [
    { name: 'Bank1 OwnerA', currency: 'IDR', owner: 'OwnerA' },
    { name: 'Bank2 OwnerA USD', currency: 'USD', owner: 'OwnerA' },
  ],
  accountAliases: [{ from: 'Old Name', to: 'Bank1 OwnerA' }],
  duplicateRules: [
    { month: '2099-01', name: 'Bank1 OwnerA', occurrence: 2, rename: 'Bank1 OwnerA (2)' },
  ],
  categories: { expense: ['Cat1'], income: [{ name: 'Inc1', sourceType: 'active' }] },
} as unknown as BackfillConfig;

const row = (name: string, occurrence = 1, akhir = 100): RawAccountRow => ({
  owner: 'primary',
  name,
  occurrence,
  awal: { kind: 'value', value: 100 },
  income: { kind: 'value', value: 0 },
  akhir: { kind: 'value', value: akhir },
});

const month = (accounts: RawAccountRow[]) => ({ accounts }) as unknown as RawMonth;

describe('resolveAccounts', () => {
  it('maps an aliased name onto its canonical account', () => {
    const out = resolveAccounts(month([row('Old Name')]), base, '2099-01');
    expect(out[0]?.name).toBe('Bank1 OwnerA');
  });

  it('applies a duplicate rule to the second occurrence only', () => {
    const config = {
      ...base,
      accounts: [...base.accounts, { name: 'Bank1 OwnerA (2)', currency: 'IDR', owner: 'OwnerA' }],
    } as BackfillConfig;
    const out = resolveAccounts(
      month([row('Bank1 OwnerA', 1), row('Bank1 OwnerA', 2)]),
      config,
      '2099-01'
    );
    expect(out.map((a) => a.name)).toEqual(['Bank1 OwnerA', 'Bank1 OwnerA (2)']);
  });

  it('aborts on a repeated label with no duplicate rule', () => {
    expect(
      thrown(() =>
        resolveAccounts(month([row('Bank1 OwnerA', 1), row('Bank1 OwnerA', 2)]), base, '2099-02')
      )
    ).toBeInstanceOf(DetectionError);
  });

  it('aborts on an account absent from the roster, naming it', () => {
    expect(() => resolveAccounts(month([row('Unknown Bank')]), base, '2099-01')).toThrow(
      /Unknown Bank/
    );
  });

  it('carries currency from the roster, never inferring it', () => {
    const out = resolveAccounts(month([row('Bank2 OwnerA USD')]), base, '2099-01');
    expect(out[0]?.currency).toBe('USD');
  });

  it('names the config field to edit in every abort message', () => {
    const error = thrown(() => resolveAccounts(month([row('Unknown Bank')]), base, '2099-01'));
    expect((error as Error).message).toMatch(/accounts/);
  });
});

describe('assertCategoriesKnown', () => {
  const raw = (categories: string[]) =>
    ({
      expenses: categories.map((category) => ({ category })),
      incomes: [],
      budgets: [],
    }) as unknown as RawMonth;

  it('aborts on an unknown expense category, naming it', () => {
    expect(() => assertCategoriesKnown(raw(['NewCat']), base)).toThrow(/NewCat/);
  });

  it('accepts categories present in config', () => {
    expect(() => assertCategoriesKnown(raw(['Cat1']), base)).not.toThrow();
  });
});
