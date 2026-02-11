import type { Currency } from '@/lib/enums';
import { formatCurrency } from '@/lib/formatting/currency';
import { subtractCurrency, multiplyCurrency } from './currency';
import { decimalCompare, decimalIsZero, decimalDivide } from './decimal';

/**
 * Budget status and calculation utilities
 */

export type BudgetStatus = 'ok' | 'warning' | 'exceeded';

export type BudgetUsageStatus = 'ok' | 'warning' | 'danger';

export interface BudgetStatusSummary {
  status: BudgetUsageStatus;
  badgeVariant: 'optimal' | 'review' | 'exceeded';
  label: string;
}

export function getBudgetStatus(percentage: number): BudgetStatusSummary {
  if (percentage > 100) {
    return {
      status: 'danger',
      badgeVariant: 'exceeded',
      label: 'Over Budget',
    };
  }

  if (percentage === 100) {
    return {
      status: 'warning',
      badgeVariant: 'review',
      label: 'On Budget',
    };
  }

  if (percentage >= 80) {
    return {
      status: 'warning',
      badgeVariant: 'review',
      label: 'Near Limit',
    };
  }

  return {
    status: 'ok',
    badgeVariant: 'optimal',
    label: 'On Track',
  };
}

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
  const remaining = subtractCurrency(budgetAmount, spentAmount);
  const percentageUsed = !decimalIsZero(budgetAmount)
    ? parseFloat(decimalDivide(multiplyCurrency(spentAmount, 100), budgetAmount))
    : 0;

  let status: BudgetStatus;
  if (decimalCompare(remaining, '0') < 0) {
    status = 'exceeded';
  } else if (percentageUsed >= 80) {
    status = 'warning';
  } else {
    status = 'ok';
  }

  // Calculate overage using decimal arithmetic if exceeded
  const overage =
    decimalCompare(remaining, '0') < 0
      ? subtractCurrency('0', remaining) // Get absolute value
      : '0';

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

/**
 * Predefined color palette for budget allocation visualization.
 * Colors are chosen for accessibility and visual distinction.
 * Uses HSL colors that work well in both light and dark themes.
 */
const ALLOCATION_COLORS = [
  '#ea580c', // orange-600 - Housing typically largest
  '#3b82f6', // blue-500 - Groceries
  '#15803d', // forest-600 - Utilities (accent)
  '#8b5cf6', // violet-500 - Dining
  '#a855f7', // purple-500 - Transport
  '#ec4899', // pink-500 - Entertainment
  '#14b8a6', // teal-500 - Healthcare
  '#f59e0b', // amber-500 - Education
  '#10b981', // emerald-500 - Personal
  '#ef4444', // red-500 - Other
] as const;

/**
 * Regex pattern for validating hex color strings.
 * Matches 6-character hex colors (e.g., #ea580c).
 */
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

/**
 * Default fallback color when validation fails.
 */
const DEFAULT_COLOR = '#6b7280'; // gray-500

/**
 * Validate a hex color string.
 * Used to prevent potential XSS via inline style injection.
 *
 * @param color - Color string to validate
 * @returns True if valid 6-character hex color
 */
export function isValidHexColor(color: string): boolean {
  return HEX_COLOR_REGEX.test(color);
}

/**
 * Sanitize a color value for safe use in inline styles.
 * Returns default gray if color is invalid.
 *
 * @param color - Color string to sanitize
 * @returns Validated hex color or default fallback
 */
export function sanitizeColor(color: string): string {
  return isValidHexColor(color) ? color : DEFAULT_COLOR;
}

/**
 * Generate a consistent color for a category based on its name.
 * Uses a hash function to ensure the same category always gets the same color.
 *
 * @param categoryName - The category name
 * @param index - Optional index for fallback ordering
 * @returns A hex color string
 */
export function getCategoryColor(categoryName: string, index?: number): string {
  // Simple hash function to generate consistent colors
  const hash = categoryName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const colorIndex = index !== undefined ? index : hash % ALLOCATION_COLORS.length;
  return ALLOCATION_COLORS[colorIndex % ALLOCATION_COLORS.length];
}

/**
 * Distribution item for allocation mix visualization
 */
export interface AllocationDistribution {
  name: string;
  weight: number;
  limit: number;
  color: string;
}

/**
 * Calculate allocation distribution for budget categories.
 * Used for the allocation mix bar in BudgetSummary.
 *
 * @param categories - Array of budget categories with name, budget_amount, and spent_amount
 * @returns Array of distribution items sorted by weight (largest first)
 */
export function calculateAllocationDistribution(
  categories: Array<{
    name: string;
    budget_amount: string;
    spent_amount?: string;
  }>
): AllocationDistribution[] {
  // Filter to only positive budget amounts first
  const validCategories = categories.filter((cat) => {
    const amount = parseFloat(cat.budget_amount || '0');
    return !isNaN(amount) && amount > 0;
  });

  // Calculate total from valid categories only
  const totalAllocated = validCategories.reduce(
    (sum, cat) => sum + parseFloat(cat.budget_amount || '0'),
    0
  );

  if (totalAllocated === 0) {
    return [];
  }

  // Calculate distribution with weights
  const distribution = validCategories
    .map((cat, index) => {
      const limit = parseFloat(cat.budget_amount || '0');
      return {
        name: cat.name,
        weight: (limit / totalAllocated) * 100,
        limit,
        color: getCategoryColor(cat.name, index),
      };
    })
    .sort((a, b) => b.weight - a.weight);

  return distribution;
}
