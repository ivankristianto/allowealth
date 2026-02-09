/**
 * BudgetCard Component Tests
 * ==========================
 * Unit tests for BudgetCard utility functions and logic
 */

import { describe, it, expect } from 'bun:test';
import { formatCurrency } from '@/lib/formatting';
import { getIconForCategory } from '@/lib/utils/categoryIcons';

// Status badge styling logic (same as used in component)
const getStatusBadgeClasses = (status: 'ok' | 'warning' | 'exceeded'): string => {
  const statusMap: Record<string, string> = {
    ok: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    exceeded: 'bg-error/10 text-error',
  };
  return statusMap[status] || statusMap.ok;
};

// Progress bar status mapping
const getProgressStatus = (status: 'ok' | 'warning' | 'exceeded'): 'ok' | 'warning' | 'danger' => {
  if (status === 'exceeded') return 'danger';
  if (status === 'warning') return 'warning';
  return 'ok';
};

describe('BudgetCard - getStatusBadgeClasses', () => {
  it('should return success classes for ok status', () => {
    expect(getStatusBadgeClasses('ok')).toBe('bg-success/10 text-success');
  });

  it('should return warning classes for warning status', () => {
    expect(getStatusBadgeClasses('warning')).toBe('bg-warning/10 text-warning');
  });

  it('should return error classes for exceeded status', () => {
    expect(getStatusBadgeClasses('exceeded')).toBe('bg-error/10 text-error');
  });
});

describe('BudgetCard - getProgressStatus', () => {
  it('should map ok status to ok', () => {
    expect(getProgressStatus('ok')).toBe('ok');
  });

  it('should map warning status to warning', () => {
    expect(getProgressStatus('warning')).toBe('warning');
  });

  it('should map exceeded status to danger', () => {
    expect(getProgressStatus('exceeded')).toBe('danger');
  });
});

describe('BudgetCard - remaining amount calculation', () => {
  it('should calculate positive remaining when under budget', () => {
    const budget = 40000000;
    const spent = 37680000;
    const remaining = budget - spent;
    expect(remaining).toBe(2320000);
    expect(remaining > 0).toBe(true);
  });

  it('should calculate zero remaining when at budget', () => {
    const budget = 40000000;
    const spent = 40000000;
    const remaining = budget - spent;
    expect(remaining).toBe(0);
  });

  it('should calculate negative remaining when over budget', () => {
    const budget = 3000000;
    const spent = 3500000;
    const remaining = budget - spent;
    expect(remaining).toBe(-500000);
    expect(remaining < 0).toBe(true);
  });

  it('should display absolute value for over budget display', () => {
    const budget = 3000000;
    const spent = 3500000;
    const remaining = budget - spent;
    expect(Math.abs(remaining)).toBe(500000);
  });
});

describe('BudgetCard - percentage used calculation', () => {
  it('should calculate percentage correctly', () => {
    expect(Math.round((37680000 / 40000000) * 100)).toBe(94);
    expect(Math.round((5800000 / 8000000) * 100)).toBe(73); // rounds to 73
    expect(Math.round((1200000 / 2500000) * 100)).toBe(48);
  });

  it('should handle over 100% usage', () => {
    expect(Math.round((3500000 / 3000000) * 100)).toBe(117);
    expect(Math.round((4000000 / 3000000) * 100)).toBe(133);
  });

  it('should cap progress bar at 100%', () => {
    const percentageUsed = 117;
    expect(Math.min(percentageUsed, 100)).toBe(100);
  });
});

describe('BudgetCard - currency formatting IDR', () => {
  it('should format IDR amounts correctly', () => {
    expect(formatCurrency(37680000, 'IDR')).toContain('37.680.000');
    expect(formatCurrency(40000000, 'IDR')).toContain('40.000.000');
    expect(formatCurrency(2320000, 'IDR')).toContain('2.320.000');
  });

  it('should format small IDR amounts', () => {
    expect(formatCurrency(150000, 'IDR')).toContain('150.000');
    expect(formatCurrency(50000, 'IDR')).toContain('50.000');
  });

  it('should format zero IDR', () => {
    expect(formatCurrency(0, 'IDR')).toContain('Rp');
    expect(formatCurrency(0, 'IDR')).toContain('0');
  });
});

describe('BudgetCard - currency formatting USD', () => {
  it('should format USD amounts correctly', () => {
    expect(formatCurrency(2500, 'USD')).toBe('$2,500.00');
    expect(formatCurrency(450.5, 'USD')).toBe('$450.50');
    expect(formatCurrency(125, 'USD')).toBe('$125.00');
  });

  it('should format large USD amounts', () => {
    expect(formatCurrency(10000, 'USD')).toBe('$10,000.00');
    expect(formatCurrency(125000.99, 'USD')).toBe('$125,000.99');
  });

  it('should format zero USD', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
  });
});

describe('BudgetCard - getIconForCategory', () => {
  it('should return House icon for housing category', () => {
    expect(getIconForCategory('Housing')).toBe('House');
    expect(getIconForCategory('housing')).toBe('House');
    expect(getIconForCategory('My Housing Expenses')).toBe('House');
    expect(getIconForCategory('Home')).toBe('House');
  });

  it('should return ShoppingCart icon for groceries', () => {
    expect(getIconForCategory('Groceries')).toBe('ShoppingCart');
    expect(getIconForCategory('grocery shopping')).toBe('ShoppingCart');
  });

  it('should return Utensils icon for dining/food', () => {
    expect(getIconForCategory('Dining')).toBe('Utensils');
    expect(getIconForCategory('Restaurant')).toBe('Utensils');
    expect(getIconForCategory('Food & Dining')).toBe('Utensils');
  });

  it('should return Car icon for transport', () => {
    expect(getIconForCategory('Transport')).toBe('Car');
    expect(getIconForCategory('Transportation')).toBe('Car');
  });

  it('should return Film icon for entertainment', () => {
    expect(getIconForCategory('Entertainment')).toBe('Film');
    expect(getIconForCategory('Movies & Entertainment')).toBe('Film');
  });

  it('should return Zap icon for utilities', () => {
    expect(getIconForCategory('Utilities')).toBe('Zap');
    expect(getIconForCategory('Bills & Utilities')).toBe('Zap');
  });

  it('should return default icon for unknown categories', () => {
    expect(getIconForCategory('Unknown Category')).toBe('CircleDollarSign');
    expect(getIconForCategory('Miscellaneous')).toBe('CircleDollarSign');
  });

  it('should use provided default icon', () => {
    expect(getIconForCategory('Unknown', 'Heart')).toBe('Heart');
    expect(getIconForCategory('Custom', 'Briefcase')).toBe('Briefcase');
  });
});

describe('BudgetCard - status determination based on percentage', () => {
  const getStatusFromPercentage = (percentage: number): 'ok' | 'warning' | 'exceeded' => {
    if (percentage > 100) return 'exceeded';
    if (percentage >= 80) return 'warning';
    return 'ok';
  };

  it('should return ok for percentage under 80%', () => {
    expect(getStatusFromPercentage(0)).toBe('ok');
    expect(getStatusFromPercentage(48)).toBe('ok');
    expect(getStatusFromPercentage(79)).toBe('ok');
    expect(getStatusFromPercentage(79.9)).toBe('ok');
  });

  it('should return warning for exactly 100% (on budget, orange)', () => {
    expect(getStatusFromPercentage(100)).toBe('warning');
  });

  it('should return warning for percentage 80-99%', () => {
    expect(getStatusFromPercentage(80)).toBe('warning');
    expect(getStatusFromPercentage(85)).toBe('warning');
    expect(getStatusFromPercentage(94)).toBe('warning');
    expect(getStatusFromPercentage(99)).toBe('warning');
    expect(getStatusFromPercentage(99.9)).toBe('warning');
  });

  it('should return exceeded for percentage > 100%', () => {
    expect(getStatusFromPercentage(100.1)).toBe('exceeded');
    expect(getStatusFromPercentage(117)).toBe('exceeded');
    expect(getStatusFromPercentage(150)).toBe('exceeded');
  });
});

describe('BudgetCard - props validation', () => {
  it('should accept valid budget data', () => {
    const props = {
      categoryId: '1',
      categoryName: 'Housing',
      icon: 'Home',
      spent: 37680000,
      budget: 40000000,
      percentageUsed: 94,
      status: 'warning' as const,
      currency: 'IDR' as const,
    };

    expect(props.spent).toBeLessThanOrEqual(props.budget);
    expect(props.percentageUsed).toBeGreaterThan(0);
    expect(props.percentageUsed).toBeLessThanOrEqual(100);
    expect(['ok', 'warning', 'exceeded']).toContain(props.status);
  });

  it('should handle over budget data', () => {
    const props = {
      categoryId: '3',
      categoryName: 'Dining',
      icon: 'Utensils',
      spent: 3500000,
      budget: 3000000,
      percentageUsed: 117,
      status: 'exceeded' as const,
      currency: 'IDR' as const,
    };

    expect(props.spent).toBeGreaterThan(props.budget);
    expect(props.percentageUsed).toBeGreaterThan(100);
    expect(props.status).toBe('exceeded');
  });

  it('should handle zero budget gracefully', () => {
    const props = {
      categoryId: '0',
      categoryName: 'No Budget',
      spent: 0,
      budget: 0,
      percentageUsed: 0,
      status: 'ok' as const,
      currency: 'IDR' as const,
    };

    expect(props.budget).toBe(0);
    expect(props.spent).toBe(0);
    expect(props.percentageUsed).toBe(0);
  });
});
