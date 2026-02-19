import { describe, it, expect } from 'bun:test';
import { listTransactionsSchema, addTransactionSchema } from './transactions';

describe('transaction tool schemas', () => {
  it('should validate list_transactions input', () => {
    expect(() => listTransactionsSchema.parse({})).not.toThrow();
    expect(() => listTransactionsSchema.parse({ type: 'expense', limit: 10 })).not.toThrow();
    expect(() => listTransactionsSchema.parse({ limit: 0 })).toThrow();
    expect(() => listTransactionsSchema.parse({ limit: 51 })).toThrow();
  });

  it('should accept valid date strings', () => {
    expect(() =>
      listTransactionsSchema.parse({ start_date: '2024-01-01', end_date: '2024-12-31' })
    ).not.toThrow();
  });

  it('should reject invalid date strings', () => {
    expect(() => listTransactionsSchema.parse({ start_date: 'not-a-date' })).toThrow();
  });

  it('should reject start_date after end_date', () => {
    expect(() =>
      listTransactionsSchema.parse({ start_date: '2024-12-31', end_date: '2024-01-01' })
    ).toThrow();
  });

  it('should validate add_transaction input', () => {
    expect(() =>
      addTransactionSchema.parse({
        amount: 50000,
        currency: 'IDR',
        category_name: 'Food',
        account_name: 'Cash',
      })
    ).not.toThrow();
  });

  it('should accept valid date in add_transaction', () => {
    expect(() =>
      addTransactionSchema.parse({
        amount: 50000,
        currency: 'IDR',
        category_name: 'Food',
        account_name: 'Cash',
        date: '2024-06-15',
      })
    ).not.toThrow();
  });

  it('should reject invalid date in add_transaction', () => {
    expect(() =>
      addTransactionSchema.parse({
        amount: 50000,
        currency: 'IDR',
        category_name: 'Food',
        account_name: 'Cash',
        date: 'garbage',
      })
    ).toThrow();
  });

  it('should reject invalid add_transaction input', () => {
    expect(() =>
      addTransactionSchema.parse({
        amount: -100,
        currency: 'IDR',
        category_name: 'Food',
        account_name: 'Cash',
      })
    ).toThrow();

    expect(() =>
      addTransactionSchema.parse({
        amount: 100,
        currency: 'EUR',
        category_name: 'Food',
        account_name: 'Cash',
      })
    ).toThrow();
  });
});
