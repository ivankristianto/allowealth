import { describe, expect, it } from 'bun:test';
import { scaffoldConfig } from './scaffold';
import type { RawMonth } from './parse';

const month = (names: string[]): RawMonth =>
  ({
    month: 1,
    year: 2099,
    rate: 1,
    expenses: [],
    incomes: [],
    budgets: [],
    totals: { expense: 0, income: 0, closing: 0 },
    accounts: names.map((n) => ({
      owner: 'primary' as const,
      name: n,
      occurrence: 1,
      awal: { kind: 'value' as const, value: 0 },
      income: { kind: 'value' as const, value: 0 },
      akhir: { kind: 'value' as const, value: 0 },
    })),
  }) as RawMonth;

describe('scaffoldConfig', () => {
  it('emits every distinct account defaulting to local currency', () => {
    const { config } = scaffoldConfig([month(['Bank1 OwnerA', 'Bank2 OwnerA'])]);
    expect(config.accounts).toHaveLength(2);
    expect(config.accounts?.every((a) => a.currency === 'IDR')).toBe(true);
  });

  it('unions accounts across months without duplicating', () => {
    const { config } = scaffoldConfig([
      month(['Bank1 OwnerA']),
      month(['Bank1 OwnerA', 'Bank2 OwnerA']),
    ]);
    expect(config.accounts).toHaveLength(2);
  });

  it('flags names differing only by whitespace or punctuation', () => {
    const { ambiguities } = scaffoldConfig([month(['Bank1  OwnerA', 'Bank1 OwnerA'])]);
    expect(ambiguities.join(' ')).toMatch(/Bank1/);
  });

  it('reports no ambiguity when every name is distinct', () => {
    const { ambiguities } = scaffoldConfig([month(['Bank1 OwnerA', 'Bank2 OwnerA'])]);
    expect(ambiguities).toEqual([]);
  });

  it('collects the categories seen across the range', () => {
    const m = month(['Bank1 OwnerA']);
    m.expenses = [
      {
        description: 'x',
        category: 'Cat1',
        date: '',
        amount: { kind: 'blank' },
        usd: { kind: 'blank' },
      },
    ];
    m.incomes = [
      {
        description: 'y',
        category: 'Inc1',
        date: '',
        amount: { kind: 'blank' },
        usd: { kind: 'blank' },
      },
    ];
    const { config } = scaffoldConfig([m]);
    expect(config.categories?.expense).toEqual(['Cat1']);
    expect(config.categories?.income).toEqual([{ name: 'Inc1', sourceType: 'other' }]);
  });
});
