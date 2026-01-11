/**
 * Budget Alert Calculation
 * ========================
 * Provides utilities for calculating budget alerts and status.
 */

import {
  decimalAdd,
  decimalSubtract,
  decimalDivide,
  decimalMultiply,
  decimalCompare,
  decimalIsZero,
} from '@/lib/utils/decimal';

/**
 * Budget alert status
 */
export type BudgetStatus = 'healthy' | 'warning' | 'exceeded';

/**
 * Budget alert details
 */
export interface BudgetAlert {
  category: string;
  budget: string;
  spent: string;
  percentage: number;
  status: 'warning' | 'exceeded';
  remaining: string;
  overage: string;
}

/**
 * Budget health summary
 */
export interface BudgetHealthSummary {
  status: BudgetStatus;
  alertCount: number;
  warningCount: number;
  exceededCount: number;
}

/**
 * Alert thresholds
 */
export const ALERT_THRESHOLDS = {
  WARNING: 80, // 80% of budget
  EXCEEDED: 100, // 100% of budget
} as const;

/**
 * Calculate budget status based on percentage used
 *
 * @param budget - Budget amount as string
 * @param spent - Amount spent as string
 * @returns Budget status ('healthy', 'warning', or 'exceeded')
 *
 * @example
 * calculateBudgetStatus('100', '50') // Returns 'healthy'
 * calculateBudgetStatus('100', '85') // Returns 'warning'
 * calculateBudgetStatus('100', '100') // Returns 'exceeded'
 * calculateBudgetStatus('100', '120') // Returns 'exceeded'
 */
export function calculateBudgetStatus(budget: string, spent: string): BudgetStatus {
  // Handle zero or negative budget
  if (decimalIsZero(budget) || decimalCompare(budget, '0') <= 0) {
    return 'healthy';
  }

  const percentage = parseFloat(decimalDivide(decimalMultiply(spent, '100'), budget));

  if (percentage >= ALERT_THRESHOLDS.EXCEEDED) {
    return 'exceeded';
  } else if (percentage >= ALERT_THRESHOLDS.WARNING) {
    return 'warning';
  }

  return 'healthy';
}

/**
 * Calculate budget alert details
 *
 * @param category - Category name
 * @param budget - Budget amount as string
 * @param spent - Amount spent as string
 * @returns Budget alert object or null if no alert
 *
 * @example
 * calculateBudgetAlert('Food', '100', '85') // Returns warning alert
 * calculateBudgetAlert('Food', '100', '100') // Returns exceeded alert
 * calculateBudgetAlert('Food', '100', '50') // Returns null (no alert)
 */
export function calculateBudgetAlert(
  category: string,
  budget: string,
  spent: string
): BudgetAlert | null {
  // Handle zero or negative budget
  if (decimalIsZero(budget) || decimalCompare(budget, '0') <= 0) {
    return null;
  }

  const percentage = parseFloat(decimalDivide(decimalMultiply(spent, '100'), budget));
  const remaining = decimalSubtract(budget, spent);
  const overage = decimalCompare(spent, budget) > 0 ? decimalSubtract(spent, budget) : '0';

  // Determine status
  let status: 'warning' | 'exceeded' | null = null;
  if (percentage >= ALERT_THRESHOLDS.EXCEEDED) {
    status = 'exceeded';
  } else if (percentage >= ALERT_THRESHOLDS.WARNING) {
    status = 'warning';
  }

  // Return null if no alert
  if (!status) {
    return null;
  }

  return {
    category,
    budget,
    spent,
    percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
    status,
    remaining,
    overage,
  };
}

/**
 * Calculate multiple budget alerts
 *
 * @param budgets - Array of budget items with category, budget, and spent
 * @returns Array of budget alerts
 *
 * @example
 * calculateBudgetAlerts([
 *   { category: 'Food', budget: '100', spent: '85' },
 *   { category: 'Transport', budget: '50', spent: '60' }
 * ])
 * // Returns alerts for both categories
 */
export function calculateBudgetAlerts(
  budgets: Array<{ category: string; budget: string; spent: string }>
): BudgetAlert[] {
  const alerts: BudgetAlert[] = [];

  for (const { category, budget, spent } of budgets) {
    const alert = calculateBudgetAlert(category, budget, spent);
    if (alert) {
      alerts.push(alert);
    }
  }

  // Sort by percentage descending (most critical first)
  return alerts.sort((a, b) => b.percentage - a.percentage);
}

/**
 * Calculate budget health summary
 *
 * @param budgets - Array of budget items with category, budget, and spent
 * @returns Budget health summary with status and counts
 *
 * @example
 * calculateBudgetHealthSummary([
 *   { category: 'Food', budget: '100', spent: '85' },
 *   { category: 'Transport', budget: '50', spent: '60' }
 * ])
 * // Returns { status: 'exceeded', alertCount: 2, warningCount: 1, exceededCount: 1 }
 */
export function calculateBudgetHealthSummary(
  budgets: Array<{ category: string; budget: string; spent: string }>
): BudgetHealthSummary {
  let warningCount = 0;
  let exceededCount = 0;

  for (const { budget, spent } of budgets) {
    if (decimalIsZero(budget) || decimalCompare(budget, '0') <= 0) continue;

    const status = calculateBudgetStatus(budget, spent);
    if (status === 'exceeded') {
      exceededCount++;
    } else if (status === 'warning') {
      warningCount++;
    }
  }

  const alertCount = warningCount + exceededCount;

  // Overall status is determined by worst case
  let status: BudgetStatus = 'healthy';
  if (exceededCount > 0) {
    status = 'exceeded';
  } else if (warningCount > 0) {
    status = 'warning';
  }

  return {
    status,
    alertCount,
    warningCount,
    exceededCount,
  };
}

/**
 * Calculate budget remaining amount
 *
 * @param budget - Budget amount as string
 * @param spent - Amount spent as string
 * @returns Remaining amount as string (can be negative if over budget)
 *
 * @example
 * calculateBudgetRemaining('100', '50') // Returns '50'
 * calculateBudgetRemaining('100', '100') // Returns '0'
 * calculateBudgetRemaining('100', '120') // Returns '-20'
 */
export function calculateBudgetRemaining(budget: string, spent: string): string {
  return decimalSubtract(budget, spent);
}

/**
 * Calculate budget percentage used
 *
 * @param budget - Budget amount as string
 * @param spent - Amount spent as string
 * @returns Percentage used (can be over 100)
 *
 * @example
 * calculateBudgetPercentage('100', '50') // Returns 50
 * calculateBudgetPercentage('100', '100') // Returns 100
 * calculateBudgetPercentage('100', '120') // Returns 120
 */
export function calculateBudgetPercentage(budget: string, spent: string): number {
  if (decimalIsZero(budget) || decimalCompare(budget, '0') <= 0) {
    return 0;
  }
  return Math.round(parseFloat(decimalDivide(decimalMultiply(spent, '100'), budget)) * 10) / 10; // Round to 1 decimal
}

/**
 * Check if budget is healthy (no alerts)
 *
 * @param budget - Budget amount as string
 * @param spent - Amount spent as string
 * @returns True if healthy, false otherwise
 */
export function isBudgetHealthy(budget: string, spent: string): boolean {
  return calculateBudgetStatus(budget, spent) === 'healthy';
}

/**
 * Check if budget has warning
 *
 * @param budget - Budget amount as string
 * @param spent - Amount spent as string
 * @returns True if warning, false otherwise
 */
export function isBudgetWarning(budget: string, spent: string): boolean {
  return calculateBudgetStatus(budget, spent) === 'warning';
}

/**
 * Check if budget is exceeded
 *
 * @param budget - Budget amount as string
 * @param spent - Amount spent as string
 * @returns True if exceeded, false otherwise
 */
export function isBudgetExceeded(budget: string, spent: string): boolean {
  return calculateBudgetStatus(budget, spent) === 'exceeded';
}
