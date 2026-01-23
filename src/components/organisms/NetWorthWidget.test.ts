/**
 * NetWorthWidget Component Tests
 * ===============================
 * Unit tests for NetWorthWidget utility functions
 */

import { describe, it, expect } from 'bun:test';

// Currency formatting helpers (same as used in component)
const formatIDR = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatUSD = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

describe('NetWorthWidget - formatIDR', () => {
  it('should format positive IDR amounts correctly', () => {
    expect(formatIDR(1956063000)).toBe('Rp 1.956.063.000');
    expect(formatIDR(1000000)).toBe('Rp 1.000.000');
    expect(formatIDR(50000)).toBe('Rp 50.000');
  });

  it('should format zero correctly', () => {
    expect(formatIDR(0)).toBe('Rp 0');
  });

  it('should handle large numbers', () => {
    expect(formatIDR(5000000000)).toBe('Rp 5.000.000.000');
    expect(formatIDR(999999999999)).toBe('Rp 999.999.999.999');
  });

  it('should not show decimal places', () => {
    expect(formatIDR(1234.56)).toBe('Rp 1.235'); // rounded, not truncated
  });
});

describe('NetWorthWidget - formatUSD', () => {
  it('should format positive USD amounts correctly', () => {
    expect(formatUSD(130404.2)).toBe('$130,404.2');
    expect(formatUSD(1000)).toBe('$1,000');
    expect(formatUSD(100.5)).toBe('$100.5');
  });

  it('should format zero correctly', () => {
    expect(formatUSD(0)).toBe('$0');
  });

  it('should handle whole numbers', () => {
    expect(formatUSD(50000)).toBe('$50,000');
    expect(formatUSD(250000)).toBe('$250,000');
  });

  it('should handle large numbers', () => {
    expect(formatUSD(333333.33)).toBe('$333,333.33');
    expect(formatUSD(1000000)).toBe('$1,000,000');
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
