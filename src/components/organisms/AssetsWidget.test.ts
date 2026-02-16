/**
 * AssetsWidget Component Tests
 * ===============================
 * Unit tests for AssetsWidget utility logic
 */

import { describe, it, expect } from 'bun:test';
import { formatCurrency } from '@/lib/formatting';

describe('AssetsWidget - empty state detection', () => {
  const isEmpty = (props: {
    assetIdr: number;
    assetUsd: number;
    debtIdr: number;
    debtUsd: number;
  }): boolean => {
    return !props.assetIdr && !props.assetUsd && !props.debtIdr && !props.debtUsd;
  };

  it('should detect empty state when all values are 0', () => {
    expect(isEmpty({ assetIdr: 0, assetUsd: 0, debtIdr: 0, debtUsd: 0 })).toBe(true);
  });

  it('should not be empty when assetIdr has value', () => {
    expect(isEmpty({ assetIdr: 1000000, assetUsd: 0, debtIdr: 0, debtUsd: 0 })).toBe(false);
  });

  it('should not be empty when assetUsd has value', () => {
    expect(isEmpty({ assetIdr: 0, assetUsd: 500, debtIdr: 0, debtUsd: 0 })).toBe(false);
  });

  it('should not be empty when only debt exists', () => {
    expect(isEmpty({ assetIdr: 0, assetUsd: 0, debtIdr: 5000000, debtUsd: 0 })).toBe(false);
  });

  it('should not be empty with small positive values', () => {
    expect(isEmpty({ assetIdr: 0.01, assetUsd: 0, debtIdr: 0, debtUsd: 0 })).toBe(false);
  });
});

describe('AssetsWidget - hasDebt detection', () => {
  const hasDebt = (debtIdr: number, debtUsd: number): boolean => {
    return debtIdr > 0 || debtUsd > 0;
  };

  it('should return false when no debt', () => {
    expect(hasDebt(0, 0)).toBe(false);
  });

  it('should return true when IDR debt exists', () => {
    expect(hasDebt(5000000, 0)).toBe(true);
  });

  it('should return true when USD debt exists', () => {
    expect(hasDebt(0, 1000)).toBe(true);
  });

  it('should return true when both currencies have debt', () => {
    expect(hasDebt(5000000, 1000)).toBe(true);
  });
});

describe('AssetsWidget - currency formatting', () => {
  it('should format IDR amounts correctly', () => {
    expect(formatCurrency(1956063000, 'IDR')).toBe('Rp1.956.063.000,00');
    expect(formatCurrency(50000, 'IDR')).toBe('Rp50.000,00');
  });

  it('should format USD amounts correctly', () => {
    expect(formatCurrency(130404.2, 'USD')).toBe('$130,404.20');
    expect(formatCurrency(1000, 'USD')).toBe('$1,000.00');
  });

  it('should format zero correctly', () => {
    expect(formatCurrency(0, 'IDR')).toBe('Rp0,00');
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
  });
});
