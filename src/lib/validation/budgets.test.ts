import { describe, expect, it } from 'bun:test';
import { parse } from 'valibot';
import {
  copyBudgetsAPISchema,
  copyBudgetsSchema,
  createBudgetSchema,
  initializeBudgetsAPISchema,
} from './budgets';

describe('budget validation', () => {
  it('parses required service-layer budget fields', () => {
    const parsed = parse(createBudgetSchema, {
      workspace_id: 'workspace-1',
      created_by_user_id: 'user-1',
      category_id: 'category-1',
      month: 3,
      year: 2026,
      budget_amount: '1000',
      currency: 'IDR',
    });

    expect(parsed.notes).toBeNull();
    expect(parsed.currency).toBe('IDR');
  });

  it('rejects copying budgets to the same month and year', () => {
    expect(() =>
      parse(copyBudgetsSchema, {
        workspace_id: 'workspace-1',
        created_by_user_id: 'user-1',
        source_month: 3,
        source_year: 2026,
        target_month: 3,
        target_year: 2026,
      })
    ).toThrow();
  });

  it('coerces API month and year inputs to numbers for copy budgets', () => {
    const parsed = parse(copyBudgetsAPISchema, {
      source_month: '1',
      source_year: '2026',
      target_month: '2',
      target_year: '2026',
    });

    expect(parsed).toEqual({
      source_month: 1,
      source_year: 2026,
      target_month: 2,
      target_year: 2026,
    });
  });

  it('coerces initialize budget API inputs to numbers', () => {
    const parsed = parse(initializeBudgetsAPISchema, {
      month: '3',
      year: '2026',
      currency: 'USD',
    });

    expect(parsed).toEqual({
      month: 3,
      year: 2026,
      currency: 'USD',
    });
  });
});
