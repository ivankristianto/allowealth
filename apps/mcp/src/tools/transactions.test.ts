import { describe, it, expect } from 'bun:test';
import { parse } from 'valibot';
import { listTransactionsSchema, addTransactionSchema } from './transactions';

describe('transaction tool schemas', () => {
  it('should validate list_transactions input', () => {
    expect(() => parse(listTransactionsSchema, {})).not.toThrow();
    expect(() => parse(listTransactionsSchema, { type: 'expense', limit: 10 })).not.toThrow();
    expect(() => parse(listTransactionsSchema, { limit: 0 })).toThrow();
    expect(() => parse(listTransactionsSchema, { limit: 51 })).toThrow();
  });

  it('should accept valid date strings', () => {
    expect(() =>
      parse(listTransactionsSchema, { start_date: '2024-01-01', end_date: '2024-12-31' })
    ).not.toThrow();
  });

  it('should reject invalid date strings', () => {
    expect(() => parse(listTransactionsSchema, { start_date: 'not-a-date' })).toThrow();
  });

  it('should reject start_date after end_date', () => {
    expect(() =>
      parse(listTransactionsSchema, { start_date: '2024-12-31', end_date: '2024-01-01' })
    ).toThrow();
  });

  it('should validate add_transaction input', () => {
    expect(() =>
      parse(addTransactionSchema, {
        amount: 50000,
        currency: 'IDR',
        category_name: 'Food',
        account_name: 'Cash',
      })
    ).not.toThrow();
  });

  it('should accept valid date in add_transaction', () => {
    expect(() =>
      parse(addTransactionSchema, {
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
      parse(addTransactionSchema, {
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
      parse(addTransactionSchema, {
        amount: -100,
        currency: 'IDR',
        category_name: 'Food',
        account_name: 'Cash',
      })
    ).toThrow();

    expect(() =>
      parse(addTransactionSchema, {
        amount: 100,
        currency: 'CAD',
        category_name: 'Food',
        account_name: 'Cash',
      })
    ).toThrow();
  });
});
