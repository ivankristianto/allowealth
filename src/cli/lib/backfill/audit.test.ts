import { describe, expect, it } from 'bun:test';
import { diffMonth } from './audit';
import type { ActualState } from './audit';
import type { Plan } from './types';

const plan = {
  month: 1,
  year: 2099,
  rate: 10000,
  transactions: [
    {
      kind: 'expense',
      date: '2099-01-02',
      description: 'a',
      category: 'Cat1',
      account: 'Household (historical)',
      amount: '100',
      currency: 'IDR',
    },
  ],
  budgets: [{ category: 'Cat1', amountIdr: 400, pct: '50%' }],
  snapshots: [{ account: 'A', closing: '1200', currency: 'IDR', recordedAt: '' }],
  checks: { expenseTotal: 100, incomeTotal: 0, closingTotal: 1200, accountIncome: {} },
  skipped: [],
  unmarkedOwner: [],
} as unknown as Plan;

const clean: ActualState = {
  transactions: [
    {
      type: 'expense',
      transaction_date: '2099-01-02',
      amount: '100',
      category: 'Cat1',
      account: 'Household (historical)',
      currency: 'IDR',
    },
  ],
  budgets: [{ category: 'Cat1', budget_amount: '400' }],
  history: { A: '1200' },
  balances: { A: '1200' },
};

describe('diffMonth', () => {
  it('reports nothing when app and CSV agree', () => {
    expect(diffMonth(plan, clean)).toEqual([]);
  });

  it('reports a missing transaction', () => {
    const r = diffMonth(plan, { ...clean, transactions: [] });
    expect(r.some((x) => x.dimension === 'expense total')).toBe(true);
  });

  it('reports a wrong budget amount', () => {
    const r = diffMonth(plan, { ...clean, budgets: [{ category: 'Cat1', budget_amount: '999' }] });
    expect(r.some((x) => x.dimension === 'budget')).toBe(true);
  });

  it('reports a missing budget', () => {
    const r = diffMonth(plan, { ...clean, budgets: [] });
    expect(r.some((x) => x.dimension === 'budget')).toBe(true);
  });

  it('reports a drifted history balance', () => {
    const r = diffMonth(plan, { ...clean, history: { A: '999' } });
    expect(r.some((x) => x.dimension === 'closing balance')).toBe(true);
  });

  it('reports a stale current balance even when history is correct', () => {
    const r = diffMonth(plan, { ...clean, balances: { A: '999' } });
    expect(r.some((x) => x.dimension === 'current balance')).toBe(true);
  });

  it('reports a transaction count mismatch', () => {
    const r = diffMonth(plan, {
      ...clean,
      transactions: [...clean.transactions, ...clean.transactions],
    });
    expect(r.some((x) => x.dimension === 'transaction count')).toBe(true);
  });

  it('reports a nonzero reconciliation variance', () => {
    const r = diffMonth(plan, { ...clean, reconciliation: { IDR: 5, USD: 0 } });
    expect(r.some((x) => x.dimension === 'reconciliation')).toBe(true);
  });
});
