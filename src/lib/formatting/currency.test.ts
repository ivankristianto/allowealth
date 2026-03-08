import { describe, expect, it } from 'bun:test';
import { formatCurrency, formatPercentage } from '@/lib/formatting';

describe('currency formatting', () => {
  it('formats IDR with dot thousands and 2 decimals', () => {
    expect(formatCurrency(150000, 'IDR')).toBe('Rp150.000,00');
    expect(formatCurrency('150000', 'IDR')).toBe('Rp150.000,00');
  });

  it('formats USD with comma thousands and 2 decimals', () => {
    expect(formatCurrency(2500, 'USD')).toBe('$2,500.00');
    expect(formatCurrency('1234.56', 'USD')).toBe('$1,234.56');
  });

  it('places negative sign before symbol', () => {
    expect(formatCurrency(-150000, 'IDR')).toBe('-Rp150.000,00');
    expect(formatCurrency(-2500, 'USD')).toBe('-$2,500.00');
  });

  it('handles invalid numeric inputs as zero', () => {
    expect(formatCurrency(Number.NaN, 'IDR')).toBe('Rp0,00');
    expect(formatCurrency(Number.POSITIVE_INFINITY, 'USD')).toBe('$0.00');
  });

  it('formats newly supported currencies', () => {
    expect(formatCurrency(1000, 'EUR')).toBe('€1.000,00');
  });
});

describe('percentage formatting', () => {
  it('formats percentages with fixed decimals', () => {
    expect(formatPercentage(85.5, 2)).toBe('85.50%');
  });
});
