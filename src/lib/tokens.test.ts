/**
 * Design Tokens Tests
 * ===================
 *
 * Unit tests for design token utility functions.
 */

import { describe, it, expect } from 'bun:test';
import {
  getStatusBadgeClasses,
  getBudgetStatusClass,
  toBudgetStatusClassName,
  getProgressBarStatusColors,
  type BudgetStatusClassName,
  type ProgressBarStatus,
} from './tokens';

describe('BudgetStatusClassName type', () => {
  it('should define exactly three status values', () => {
    const allStatuses: BudgetStatusClassName[] = ['status-ok', 'status-warning', 'status-danger'];
    expect(allStatuses).toHaveLength(3);
  });

  it('should be usable as function parameter type', () => {
    const testFn = (status: BudgetStatusClassName): string => status;
    expect(testFn('status-ok')).toBe('status-ok');
    expect(testFn('status-warning')).toBe('status-warning');
    expect(testFn('status-danger')).toBe('status-danger');
  });
});

describe('toBudgetStatusClassName', () => {
  it('should convert ok to status-ok', () => {
    expect(toBudgetStatusClassName('ok')).toBe('status-ok');
  });

  it('should convert warning to status-warning', () => {
    expect(toBudgetStatusClassName('warning')).toBe('status-warning');
  });

  it('should convert exceeded to status-danger', () => {
    expect(toBudgetStatusClassName('exceeded')).toBe('status-danger');
  });

  it('should return correct types for all business status values', () => {
    const businessStatuses: Array<'ok' | 'warning' | 'exceeded'> = ['ok', 'warning', 'exceeded'];
    const cssClasses = businessStatuses.map(toBudgetStatusClassName);

    expect(cssClasses).toEqual(['status-ok', 'status-warning', 'status-danger']);
  });

  it('should integrate with getStatusBadgeClasses', () => {
    // Business logic flow: BudgetStatus → BudgetStatusClassName → CSS classes
    const status = toBudgetStatusClassName('exceeded');
    const classes = getStatusBadgeClasses(status);

    expect(status).toBe('status-danger');
    expect(classes).toContain('text-error');
    expect(classes).toContain('bg-error/10');
  });
});

describe('getProgressBarStatusColors', () => {
  it('should return correct colors for ok status', () => {
    expect(getProgressBarStatusColors('ok')).toBe('text-success bg-success/10');
  });

  it('should return correct colors for warning status', () => {
    expect(getProgressBarStatusColors('warning')).toBe('text-warning bg-warning/10');
  });

  it('should return correct colors for danger status', () => {
    expect(getProgressBarStatusColors('danger')).toBe('text-error bg-error/10');
  });

  it('should work with all ProgressBarStatus values', () => {
    const statuses: ProgressBarStatus[] = ['ok', 'warning', 'danger'];
    statuses.forEach((status) => {
      const result = getProgressBarStatusColors(status);
      expect(result).toContain('text-');
      expect(result).toContain('bg-');
    });
  });

  it('should return only color classes without typography', () => {
    const result = getProgressBarStatusColors('ok');
    // Should NOT contain typography classes (those are in getStatusBadgeClasses)
    expect(result).not.toContain('text-xs');
    expect(result).not.toContain('font-bold');
    expect(result).not.toContain('uppercase');
  });
});

describe('getStatusBadgeClasses', () => {
  it('should return correct classes for status-ok', () => {
    const result = getStatusBadgeClasses('status-ok');
    expect(result).toContain('text-success');
    expect(result).toContain('bg-success/10');
    expect(result).toContain('text-xs');
    expect(result).toContain('font-bold');
    expect(result).toContain('tracking-wider');
    expect(result).toContain('uppercase');
    expect(result).toContain('px-3');
    expect(result).toContain('py-1.5');
    expect(result).toContain('rounded-full');
  });

  it('should return correct classes for status-warning', () => {
    const result = getStatusBadgeClasses('status-warning');
    expect(result).toContain('text-warning');
    expect(result).toContain('bg-warning/10');
    expect(result).toContain('text-xs');
    expect(result).toContain('font-bold');
    expect(result).toContain('tracking-wider');
    expect(result).toContain('uppercase');
    expect(result).toContain('px-3');
    expect(result).toContain('py-1.5');
    expect(result).toContain('rounded-full');
  });

  it('should return correct classes for status-danger', () => {
    const result = getStatusBadgeClasses('status-danger');
    expect(result).toContain('text-error');
    expect(result).toContain('bg-error/10');
    expect(result).toContain('text-xs');
    expect(result).toContain('font-bold');
    expect(result).toContain('tracking-wider');
    expect(result).toContain('uppercase');
    expect(result).toContain('px-3');
    expect(result).toContain('py-1.5');
    expect(result).toContain('rounded-full');
  });

  it('should use DaisyUI semantic color classes for theme compatibility', () => {
    const okResult = getStatusBadgeClasses('status-ok');
    const warningResult = getStatusBadgeClasses('status-warning');
    const dangerResult = getStatusBadgeClasses('status-danger');

    // Verify DaisyUI semantic classes (not hardcoded Tailwind colors)
    expect(okResult).toContain('text-success');
    expect(okResult).not.toContain('text-emerald');

    expect(warningResult).toContain('text-warning');
    expect(warningResult).not.toContain('text-amber');

    expect(dangerResult).toContain('text-error');
    expect(dangerResult).not.toContain('text-rose');
  });

  it('should include all required base styling classes', () => {
    const result = getStatusBadgeClasses('status-ok');

    // Typography classes
    expect(result).toContain('text-xs');
    expect(result).toContain('font-bold');
    expect(result).toContain('tracking-wider');
    expect(result).toContain('uppercase');

    // Spacing classes
    expect(result).toContain('px-3');
    expect(result).toContain('py-1.5');

    // Shape classes
    expect(result).toContain('rounded-full');
  });

  it('should enforce type safety at compile time', () => {
    // TypeScript enforces valid status values - invalid values will cause compile error
    // This test verifies all three valid status types work correctly
    const validStatuses: BudgetStatusClassName[] = ['status-ok', 'status-warning', 'status-danger'];

    validStatuses.forEach((status) => {
      const result = getStatusBadgeClasses(status);
      expect(result).toBeTruthy();
      expect(result).toContain('text-xs');
      expect(result).toContain('font-bold');
    });
  });
});

describe('getBudgetStatusClass', () => {
  it('should return status-danger for percentage >= 100', () => {
    expect(getBudgetStatusClass(100)).toBe('status-danger');
    expect(getBudgetStatusClass(100.1)).toBe('status-danger');
    expect(getBudgetStatusClass(150)).toBe('status-danger');
  });

  it('should return status-warning for percentage >= 80', () => {
    expect(getBudgetStatusClass(80)).toBe('status-warning');
    expect(getBudgetStatusClass(85)).toBe('status-warning');
    expect(getBudgetStatusClass(99.9)).toBe('status-warning');
  });

  it('should return status-ok for percentage < 80', () => {
    expect(getBudgetStatusClass(0)).toBe('status-ok');
    expect(getBudgetStatusClass(50)).toBe('status-ok');
    expect(getBudgetStatusClass(79.9)).toBe('status-ok');
  });

  it('should handle edge cases', () => {
    expect(getBudgetStatusClass(-1)).toBe('status-ok');
    expect(getBudgetStatusClass(0)).toBe('status-ok');
    expect(getBudgetStatusClass(79.99)).toBe('status-ok');
    expect(getBudgetStatusClass(80)).toBe('status-warning');
    expect(getBudgetStatusClass(99.99)).toBe('status-warning');
    expect(getBudgetStatusClass(100)).toBe('status-danger');
  });
});

describe('getStatusBadgeClasses integration with getBudgetStatusClass', () => {
  it('should work together for complete status badge styling', () => {
    // Test integration between the two functions
    const percentage = 85;
    const status = getBudgetStatusClass(percentage);
    const badgeClasses = getStatusBadgeClasses(status);

    expect(status).toBe('status-warning');
    expect(badgeClasses).toContain('text-warning');
    expect(badgeClasses).toContain('bg-warning/10');
  });

  it('should provide correct styling for all budget scenarios', () => {
    const testCases = [
      { percentage: 50, expectedStatus: 'status-ok' },
      { percentage: 85, expectedStatus: 'status-warning' },
      { percentage: 110, expectedStatus: 'status-danger' },
    ];

    testCases.forEach(({ percentage, expectedStatus }) => {
      const status = getBudgetStatusClass(percentage);
      const badgeClasses = getStatusBadgeClasses(status);

      expect(status).toBe(expectedStatus);

      if (expectedStatus === 'status-ok') {
        expect(badgeClasses).toContain('text-success');
      } else if (expectedStatus === 'status-warning') {
        expect(badgeClasses).toContain('text-warning');
      } else {
        expect(badgeClasses).toContain('text-error');
      }
    });
  });
});
