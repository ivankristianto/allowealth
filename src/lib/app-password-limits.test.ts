import { describe, expect, test } from 'bun:test';
import { describeAppPasswordLimits } from './app-password-limits';

describe('describeAppPasswordLimits', () => {
  test('is empty without limits', () => {
    expect(describeAppPasswordLimits({})).toEqual([]);
  });

  test('counts categories and names the own-transactions limit', () => {
    expect(
      describeAppPasswordLimits({ category_ids: ['a', 'b'], own_transactions_only: true })
    ).toEqual(['2 categories', 'Own transactions only']);
    expect(describeAppPasswordLimits({ category_ids: ['a'] })).toEqual(['1 category']);
  });
});
