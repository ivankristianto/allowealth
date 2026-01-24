/**
 * Unit tests for date utility functions
 * @fileoverview Tests for date formatting and month key utilities
 */

import { describe, test, expect } from 'bun:test';
import {
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
} from './date';

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
});
