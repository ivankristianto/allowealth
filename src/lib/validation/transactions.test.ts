import { describe, expect, it } from 'bun:test';
import { parse } from 'valibot';
import { createTransactionAPISchema, transactionFilterSchema } from './transactions';

describe('transaction validation', () => {
  it('requires a destination account for transfers', () => {
    expect(() =>
      parse(createTransactionAPISchema, {
        type: 'transfer',
        amount: '100',
        currency: 'IDR',
        account_id: 'account-1',
        transaction_date: '2026-03-10',
      })
    ).toThrow();
  });

  it('requires a category for non-transfer transactions', () => {
    expect(() =>
      parse(createTransactionAPISchema, {
        type: 'expense',
        amount: '100',
        currency: 'IDR',
        account_id: 'account-1',
        transaction_date: '2026-03-10',
      })
    ).toThrow();
  });

  it('rejects future transaction dates', () => {
    expect(() =>
      parse(createTransactionAPISchema, {
        type: 'expense',
        amount: '100',
        currency: 'IDR',
        category_id: 'category-1',
        account_id: 'account-1',
        transaction_date: '2099-03-10',
      })
    ).toThrow();
  });

  it('coerces filter inputs for dates, limit, and offset', () => {
    const parsed = parse(transactionFilterSchema, {
      limit: '10',
      offset: '5',
      start_date: '2026-03-01',
      end_date: '2026-03-10',
    });

    expect(parsed.limit).toBe(10);
    expect(parsed.offset).toBe(5);
    expect(parsed.start_date).toBeInstanceOf(Date);
    expect(parsed.end_date).toBeInstanceOf(Date);
  });
});
