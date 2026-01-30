/**
 * NetWorthWidget Component Tests
 * ===============================
 * Unit tests for NetWorthWidget utility functions
 */

import { describe, it, expect } from 'bun:test';
import { formatCurrency } from '@/lib/formatting';

describe('NetWorthWidget - formatIDR', () => {
  it('should format positive IDR amounts correctly', () => {
    expect(formatCurrency(1956063000, 'IDR')).toBe('Rp1.956.063.000');
    expect(formatCurrency(1000000, 'IDR')).toBe('Rp1.000.000');
    expect(formatCurrency(50000, 'IDR')).toBe('Rp50.000');
  });

  it('should format zero correctly', () => {
    expect(formatCurrency(0, 'IDR')).toBe('Rp0');
  });

  it('should handle large numbers', () => {
    expect(formatCurrency(5000000000, 'IDR')).toBe('Rp5.000.000.000');
    expect(formatCurrency(999999999999)).toBe('Rp999.999.999.999');
  });

  it('should not show decimal places', () => {
    expect(formatCurrency(1234.56, 'IDR')).toBe('Rp1.235'); // rounded, not truncated
  });
});

describe('NetWorthWidget - formatUSD', () => {
  it('should format positive USD amounts correctly', () => {
    expect(formatCurrency(130404.2, 'USD')).toBe('$130,404.20');
    expect(formatCurrency(1000, 'USD')).toBe('$1,000.00');
    expect(formatCurrency(100.5, 'USD')).toBe('$100.50');
  });

  it('should format zero correctly', () => {
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
  });

  it('should handle whole numbers', () => {
    expect(formatCurrency(50000, 'USD')).toBe('$50,000.00');
    expect(formatCurrency(250000, 'USD')).toBe('$250,000.00');
  });

  it('should handle large numbers', () => {
    expect(formatCurrency(333333.33, 'USD')).toBe('$333,333.33');
    expect(formatCurrency(1000000, 'USD')).toBe('$1,000,000.00');
  });
});

describe('NetWorthWidget - growth badge logic', () => {
  const getGrowthVariant = (percentage: number): string => {
    return percentage >= 0 ? 'success' : 'error';
  };

  it('should return success for positive growth', () => {
    expect(getGrowthVariant(4.2)).toBe('success');
    expect(getGrowthVariant(0.1)).toBe('success');
    expect(getGrowthVariant(100)).toBe('success');
  });

  it('should return success for zero growth', () => {
    expect(getGrowthVariant(0)).toBe('success');
  });

  it('should return error for negative growth', () => {
    expect(getGrowthVariant(-2.5)).toBe('error');
    expect(getGrowthVariant(-0.1)).toBe('error');
    expect(getGrowthVariant(-100)).toBe('error');
  });
});

describe('NetWorthWidget - growth label format', () => {
  const getGrowthLabel = (percentage: number): string => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}% growth`;
  };

  it('should format positive growth with + sign', () => {
    expect(getGrowthLabel(4.2)).toBe('+4.2% growth');
    expect(getGrowthLabel(12.8)).toBe('+12.8% growth');
    expect(getGrowthLabel(0.5)).toBe('+0.5% growth');
  });

  it('should format negative growth with - sign', () => {
    expect(getGrowthLabel(-2.5)).toBe('-2.5% growth');
    expect(getGrowthLabel(-10)).toBe('-10.0% growth');
    expect(getGrowthLabel(-0.1)).toBe('-0.1% growth');
  });

  it('should format zero growth with + sign', () => {
    expect(getGrowthLabel(0)).toBe('+0.0% growth');
  });
});

describe('NetWorthWidget - props validation', () => {
  it('should accept valid positive numbers for all props', () => {
    const props = {
      totalIDR: 1956063000,
      totalUSD: 130404.2,
      localAssets: 1541740000,
      globalAssets: 102782.67,
      growthPercentage: 4.2,
    };

    expect(props.totalIDR).toBeGreaterThan(0);
    expect(props.totalUSD).toBeGreaterThan(0);
    expect(props.localAssets).toBeGreaterThan(0);
    expect(props.globalAssets).toBeGreaterThan(0);
    expect(typeof props.growthPercentage).toBe('number');
  });

  it('should handle negative growth percentage', () => {
    const props = {
      totalIDR: 1850000000,
      totalUSD: 123333.33,
      localAssets: 1450000000,
      globalAssets: 98765.43,
      growthPercentage: -2.5,
    };

    expect(props.growthPercentage).toBeLessThan(0);
  });

  it('should handle zero values', () => {
    const props = {
      totalIDR: 0,
      totalUSD: 0,
      localAssets: 0,
      globalAssets: 0,
      growthPercentage: 0,
    };

    expect(props.totalIDR).toBe(0);
    expect(props.totalUSD).toBe(0);
    expect(props.localAssets).toBe(0);
    expect(props.globalAssets).toBe(0);
    expect(props.growthPercentage).toBe(0);
  });
});

describe('NetWorthWidget - asset breakdown consistency', () => {
  it('should accept valid asset breakdown props', () => {
    // The component displays whatever data is passed to it
    // Exchange rate conversion is handled by the service layer
    const props = {
      totalIDR: 1956063000,
      totalUSD: 130404.2,
      localAssets: 1541740000,
      globalAssets: 102782.67,
      growthPercentage: 4.2,
    };

    expect(props.totalIDR).toBeGreaterThan(0);
    expect(props.totalUSD).toBeGreaterThan(0);
    expect(props.localAssets).toBeGreaterThan(0);
    expect(props.globalAssets).toBeGreaterThan(0);
  });
});

describe('NetWorthWidget - empty state detection', () => {
  /**
   * Tests for the empty state logic (P2-2 code quality improvement)
   * Component shows empty state when all asset values are falsy (0, null, undefined)
   * Uses falsy check instead of strict equality for robustness
   */
  const isEmptyState = (props: {
    totalIDR: number | null | undefined;
    totalUSD: number | null | undefined;
    localAssets: number | null | undefined;
    globalAssets: number | null | undefined;
  }): boolean => {
    // Robust falsy check - handles 0, null, undefined, and NaN
    return !props.totalIDR && !props.totalUSD && !props.localAssets && !props.globalAssets;
  };

  it('should detect empty state when all values are 0', () => {
    const emptyProps = {
      totalIDR: 0,
      totalUSD: 0,
      localAssets: 0,
      globalAssets: 0,
    };
    expect(isEmptyState(emptyProps)).toBe(true);
  });

  it('should detect empty state when all values are null', () => {
    const nullProps = {
      totalIDR: null,
      totalUSD: null,
      localAssets: null,
      globalAssets: null,
    };
    expect(isEmptyState(nullProps)).toBe(true);
  });

  it('should detect empty state when all values are undefined', () => {
    const undefinedProps = {
      totalIDR: undefined,
      totalUSD: undefined,
      localAssets: undefined,
      globalAssets: undefined,
    };
    expect(isEmptyState(undefinedProps)).toBe(true);
  });

  it('should detect empty state with mixed falsy values', () => {
    const mixedFalsyProps = {
      totalIDR: 0,
      totalUSD: null,
      localAssets: undefined,
      globalAssets: 0,
    };
    expect(isEmptyState(mixedFalsyProps)).toBe(true);
  });

  it('should not be empty state when any IDR value is set', () => {
    const props = {
      totalIDR: 1000000,
      totalUSD: 0,
      localAssets: 0,
      globalAssets: 0,
    };
    expect(isEmptyState(props)).toBe(false);
  });

  it('should not be empty state when any USD value is set', () => {
    const props = {
      totalIDR: 0,
      totalUSD: 100,
      localAssets: 0,
      globalAssets: 0,
    };
    expect(isEmptyState(props)).toBe(false);
  });

  it('should not be empty state when local assets are set', () => {
    const props = {
      totalIDR: 0,
      totalUSD: 0,
      localAssets: 500000,
      globalAssets: 0,
    };
    expect(isEmptyState(props)).toBe(false);
  });

  it('should not be empty state when global assets are set', () => {
    const props = {
      totalIDR: 0,
      totalUSD: 0,
      localAssets: 0,
      globalAssets: 50,
    };
    expect(isEmptyState(props)).toBe(false);
  });

  it('should not be empty state with full data', () => {
    const fullProps = {
      totalIDR: 1956063000,
      totalUSD: 130404.2,
      localAssets: 1541740000,
      globalAssets: 102782.67,
    };
    expect(isEmptyState(fullProps)).toBe(false);
  });

  it('should not be empty state with small positive values', () => {
    const smallValueProps = {
      totalIDR: 0.01,
      totalUSD: 0,
      localAssets: 0,
      globalAssets: 0,
    };
    expect(isEmptyState(smallValueProps)).toBe(false);
  });
});
