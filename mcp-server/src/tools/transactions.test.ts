import { describe, it, expect } from 'bun:test';
import { listTransactionsSchema, addTransactionSchema } from './transactions';

describe('transaction tool schemas', () => {
  it('should validate list_transactions input', () => {
    expect(() => listTransactionsSchema.parse({})).not.toThrow();
    expect(() => listTransactionsSchema.parse({ type: 'expense', limit: 10 })).not.toThrow();
    expect(() => listTransactionsSchema.parse({ limit: 0 })).toThrow();
    expect(() => listTransactionsSchema.parse({ limit: 51 })).toThrow();
  });

  it('should validate add_transaction input', () => {
    expect(() =>
      addTransactionSchema.parse({
        amount: 50000,
        currency: 'IDR',
        category_name: 'Food',
        asset_name: 'Cash',
      })
    ).not.toThrow();
  });

  it('should reject invalid add_transaction input', () => {
    expect(() =>
      addTransactionSchema.parse({
        amount: -100,
        currency: 'IDR',
        category_name: 'Food',
        asset_name: 'Cash',
      })
    ).toThrow();

    expect(() =>
      addTransactionSchema.parse({
        amount: 100,
        currency: 'EUR',
        category_name: 'Food',
        asset_name: 'Cash',
      })
    ).toThrow();
  });
});
