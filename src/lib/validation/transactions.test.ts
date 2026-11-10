import { describe, expect, it } from 'bun:test';
import { parse } from 'valibot';
import {
  createTransactionAPISchema,
  createTransactionSchema,
  transactionFilterSchema,
  updateTransactionAPISchema,
  updateTransactionSchema,
} from './transactions';

describe('transaction validation', () => {
  it('requires a destination account for transfers', () => {
    expect(() =>
      parse(createTransactionAPISchema, {
        type: 'transfer',
        amount: '100',
        currency: 'IDR',
        account_id: 'account-1',
        transaction_date: '2020-01-15',
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
        transaction_date: '2020-01-15',
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
      start_date: '2020-01-01',
      end_date: '2020-01-15',
    });

    expect(parsed.limit).toBe(10);
    expect(parsed.offset).toBe(5);
    expect(parsed.start_date).toBeInstanceOf(Date);
    expect(parsed.end_date).toBeInstanceOf(Date);
  });

  describe('amount', () => {
    const apiInput = {
      type: 'expense',
      currency: 'IDR',
      category_id: 'category-1',
      account_id: 'account-1',
      transaction_date: '2020-01-15',
    };
    const serviceInput = {
      workspace_id: 'workspace-1',
      created_by_user_id: 'user-1',
      type: 'expense',
      currency: 'IDR',
      category_id: 'category-1',
      account_id: 'account-1',
      transaction_date: new Date('2020-01-15'),
    };

    for (const amount of ['1,000', '100abc', 'Infinity', '-5', '0', '100.123']) {
      it(`rejects ${amount} on create and update`, () => {
        expect(() => parse(createTransactionAPISchema, { ...apiInput, amount })).toThrow();
        expect(() => parse(createTransactionSchema, { ...serviceInput, amount })).toThrow();
        expect(() => parse(updateTransactionAPISchema, { amount })).toThrow();
        expect(() => parse(updateTransactionSchema, { amount })).toThrow();
      });
    }

    for (const amount of ['1', '50000', '1250.5', '1250.75']) {
      it(`accepts ${amount}`, () => {
        expect(parse(createTransactionAPISchema, { ...apiInput, amount }).amount).toBe(amount);
        expect(parse(updateTransactionSchema, { amount }).amount).toBe(amount);
      });
    }
  });
});
