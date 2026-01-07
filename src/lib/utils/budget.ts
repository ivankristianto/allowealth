import type { Currency } from '@/lib/types';
import { subtractCurrency, divideCurrency, multiplyCurrency, addCurrency } from './currency';

/**
 * Budget status and calculation utilities
 */

export type BudgetStatus = 'ok' | 'warning' | 'exceeded';

/**
 * Calculate budget status for a category
 * @param budgetAmount - Budget limit as string
 * @param spentAmount - Amount spent as string
 * @returns Budget status information
 */
export interface BudgetStatusResult {
  budget_amount: string;
  spent_amount: string;
  remaining: string;
  percentage_used: number;
  status: BudgetStatus;
  overage: string; // Amount over budget if exceeded
}

export function calculateBudgetStatus(
  budgetAmount: string,
  spentAmount: string
): BudgetStatusResult {
  const budgetNum = parseFloat(budgetAmount) || 0;
  const spentNum = parseFloat(spentAmount) || 0;

  const remaining = subtractCurrency(budgetAmount, spentAmount);
  const remainingNum = parseFloat(remaining);

  const percentageUsed =
    budgetNum > 0 ? parseFloat(divideCurrency(multiplyCurrency(spentAmount, 100), budgetNum)) : 0;

  let status: BudgetStatus;
  if (remainingNum < 0) {
    status = 'exceeded';
  } else if (percentageUsed >= 80) {
    status = 'warning';
  } else {
    status = 'ok';
  }

  const overage = remainingNum < 0 ? Math.abs(remainingNum).toString() : '0';

  return {
    budget_amount: budgetAmount,
    spent_amount: spentAmount,
    remaining,
    percentage_used: Math.round(percentageUsed),
    status,
    overage,
  };
}

/**
 * Get CSS class for budget status (for DaisyUI styling)
 * @param status - Budget status
 * @returns CSS class string
 */
export function getBudgetStatusClass(status: BudgetStatus): string {
  switch (status) {
    case 'ok':
      return 'text-success bg-success/10';
    case 'warning':
      return 'text-warning bg-warning/10';
    case 'exceeded':
      return 'text-error bg-error/10';
    default:
      return '';
  }
}

/**
 * Get badge icon/emoji for budget status
 * @param status - Budget status
 * @returns Icon or emoji string
 */
export function getBudgetStatusIcon(status: BudgetStatus): string {
  switch (status) {
    case 'ok':
      return '🟢';
    case 'warning':
      return '🟡';
    case 'exceeded':
      return '🔴';
    default:
      return '⚪';
  }
}

/**
 * Calculate total budget for all categories
 * @param categories - Array of category budgets
 * @returns Total budget amount and percentage allocation
 */
export interface BudgetTotal {
  total_budget: string;
  total_percentage: number;
  is_over_allocated: boolean; // Total percentage > 100%
}

export function calculateTotalBudget(
  categories: Array<{ budget_amount: string; percentage: string }>
): BudgetTotal {
  let totalBudget = '0';
  let totalPercentage = 0;

  for (const category of categories) {
    totalBudget = addCurrency(totalBudget, category.budget_amount);
    totalPercentage += parseFloat(category.percentage) || 0;
  }

  return {
    total_budget: totalBudget,
    total_percentage: Math.round(totalPercentage),
    is_over_allocated: totalPercentage > 100,
  };
}

/**
 * Check if user should be warned about budget allocation
 * @param totalPercentage - Total percentage allocated
 * @returns True if warning should be shown
 */
export function shouldWarnBudgetAllocation(totalPercentage: number): boolean {
  return totalPercentage > 100;
}

/**
 * Format budget status for display
 * @param result - Budget status result
 * @param currency - Currency code
 * @returns Formatted string for display
 */
export function formatBudgetStatus(result: BudgetStatusResult, currency: Currency): string {
  if (result.status === 'exceeded') {
    return `Exceeded by ${formatCurrency(result.overage, currency)}`;
  } else if (result.status === 'warning') {
    return `${result.percentage_used}% used`;
  } else {
    return `${formatCurrency(result.remaining, currency)} remaining`;
  }
}

/**
 * Get budget progress bar width percentage
 * @param status - Budget status result
 * @returns Width percentage (clamped to 0-100)
 */
export function getBudgetProgressWidth(status: BudgetStatusResult): number {
  return Math.min(Math.max(status.percentage_used, 0), 100);
}

/**
 * Get budget progress bar color class (DaisyUI)
 * @param status - Budget status
 * @returns CSS class for progress bar
 */
export function getBudgetProgressClass(status: BudgetStatus): string {
  switch (status) {
    case 'ok':
      return 'bg-success';
    case 'warning':
      return 'bg-warning';
    case 'exceeded':
      return 'bg-error';
    default:
      return 'bg-neutral';
  }
}

// Re-export formatCurrency from currency module for convenience
import { formatCurrency } from './currency';
export { formatCurrency };
