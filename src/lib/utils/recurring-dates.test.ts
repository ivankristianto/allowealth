import { describe, test, expect } from 'bun:test';
import {
  calculateDueDate,
  shouldGenerateOccurrence,
  generateInstallmentDescription,
} from './recurring-dates';

describe('calculateDueDate', () => {
  test('calculates due date for normal month', () => {
    expect(calculateDueDate('2026-01-01', 15, 0)).toBe('2026-01-15');
  });

  test('calculates due date for next month', () => {
    expect(calculateDueDate('2026-01-01', 15, 1)).toBe('2026-02-15');
  });

  test('caps day 31 in 30-day month', () => {
    expect(calculateDueDate('2026-01-01', 31, 3)).toBe('2026-04-30');
  });

  test('caps day 31 in february', () => {
    expect(calculateDueDate('2026-01-01', 31, 1)).toBe('2026-02-28');
  });

  test('supports leap year february', () => {
    expect(calculateDueDate('2028-01-01', 29, 1)).toBe('2028-02-29');
  });

  test('caps non-leap year february', () => {
    expect(calculateDueDate('2026-01-01', 29, 1)).toBe('2026-02-28');
  });
});

describe('shouldGenerateOccurrence', () => {
  test('returns true within total occurrence limit', () => {
    expect(
      shouldGenerateOccurrence({ total_occurrences: 12, end_date: null }, 5, '2026-06-15')
    ).toBe(true);
  });

  test('returns true at total occurrence limit', () => {
    expect(
      shouldGenerateOccurrence({ total_occurrences: 12, end_date: null }, 12, '2026-12-15')
    ).toBe(true);
  });

  test('returns false when exceeding total occurrence limit', () => {
    expect(
      shouldGenerateOccurrence({ total_occurrences: 12, end_date: null }, 13, '2027-01-15')
    ).toBe(false);
  });

  test('returns true before end date', () => {
    expect(
      shouldGenerateOccurrence({ total_occurrences: null, end_date: '2026-12-31' }, 5, '2026-06-15')
    ).toBe(true);
  });

  test('returns false after end date', () => {
    expect(
      shouldGenerateOccurrence({ total_occurrences: null, end_date: '2026-06-30' }, 5, '2026-07-15')
    ).toBe(false);
  });

  test('returns false when count limit exceeded even if end date is in the future', () => {
    expect(
      shouldGenerateOccurrence({ total_occurrences: 3, end_date: '2027-12-31' }, 4, '2026-04-15')
    ).toBe(false);
  });
});

describe('generateInstallmentDescription', () => {
  test('formats installment description with zero-padded numbers', () => {
    expect(generateInstallmentDescription('iPhone 17 Pro', 'Installment', 3, 12)).toBe(
      'iPhone 17 Pro - Installment 03/12'
    );
  });

  test('pads single digit occurrence numbers', () => {
    expect(generateInstallmentDescription('iPhone 17 Pro', 'Installment', 1, 12)).toBe(
      'iPhone 17 Pro - Installment 01/12'
    );
  });

  test('supports custom installment label', () => {
    expect(generateInstallmentDescription('iPhone 17 Pro', 'Cicilan', 3, 12)).toBe(
      'iPhone 17 Pro - Cicilan 03/12'
    );
  });
});
