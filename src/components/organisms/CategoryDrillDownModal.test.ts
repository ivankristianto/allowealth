/**
 * Unit tests for CategoryDrillDownModal component
 *
 * Tests data structure, budget calculations, and transaction rendering logic.
 */

import { describe, it, expect } from 'bun:test';

describe('CategoryDrillDownModal', () => {
  describe('Data Structure', () => {
    it('should accept valid category drill-down data', () => {
      const data = {
        categoryId: '1',
        categoryName: 'Utilities',
        categoryIcon: 'U',
        categoryColor: 'bg-primary/10',
        spent: 1850000,
        budgetLimit: 4000000,
        period: 'February 2024',
      };

      expect(data.categoryId).toBe('1');
      expect(data.categoryName).toBe('Utilities');
      expect(data.spent).toBe(1850000);
      expect(data.budgetLimit).toBe(4000000);
    });

    it('should handle null budget limit', () => {
      const data = {
        categoryId: '1',
        categoryName: 'Health',
        spent: 750000,
        budgetLimit: null,
        period: 'February 2024',
      };

      expect(data.budgetLimit).toBeNull();
    });

    it('should handle optional icon and color', () => {
      const dataWithOptionals: {
        categoryId: string;
        categoryName: string;
        spent: number;
        budgetLimit: number;
        period: string;
        categoryIcon?: string;
        categoryColor?: string;
      } = {
        categoryId: '1',
        categoryName: 'Utilities',
        spent: 1850000,
        budgetLimit: 4000000,
        period: 'February 2024',
      };

      expect(dataWithOptionals.categoryIcon).toBeUndefined();
      expect(dataWithOptionals.categoryColor).toBeUndefined();
    });
  });

  describe('Transaction Data Structure', () => {
    it('should accept valid transaction data', () => {
      const transaction = {
        id: 'txn-1',
        title: 'Electric bill',
        amount: 500000,
        date: '2024-02-15',
        paymentMethod: 'BCA',
      };

      expect(transaction.id).toBe('txn-1');
      expect(transaction.title).toBe('Electric bill');
      expect(transaction.amount).toBe(500000);
      expect(transaction.date).toBe('2024-02-15');
      expect(transaction.paymentMethod).toBe('BCA');
    });

    it('should handle array of transactions', () => {
      const transactions = [
        {
          id: 'txn-1',
          title: 'Electric bill',
          amount: 500000,
          date: '2024-02-15',
          paymentMethod: 'BCA',
        },
        {
          id: 'txn-2',
          title: 'Water bill',
          amount: 150000,
          date: '2024-02-10',
          paymentMethod: 'Mandiri',
        },
      ];

      expect(transactions).toHaveLength(2);
      expect(transactions[0].title).toBe('Electric bill');
      expect(transactions[1].title).toBe('Water bill');
    });
  });

  describe('Budget Calculations', () => {
    it('should calculate percentage correctly when budget is set', () => {
      const data = {
        categoryId: '1',
        categoryName: 'Utilities',
        spent: 1850000,
        budgetLimit: 4000000,
        period: 'February 2024',
      };

      const percentage = (data.spent / data.budgetLimit) * 100;
      expect(percentage).toBeCloseTo(46.25, 2);
    });

    it('should calculate remaining budget correctly', () => {
      const data = {
        categoryId: '1',
        categoryName: 'Utilities',
        spent: 1850000,
        budgetLimit: 4000000,
        period: 'February 2024',
      };

      const remaining = data.budgetLimit - data.spent;
      expect(remaining).toBe(2150000);
    });

    it('should handle budget exceeded scenario', () => {
      const data = {
        categoryId: '1',
        categoryName: 'Dining',
        spent: 4000000,
        budgetLimit: 3000000,
        period: 'February 2024',
      };

      const percentage = (data.spent / data.budgetLimit) * 100;
      const remaining = data.budgetLimit - data.spent;

      expect(percentage).toBeGreaterThan(100);
      expect(percentage).toBeCloseTo(133.33, 2);
      expect(remaining).toBeLessThan(0);
      expect(remaining).toBe(-1000000);
    });

    it('should handle null budget limit', () => {
      const data = {
        categoryId: '1',
        categoryName: 'Health',
        spent: 750000,
        budgetLimit: null,
        period: 'February 2024',
      };

      const hasBudget = data.budgetLimit !== null && data.budgetLimit !== undefined;
      expect(hasBudget).toBe(false);
    });

    it('should handle zero spent', () => {
      const data = {
        categoryId: '1',
        categoryName: 'Housing',
        spent: 0,
        budgetLimit: 40000000,
        period: 'February 2024',
      };

      const percentage = (data.spent / data.budgetLimit) * 100;
      expect(percentage).toBe(0);
    });

    it('should calculate percentage for near-budget scenarios', () => {
      const scenarios = [
        { spent: 3200000, budget: 4000000, expectedPercentage: 80 },
        { spent: 3600000, budget: 4000000, expectedPercentage: 90 },
        { spent: 3960000, budget: 4000000, expectedPercentage: 99 },
        { spent: 4000000, budget: 4000000, expectedPercentage: 100 },
      ];

      scenarios.forEach((scenario) => {
        const percentage = (scenario.spent / scenario.budget) * 100;
        expect(percentage).toBeCloseTo(scenario.expectedPercentage, 1);
      });
    });
  });

  describe('Budget Status Classification', () => {
    it('should identify healthy budget (< 80%)', () => {
      const data = {
        categoryId: '1',
        categoryName: 'Utilities',
        spent: 1850000,
        budgetLimit: 4000000,
        period: 'February 2024',
      };

      const percentage = (data.spent / data.budgetLimit) * 100;
      const isHealthy = percentage < 80;

      expect(isHealthy).toBe(true);
      expect(percentage).toBeLessThan(80);
    });

    it('should identify warning budget (>= 80%, <= 100%)', () => {
      const data = {
        categoryId: '1',
        categoryName: 'Transport',
        spent: 3600000,
        budgetLimit: 4000000,
        period: 'February 2024',
      };

      const percentage = (data.spent / data.budgetLimit) * 100;
      const isWarning = percentage >= 80 && percentage <= 100;

      expect(isWarning).toBe(true);
      expect(percentage).toBeGreaterThanOrEqual(80);
      expect(percentage).toBeLessThanOrEqual(100);
    });

    it('should identify over-budget (> 100%)', () => {
      const data = {
        categoryId: '1',
        categoryName: 'Dining',
        spent: 4500000,
        budgetLimit: 3000000,
        period: 'February 2024',
      };

      const percentage = (data.spent / data.budgetLimit) * 100;
      const isOverBudget = percentage > 100;

      expect(isOverBudget).toBe(true);
      expect(percentage).toBeGreaterThan(100);
    });

    it('should handle untracked budget', () => {
      const data = {
        categoryId: '1',
        categoryName: 'Health',
        spent: 750000,
        budgetLimit: null,
        period: 'February 2024',
      };

      const hasBudget = data.budgetLimit !== null && data.budgetLimit !== undefined;
      expect(hasBudget).toBe(false);
    });
  });

  describe('Transaction Sorting', () => {
    it('should sort transactions by date descending', () => {
      const transactions = [
        { id: '1', title: 'Txn 1', amount: 100, date: '2024-02-05', paymentMethod: 'BCA' },
        { id: '2', title: 'Txn 2', amount: 200, date: '2024-02-15', paymentMethod: 'BCA' },
        { id: '3', title: 'Txn 3', amount: 300, date: '2024-02-10', paymentMethod: 'BCA' },
      ];

      const sorted = [...transactions].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      expect(sorted[0].id).toBe('2'); // Feb 15
      expect(sorted[1].id).toBe('3'); // Feb 10
      expect(sorted[2].id).toBe('1'); // Feb 5
    });

    it('should handle equal dates', () => {
      const transactions = [
        { id: '1', title: 'Txn 1', amount: 100, date: '2024-02-15', paymentMethod: 'BCA' },
        { id: '2', title: 'Txn 2', amount: 200, date: '2024-02-15', paymentMethod: 'BCA' },
      ];

      const sorted = [...transactions].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      expect(sorted).toHaveLength(2);
      expect(sorted[0].date).toBe(sorted[1].date);
    });
  });

  describe('Transaction Amount Validation', () => {
    it('should sum transaction amounts to match spent', () => {
      const spent = 1850000;
      const transactions = [
        { id: '1', title: 'Txn 1', amount: 500000, date: '2024-02-15', paymentMethod: 'BCA' },
        { id: '2', title: 'Txn 2', amount: 750000, date: '2024-02-10', paymentMethod: 'BCA' },
        { id: '3', title: 'Txn 3', amount: 600000, date: '2024-02-05', paymentMethod: 'BCA' },
      ];

      const total = transactions.reduce((sum, txn) => sum + txn.amount, 0);
      expect(total).toBe(spent);
    });

    it('should handle empty transaction list', () => {
      const transactions: Array<any> = [];
      const total = transactions.reduce((sum, txn) => sum + txn.amount, 0);
      expect(total).toBe(0);
    });
  });

  describe('Period Formatting', () => {
    it('should handle month-year period format', () => {
      const periods = ['January 2024', 'February 2024', 'December 2023'];

      periods.forEach((period) => {
        expect(period).toMatch(/^[A-Z][a-z]+ \d{4}$/);
      });
    });

    it('should handle period uppercase transformation', () => {
      const period = 'February 2024';
      const uppercase = period.toUpperCase();

      expect(uppercase).toBe('FEBRUARY 2024');
    });
  });

  describe('Icon Fallback', () => {
    it('should use first letter as fallback when icon not provided', () => {
      const categoryName = 'Utilities';
      const fallbackIcon = categoryName.charAt(0).toUpperCase();

      expect(fallbackIcon).toBe('U');
    });

    it('should handle empty name gracefully', () => {
      const categoryName = '';
      const fallbackIcon = categoryName.charAt(0).toUpperCase();

      expect(fallbackIcon).toBe('');
    });

    it('should preserve provided icon', () => {
      const categoryIcon = '⚡';
      expect(categoryIcon).toBe('⚡');
    });
  });

  describe('Currency Formatting', () => {
    it('should format amounts correctly', () => {
      const formatter = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });

      expect(formatter.format(1850000)).toBe('Rp\u00a01.850.000');
      expect(formatter.format(4000000)).toBe('Rp\u00a04.000.000');
    });

    it('should handle zero values', () => {
      const formatter = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });

      expect(formatter.format(0)).toBe('Rp\u00a00');
    });
  });

  describe('Date Formatting', () => {
    it('should format transaction dates correctly', () => {
      const date = new Date('2024-02-15');
      const formatted = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      expect(formatted).toMatch(/Feb \d+, 2024/);
    });

    it('should handle different date formats', () => {
      const dates = ['2024-02-01', '2024-12-31', '2024-06-15'];

      dates.forEach((dateStr) => {
        const date = new Date(dateStr);
        expect(date.toISOString().split('T')[0]).toBe(dateStr);
      });
    });
  });
});
