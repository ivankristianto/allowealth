import { describe, expect, test } from 'bun:test';
import { describeAppPasswordLimits, limitCategoryGroups } from './app-password-limits';

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

describe('limitCategoryGroups', () => {
  const categories = [
    { id: 'food', name: 'Food', type: 'expense', is_active: true },
    { id: 'old', name: 'Old rent', type: 'expense', is_active: false },
    { id: 'gift', name: 'Gift', type: 'expense', is_active: false },
    { id: 'salary', name: 'Salary', type: 'income', is_active: true },
  ] as const;

  test('groups active categories by type and keeps inactive ones the token lists', () => {
    expect(limitCategoryGroups(categories, { category_ids: ['old'] })).toEqual([
      { label: 'Expense', categories: [categories[0], categories[1]] },
      { label: 'Income', categories: [categories[3]] },
    ]);
  });

  test('drops a group with nothing to offer', () => {
    expect(limitCategoryGroups([categories[3]], {})).toEqual([
      { label: 'Income', categories: [categories[3]] },
    ]);
  });
});
