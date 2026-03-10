import { describe, expect, it } from 'bun:test';
import { parse } from 'valibot';
import {
  categoryTypeEnum,
  currencyEnum,
  recurringOccurrenceStatusEnum,
  recurringTemplateStatusEnum,
  transactionTypeEnum,
  type CategoryType,
  type Currency,
  type RecurringOccurrenceStatus,
  type RecurringTemplateStatus,
  type TransactionType,
} from './enums';

describe('shared enum schemas', () => {
  it('parses valid currencies', () => {
    const currency: Currency = parse(currencyEnum, 'IDR');

    expect(currency).toBe('IDR');
  });

  it('rejects invalid transaction types', () => {
    expect(() => parse(transactionTypeEnum, 'refund')).toThrow();
  });

  it('parses valid category types', () => {
    const categoryType: CategoryType = parse(categoryTypeEnum, 'expense');

    expect(categoryType).toBe('expense');
  });

  it('parses recurring template statuses', () => {
    const status: RecurringTemplateStatus = parse(recurringTemplateStatusEnum, 'paused');

    expect(status).toBe('paused');
  });

  it('parses recurring occurrence statuses', () => {
    const status: RecurringOccurrenceStatus = parse(recurringOccurrenceStatusEnum, 'confirmed');

    expect(status).toBe('confirmed');
  });

  it('preserves the transaction type output type', () => {
    const transactionType: TransactionType = parse(transactionTypeEnum, 'income');

    expect(transactionType).toBe('income');
  });
});
