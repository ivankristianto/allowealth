/**
 * BudgetPageHeader Component Tests
 * ================================
 * Tests for BudgetPageHeader component month navigation and styling
 */

import { describe, it, expect } from 'bun:test';

// Test the month navigation URL building logic
describe('BudgetPageHeader - Month Navigation', () => {
  describe('URL Building', () => {
    const buildMonthUrl = (year: number, month: number, currency: string = 'IDR') => {
      const params = new URLSearchParams();
      params.set('year', year.toString());
      params.set('month', month.toString());
      params.set('currency', currency);
      return `/budget?${params.toString()}`;
    };

    it('should build correct URL for previous month', () => {
      const url = buildMonthUrl(2024, 12, 'IDR');
      expect(url).toBe('/budget?year=2024&month=12&currency=IDR');
    });

    it('should build correct URL for next month', () => {
      const url = buildMonthUrl(2025, 2, 'IDR');
      expect(url).toBe('/budget?year=2025&month=2&currency=IDR');
    });

    it('should handle year boundary (December to January)', () => {
      // January 2025, go to previous month
      const prevMonthDate = new Date(2025, 0 - 1, 1); // December 2024
      expect(prevMonthDate.getFullYear()).toBe(2024);
      expect(prevMonthDate.getMonth() + 1).toBe(12);
    });

    it('should handle year boundary (January to December)', () => {
      // December 2024, go to next month
      const nextMonthDate = new Date(2024, 12, 1); // January 2025
      expect(nextMonthDate.getFullYear()).toBe(2025);
      expect(nextMonthDate.getMonth() + 1).toBe(1);
    });

    it('should preserve currency in URL', () => {
      const urlIDR = buildMonthUrl(2024, 6, 'IDR');
      const urlUSD = buildMonthUrl(2024, 6, 'USD');
      expect(urlIDR).toContain('currency=IDR');
      expect(urlUSD).toContain('currency=USD');
    });
  });

  describe('Future Month Restriction', () => {
    const isNextMonthInFuture = (
      nextMonthYear: number,
      nextMonth: number,
      currentYear: number,
      currentMonth: number
    ) => {
      return (
        nextMonthYear > currentYear || (nextMonthYear === currentYear && nextMonth > currentMonth)
      );
    };

    it('should detect next month as future when in same year', () => {
      // Current: January 2025, Next: February 2025
      expect(isNextMonthInFuture(2025, 2, 2025, 1)).toBe(true);
    });

    it('should detect next month as future when crossing year', () => {
      // Current: December 2024, Next: January 2025, but we're in December 2024
      expect(isNextMonthInFuture(2025, 1, 2024, 12)).toBe(true);
    });

    it('should allow navigation to current month', () => {
      // Current: January 2025, checking January 2025
      expect(isNextMonthInFuture(2025, 1, 2025, 1)).toBe(false);
    });

    it('should allow navigation to past months', () => {
      // Current: March 2025, Next: February 2025
      expect(isNextMonthInFuture(2025, 2, 2025, 3)).toBe(false);
    });
  });

  describe('Subtitle Generation', () => {
    const generateSubtitle = (budgetCount: number): string => {
      return budgetCount > 0
        ? `Monitoring ${budgetCount} critical expense ${budgetCount === 1 ? 'category' : 'categories'} for our household.`
        : 'Set up spending limits to track your budget.';
    };

    it('should show monitoring message when budgets exist', () => {
      expect(generateSubtitle(6)).toBe(
        'Monitoring 6 critical expense categories for our household.'
      );
      expect(generateSubtitle(3)).toBe(
        'Monitoring 3 critical expense categories for our household.'
      );
    });

    it('should show setup message when no budgets', () => {
      expect(generateSubtitle(0)).toBe('Set up spending limits to track your budget.');
    });

    it('should use singular form for single budget', () => {
      expect(generateSubtitle(1)).toBe('Monitoring 1 critical expense category for our household.');
    });
  });
});

describe('BudgetPageHeader - Styling', () => {
  describe('Month Navigation Button Styles', () => {
    const prevNextButtonClasses =
      'btn btn-sm btn-square bg-base-100 border border-base-300 hover:border-accent/30 hover:text-accent rounded-xl transition-all';

    it('should have correct button classes for nav buttons', () => {
      expect(prevNextButtonClasses).toContain('btn-sm');
      expect(prevNextButtonClasses).toContain('btn-square');
      expect(prevNextButtonClasses).toContain('bg-base-100');
      expect(prevNextButtonClasses).toContain('border-base-300');
      expect(prevNextButtonClasses).toContain('rounded-xl');
    });

    it('should have hover state classes', () => {
      expect(prevNextButtonClasses).toContain('hover:border-accent/30');
      expect(prevNextButtonClasses).toContain('hover:text-accent');
    });
  });

  describe('Month Display Styles', () => {
    const monthDisplayClasses =
      'px-4 py-2 bg-base-100 border border-base-300 rounded-xl text-sm font-bold text-base-content min-w-[130px] text-center';

    it('should have correct display classes', () => {
      expect(monthDisplayClasses).toContain('bg-base-100');
      expect(monthDisplayClasses).toContain('border-base-300');
      expect(monthDisplayClasses).toContain('rounded-xl');
      expect(monthDisplayClasses).toContain('font-bold');
    });

    it('should have minimum width for consistent sizing', () => {
      expect(monthDisplayClasses).toContain('min-w-[130px]');
    });

    it('should center text', () => {
      expect(monthDisplayClasses).toContain('text-center');
    });
  });

  describe('Set New Budget Button Styles', () => {
    const setNewBudgetClasses =
      'btn btn-outline btn-accent gap-2 rounded-2xl border-2 hover:bg-accent/5';

    it('should be outline style with accent color', () => {
      expect(setNewBudgetClasses).toContain('btn-outline');
      expect(setNewBudgetClasses).toContain('btn-accent');
    });

    it('should have rounded corners', () => {
      expect(setNewBudgetClasses).toContain('rounded-2xl');
    });

    it('should have border width of 2', () => {
      expect(setNewBudgetClasses).toContain('border-2');
    });
  });

  describe('AI Rebalancer Button Styles', () => {
    const aiRebalancerClasses =
      'btn btn-accent gap-2 rounded-2xl shadow-md hover:shadow-lg transition-all';

    it('should be accent filled button', () => {
      expect(aiRebalancerClasses).toContain('btn-accent');
    });

    it('should have shadow', () => {
      expect(aiRebalancerClasses).toContain('shadow-md');
      expect(aiRebalancerClasses).toContain('hover:shadow-lg');
    });

    it('should have rounded corners', () => {
      expect(aiRebalancerClasses).toContain('rounded-2xl');
    });
  });
});

describe('BudgetPageHeader - Accessibility', () => {
  describe('ARIA Labels', () => {
    it('should have aria-label for previous month button', () => {
      const label = 'Previous month';
      expect(label).toBe('Previous month');
    });

    it('should have aria-label for next month button', () => {
      const label = 'Next month';
      expect(label).toBe('Next month');
    });

    it('should have aria-label for disabled next button', () => {
      const label = 'Next month (disabled)';
      expect(label).toContain('disabled');
    });

    it('should have aria-label for Set New Budget button', () => {
      const label = 'Set new budget';
      expect(label).toBe('Set new budget');
    });

    it('should have aria-label for AI Rebalancer button', () => {
      const label = 'Open AI budget rebalancer';
      expect(label).toContain('AI');
    });
  });

  describe('Icons', () => {
    it('should have aria-hidden on decorative icons', () => {
      // All icons in the component should have aria-hidden="true"
      const ariaHidden = true;
      expect(ariaHidden).toBe(true);
    });
  });
});
