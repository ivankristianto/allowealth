/**
 * Currency Conversion Tests
 * =========================
 * Unit tests for currency conversion utilities
 */

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import {
  convertCurrency,
  convertCurrencySync,
  getLatestExchangeRate,
  roundToDecimals,
  formatCurrencyAmount,
  calculatePercentageUsed,
  DEFAULT_EXCHANGE_RATE,
} from './conversion';

describe('roundToDecimals', () => {
  it('should round to 2 decimal places by default', () => {
    expect(roundToDecimals(123.456)).toBe(123.46);
    expect(roundToDecimals(123.454)).toBe(123.45);
    expect(roundToDecimals(123.455)).toBe(123.46);
  });

  it('should round to specified decimal places', () => {
    expect(roundToDecimals(123.4567, 3)).toBe(123.457);
    expect(roundToDecimals(123.4567, 1)).toBe(123.5);
    expect(roundToDecimals(123.4567, 0)).toBe(123);
  });

  it('should handle zero', () => {
    expect(roundToDecimals(0)).toBe(0);
    expect(roundToDecimals(0.0001)).toBe(0);
  });

  it('should handle negative numbers', () => {
    expect(roundToDecimals(-123.456)).toBe(-123.46);
    expect(roundToDecimals(-123.454)).toBe(-123.45);
  });

  it('should handle very small numbers', () => {
    expect(roundToDecimals(0.001)).toBe(0);
    expect(roundToDecimals(0.005)).toBe(0.01);
    expect(roundToDecimals(0.009)).toBe(0.01);
  });
});

describe('convertCurrencySync', () => {
  const rate = 15000;

  it('should return same amount for same currency', () => {
    expect(convertCurrencySync(100, 'USD', 'USD', rate)).toBe(100);
    expect(convertCurrencySync(100, 'IDR', 'IDR', rate)).toBe(100);
  });

  it('should convert USD to IDR correctly', () => {
    expect(convertCurrencySync(1, 'USD', 'IDR', rate)).toBe(15000);
    expect(convertCurrencySync(100, 'USD', 'IDR', rate)).toBe(1500000);
    expect(convertCurrencySync(0.5, 'USD', 'IDR', rate)).toBe(7500);
  });

  it('should convert IDR to USD correctly', () => {
    expect(convertCurrencySync(15000, 'IDR', 'USD', rate)).toBe(1);
    expect(convertCurrencySync(1500000, 'IDR', 'USD', rate)).toBe(100);
    expect(convertCurrencySync(7500, 'IDR', 'USD', rate)).toBe(0.5);
  });

  it('should round to 2 decimal places', () => {
    expect(convertCurrencySync(1.23456, 'USD', 'IDR', rate)).toBe(18518.4);
    expect(convertCurrencySync(15000.123, 'IDR', 'USD', rate)).toBe(1);
    expect(convertCurrencySync(15555.555, 'IDR', 'USD', rate)).toBe(1.04);
  });

  it('should handle zero', () => {
    expect(convertCurrencySync(0, 'USD', 'IDR', rate)).toBe(0);
    expect(convertCurrencySync(0, 'IDR', 'USD', rate)).toBe(0);
  });

  it('should handle very small amounts', () => {
    expect(convertCurrencySync(0.01, 'USD', 'IDR', rate)).toBe(150);
    expect(convertCurrencySync(100, 'IDR', 'USD', rate)).toBe(0.01);
  });

  it('should use default rate when not provided', () => {
    expect(convertCurrencySync(1, 'USD', 'IDR')).toBe(DEFAULT_EXCHANGE_RATE);
    expect(convertCurrencySync(DEFAULT_EXCHANGE_RATE, 'IDR', 'USD')).toBe(1);
  });

  it('should throw error for negative amounts', () => {
    expect(() => convertCurrencySync(-100, 'USD', 'IDR', rate)).toThrow('Invalid amount');
  });

  it('should throw error for NaN amounts', () => {
    expect(() => convertCurrencySync(NaN, 'USD', 'IDR', rate)).toThrow('Invalid amount');
  });

  it('should throw error for invalid rates', () => {
    expect(() => convertCurrencySync(100, 'USD', 'IDR', 0)).toThrow('Invalid exchange rate');
    expect(() => convertCurrencySync(100, 'USD', 'IDR', -15000)).toThrow('Invalid exchange rate');
    expect(() => convertCurrencySync(100, 'USD', 'IDR', NaN)).toThrow('Invalid exchange rate');
  });
});

describe('formatCurrencyAmount', () => {
  it('should format USD correctly', () => {
    expect(formatCurrencyAmount(100, 'USD')).toBe('$100.00');
    expect(formatCurrencyAmount(1234.56, 'USD')).toBe('$1,234.56');
    expect(formatCurrencyAmount(1000000, 'USD')).toBe('$1,000,000.00');
  });

  it('should format IDR correctly', () => {
    expect(formatCurrencyAmount(100, 'IDR')).toBe('Rp100');
    expect(formatCurrencyAmount(1234.56, 'IDR')).toBe('Rp1,235');
    expect(formatCurrencyAmount(1000000, 'IDR')).toBe('Rp1,000,000');
  });

  it('should round to appropriate decimals', () => {
    expect(formatCurrencyAmount(123.456, 'USD')).toBe('$123.46');
    expect(formatCurrencyAmount(123.456, 'IDR')).toBe('Rp123');
  });

  it('should handle zero', () => {
    expect(formatCurrencyAmount(0, 'USD')).toBe('$0.00');
    expect(formatCurrencyAmount(0, 'IDR')).toBe('Rp0');
  });

  it('should handle negative numbers', () => {
    expect(formatCurrencyAmount(-100, 'USD')).toBe('$-100.00');
    expect(formatCurrencyAmount(-100, 'IDR')).toBe('Rp-100');
  });
});

describe('calculatePercentageUsed', () => {
  it('should calculate percentage correctly', () => {
    expect(calculatePercentageUsed(50, 100)).toBe(50);
    expect(calculatePercentageUsed(80, 100)).toBe(80);
    expect(calculatePercentageUsed(100, 100)).toBe(100);
    expect(calculatePercentageUsed(150, 100)).toBe(150);
  });

  it('should return 0 for zero budget', () => {
    expect(calculatePercentageUsed(50, 0)).toBe(0);
    expect(calculatePercentageUsed(0, 0)).toBe(0);
  });

  it('should return 0 for negative budget', () => {
    expect(calculatePercentageUsed(50, -100)).toBe(0);
  });

  it('should handle zero spent', () => {
    expect(calculatePercentageUsed(0, 100)).toBe(0);
  });

  it('should round to 1 decimal place', () => {
    expect(calculatePercentageUsed(33.333, 100)).toBe(33.3);
    expect(calculatePercentageUsed(66.666, 100)).toBe(66.7);
  });

  it('should handle very small budgets', () => {
    expect(calculatePercentageUsed(0.5, 1)).toBe(50);
    expect(calculatePercentageUsed(1.5, 1)).toBe(150);
  });
});
