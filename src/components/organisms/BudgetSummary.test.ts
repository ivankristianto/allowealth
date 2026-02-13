/**
 * BudgetSummary Component Tests
 * =============================
 * Unit tests for BudgetSummary utility functions and logic
 */

import { describe, it, expect } from 'bun:test';
import {
  getCategoryColor,
  calculateAllocationDistribution,
  isValidHexColor,
  sanitizeColor,
} from '@/lib/utils/budget';
import {
  getRemainingBudgetMetric,
  resolveBudgetAllocationOpenState,
} from '@/lib/utils/budget-summary';

describe('BudgetSummary - getCategoryColor', () => {
  it('should return a valid hex color string', () => {
    const color = getCategoryColor('Housing');
    expect(color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('should return consistent color for same category name', () => {
    const color1 = getCategoryColor('Housing');
    const color2 = getCategoryColor('Housing');
    expect(color1).toBe(color2);
  });

  it('should return different colors for different categories', () => {
    const housingColor = getCategoryColor('Housing', 0);
    const groceriesColor = getCategoryColor('Groceries', 1);
    expect(housingColor).not.toBe(groceriesColor);
  });

  it('should use index when provided', () => {
    const color1 = getCategoryColor('Test', 0);
    const color2 = getCategoryColor('Test', 1);
    expect(color1).not.toBe(color2);
  });

  it('should cycle through colors when index exceeds array length', () => {
    const color0 = getCategoryColor('Test', 0);
    const color10 = getCategoryColor('Test', 10);
    expect(color0).toBe(color10);
  });
});

describe('BudgetSummary - calculateAllocationDistribution', () => {
  it('should calculate distribution weights correctly', () => {
    const categories = [
      { name: 'Housing', budget_amount: '40000000' },
      { name: 'Groceries', budget_amount: '8000000' },
      { name: 'Transport', budget_amount: '2000000' },
    ];

    const distribution = calculateAllocationDistribution(categories);

    expect(distribution).toHaveLength(3);
    // Total is 50,000,000
    expect(distribution[0].name).toBe('Housing'); // Largest first
    expect(distribution[0].weight).toBe(80); // 40M / 50M * 100
    expect(distribution[1].name).toBe('Groceries');
    expect(distribution[1].weight).toBe(16); // 8M / 50M * 100
    expect(distribution[2].name).toBe('Transport');
    expect(distribution[2].weight).toBe(4); // 2M / 50M * 100
  });

  it('should sort distribution by weight descending', () => {
    const categories = [
      { name: 'Small', budget_amount: '1000000' },
      { name: 'Large', budget_amount: '10000000' },
      { name: 'Medium', budget_amount: '5000000' },
    ];

    const distribution = calculateAllocationDistribution(categories);

    expect(distribution[0].name).toBe('Large');
    expect(distribution[1].name).toBe('Medium');
    expect(distribution[2].name).toBe('Small');
  });

  it('should filter out categories with zero budget', () => {
    const categories = [
      { name: 'Housing', budget_amount: '40000000' },
      { name: 'Empty', budget_amount: '0' },
      { name: 'Transport', budget_amount: '2000000' },
    ];

    const distribution = calculateAllocationDistribution(categories);

    expect(distribution).toHaveLength(2);
    expect(distribution.find((d) => d.name === 'Empty')).toBeUndefined();
  });

  it('should return empty array when total is zero', () => {
    const categories = [
      { name: 'Empty1', budget_amount: '0' },
      { name: 'Empty2', budget_amount: '0' },
    ];

    const distribution = calculateAllocationDistribution(categories);

    expect(distribution).toHaveLength(0);
  });

  it('should handle empty categories array', () => {
    const distribution = calculateAllocationDistribution([]);
    expect(distribution).toHaveLength(0);
  });

  it('should assign colors to each distribution item', () => {
    const categories = [
      { name: 'Housing', budget_amount: '40000000' },
      { name: 'Groceries', budget_amount: '8000000' },
    ];

    const distribution = calculateAllocationDistribution(categories);

    distribution.forEach((item) => {
      expect(item.color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  it('should include limit in distribution items', () => {
    const categories = [{ name: 'Housing', budget_amount: '40000000' }];

    const distribution = calculateAllocationDistribution(categories);

    expect(distribution[0].limit).toBe(40000000);
  });

  it('should handle string amounts with decimals', () => {
    const categories = [
      { name: 'Rent', budget_amount: '1500.50' },
      { name: 'Food', budget_amount: '500.25' },
    ];

    const distribution = calculateAllocationDistribution(categories);
    const totalWeight = distribution.reduce((sum, item) => sum + item.weight, 0);

    // Weights should sum to 100%
    expect(Math.round(totalWeight)).toBe(100);
  });
});

describe('BudgetSummary - Surplus/Deficit calculation', () => {
  it('should identify surplus when spending is under budget', () => {
    const totalAllocated = 59000000;
    const totalSpent = 51309000;
    const remaining = totalAllocated - totalSpent;
    const isDeficit = remaining < 0;

    expect(remaining).toBe(7691000);
    expect(isDeficit).toBe(false);
  });

  it('should identify deficit when spending exceeds budget', () => {
    const totalAllocated = 50000000;
    const totalSpent = 55000000;
    const remaining = totalAllocated - totalSpent;
    const isDeficit = remaining < 0;

    expect(remaining).toBe(-5000000);
    expect(isDeficit).toBe(true);
  });

  it('should handle exact budget match', () => {
    const totalAllocated = 50000000;
    const totalSpent = 50000000;
    const remaining = totalAllocated - totalSpent;
    const isDeficit = remaining < 0;

    expect(remaining).toBe(0);
    expect(isDeficit).toBe(false);
  });
});

describe('BudgetSummary - Overall usage calculation', () => {
  it('should calculate percentage correctly', () => {
    const totalAllocated = 59000000;
    const totalSpent = 51309000;
    const overallUsage = (totalSpent / totalAllocated) * 100;

    expect(overallUsage.toFixed(1)).toBe('87.0');
  });

  it('should handle zero allocated budget', () => {
    const totalAllocated = 0;
    const totalSpent = 1000;
    const overallUsage = totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;

    expect(overallUsage).toBe(0);
  });

  it('should handle over 100% usage', () => {
    const totalAllocated = 50000000;
    const totalSpent = 60000000;
    const overallUsage = (totalSpent / totalAllocated) * 100;

    expect(overallUsage).toBe(120);
  });
});

describe('BudgetSummary - Display distribution limit', () => {
  it('should limit legend display to top 7 categories plus Others', () => {
    const categories = [
      { name: 'Cat1', budget_amount: '10000000' },
      { name: 'Cat2', budget_amount: '9000000' },
      { name: 'Cat3', budget_amount: '8000000' },
      { name: 'Cat4', budget_amount: '7000000' },
      { name: 'Cat5', budget_amount: '6000000' },
      { name: 'Cat6', budget_amount: '5000000' },
      { name: 'Cat7', budget_amount: '4000000' },
      { name: 'Cat8', budget_amount: '3000000' },
      { name: 'Cat9', budget_amount: '2000000' },
    ];

    const distribution = calculateAllocationDistribution(categories);
    const MAX_LEGEND_ITEMS = 7;

    // Get top 7 categories
    const topCategories = distribution.slice(0, MAX_LEGEND_ITEMS);
    const remainingCategories = distribution.slice(MAX_LEGEND_ITEMS);
    const othersWeight = remainingCategories.reduce((sum, item) => sum + item.weight, 0);

    expect(topCategories).toHaveLength(7);
    expect(topCategories[0].name).toBe('Cat1'); // Largest
    expect(topCategories[6].name).toBe('Cat7');

    // Remaining categories should be combined as "Others"
    expect(remainingCategories).toHaveLength(2);
    expect(othersWeight).toBeGreaterThan(0);
  });

  it('should not show Others when categories are 7 or fewer', () => {
    const categories = [
      { name: 'Cat1', budget_amount: '10000000' },
      { name: 'Cat2', budget_amount: '9000000' },
      { name: 'Cat3', budget_amount: '8000000' },
    ];

    const distribution = calculateAllocationDistribution(categories);
    const MAX_LEGEND_ITEMS = 7;
    const remainingCategories = distribution.slice(MAX_LEGEND_ITEMS);

    expect(distribution).toHaveLength(3);
    expect(remainingCategories).toHaveLength(0);
  });
});

describe('BudgetSummary - Props validation', () => {
  it('should accept valid budget summary data', () => {
    const props = {
      totalAllocated: 59000000,
      totalSpent: 51309000,
      distribution: [
        { name: 'Housing', weight: 67.8, color: '#ea580c' },
        { name: 'Groceries', weight: 13.6, color: '#3b82f6' },
      ],
      currency: 'IDR' as const,
    };

    expect(props.totalAllocated).toBeGreaterThan(0);
    expect(props.totalSpent).toBeLessThanOrEqual(props.totalAllocated);
    expect(props.distribution.length).toBeGreaterThan(0);
  });

  it('should handle deficit state', () => {
    const props = {
      totalAllocated: 50000000,
      totalSpent: 55000000,
      distribution: [],
      currency: 'IDR' as const,
    };

    const remaining = props.totalAllocated - props.totalSpent;
    expect(remaining).toBeLessThan(0);
  });
});

// P0: Color validation tests for XSS prevention
describe('BudgetSummary - isValidHexColor', () => {
  it('should validate correct 6-character hex colors', () => {
    expect(isValidHexColor('#ea580c')).toBe(true);
    expect(isValidHexColor('#FFFFFF')).toBe(true);
    expect(isValidHexColor('#000000')).toBe(true);
    expect(isValidHexColor('#AbCdEf')).toBe(true);
  });

  it('should reject invalid color formats', () => {
    expect(isValidHexColor('')).toBe(false);
    expect(isValidHexColor('ea580c')).toBe(false); // Missing #
    expect(isValidHexColor('#fff')).toBe(false); // 3-char shorthand
    expect(isValidHexColor('#gggggg')).toBe(false); // Invalid hex chars
    expect(isValidHexColor('#ea580c; xss')).toBe(false); // XSS attempt
    expect(isValidHexColor('javascript:alert(1)')).toBe(false); // XSS attempt
  });
});

describe('BudgetSummary - sanitizeColor', () => {
  it('should return valid colors unchanged', () => {
    expect(sanitizeColor('#ea580c')).toBe('#ea580c');
    expect(sanitizeColor('#FFFFFF')).toBe('#FFFFFF');
  });

  it('should return default gray for invalid colors', () => {
    expect(sanitizeColor('')).toBe('#6b7280');
    expect(sanitizeColor('invalid')).toBe('#6b7280');
    expect(sanitizeColor('#fff')).toBe('#6b7280'); // 3-char not allowed
  });

  it('should sanitize potential XSS payloads', () => {
    expect(sanitizeColor('#ea580c; alert(1)')).toBe('#6b7280');
    expect(sanitizeColor('javascript:alert(1)')).toBe('#6b7280');
    expect(sanitizeColor('<script>alert(1)</script>')).toBe('#6b7280');
  });
});

// P2: Edge case tests
describe('BudgetSummary - Edge cases', () => {
  it('should handle negative budget amounts by filtering them out', () => {
    const categories = [
      { name: 'Valid', budget_amount: '2000' },
      { name: 'Negative', budget_amount: '-500' },
    ];
    const distribution = calculateAllocationDistribution(categories);

    // Negative budgets should be filtered (parseFloat returns negative, > 0 check fails)
    // Only the valid positive budget should be included
    expect(distribution).toHaveLength(1);
    expect(distribution[0].name).toBe('Valid');
    expect(distribution[0].weight).toBe(100); // 100% since it's the only valid item
  });

  it('should handle NaN string amounts gracefully', () => {
    const categories = [
      { name: 'Invalid', budget_amount: 'abc' },
      { name: 'Valid', budget_amount: '1000' },
    ];
    const distribution = calculateAllocationDistribution(categories);

    // NaN is treated as 0 and filtered out
    expect(distribution).toHaveLength(1);
    expect(distribution[0].name).toBe('Valid');
  });

  it('should handle missing budget_amount', () => {
    const categories = [
      { name: 'NoAmount', budget_amount: '' },
      { name: 'Valid', budget_amount: '1000' },
    ];
    const distribution = calculateAllocationDistribution(categories);

    expect(distribution).toHaveLength(1);
  });
});

describe('BudgetSummary - Remaining/Overbudget metric', () => {
  it('returns remaining metric when spending is within budget', () => {
    expect(getRemainingBudgetMetric(1000, 700)).toEqual({
      label: 'Remaining',
      value: 300,
      tone: 'success',
    });
  });

  it('returns overbudget metric when spending exceeds budget', () => {
    expect(getRemainingBudgetMetric(1000, 1350)).toEqual({
      label: 'Overbudget',
      value: 350,
      tone: 'error',
    });
  });
});

describe('BudgetSummary - allocation details open state sync', () => {
  it('sets initial state based on viewport width', () => {
    expect(resolveBudgetAllocationOpenState({ isWide: true })).toBe(true);
    expect(resolveBudgetAllocationOpenState({ isWide: false })).toBe(false);
  });

  it('does not override user state when width class is unchanged', () => {
    expect(resolveBudgetAllocationOpenState({ previousIsWide: false, isWide: false })).toBeNull();
    expect(resolveBudgetAllocationOpenState({ previousIsWide: true, isWide: true })).toBeNull();
  });

  it('updates state when crossing breakpoint', () => {
    expect(resolveBudgetAllocationOpenState({ previousIsWide: false, isWide: true })).toBe(true);
    expect(resolveBudgetAllocationOpenState({ previousIsWide: true, isWide: false })).toBe(false);
  });
});
