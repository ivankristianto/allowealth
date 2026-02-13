export type BudgetMetricTone = 'success' | 'error';
export const COPY_BUDGET_TO_NEXT_MONTH_LABEL = 'Copy budget to next month';

export interface RemainingBudgetMetric {
  label: 'Remaining' | 'Overbudget';
  value: number;
  tone: BudgetMetricTone;
}

interface BudgetAllocationOpenStateInput {
  previousIsWide?: boolean;
  isWide: boolean;
}

export function getRemainingBudgetMetric(
  totalAllocated: number,
  totalSpent: number
): RemainingBudgetMetric {
  const delta = totalAllocated - totalSpent;

  if (delta < 0) {
    return {
      label: 'Overbudget',
      value: Math.abs(delta),
      tone: 'error',
    };
  }

  return {
    label: 'Remaining',
    value: delta,
    tone: 'success',
  };
}

export function resolveBudgetAllocationOpenState({
  previousIsWide,
  isWide,
}: BudgetAllocationOpenStateInput): boolean | null {
  if (previousIsWide === undefined) {
    return isWide;
  }

  if (previousIsWide === isWide) {
    return null;
  }

  return isWide;
}
