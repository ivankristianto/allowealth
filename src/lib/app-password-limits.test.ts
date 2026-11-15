import { describe, expect, test } from 'bun:test';
import { describeAppPasswordLimits, limitCategoryGroups } from './app-password-limits';

describe('describeAppPasswordLimits', () => {
  const existing = new Set(['a', 'b']);

  test('is empty without limits', () => {
    expect(describeAppPasswordLimits({}, existing)).toEqual([]);
  });

  test('counts categories and names the own-transactions limit', () => {
    expect(
      describeAppPasswordLimits({ category_ids: ['a', 'b'], own_transactions_only: true }, existing)
    ).toEqual(['2 categories', 'Own transactions only']);
    expect(describeAppPasswordLimits({ category_ids: ['a'] }, existing)).toEqual(['1 category']);
  });

  test('counts only categories that still exist, and still shows an allowlist that matches none', () => {
    expect(describeAppPasswordLimits({ category_ids: ['a', 'gone'] }, existing)).toEqual([
      '1 category',
    ]);
    expect(describeAppPasswordLimits({ category_ids: ['gone'] }, existing)).toEqual([
      '0 categories',
    ]);
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
