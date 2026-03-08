import { describe, expect, test } from 'bun:test';
import {
  stripAmountFormatting,
  formatAmountForDisplay,
  formatAmountForTyping,
} from './amount-input';

describe('stripAmountFormatting', () => {
  describe('IDR (thousands=".", decimal=",")', () => {
    test('strips thousand separators', () => {
      expect(stripAmountFormatting('2.400.000', 'IDR')).toBe('2400000');
    });

    test('handles decimal comma', () => {
      expect(stripAmountFormatting('2.400.000,50', 'IDR')).toBe('2400000.50');
    });

    test('handles plain number', () => {
      expect(stripAmountFormatting('2400000', 'IDR')).toBe('2400000');
    });

    test('handles empty string', () => {
      expect(stripAmountFormatting('', 'IDR')).toBe('');
    });

    test('handles whitespace', () => {
      expect(stripAmountFormatting('  ', 'IDR')).toBe('');
    });

    test('handles negative values', () => {
      expect(stripAmountFormatting('-2.400.000', 'IDR')).toBe('-2400000');
    });

    test('handles small numbers without separators', () => {
      expect(stripAmountFormatting('500', 'IDR')).toBe('500');
    });

    test('strips currency symbols', () => {
      expect(stripAmountFormatting('Rp2.400.000', 'IDR')).toBe('2400000');
    });

    test('treats comma with 3+ digits as thousands (USD-style paste)', () => {
      expect(stripAmountFormatting('12,000', 'IDR')).toBe('12000');
    });

    test('treats multiple commas as thousands separators', () => {
      expect(stripAmountFormatting('1,000,000', 'IDR')).toBe('1000000');
    });

    test('treats comma with 1-2 digits as decimal', () => {
      expect(stripAmountFormatting('12,50', 'IDR')).toBe('12.50');
      expect(stripAmountFormatting('12,5', 'IDR')).toBe('12.5');
    });

    test('prefers IDR format when dots and comma both present', () => {
      // Dots = thousands, comma = decimal (standard IDR format)
      expect(stripAmountFormatting('2.400,50', 'IDR')).toBe('2400.50');
    });
  });

  describe('USD (thousands=",", decimal=".")', () => {
    test('strips thousand separators', () => {
      expect(stripAmountFormatting('2,400,000', 'USD')).toBe('2400000');
    });

    test('handles decimal point', () => {
      expect(stripAmountFormatting('2,400,000.50', 'USD')).toBe('2400000.50');
    });

    test('handles plain number', () => {
      expect(stripAmountFormatting('2400000', 'USD')).toBe('2400000');
    });

    test('handles empty string', () => {
      expect(stripAmountFormatting('', 'USD')).toBe('');
    });

    test('handles negative values', () => {
      expect(stripAmountFormatting('-2,400,000', 'USD')).toBe('-2400000');
    });

    test('strips currency symbols', () => {
      expect(stripAmountFormatting('$2,400,000', 'USD')).toBe('2400000');
    });
  });

  test('defaults to IDR when no currency specified', () => {
    expect(stripAmountFormatting('2.400.000')).toBe('2400000');
  });
});

describe('formatAmountForDisplay', () => {
  describe('IDR', () => {
    test('formats with dot thousand separators', () => {
      expect(formatAmountForDisplay('2400000', 'IDR')).toBe('2.400.000');
    });

    test('formats small numbers', () => {
      expect(formatAmountForDisplay('500', 'IDR')).toBe('500');
    });

    test('handles already-formatted input (round-trip)', () => {
      const formatted = formatAmountForDisplay('2400000', 'IDR');
      const stripped = stripAmountFormatting(formatted, 'IDR');
      expect(stripped).toBe('2400000');
      expect(formatAmountForDisplay(stripped, 'IDR')).toBe('2.400.000');
    });

    test('returns empty for empty input', () => {
      expect(formatAmountForDisplay('', 'IDR')).toBe('');
    });

    test('returns empty for non-numeric input', () => {
      expect(formatAmountForDisplay('abc', 'IDR')).toBe('');
    });

    test('handles decimal values', () => {
      const result = formatAmountForDisplay('2400000.50', 'IDR');
      expect(result).toBe('2.400.000,5');
    });

    test('handles negative values', () => {
      expect(formatAmountForDisplay('-2400000', 'IDR')).toBe('-2.400.000');
    });
  });

  describe('USD', () => {
    test('formats with comma thousand separators', () => {
      expect(formatAmountForDisplay('2400000', 'USD')).toBe('2,400,000');
    });

    test('formats small numbers', () => {
      expect(formatAmountForDisplay('500', 'USD')).toBe('500');
    });

    test('handles already-formatted input (round-trip)', () => {
      const formatted = formatAmountForDisplay('2400000', 'USD');
      const stripped = stripAmountFormatting(formatted, 'USD');
      expect(stripped).toBe('2400000');
      expect(formatAmountForDisplay(stripped, 'USD')).toBe('2,400,000');
    });

    test('handles decimal values', () => {
      const result = formatAmountForDisplay('2400000.50', 'USD');
      expect(result).toBe('2,400,000.5');
    });

    test('handles negative values', () => {
      expect(formatAmountForDisplay('-2400000', 'USD')).toBe('-2,400,000');
    });
  });

  test('defaults to IDR when no currency specified', () => {
    expect(formatAmountForDisplay('2400000')).toBe('2.400.000');
  });
});

describe('formatAmountForTyping', () => {
  test('formats integer input with grouping while typing (IDR)', () => {
    expect(formatAmountForTyping('1234', 'IDR')).toBe('1.234');
  });

  test('preserves trailing decimal separator while typing (IDR)', () => {
    expect(formatAmountForTyping('1234,', 'IDR')).toBe('1.234,');
  });

  test('accepts dot decimal typing for IDR and normalizes to comma', () => {
    expect(formatAmountForTyping('1234.5', 'IDR')).toBe('1.234,5');
  });

  test('formats USD typing with comma grouping and dot decimal', () => {
    expect(formatAmountForTyping('1234.5', 'USD')).toBe('1,234.5');
  });

  test('preserves trailing decimal separator while typing (USD)', () => {
    expect(formatAmountForTyping('1234.', 'USD')).toBe('1,234.');
  });
});
