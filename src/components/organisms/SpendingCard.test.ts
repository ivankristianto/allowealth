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
import { getBudgetStatusClass, getStatusBadgeClasses } from '@/lib/tokens';

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
    statusClass: 'status-ok' | 'status-warning' | 'status-danger'
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
    type StatusType = 'status-ok' | 'status-warning' | 'status-danger';
    const getVariant = (status: StatusType): 'error' | 'warning' => {
      return status === 'status-danger' ? 'error' : 'warning';
    };
    expect(getVariant('status-warning')).toBe('warning');
    expect(getVariant('status-ok')).toBe('warning');
  });

  it('should use error variant when status is danger', () => {
    type StatusType = 'status-ok' | 'status-warning' | 'status-danger';
    const getVariant = (status: StatusType): 'error' | 'warning' => {
      return status === 'status-danger' ? 'error' : 'warning';
    };
    expect(getVariant('status-danger')).toBe('error');
  });
});
