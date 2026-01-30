/**
 * Cash Flow Utilities Tests
 * =========================
 * Unit tests for cash flow helpers used by the dashboard widget.
 */

import { describe, expect, it } from 'bun:test';
import { formatCurrency } from '@/lib/formatting';
import {
  formatCashFlowAmount,
  getCashFlowSignedAmount,
  getCashFlowTypeConfig,
} from '@/lib/cash-flow';

describe('getCashFlowSignedAmount', () => {
  it('returns positive values for income', () => {
    expect(getCashFlowSignedAmount(15000000, 'income')).toBe(15000000);
    expect(getCashFlowSignedAmount(-15000000, 'income')).toBe(15000000);
  });

  it('returns negative values for expenses', () => {
    expect(getCashFlowSignedAmount(45000000, 'expense')).toBe(-45000000);
    expect(getCashFlowSignedAmount(-45000000, 'expense')).toBe(-45000000);
  });

  it('handles zero amounts', () => {
    expect(getCashFlowSignedAmount(0, 'income')).toBe(0);
    expect(getCashFlowSignedAmount(0, 'expense')).toBe(0);
  });
});

describe('formatCashFlowAmount', () => {
  it('formats income amounts with + sign', () => {
    const base = formatCurrency(15000000, 'IDR');
    expect(formatCashFlowAmount(15000000, 'income', 'IDR')).toBe(`+${base}`);
  });

  it('formats expense amounts with - sign', () => {
    const base = formatCurrency(45000000, 'IDR');
    expect(formatCashFlowAmount(45000000, 'expense', 'IDR')).toBe(`-${base}`);
  });

  it('does not add sign for zero', () => {
    const base = formatCurrency(0, 'IDR');
    expect(formatCashFlowAmount(0, 'income', 'IDR')).toBe(base);
  });
});

describe('getCashFlowTypeConfig', () => {
  it('returns success styling for income', () => {
    const config = getCashFlowTypeConfig('income');
    expect(config.containerClass).toContain('success');
    expect(config.amountClass).toContain('success');
    expect(config.badgeVariant).toBe('success');
  });

  it('returns error styling for expense', () => {
    const config = getCashFlowTypeConfig('expense');
    expect(config.containerClass).toContain('error');
    expect(config.amountClass).toContain('error');
    expect(config.badgeVariant).toBe('error');
  });
});
