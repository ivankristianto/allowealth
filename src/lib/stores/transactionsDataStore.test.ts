import { describe, expect, test } from 'bun:test';
import type { TransactionOutput } from '@/lib/types/transaction';
import { filterCachedTransactions } from './transactionsDataStore';

function transaction(overrides: Partial<TransactionOutput>): TransactionOutput {
  const now = new Date();
  return {
    id: 't1',
    type: 'expense',
    amount: '1000',
    currency: 'IDR',
    description: null,
    transaction_date: now,
    updated_by_user_id: null,
    deleted_by_user_id: null,
    deleted_at: null,
    created_at: now,
    updated_at: now,
    category: { id: 'food', name: 'Food', type: 'expense', icon: 'x', color: '#000' },
    account: { id: 'a1', name: 'Cash', type: 'cash' },
    ...overrides,
  };
}

describe('filterCachedTransactions', () => {
  const groceries = transaction({ id: 'groceries' });
  const transfer = transaction({ id: 'transfer', type: 'transfer', category: null });

  test('skips transfers, which have no category, when filtering by category', () => {
    const result = filterCachedTransactions([groceries, transfer], { category_ids: ['food'] });
    expect(result.map((t) => t.id)).toEqual(['groceries']);
  });

  test('searches category names without failing on transfers', () => {
    const result = filterCachedTransactions([groceries, transfer], { search: 'foo' });
    expect(result.map((t) => t.id)).toEqual(['groceries']);
  });
});
