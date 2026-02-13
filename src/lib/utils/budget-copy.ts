export const COPY_BUDGET_TO_NEXT_MONTH_LABEL = 'Copy budget to next month';

export type CopyBudgetDisabledReason = 'none' | 'target-month-has-budgets' | 'no-source-budgets';

export interface CopyBudgetAvailabilityInput {
  sourceBudgetCount: number;
  hasNextMonthBudgets: boolean;
}

export interface CopyBudgetAvailability {
  isVisible: boolean;
  isDisabled: boolean;
  disabledReason: CopyBudgetDisabledReason;
}

export function getCopyBudgetAvailability({
  sourceBudgetCount,
  hasNextMonthBudgets,
}: CopyBudgetAvailabilityInput): CopyBudgetAvailability {
  if (sourceBudgetCount <= 0) {
    return {
      isVisible: false,
      isDisabled: true,
      disabledReason: 'no-source-budgets',
    };
  }

  if (hasNextMonthBudgets) {
    return {
      isVisible: true,
      isDisabled: true,
      disabledReason: 'target-month-has-budgets',
    };
  }

  return {
    isVisible: true,
    isDisabled: false,
    disabledReason: 'none',
  };
}
