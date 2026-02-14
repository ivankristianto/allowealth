import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { groupTransactionsByDate } from './transaction-grouping';
import type { TransactionOutput } from '@/lib/types/transaction';

// Helper to create a minimal TransactionOutput for testing
function makeTx(
  overrides: Partial<TransactionOutput> & { transaction_date: Date }
): TransactionOutput {
  return {
    id: `tx-${Math.random().toString(36).slice(2, 8)}`,
    type: 'expense',
    amount: '50000',
    currency: 'IDR',
    description: 'Test transaction',
    transaction_date: overrides.transaction_date,
    updated_by_user_id: null,
    deleted_by_user_id: null,
    deleted_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    category: { id: 'cat-1', name: 'Food', type: 'expense', icon: 'utensils', color: 'bg-info' },
    asset: { id: 'asset-1', name: 'Cash', type: 'cash' },
    ...overrides,
  };
}

describe('groupTransactionsByDate', () => {
  // Fix "now" for deterministic tests
  let realDate: typeof Date;

  beforeEach(() => {
    realDate = globalThis.Date;
    const fixed = new Date(2026, 1, 13); // Feb 13, 2026
    globalThis.Date = class extends realDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(2026, 1, 13);
        } else {
          // @ts-expect-error - spread constructor args
          super(...args);
        }
      }
      static now() {
        return fixed.getTime();
      }
    } as any;
  });

  afterEach(() => {
    globalThis.Date = realDate;
  });

  test('returns empty array for empty input', () => {
    expect(groupTransactionsByDate([])).toEqual([]);
  });

  test('labels today correctly', () => {
    const tx = makeTx({ transaction_date: new Date(2026, 1, 13) });
    const groups = groupTransactionsByDate([tx]);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('Today, 13 February 2026');
    expect(groups[0].relativeLabel).toBe('Today');
    expect(groups[0].fullDate).toBe('13 February 2026');
    expect(groups[0].dateKey).toBe('2026-02-13');
    expect(groups[0].transactions).toHaveLength(1);
  });

  test('labels yesterday correctly', () => {
    const tx = makeTx({ transaction_date: new Date(2026, 1, 12) });
    const groups = groupTransactionsByDate([tx]);
    expect(groups[0].label).toBe('Yesterday, 12 February 2026');
    expect(groups[0].relativeLabel).toBe('Yesterday');
    expect(groups[0].fullDate).toBe('12 February 2026');
    expect(groups[0].dateKey).toBe('2026-02-12');
  });

  test('formats older dates as "d MMMM yyyy"', () => {
    const tx = makeTx({ transaction_date: new Date(2026, 1, 10) });
    const groups = groupTransactionsByDate([tx]);
    expect(groups[0].label).toBe('10 February 2026');
    expect(groups[0].relativeLabel).toBeUndefined();
    expect(groups[0].fullDate).toBe('10 February 2026');
    expect(groups[0].dateKey).toBe('2026-02-10');
  });

  test('groups multiple transactions by date, ordered descending', () => {
    const txToday1 = makeTx({ id: 't1', transaction_date: new Date(2026, 1, 13) });
    const txToday2 = makeTx({ id: 't2', transaction_date: new Date(2026, 1, 13) });
    const txYesterday = makeTx({ id: 'y1', transaction_date: new Date(2026, 1, 12) });
    const txOld = makeTx({ id: 'o1', transaction_date: new Date(2026, 1, 9) });

    const groups = groupTransactionsByDate([txToday1, txYesterday, txToday2, txOld]);

    expect(groups).toHaveLength(3);
    expect(groups[0].label).toBe('Today, 13 February 2026');
    expect(groups[0].relativeLabel).toBe('Today');
    expect(groups[0].fullDate).toBe('13 February 2026');
    expect(groups[0].transactions).toHaveLength(2);
    expect(groups[1].label).toBe('Yesterday, 12 February 2026');
    expect(groups[1].relativeLabel).toBe('Yesterday');
    expect(groups[1].fullDate).toBe('12 February 2026');
    expect(groups[1].transactions).toHaveLength(1);
    expect(groups[2].label).toBe('9 February 2026');
    expect(groups[2].relativeLabel).toBeUndefined();
    expect(groups[2].fullDate).toBe('9 February 2026');
    expect(groups[2].transactions).toHaveLength(1);
  });

  test('preserves transaction order within same date group', () => {
    const tx1 = makeTx({ id: 'first', transaction_date: new Date(2026, 1, 13) });
    const tx2 = makeTx({ id: 'second', transaction_date: new Date(2026, 1, 13) });

    const groups = groupTransactionsByDate([tx1, tx2]);
    expect(groups[0].relativeLabel).toBe('Today');
    expect(groups[0].fullDate).toBe('13 February 2026');
    expect(groups[0].transactions[0].id).toBe('first');
    expect(groups[0].transactions[1].id).toBe('second');
  });

  test('handles string dates (ISO format)', () => {
    const tx = makeTx({ transaction_date: '2026-02-11' as any });
    const groups = groupTransactionsByDate([tx]);
    expect(groups[0].label).toBe('11 February 2026');
    expect(groups[0].relativeLabel).toBeUndefined();
    expect(groups[0].fullDate).toBe('11 February 2026');
    expect(groups[0].dateKey).toBe('2026-02-11');
  });

  test('handles cross-year dates', () => {
    const tx = makeTx({ transaction_date: new Date(2025, 11, 25) });
    const groups = groupTransactionsByDate([tx]);
    expect(groups[0].label).toBe('25 December 2025');
    expect(groups[0].relativeLabel).toBeUndefined();
    expect(groups[0].fullDate).toBe('25 December 2025');
  });
});
