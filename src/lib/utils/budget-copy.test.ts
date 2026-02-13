import { describe, expect, it } from 'bun:test';
import { COPY_BUDGET_TO_NEXT_MONTH_LABEL, getCopyBudgetAvailability } from './budget-copy';

describe('getCopyBudgetAvailability', () => {
  it('uses the expected copy action label', () => {
    expect(COPY_BUDGET_TO_NEXT_MONTH_LABEL).toBe('Copy budget to next month');
  });

  it('shows enabled action when source month has budgets and next month has none', () => {
    expect(
      getCopyBudgetAvailability({
        sourceBudgetCount: 4,
        hasNextMonthBudgets: false,
      })
    ).toEqual({
      isVisible: true,
      isDisabled: false,
      disabledReason: 'none',
    });
  });

  it('shows disabled action when next month already has budgets', () => {
    expect(
      getCopyBudgetAvailability({
        sourceBudgetCount: 4,
        hasNextMonthBudgets: true,
      })
    ).toEqual({
      isVisible: true,
      isDisabled: true,
      disabledReason: 'target-month-has-budgets',
    });
  });

  it('hides action when source month has no budgets to copy', () => {
    expect(
      getCopyBudgetAvailability({
        sourceBudgetCount: 0,
        hasNextMonthBudgets: false,
      })
    ).toEqual({
      isVisible: false,
      isDisabled: true,
      disabledReason: 'no-source-budgets',
    });
  });
});
