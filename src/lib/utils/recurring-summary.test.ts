import { describe, expect, it } from 'bun:test';
import type { RecurringOccurrenceOutput } from '@/lib/types/recurring';
import { buildRecurringMonthlySummary } from './recurring-summary';

function createOccurrence(
  id: string,
  type: 'expense' | 'income',
  amount: string,
  currency: 'IDR' | 'USD'
): RecurringOccurrenceOutput {
  return {
    id,
    template_id: `template-${id}`,
    workspace_id: 'workspace-1',
    due_date: '2026-02-10',
    occurrence_number: 1,
    status: 'pending',
    transaction_id: null,
    confirmed_amount: null,
    skip_reason: null,
    confirmed_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    templateName: `Template ${id}`,
    templateType: type,
    templateAmount: amount,
    currency,
    category: {
      id: 'category-1',
      name: 'Category',
      icon: 'wallet',
      color: 'green',
      type,
    },
    account: {
      id: 'account-1',
      name: 'Cash',
      type: 'cash',
    },
    isInstallment: false,
    installmentLabel: null,
    totalOccurrences: null,
  };
}

describe('buildRecurringMonthlySummary', () => {
  it('groups income and expenses by currency and computes net', () => {
    const summary = buildRecurringMonthlySummary([
      createOccurrence('1', 'income', '1000', 'IDR'),
      createOccurrence('2', 'income', '300', 'USD'),
      createOccurrence('3', 'expense', '250', 'USD'),
      createOccurrence('4', 'expense', '200', 'IDR'),
    ]);

    expect(summary.upcomingIncomeCount).toBe(2);
    expect(summary.upcomingExpenseCount).toBe(2);
    expect(summary.incomeByCurrency).toEqual([
      { currency: 'IDR', amount: '1000' },
      { currency: 'USD', amount: '300' },
    ]);
    expect(summary.expenseByCurrency).toEqual([
      { currency: 'IDR', amount: '200' },
      { currency: 'USD', amount: '250' },
    ]);
    expect(summary.netByCurrency).toEqual([
      { currency: 'IDR', income: '1000', expenses: '200', net: '800' },
      { currency: 'USD', income: '300', expenses: '250', net: '50' },
    ]);
  });

  it('returns zeroed values when occurrences are empty', () => {
    const summary = buildRecurringMonthlySummary([]);
    expect(summary.upcomingIncomeCount).toBe(0);
    expect(summary.upcomingExpenseCount).toBe(0);
    expect(summary.incomeByCurrency).toEqual([]);
    expect(summary.expenseByCurrency).toEqual([]);
    expect(summary.netByCurrency).toEqual([]);
  });
});
