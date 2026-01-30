import { describe, expect, it } from 'bun:test';
import {
  formatCompactNumber,
  formatCurrency,
  formatCurrencyCompact,
  formatPercentage,
} from '@/lib/formatting';

describe('currency formatting', () => {
  it('formats IDR with dot thousands and no decimals', () => {
    expect(formatCurrency(150000, 'IDR')).toBe('Rp150.000');
    expect(formatCurrency('150000', 'IDR')).toBe('Rp150.000');
  });

  it('formats USD with comma thousands and 2 decimals', () => {
    expect(formatCurrency(2500, 'USD')).toBe('$2,500.00');
    expect(formatCurrency('1234.56', 'USD')).toBe('$1,234.56');
  });

  it('places negative sign before symbol', () => {
    expect(formatCurrency(-150000, 'IDR')).toBe('-Rp150.000');
    expect(formatCurrency(-2500, 'USD')).toBe('-$2,500.00');
  });

  it('formats compact currency with K/M/B suffixes', () => {
    expect(formatCurrencyCompact(1500, 'IDR')).toBe('Rp1.5K');
    expect(formatCurrencyCompact(1_000_000, 'IDR')).toBe('Rp1M');
    expect(formatCurrencyCompact(2_500_000_000, 'IDR')).toBe('Rp2.5B');
    expect(formatCurrencyCompact(-1500, 'USD')).toBe('-$1.5K');
  });

  it('falls back to full format for small values', () => {
    expect(formatCurrencyCompact(999, 'IDR')).toBe('Rp999');
    expect(formatCurrencyCompact(999, 'USD')).toBe('$999.00');
  });

  it('handles invalid numeric inputs as zero', () => {
    expect(formatCurrency(Number.NaN, 'IDR')).toBe('Rp0');
    expect(formatCurrency(Number.POSITIVE_INFINITY, 'USD')).toBe('$0.00');
  });

  it('falls back to default currency on invalid codes', () => {
    expect(formatCurrency(1000, 'EUR' as unknown as 'IDR')).toBe('Rp1.000');
  });
});

describe('percentage and compact number formatting', () => {
  it('formats percentages with fixed decimals', () => {
    expect(formatPercentage(85.5, 2)).toBe('85.50%');
  });

  it('formats compact numbers with K/M/B suffixes', () => {
    expect(formatCompactNumber(1500)).toBe('1.5K');
    expect(formatCompactNumber(1_000_000)).toBe('1M');
    expect(formatCompactNumber(-2500000)).toBe('-2.5M');
  });
});
