/**
 * Unit tests for date utility functions
 * @fileoverview Tests for date formatting and month key utilities
 */

import { describe, test, expect } from 'bun:test';
import {
  MONTH_NAMES,
  MONTH_NAMES_SHORT,
  getMonthName,
  formatDate,
  formatMonthYear,
  isFutureDate,
  isPastDate,
  isToday,
  getStartOfDay,
  getEndOfDay,
  getStartOfMonth,
  getEndOfMonth,
  getDaysBetween,
  getCurrentDateISO,
  parseMonthKey,
  parseMonthKeyToISO,
  formatMonthKey,
  createMonthKey,
  getCurrentMonthKey,
  extractAvailableMonths,
} from './date';

describe('month name constants', () => {
  describe('MONTH_NAMES', () => {
    test('has 12 entries', () => {
      expect(MONTH_NAMES).toHaveLength(12);
    });

    test('starts with January and ends with December', () => {
      expect(MONTH_NAMES[0]).toBe('January');
      expect(MONTH_NAMES[11]).toBe('December');
    });

    test('contains all full month names in order', () => {
      const expected: ReadonlyArray<string> = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      expect([...MONTH_NAMES]).toEqual(expected);
    });
  });

  describe('MONTH_NAMES_SHORT', () => {
    test('has 12 entries', () => {
      expect(MONTH_NAMES_SHORT).toHaveLength(12);
    });

    test('starts with Jan and ends with Dec', () => {
      expect(MONTH_NAMES_SHORT[0]).toBe('Jan');
      expect(MONTH_NAMES_SHORT[11]).toBe('Dec');
    });

    test('contains all abbreviated month names in order', () => {
      const expected: ReadonlyArray<string> = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      expect([...MONTH_NAMES_SHORT]).toEqual(expected);
    });
  });

  describe('getMonthName', () => {
    test('returns full month name by default', () => {
      expect(getMonthName(1)).toBe('January');
      expect(getMonthName(6)).toBe('June');
      expect(getMonthName(12)).toBe('December');
    });

    test('returns short month name when format is "short"', () => {
      expect(getMonthName(1, 'short')).toBe('Jan');
      expect(getMonthName(6, 'short')).toBe('Jun');
      expect(getMonthName(12, 'short')).toBe('Dec');
    });

    test('returns fallback for out-of-range month numbers', () => {
      expect(getMonthName(0)).toBe('Month 0');
      expect(getMonthName(13)).toBe('Month 13');
      expect(getMonthName(-1)).toBe('Month -1');
    });

    test('returns fallback for out-of-range short format', () => {
      expect(getMonthName(0, 'short')).toBe('Month 0');
      expect(getMonthName(13, 'short')).toBe('Month 13');
    });

    test('handles edge cases: NaN, decimals, Infinity', () => {
      expect(getMonthName(NaN)).toBe('Month NaN');
      expect(getMonthName(1.5)).toBe('Month 1.5');
      expect(getMonthName(Infinity)).toBe('Month Infinity');
      expect(getMonthName(-Infinity)).toBe('Month -Infinity');
    });

    test('handles edge cases with short format', () => {
      expect(getMonthName(NaN, 'short')).toBe('Month NaN');
      expect(getMonthName(1.5, 'short')).toBe('Month 1.5');
      expect(getMonthName(Infinity, 'short')).toBe('Month Infinity');
    });
  });
});

describe('date utilities', () => {
  describe('formatDate', () => {
    test('formats date in short format', () => {
      const date = new Date(2026, 0, 15); // January 15, 2026
      const result = formatDate(date, 'short');
      expect(result).toContain('Jan');
      expect(result).toContain('15');
      expect(result).toContain('2026');
    });

    test('formats date in long format', () => {
      const date = new Date(2026, 0, 15);
      const result = formatDate(date, 'long');
      expect(result).toContain('January');
      expect(result).toContain('15');
      expect(result).toContain('2026');
    });

    test('formats date in ISO format', () => {
      const date = new Date(2026, 0, 15);
      const result = formatDate(date, 'iso');
      expect(result).toBe('2026-01-15');
    });

    test('handles string input', () => {
      const result = formatDate('2026-01-15', 'iso');
      expect(result).toBe('2026-01-15');
    });

    test('returns "Invalid Date" for invalid input', () => {
      const result = formatDate('not-a-date');
      expect(result).toBe('Invalid Date');
    });
  });

  describe('formatMonthYear', () => {
    test('formats date as Month Year', () => {
      const date = new Date(2026, 0, 15);
      const result = formatMonthYear(date);
      expect(result).toContain('January');
      expect(result).toContain('2026');
    });
  });

  describe('isFutureDate', () => {
    test('returns true for future date', () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      expect(isFutureDate(future)).toBe(true);
    });

    test('returns false for past date', () => {
      const past = new Date();
      past.setFullYear(past.getFullYear() - 1);
      expect(isFutureDate(past)).toBe(false);
    });
  });

  describe('isPastDate', () => {
    test('returns true for past date', () => {
      const past = new Date();
      past.setFullYear(past.getFullYear() - 1);
      expect(isPastDate(past)).toBe(true);
    });

    test('returns false for future date', () => {
      const future = new Date();
      future.setFullYear(future.getFullYear() + 1);
      expect(isPastDate(future)).toBe(false);
    });
  });

  describe('isToday', () => {
    test('returns true for today', () => {
      expect(isToday(new Date())).toBe(true);
    });

    test('returns false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });
  });

  describe('getStartOfDay', () => {
    test('returns midnight of the given date', () => {
      const date = new Date(2026, 0, 15, 14, 30, 45);
      const start = getStartOfDay(date);
      expect(start.getHours()).toBe(0);
      expect(start.getMinutes()).toBe(0);
      expect(start.getSeconds()).toBe(0);
      expect(start.getDate()).toBe(15);
    });
  });

  describe('getEndOfDay', () => {
    test('returns end of the given date', () => {
      const date = new Date(2026, 0, 15, 14, 30, 45);
      const end = getEndOfDay(date);
      expect(end.getHours()).toBe(23);
      expect(end.getMinutes()).toBe(59);
      expect(end.getSeconds()).toBe(59);
      expect(end.getDate()).toBe(15);
    });
  });

  describe('getStartOfMonth', () => {
    test('returns first day of month at midnight', () => {
      const date = new Date(2026, 0, 15);
      const start = getStartOfMonth(date);
      expect(start.getDate()).toBe(1);
      expect(start.getMonth()).toBe(0);
      expect(start.getHours()).toBe(0);
    });
  });

  describe('getEndOfMonth', () => {
    test('returns last day of month', () => {
      const date = new Date(2026, 0, 15); // January
      const end = getEndOfMonth(date);
      expect(end.getDate()).toBe(31);
      expect(end.getMonth()).toBe(0);
    });

    test('handles February correctly', () => {
      const date = new Date(2026, 1, 15); // February 2026 (not leap year)
      const end = getEndOfMonth(date);
      expect(end.getDate()).toBe(28);
    });

    test('handles leap year February', () => {
      const date = new Date(2024, 1, 15); // February 2024 (leap year)
      const end = getEndOfMonth(date);
      expect(end.getDate()).toBe(29);
    });
  });

  describe('getDaysBetween', () => {
    test('calculates days between two dates', () => {
      const start = new Date(2026, 0, 1);
      const end = new Date(2026, 0, 10);
      expect(getDaysBetween(start, end)).toBe(9);
    });

    test('returns 0 for same day', () => {
      const date = new Date(2026, 0, 15);
      expect(getDaysBetween(date, date)).toBe(0);
    });
  });

  describe('getCurrentDateISO', () => {
    test('returns current date in ISO format', () => {
      const result = getCurrentDateISO();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });
});

describe('month key utilities', () => {
  describe('parseMonthKey', () => {
    test('parses valid month key', () => {
      const result = parseMonthKey('01-2026');
      expect(result).not.toBeNull();
      expect(result!.start.getFullYear()).toBe(2026);
      expect(result!.start.getMonth()).toBe(0); // January
      expect(result!.start.getDate()).toBe(1);
      expect(result!.end.getDate()).toBe(31); // Last day of January
    });

    test('sets end date to end of day for inclusive range filters', () => {
      const result = parseMonthKey('02-2026');
      expect(result).not.toBeNull();
      expect(result!.end.getDate()).toBe(28);
      expect(result!.end.getHours()).toBe(23);
      expect(result!.end.getMinutes()).toBe(59);
      expect(result!.end.getSeconds()).toBe(59);
      expect(result!.end.getMilliseconds()).toBe(999);
    });

    test('parses December correctly', () => {
      const result = parseMonthKey('12-2025');
      expect(result).not.toBeNull();
      expect(result!.start.getMonth()).toBe(11); // December
      expect(result!.end.getDate()).toBe(31);
    });

    test('returns null for invalid format', () => {
      expect(parseMonthKey('2026-01')).toBeNull(); // Wrong format
      expect(parseMonthKey('1-2026')).toBeNull(); // Missing leading zero
      expect(parseMonthKey('invalid')).toBeNull();
      expect(parseMonthKey('')).toBeNull();
    });

    test('returns null for invalid month', () => {
      expect(parseMonthKey('13-2026')).toBeNull(); // Month > 12
      expect(parseMonthKey('00-2026')).toBeNull(); // Month < 1
    });
  });

  describe('parseMonthKeyToISO', () => {
    test('returns ISO date strings', () => {
      const result = parseMonthKeyToISO('01-2026');
      expect(result).not.toBeNull();
      expect(result!.startDate).toBe('2026-01-01');
      expect(result!.endDate).toBe('2026-01-31');
    });

    test('handles February in leap year', () => {
      const result = parseMonthKeyToISO('02-2024');
      expect(result).not.toBeNull();
      expect(result!.endDate).toBe('2024-02-29');
    });

    test('handles February in non-leap year', () => {
      const result = parseMonthKeyToISO('02-2026');
      expect(result).not.toBeNull();
      expect(result!.endDate).toBe('2026-02-28');
    });

    test('returns null for invalid key', () => {
      expect(parseMonthKeyToISO('invalid')).toBeNull();
    });
  });

  describe('formatMonthKey', () => {
    test('formats month key to readable string', () => {
      const result = formatMonthKey('01-2026');
      expect(result).toBe('January 2026');
    });

    test('formats all months correctly', () => {
      expect(formatMonthKey('02-2026')).toContain('February');
      expect(formatMonthKey('06-2026')).toContain('June');
      expect(formatMonthKey('12-2026')).toContain('December');
    });

    test('returns original key for invalid input', () => {
      expect(formatMonthKey('invalid')).toBe('invalid');
      expect(formatMonthKey('')).toBe('');
    });
  });

  describe('createMonthKey', () => {
    test('creates month key from date', () => {
      const date = new Date(2026, 0, 15); // January 15, 2026
      expect(createMonthKey(date)).toBe('01-2026');
    });

    test('pads single digit months', () => {
      const date = new Date(2026, 8, 1); // September
      expect(createMonthKey(date)).toBe('09-2026');
    });

    test('handles December', () => {
      const date = new Date(2025, 11, 31);
      expect(createMonthKey(date)).toBe('12-2025');
    });
  });

  describe('getCurrentMonthKey', () => {
    test('returns current month key', () => {
      const result = getCurrentMonthKey();
      expect(result).toMatch(/^\d{2}-\d{4}$/);

      const now = new Date();
      const expected = createMonthKey(now);
      expect(result).toBe(expected);
    });
  });

  describe('extractAvailableMonths', () => {
    test('extracts unique months from transactions', () => {
      const transactions = [
        { transaction_date: '2026-01-15' },
        { transaction_date: '2026-02-20' },
        { transaction_date: '2026-01-05' }, // Duplicate month
      ];

      const result = extractAvailableMonths(transactions);

      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('01-2026');
      expect(result[0].label).toBe('January 2026');
      expect(result[1].key).toBe('02-2026');
      expect(result[1].label).toBe('February 2026');
    });

    test('sorts months chronologically (oldest first)', () => {
      const transactions = [
        { transaction_date: '2026-03-15' },
        { transaction_date: '2025-12-20' },
        { transaction_date: '2026-01-05' },
      ];

      const result = extractAvailableMonths(transactions);

      expect(result).toHaveLength(3);
      expect(result[0].key).toBe('12-2025');
      expect(result[1].key).toBe('01-2026');
      expect(result[2].key).toBe('03-2026');
    });

    test('handles Date objects as transaction_date', () => {
      const transactions = [
        { transaction_date: new Date(2026, 0, 15) }, // January
        { transaction_date: new Date(2026, 1, 20) }, // February
      ];

      const result = extractAvailableMonths(transactions);

      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('01-2026');
      expect(result[1].key).toBe('02-2026');
    });

    test('returns empty array for empty input', () => {
      const result = extractAvailableMonths([]);
      expect(result).toHaveLength(0);
    });

    test('skips invalid dates', () => {
      const transactions = [
        { transaction_date: '2026-01-15' },
        { transaction_date: 'invalid-date' },
        { transaction_date: '2026-02-20' },
      ];

      const result = extractAvailableMonths(transactions);

      expect(result).toHaveLength(2);
      expect(result[0].key).toBe('01-2026');
      expect(result[1].key).toBe('02-2026');
    });

    test('handles months spanning multiple years', () => {
      const transactions = [
        { transaction_date: '2025-11-15' },
        { transaction_date: '2025-12-20' },
        { transaction_date: '2026-01-05' },
        { transaction_date: '2026-02-10' },
      ];

      const result = extractAvailableMonths(transactions);

      expect(result).toHaveLength(4);
      expect(result[0].key).toBe('11-2025');
      expect(result[1].key).toBe('12-2025');
      expect(result[2].key).toBe('01-2026');
      expect(result[3].key).toBe('02-2026');
    });

    test('handles single transaction', () => {
      const transactions = [{ transaction_date: '2026-06-15' }];

      const result = extractAvailableMonths(transactions);

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('06-2026');
      expect(result[0].label).toBe('June 2026');
    });
  });
});
