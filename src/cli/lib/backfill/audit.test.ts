import { describe, expect, it } from 'bun:test';
import { diffMonth, toActualBudgets } from './audit';
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
      localAmount: '100',
    },
  ],
  budgets: [{ category: 'Cat1', amountIdr: 400, pct: '50%' }],
  snapshots: [
    {
      account: 'A',
      opening: '0',
      closing: '1200',
      localClosing: '1200',
      currency: 'IDR',
      recordedAt: '',
    },
  ],
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

describe('diffMonth against a later loaded month', () => {
  it('compares current balance to the newest loaded month, not the audited one', () => {
    // The audited month closed at 1200; a later month moved the account to 5000.
    const rows = diffMonth(plan, {
      ...clean,
      balances: { A: '5000' },
      newestClosing: { A: '5000' },
    });
    expect(rows.some((x) => x.dimension === 'current balance')).toBe(false);
  });

  it('still reports a current balance that matches neither month', () => {
    const rows = diffMonth(plan, {
      ...clean,
      balances: { A: '7' },
      newestClosing: { A: '5000' },
    });
    expect(rows.some((x) => x.dimension === 'current balance')).toBe(true);
  });
});

describe('diffMonth grouped dimensions', () => {
  it('reports an expense filed under the wrong category', () => {
    const rows = diffMonth(plan, {
      ...clean,
      transactions: [{ ...clean.transactions[0]!, category: 'Cat2' }],
    });
    expect(rows.some((x) => x.dimension === 'expense per category')).toBe(true);
  });

  it('reports income landing in the wrong account', () => {
    const withIncome = structuredClone(plan);
    withIncome.transactions.push({
      kind: 'income',
      date: '2099-01-10',
      description: 'i',
      category: 'Inc1',
      account: 'A',
      amount: '500',
      currency: 'IDR',
      localAmount: '500',
    });
    withIncome.checks.incomeTotal = 500;
    const rows = diffMonth(withIncome, {
      ...clean,
      transactions: [
        ...clean.transactions,
        {
          type: 'income',
          transaction_date: '2099-01-10',
          amount: '500',
          category: 'Inc1',
          account: 'B',
          currency: 'IDR',
        },
      ],
    });
    expect(rows.some((x) => x.dimension === 'income per account')).toBe(true);
  });
});

describe('audit reconciliation dimension', () => {
  it('reports nothing when the app reconciles the way the plan predicts', () => {
    expect(diffMonth(plan, { ...clean, reconciliation: { IDR: 0, USD: 0 } })).toEqual([]);
  });

  it('reports drift between the plan and the app figures', () => {
    const rows = diffMonth(plan, { ...clean, reconciliation: { IDR: 250, USD: 0 } });
    expect(rows.some((x) => x.dimension === 'reconciliation' && x.key === 'IDR')).toBe(true);
  });
});

describe('diffMonth currency handling', () => {
  // A foreign receipt cleared at its own rate, so the sheet's local figure is not
  // amount × the month-end reference rate. The app holds the foreign amount.
  const withForeignIncome = structuredClone(plan);
  withForeignIncome.transactions.push({
    kind: 'income',
    date: '2099-01-10',
    description: 'salary',
    category: 'Inc1',
    account: 'Bank1 OwnerA USD',
    amount: '10',
    currency: 'USD',
    localAmount: '99000',
  });
  withForeignIncome.checks.incomeTotal = 99000;

  const foreignIncome = (amount: string): ActualState => ({
    ...clean,
    transactions: [
      ...clean.transactions,
      {
        type: 'income',
        transaction_date: '2099-01-10',
        amount,
        category: 'Inc1',
        account: 'Bank1 OwnerA USD',
        currency: 'USD',
      },
    ],
  });

  it('compares the foreign amount the app holds, never a converted figure', () => {
    expect(diffMonth(withForeignIncome, foreignIncome('10'))).toEqual([]);
  });

  it('reports a foreign amount posted wrong, keyed by its currency', () => {
    const rows = diffMonth(withForeignIncome, foreignIncome('11'));
    expect(rows).toContainEqual({
      dimension: 'income total',
      key: '2099-01 USD',
      expected: '10.00',
      actual: '11.00',
    });
    expect(rows.some((x) => x.dimension === 'income per account')).toBe(true);
  });
});

describe('toActualBudgets', () => {
  it('reads the category name from the nested object the API returns', () => {
    expect(toActualBudgets([{ budget_amount: '400', category: { name: 'Cat1' } }])).toEqual([
      { category: 'Cat1', budget_amount: '400' },
    ]);
  });
});
