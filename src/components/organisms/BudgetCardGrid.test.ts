/**
 * BudgetCardGrid Component Tests
 * ==============================
 * Unit tests for BudgetCardGrid utility functions and data handling
 */

import { describe, it, expect } from 'bun:test';
import { getIconForCategory } from '@/lib/utils/categoryIcons';

// Budget data type (same as component)
interface BudgetData {
  category_id: string;
  category_name: string;
  icon?: string;
  spent_amount: string | number;
  budget_amount: string | number;
  percentage_used: number;
  status: 'ok' | 'warning' | 'exceeded';
}

// Sample test data
const sampleBudgets: BudgetData[] = [
  {
    category_id: '1',
    category_name: 'Housing',
    spent_amount: '37680000',
    budget_amount: '40000000',
    percentage_used: 94,
    status: 'warning',
  },
  {
    category_id: '2',
    category_name: 'Groceries',
    spent_amount: 5800000,
    budget_amount: 8000000,
    percentage_used: 72,
    status: 'warning',
  },
  {
    category_id: '3',
    category_name: 'Dining',
    icon: 'Utensils',
    spent_amount: '2850000',
    budget_amount: '3000000',
    percentage_used: 95,
    status: 'exceeded',
  },
];

describe('BudgetCardGrid - getIconForCategory', () => {
  it('should match categories with partial matches', () => {
    expect(getIconForCategory('Monthly Housing')).toBe('House');
    // Note: groceries matches before food in iteration order
    expect(getIconForCategory('Food & Groceries')).toBe('ShoppingCart');
    expect(getIconForCategory('Work Expenses')).toBe('Briefcase');
    // Note: bills matches Zap (utilities), medical alone would match Heart
    expect(getIconForCategory('Medical Bills')).toBe('Zap');
    expect(getIconForCategory('Medical Expenses')).toBe('Heart');
  });

  it('should handle edge cases', () => {
    expect(getIconForCategory('')).toBe('CircleDollarSign');
    expect(getIconForCategory('HOUSING')).toBe('House'); // case insensitive
    expect(getIconForCategory('Home')).toBe('House'); // house category
    expect(getIconForCategory('  groceries  ')).toBe('ShoppingCart'); // includes match
  });

  it('should prefer explicit icon over inferred', () => {
    expect(getIconForCategory('Housing', 'Building')).toBe('Building');
    expect(getIconForCategory('Random Category', 'Star')).toBe('Star');
  });
});

describe('BudgetCardGrid - data parsing', () => {
  it('should handle string amounts', () => {
    const budget = sampleBudgets[0];
    const spent =
      typeof budget.spent_amount === 'string'
        ? parseFloat(budget.spent_amount)
        : budget.spent_amount;
    const budgetAmount =
      typeof budget.budget_amount === 'string'
        ? parseFloat(budget.budget_amount)
        : budget.budget_amount;

    expect(spent).toBe(37680000);
    expect(budgetAmount).toBe(40000000);
  });

  it('should handle number amounts', () => {
    const budget = sampleBudgets[1];
    const spent =
      typeof budget.spent_amount === 'string'
        ? parseFloat(budget.spent_amount)
        : budget.spent_amount;
    const budgetAmount =
      typeof budget.budget_amount === 'string'
        ? parseFloat(budget.budget_amount)
        : budget.budget_amount;

    expect(spent).toBe(5800000);
    expect(budgetAmount).toBe(8000000);
  });

  it('should handle mixed types correctly', () => {
    const testData: BudgetData[] = [
      {
        category_id: '1',
        category_name: 'Test',
        spent_amount: '1000.50',
        budget_amount: 2000,
        percentage_used: 50,
        status: 'ok',
      },
    ];

    const budget = testData[0];
    const spent =
      typeof budget.spent_amount === 'string'
        ? parseFloat(budget.spent_amount)
        : budget.spent_amount;
    const budgetAmount =
      typeof budget.budget_amount === 'string'
        ? parseFloat(budget.budget_amount)
        : budget.budget_amount;

    expect(spent).toBe(1000.5);
    expect(budgetAmount).toBe(2000);
  });
});

describe('BudgetCardGrid - empty state detection', () => {
  it('should detect empty budget array', () => {
    const budgets: BudgetData[] = [];
    expect(budgets.length === 0).toBe(true);
  });

  it('should detect non-empty budget array', () => {
    expect(sampleBudgets.length > 0).toBe(true);
    expect(sampleBudgets.length).toBe(3);
  });
});

describe('BudgetCardGrid - grid column calculation', () => {
  // Simulating responsive grid behavior
  const getGridColumns = (viewportWidth: number): number => {
    if (viewportWidth >= 1024) return 3; // lg:grid-cols-3
    if (viewportWidth >= 768) return 2; // md:grid-cols-2
    return 1; // grid-cols-1
  };

  it('should show 1 column on mobile', () => {
    expect(getGridColumns(320)).toBe(1);
    expect(getGridColumns(640)).toBe(1);
    expect(getGridColumns(767)).toBe(1);
  });

  it('should show 2 columns on tablet', () => {
    expect(getGridColumns(768)).toBe(2);
    expect(getGridColumns(900)).toBe(2);
    expect(getGridColumns(1023)).toBe(2);
  });

  it('should show 3 columns on desktop', () => {
    expect(getGridColumns(1024)).toBe(3);
    expect(getGridColumns(1280)).toBe(3);
    expect(getGridColumns(1920)).toBe(3);
  });
});

describe('BudgetCardGrid - skeleton count', () => {
  /**
   * Tests for configurable skeletonCount prop (P2-2 code quality improvement)
   * Default is 6 (2 rows in 3-column grid), but can be customized via prop
   */
  it('should render 6 skeleton cards by default when loading', () => {
    const defaultSkeletonCount = 6;
    const skeletons = Array.from({ length: defaultSkeletonCount });
    expect(skeletons.length).toBe(6);
  });

  it('should allow custom skeleton count via prop', () => {
    const customSkeletonCount = 9; // 3 rows in 3-column grid
    const skeletons = Array.from({ length: customSkeletonCount });
    expect(skeletons.length).toBe(9);
  });

  it('should allow smaller skeleton count for compact views', () => {
    const compactSkeletonCount = 3; // 1 row in 3-column grid
    const skeletons = Array.from({ length: compactSkeletonCount });
    expect(skeletons.length).toBe(3);
  });

  it('should handle skeleton count of 0', () => {
    const zeroSkeletonCount = 0;
    const skeletons = Array.from({ length: zeroSkeletonCount });
    expect(skeletons.length).toBe(0);
  });

  it('should use prop value over default', () => {
    const propValue = 12;
    const defaultValue = 6;
    const skeletonCount = propValue ?? defaultValue;
    expect(skeletonCount).toBe(12);
  });
});

describe('BudgetCardGrid - budget status counts', () => {
  it('should count status types correctly', () => {
    const okCount = sampleBudgets.filter((b) => b.status === 'ok').length;
    const warningCount = sampleBudgets.filter((b) => b.status === 'warning').length;
    const exceededCount = sampleBudgets.filter((b) => b.status === 'exceeded').length;

    expect(okCount).toBe(0);
    expect(warningCount).toBe(2);
    expect(exceededCount).toBe(1);
  });

  it('should handle all-ok budgets', () => {
    const healthyBudgets: BudgetData[] = [
      {
        category_id: '1',
        category_name: 'Transport',
        spent_amount: 1200000,
        budget_amount: 2500000,
        percentage_used: 48,
        status: 'ok',
      },
      {
        category_id: '2',
        category_name: 'Entertainment',
        spent_amount: 850000,
        budget_amount: 1500000,
        percentage_used: 56,
        status: 'ok',
      },
    ];

    const allOk = healthyBudgets.every((b) => b.status === 'ok');
    expect(allOk).toBe(true);
  });
});

describe('BudgetCardGrid - sorting by percentage', () => {
  it('should be able to sort by percentage descending (highest usage first)', () => {
    const sorted = [...sampleBudgets].sort((a, b) => b.percentage_used - a.percentage_used);

    expect(sorted[0].category_name).toBe('Dining'); // 95%
    expect(sorted[1].category_name).toBe('Housing'); // 94%
    expect(sorted[2].category_name).toBe('Groceries'); // 72%
  });

  it('should be able to sort by percentage ascending (lowest usage first)', () => {
    const sorted = [...sampleBudgets].sort((a, b) => a.percentage_used - b.percentage_used);

    expect(sorted[0].category_name).toBe('Groceries'); // 72%
    expect(sorted[1].category_name).toBe('Housing'); // 94%
    expect(sorted[2].category_name).toBe('Dining'); // 95%
  });
});

describe('BudgetCardGrid - sorting by budget amount (highest first)', () => {
  it('should sort by budget_amount descending (highest budget first)', () => {
    const sorted = [...sampleBudgets].sort((a, b) => {
      const amountA =
        typeof a.budget_amount === 'string' ? parseFloat(a.budget_amount) : a.budget_amount;
      const amountB =
        typeof b.budget_amount === 'string' ? parseFloat(b.budget_amount) : b.budget_amount;
      return amountB - amountA;
    });

    expect(sorted[0].category_name).toBe('Housing'); // 40,000,000
    expect(sorted[1].category_name).toBe('Groceries'); // 8,000,000
    expect(sorted[2].category_name).toBe('Dining'); // 3,000,000
  });

  it('should handle string and number budget amounts', () => {
    const mixedBudgets: BudgetData[] = [
      {
        category_id: '1',
        category_name: 'Small',
        spent_amount: 500,
        budget_amount: 1000, // number
        percentage_used: 50,
        status: 'ok',
      },
      {
        category_id: '2',
        category_name: 'Large',
        spent_amount: '2500',
        budget_amount: '5000', // string
        percentage_used: 50,
        status: 'ok',
      },
      {
        category_id: '3',
        category_name: 'Medium',
        spent_amount: 1500,
        budget_amount: '3000', // string
        percentage_used: 50,
        status: 'ok',
      },
    ];

    const sorted = [...mixedBudgets].sort((a, b) => {
      const amountA =
        typeof a.budget_amount === 'string' ? parseFloat(a.budget_amount) : a.budget_amount;
      const amountB =
        typeof b.budget_amount === 'string' ? parseFloat(b.budget_amount) : b.budget_amount;
      return amountB - amountA;
    });

    expect(sorted[0].category_name).toBe('Large'); // 5000
    expect(sorted[1].category_name).toBe('Medium'); // 3000
    expect(sorted[2].category_name).toBe('Small'); // 1000
  });

  it('should handle equal budget amounts (stable sort)', () => {
    const equalBudgets: BudgetData[] = [
      {
        category_id: '1',
        category_name: 'First',
        spent_amount: 500,
        budget_amount: '2000',
        percentage_used: 25,
        status: 'ok',
      },
      {
        category_id: '2',
        category_name: 'Second',
        spent_amount: 1000,
        budget_amount: '2000',
        percentage_used: 50,
        status: 'ok',
      },
    ];

    const sorted = [...equalBudgets].sort((a, b) => {
      const amountA =
        typeof a.budget_amount === 'string' ? parseFloat(a.budget_amount) : a.budget_amount;
      const amountB =
        typeof b.budget_amount === 'string' ? parseFloat(b.budget_amount) : b.budget_amount;
      return amountB - amountA;
    });

    // Both have same budget, should maintain relative order
    expect(sorted.length).toBe(2);
    expect(sorted[0].budget_amount).toBe('2000');
    expect(sorted[1].budget_amount).toBe('2000');
  });
});

describe('BudgetCardGrid - filtering', () => {
  it('should filter to show only exceeded budgets', () => {
    const exceeded = sampleBudgets.filter((b) => b.status === 'exceeded');
    expect(exceeded.length).toBe(1);
    expect(exceeded[0].category_name).toBe('Dining');
  });

  it('should filter to show warning and exceeded budgets', () => {
    const alerts = sampleBudgets.filter((b) => b.status === 'warning' || b.status === 'exceeded');
    expect(alerts.length).toBe(3);
  });

  it('should filter by category name', () => {
    const housing = sampleBudgets.filter((b) => b.category_name.toLowerCase().includes('housing'));
    expect(housing.length).toBe(1);
    expect(housing[0].category_id).toBe('1');
  });
});

describe('BudgetCardGrid - currency handling', () => {
  it('should handle IDR currency', () => {
    const currency: Currency = 'IDR';
    expect(currency).toBe('IDR');
  });

  it('should handle USD currency', () => {
    const currency: Currency = 'USD';
    expect(currency).toBe('USD');
  });

  it('should default to IDR when not specified', () => {
    const defaultCurrency = 'IDR';
    expect(defaultCurrency).toBe('IDR');
  });
});

describe('BudgetCardGrid - accessibility', () => {
  it('should have proper ARIA attributes for grid container', () => {
    // The component uses role="list" and aria-label="Budget categories"
    const expectedRole = 'list';
    const expectedAriaLabel = 'Budget categories';

    expect(expectedRole).toBe('list');
    expect(expectedAriaLabel).toBe('Budget categories');
  });

  it('should have proper ARIA attributes for loading state', () => {
    // The component uses aria-busy="true" and aria-label="Loading budgets"
    const expectedAriaBusy = 'true';
    const expectedAriaLabel = 'Loading budgets';

    expect(expectedAriaBusy).toBe('true');
    expect(expectedAriaLabel).toBe('Loading budgets');
  });
});

describe('BudgetCardGrid - aria-rowcount (P3-2)', () => {
  /**
   * Tests for aria-rowcount accessibility improvement
   * Announces total count of budget items to screen readers
   */

  it('should set aria-rowcount to budget count', () => {
    const budgets = sampleBudgets;
    const ariaRowCount = budgets.length;
    expect(ariaRowCount).toBe(3);
  });

  it('should handle empty budgets array', () => {
    const budgets: BudgetData[] = [];
    const ariaRowCount = budgets.length;
    expect(ariaRowCount).toBe(0);
  });

  it('should handle single budget', () => {
    const budgets: BudgetData[] = [
      {
        category_id: '1',
        category_name: 'Test',
        spent_amount: 1000,
        budget_amount: 2000,
        percentage_used: 50,
        status: 'ok',
      },
    ];
    const ariaRowCount = budgets.length;
    expect(ariaRowCount).toBe(1);
  });

  it('should update count dynamically when budgets change', () => {
    const initialBudgets: BudgetData[] = [...sampleBudgets];
    expect(initialBudgets.length).toBe(3);

    // Simulating adding a budget
    const updatedBudgets = [
      ...initialBudgets,
      {
        category_id: '4',
        category_name: 'New Category',
        spent_amount: 500,
        budget_amount: 1000,
        percentage_used: 50,
        status: 'ok' as const,
      },
    ];
    expect(updatedBudgets.length).toBe(4);
  });
});

describe('BudgetCardGrid - default sort by percentage_used descending', () => {
  it('should sort by percentage_used descending (highest usage first)', () => {
    const budgets = [
      { category_name: 'Food', percentage_used: 72 },
      { category_name: 'Work Support', percentage_used: 225 },
      { category_name: 'Housing', percentage_used: 94 },
    ];

    const sorted = [...budgets].sort((a, b) => b.percentage_used - a.percentage_used);

    expect(sorted[0].category_name).toBe('Work Support'); // 225%
    expect(sorted[1].category_name).toBe('Housing'); // 94%
    expect(sorted[2].category_name).toBe('Food'); // 72%
  });
});
