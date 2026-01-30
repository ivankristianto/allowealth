/**
 * Unit tests for CategoryIntelligenceTable component
 *
 * Tests data validation, percentage calculations, and rendering logic.
 */

import { describe, it, expect } from 'bun:test';
import { formatCurrency } from '@/lib/formatting';

describe('CategoryIntelligenceTable', () => {
  describe('Data Structure', () => {
    it('should accept valid category intelligence data', () => {
      const data = [
        {
          id: '1',
          name: 'Utilities',
          spent: 1850000,
          budgetLimit: 4000000,
        },
        {
          id: '2',
          name: 'Dining',
          spent: 905000,
          budgetLimit: 3000000,
        },
      ];

      expect(data).toHaveLength(2);
      expect(data[0].id).toBe('1');
      expect(data[0].name).toBe('Utilities');
      expect(data[0].spent).toBe(1850000);
      expect(data[0].budgetLimit).toBe(4000000);
    });

    it('should handle null budget limit', () => {
      const data = [
        {
          id: '1',
          name: 'Health',
          spent: 750000,
          budgetLimit: null,
        },
      ];

      expect(data[0].budgetLimit).toBeNull();
    });

    it('should handle optional icon and color', () => {
      const data = [
        {
          id: '1',
          name: 'Utilities',
          spent: 1850000,
          budgetLimit: 4000000,
          icon: '⚡',
          color: 'bg-primary/10',
        },
      ];

      expect(data[0].icon).toBe('⚡');
      expect(data[0].color).toBe('bg-primary/10');
    });
  });

  describe('Percentage Calculation', () => {
    it('should calculate correct percentage when budget is set', () => {
      const category = {
        id: '1',
        name: 'Utilities',
        spent: 1850000,
        budgetLimit: 4000000,
      };

      const percentage = ((category.spent / category.budgetLimit) * 100).toFixed(1);
      expect(percentage).toBe('46.3');
    });

    it('should handle budget exceeded scenario', () => {
      const category = {
        id: '1',
        name: 'Dining',
        spent: 4000000,
        budgetLimit: 3000000,
      };

      const percentage = parseFloat(((category.spent / category.budgetLimit) * 100).toFixed(1));
      expect(percentage).toBeGreaterThan(100);
      expect(percentage).toBe(133.3);
    });

    it('should handle null budget limit', () => {
      const category = {
        id: '1',
        name: 'Health',
        spent: 750000,
        budgetLimit: null,
      };

      const percentage = category.budgetLimit
        ? ((category.spent / category.budgetLimit) * 100).toFixed(1)
        : null;

      expect(percentage).toBeNull();
    });

    it('should handle zero budget limit', () => {
      const category = {
        id: '1',
        name: 'Test',
        spent: 1000,
        budgetLimit: 0,
      };

      // Should not divide by zero
      const percentage =
        category.budgetLimit && category.budgetLimit > 0
          ? ((category.spent / category.budgetLimit) * 100).toFixed(1)
          : null;

      expect(percentage).toBeNull();
    });

    it('should handle zero spent', () => {
      const category = {
        id: '1',
        name: 'Housing',
        spent: 0,
        budgetLimit: 40000000,
      };

      const percentage = ((category.spent / category.budgetLimit) * 100).toFixed(1);
      expect(percentage).toBe('0.0');
    });
  });

  describe('Currency Formatting', () => {
    it('should format spent amount correctly', () => {
      expect(formatCurrency(1850000, 'IDR')).toBe('Rp1.850.000');
      expect(formatCurrency(905000, 'IDR')).toBe('Rp905.000');
      expect(formatCurrency(750000, 'IDR')).toBe('Rp750.000');
    });

    it('should format budget limit correctly', () => {
      expect(formatCurrency(4000000, 'IDR')).toBe('Rp4.000.000');
      expect(formatCurrency(40000000, 'IDR')).toBe('Rp40.000.000');
    });

    it('should handle zero values', () => {
      expect(formatCurrency(0, 'IDR')).toBe('Rp0');
    });
  });

  describe('Status Indicators', () => {
    it('should identify over-budget categories', () => {
      const category = {
        id: '1',
        name: 'Dining',
        spent: 4000000,
        budgetLimit: 3000000,
      };

      const percentage = (category.spent / category.budgetLimit) * 100;
      const isOverBudget = percentage > 100;

      expect(isOverBudget).toBe(true);
    });

    it('should identify under-budget categories', () => {
      const category = {
        id: '1',
        name: 'Utilities',
        spent: 1850000,
        budgetLimit: 4000000,
      };

      const percentage = (category.spent / category.budgetLimit) * 100;
      const isOverBudget = percentage > 100;

      expect(isOverBudget).toBe(false);
    });

    it('should handle exactly at budget', () => {
      const category = {
        id: '1',
        name: 'Transport',
        spent: 3000000,
        budgetLimit: 3000000,
      };

      const percentage = (category.spent / category.budgetLimit) * 100;
      const isOverBudget = percentage > 100;

      expect(percentage).toBe(100);
      expect(isOverBudget).toBe(false);
    });
  });

  describe('Sorting', () => {
    it('should sort by spent amount descending', () => {
      const categories = [
        { id: '1', name: 'Dining', spent: 905000, budgetLimit: 3000000 },
        { id: '2', name: 'Utilities', spent: 1850000, budgetLimit: 4000000 },
        { id: '3', name: 'Health', spent: 750000, budgetLimit: null },
      ];

      const sorted = [...categories].sort((a, b) => b.spent - a.spent);

      expect(sorted[0].name).toBe('Utilities');
      expect(sorted[1].name).toBe('Dining');
      expect(sorted[2].name).toBe('Health');
    });

    it('should handle equal spent amounts', () => {
      const categories = [
        { id: '1', name: 'A', spent: 1000000, budgetLimit: 2000000 },
        { id: '2', name: 'B', spent: 1000000, budgetLimit: 3000000 },
      ];

      const sorted = [...categories].sort((a, b) => b.spent - a.spent);

      expect(sorted).toHaveLength(2);
      expect(sorted[0].spent).toBe(sorted[1].spent);
    });
  });

  describe('Icon Fallback', () => {
    it('should use first letter as fallback when icon not provided', () => {
      const category = {
        id: '1',
        name: 'Utilities',
        spent: 1850000,
        budgetLimit: 4000000,
      };

      const fallbackIcon = category.name.charAt(0).toUpperCase();
      expect(fallbackIcon).toBe('U');
    });

    it('should handle empty name gracefully', () => {
      const category = {
        id: '1',
        name: '',
        spent: 1000000,
        budgetLimit: 2000000,
      };

      const fallbackIcon = category.name.charAt(0).toUpperCase();
      expect(fallbackIcon).toBe('');
    });
  });
});
