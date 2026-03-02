/**
 * Budget Health Widget Test Utilities
 * ===================================
 *
 * Shared helper functions for BudgetHealthWidget tests and local component previews.
 * Re-exports formatCurrency and formatPercentage from canonical formatting utilities.
 *
 * Usage in preview fixtures:
 * import { getStatusColor, getStatusBg, getStatusBadge, getProgressBarColor } from './__tests__/budget-health-test-utils';
 */

import { formatCurrency } from '@/lib/formatting/currency-client';
import { formatPercentage } from '@/lib/formatting/percentage';

// Re-export from tokens for test convenience
export { formatCurrency, formatPercentage };

/**
 * Get the text color class for a budget status.
 * Uses DaisyUI semantic color classes.
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'healthy':
      return 'text-success';
    case 'warning':
      return 'text-warning';
    case 'exceeded':
      return 'text-error';
    default:
      return 'text-neutral';
  }
};

/**
 * Get the badge variant for a budget status.
 * Maps status to DaisyUI badge variant.
 */
export const getStatusBadge = (status: string): string => {
  switch (status) {
    case 'healthy':
      return 'badge-success';
    case 'warning':
      return 'badge-warning';
    case 'exceeded':
      return 'badge-error';
    default:
      return 'badge-neutral';
  }
};

/**
 * Get the background color class for a budget status.
 * Uses DaisyUI semantic color classes with transparency.
 */
export const getStatusBg = (status: string): string => {
  switch (status) {
    case 'healthy':
      return 'bg-success/10 border-success/20';
    case 'warning':
      return 'bg-warning/10 border-warning/20';
    case 'exceeded':
      return 'bg-error/10 border-error/20';
    default:
      return 'bg-base-200 border-base-300';
  }
};

/**
 * Get the background color without border for icon wrapper.
 */
export const getStatusBgOnly = (status: string): string => {
  switch (status) {
    case 'healthy':
      return 'bg-success/50';
    case 'warning':
      return 'bg-warning/50';
    case 'exceeded':
      return 'bg-error/50';
    default:
      return 'bg-base-200';
  }
};

/**
 * Get the progress bar color class based on percentage.
 * Uses DaisyUI semantic color classes.
 */
export const getProgressBarColor = (percentage: number): string => {
  if (percentage >= 100) return 'bg-error';
  if (percentage >= 80) return 'bg-warning';
  return 'bg-success';
};

/**
 * Get the alert item status color class.
 */
export const getAlertItemStatusBadge = (status: string): string => {
  switch (status) {
    case 'exceeded':
      return 'badge-error';
    case 'warning':
      return 'badge-warning';
    default:
      return 'badge-success';
  }
};
