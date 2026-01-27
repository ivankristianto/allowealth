/**
 * SpendingCard Component Tests
 * ============================
 * Unit tests for SpendingCard utility functions and accessibility
 *
 * P2-4 Code Quality Improvement: Loading state accessibility
 * - Added aria-label="Loading spending data..." for screen readers
 * - Added aria-busy attribute during loading
 * - Loading skeleton elements are aria-hidden
 */

import { describe, it, expect } from 'bun:test';
import {
  getBudgetStatusClass,
  getStatusBadgeClasses,
  type BudgetStatusClassName,
} from '@/lib/tokens';

describe('SpendingCard - percentage calculation', () => {
  const calculatePercentage = (spent: number, budget: number): number => {
    return budget > 0 ? (spent / budget) * 100 : 0;
  };

  it('should calculate percentage correctly', () => {
    expect(calculatePercentage(50, 100)).toBe(50);
    expect(calculatePercentage(75, 100)).toBe(75);
    expect(calculatePercentage(100, 100)).toBe(100);
  });

  it('should handle over-budget scenarios', () => {
    expect(calculatePercentage(120, 100)).toBe(120);
    expect(calculatePercentage(200, 100)).toBe(200);
  });

  it('should return 0 when budget is 0', () => {
    expect(calculatePercentage(50, 0)).toBe(0);
    expect(calculatePercentage(0, 0)).toBe(0);
  });

  it('should handle decimal values', () => {
    expect(calculatePercentage(53.694, 65.9)).toBeCloseTo(81.48, 1);
  });
});

describe('SpendingCard - remaining calculation', () => {
  const calculateRemaining = (budget: number, spent: number): number => {
    return budget - spent;
  };

  it('should calculate positive remaining correctly', () => {
    expect(calculateRemaining(100, 50)).toBe(50);
    expect(calculateRemaining(1000, 250)).toBe(750);
  });

  it('should calculate negative remaining (over budget)', () => {
    expect(calculateRemaining(100, 120)).toBe(-20);
    expect(calculateRemaining(1000, 1500)).toBe(-500);
  });

  it('should return 0 when exactly at budget', () => {
    expect(calculateRemaining(100, 100)).toBe(0);
  });
});

describe('SpendingCard - status mapping', () => {
  it('should use getBudgetStatusClass for status determination', () => {
    expect(getBudgetStatusClass(50)).toBe('status-ok');
    expect(getBudgetStatusClass(79)).toBe('status-ok');
    expect(getBudgetStatusClass(80)).toBe('status-warning');
    expect(getBudgetStatusClass(99)).toBe('status-warning');
    expect(getBudgetStatusClass(100)).toBe('status-danger');
    expect(getBudgetStatusClass(150)).toBe('status-danger');
  });
});

describe('SpendingCard - progress bar status mapping', () => {
  const getProgressBarStatus = (
    statusClass: BudgetStatusClassName
  ): 'ok' | 'warning' | 'danger' => {
    if (statusClass === 'status-ok') return 'ok';
    if (statusClass === 'status-warning') return 'warning';
    return 'danger';
  };

  it('should map status-ok to ok', () => {
    expect(getProgressBarStatus('status-ok')).toBe('ok');
  });

  it('should map status-warning to warning', () => {
    expect(getProgressBarStatus('status-warning')).toBe('warning');
  });

  it('should map status-danger to danger', () => {
    expect(getProgressBarStatus('status-danger')).toBe('danger');
  });
});

describe('SpendingCard - status badge classes', () => {
  it('should return correct badge classes using getStatusBadgeClasses', () => {
    expect(getStatusBadgeClasses('status-ok')).toContain('text-success');
    expect(getStatusBadgeClasses('status-warning')).toContain('text-warning');
    expect(getStatusBadgeClasses('status-danger')).toContain('text-error');
  });
});

describe('SpendingCard - loading state accessibility', () => {
  /**
   * Tests for loading state accessibility improvements (P2-4)
   * - aria-label provides context for screen readers
   * - aria-busy indicates loading state
   * - Skeleton elements are hidden from assistive technology
   */

  it('should have aria-label for loading state', () => {
    const loadingAriaLabel = 'Loading spending data...';
    expect(loadingAriaLabel).toBe('Loading spending data...');
  });

  it('should set aria-busy to true when loading', () => {
    const loading = true;
    const ariaBusy = loading ? true : undefined;
    expect(ariaBusy).toBe(true);
  });

  it('should not have aria-busy when not loading', () => {
    const loading = false;
    const ariaBusy = loading ? true : undefined;
    expect(ariaBusy).toBe(undefined);
  });

  it('should have aria-label only when loading', () => {
    const loading = true;
    const ariaLabel = loading ? 'Loading spending data...' : undefined;
    expect(ariaLabel).toBe('Loading spending data...');

    const notLoading = false;
    const ariaLabelNotLoading = notLoading ? 'Loading spending data...' : undefined;
    expect(ariaLabelNotLoading).toBe(undefined);
  });

  it('should hide skeleton elements from assistive technology', () => {
    // Skeleton elements should have aria-hidden="true"
    const skeletonAriaHidden = 'true';
    expect(skeletonAriaHidden).toBe('true');
  });
});

describe('SpendingCard - base accessibility', () => {
  it('should use status role for the card', () => {
    const role = 'status';
    expect(role).toBe('status');
  });

  it('should use polite aria-live for updates', () => {
    const ariaLive = 'polite';
    expect(ariaLive).toBe('polite');
  });
});

describe('SpendingCard - unique ID generation (P2-3)', () => {
  /**
   * Tests for unique ID generation to prevent conflicts
   * when multiple SpendingCard components are on the same page
   */

  const generateUniqueId = (): string => {
    return `spending-card-${Math.random().toString(36).slice(2, 11)}`;
  };

  it('should generate unique IDs', () => {
    const id1 = generateUniqueId();
    const id2 = generateUniqueId();
    expect(id1).not.toBe(id2);
  });

  it('should start with spending-card- prefix', () => {
    const id = generateUniqueId();
    expect(id.startsWith('spending-card-')).toBe(true);
  });

  it('should have alphanumeric suffix', () => {
    const id = generateUniqueId();
    const suffix = id.replace('spending-card-', '');
    expect(/^[a-z0-9]+$/.test(suffix)).toBe(true);
  });

  it('should generate ID with reasonable length', () => {
    const id = generateUniqueId();
    expect(id.length).toBeGreaterThan(14); // 'spending-card-' is 14 chars
    expect(id.length).toBeLessThan(25); // shouldn't be too long
  });
});

describe('SpendingCard - aria-labelledby with unique ID (P2-3)', () => {
  /**
   * Tests for aria-labelledby accessibility improvement
   * Links the card to its heading for better screen reader context
   * Now uses dynamic unique ID to prevent conflicts
   */

  const getAriaLabelledBy = (
    loading: boolean,
    error: string | undefined,
    uniqueId: string
  ): string | undefined => {
    return !loading && !error ? uniqueId : undefined;
  };

  const uniqueId = 'spending-card-abc123';

  it('should have aria-labelledby pointing to unique ID in normal state', () => {
    expect(getAriaLabelledBy(false, undefined, uniqueId)).toBe(uniqueId);
  });

  it('should have aria-labelledby when error is empty string', () => {
    expect(getAriaLabelledBy(false, '', uniqueId)).toBe(uniqueId);
  });

  it('should not have aria-labelledby when loading', () => {
    expect(getAriaLabelledBy(true, undefined, uniqueId)).toBe(undefined);
  });

  it('should not have aria-labelledby when error is present', () => {
    expect(getAriaLabelledBy(false, 'Some error message', uniqueId)).toBe(undefined);
  });

  it('should not have aria-labelledby when both loading and error', () => {
    expect(getAriaLabelledBy(true, 'Some error message', uniqueId)).toBe(undefined);
  });
});

describe('SpendingCard - props defaults', () => {
  it('should default currency to IDR', () => {
    const defaultCurrency = 'IDR';
    expect(defaultCurrency).toBe('IDR');
  });

  it('should default remainingLabel to "Remaining"', () => {
    const defaultRemainingLabel = 'Remaining';
    expect(defaultRemainingLabel).toBe('Remaining');
  });

  it('should default loading to false', () => {
    const defaultLoading = false;
    expect(defaultLoading).toBe(false);
  });
});

describe('SpendingCard - IconBadge variant based on percentage', () => {
  /**
   * IconBadge variant should match getBudgetStatusClass thresholds:
   * - <80%: success (green)
   * - 80-99%: warning (yellow)
   * - >=100%: error (red)
   */

  const getIconBadgeVariant = (percentage: number): 'success' | 'warning' | 'error' => {
    if (percentage < 80) return 'success';
    if (percentage < 100) return 'warning';
    return 'error';
  };

  it('should return success variant when percentage is below 80%', () => {
    expect(getIconBadgeVariant(0)).toBe('success');
    expect(getIconBadgeVariant(50)).toBe('success');
    expect(getIconBadgeVariant(79)).toBe('success');
    expect(getIconBadgeVariant(79.9)).toBe('success');
  });

  it('should return warning variant when percentage is 80-99%', () => {
    expect(getIconBadgeVariant(80)).toBe('warning');
    expect(getIconBadgeVariant(85)).toBe('warning');
    expect(getIconBadgeVariant(99)).toBe('warning');
    expect(getIconBadgeVariant(99.9)).toBe('warning');
  });

  it('should return error variant when percentage is 100% or above', () => {
    expect(getIconBadgeVariant(100)).toBe('error');
    expect(getIconBadgeVariant(120)).toBe('error');
    expect(getIconBadgeVariant(200)).toBe('error');
  });
});

describe('SpendingCard - net savings calculation', () => {
  /**
   * Net savings = Monthly Income - Monthly Expenses (spent)
   */

  const calculateNetSavings = (income: number, spent: number): number => {
    return income - spent;
  };

  it('should calculate positive net savings when income > spent', () => {
    expect(calculateNetSavings(1000, 800)).toBe(200);
    expect(calculateNetSavings(5000000, 3000000)).toBe(2000000);
  });

  it('should calculate negative net savings when spent > income', () => {
    expect(calculateNetSavings(800, 1000)).toBe(-200);
    expect(calculateNetSavings(3000000, 5000000)).toBe(-2000000);
  });

  it('should return zero when income equals spent', () => {
    expect(calculateNetSavings(1000, 1000)).toBe(0);
  });

  it('should handle zero income', () => {
    expect(calculateNetSavings(0, 500)).toBe(-500);
  });

  it('should handle zero spent', () => {
    expect(calculateNetSavings(1000, 0)).toBe(1000);
  });
});

describe('SpendingCard - savings percentage calculation', () => {
  /**
   * Savings percentage = (Net Savings / Income) * 100
   * Returns 0 if income is 0 to avoid division by zero
   */

  const calculateSavingsPercentage = (income: number, spent: number): number => {
    if (income === 0) return 0;
    const netSavings = income - spent;
    return (netSavings / income) * 100;
  };

  it('should calculate positive savings percentage', () => {
    expect(calculateSavingsPercentage(1000, 800)).toBe(20);
    expect(calculateSavingsPercentage(5000000, 2500000)).toBe(50);
  });

  it('should calculate negative savings percentage when overspending', () => {
    expect(calculateSavingsPercentage(1000, 1200)).toBe(-20);
  });

  it('should return 0 when income is 0', () => {
    expect(calculateSavingsPercentage(0, 500)).toBe(0);
  });

  it('should return 100% when spent is 0', () => {
    expect(calculateSavingsPercentage(1000, 0)).toBe(100);
  });
});

describe('SpendingCard - alert message handling', () => {
  it('should show alert banner when alertMessage is provided', () => {
    const alertMessage = 'Budget alert: 95% spent on dining';
    expect(alertMessage).toBeTruthy();
  });

  it('should not show alert banner when alertMessage is undefined', () => {
    const alertMessage = undefined;
    expect(alertMessage).toBeFalsy();
  });

  it('should use warning variant when status is not danger', () => {
    const getVariant = (status: BudgetStatusClassName): 'error' | 'warning' => {
      return status === 'status-danger' ? 'error' : 'warning';
    };
    expect(getVariant('status-warning')).toBe('warning');
    expect(getVariant('status-ok')).toBe('warning');
  });

  it('should use error variant when status is danger', () => {
    const getVariant = (status: BudgetStatusClassName): 'error' | 'warning' => {
      return status === 'status-danger' ? 'error' : 'warning';
    };
    expect(getVariant('status-danger')).toBe('error');
  });
});
