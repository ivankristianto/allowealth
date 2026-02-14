import { describe, expect, it } from 'bun:test';
import {
  buildBudgetPeriodOptions,
  buildBudgetUrlForPeriod,
  parseBudgetPeriodKey,
} from './budget-period';

describe('budget-period utils', () => {
  describe('buildBudgetPeriodOptions', () => {
    it('defaults to a 12-month selector window', () => {
      const options = buildBudgetPeriodOptions({
        selectedYear: 2026,
        selectedMonth: 2,
        currentYear: 2026,
        currentMonth: 2,
        allowNextMonthNavigation: false,
      });

      expect(options).toHaveLength(12);
      expect(options.at(0)?.value).toBe('2025-03');
      expect(options.at(-1)?.value).toBe('2026-02');
    });

    it('keeps current month as latest when selected month is in the past', () => {
      const options = buildBudgetPeriodOptions({
        selectedYear: 2025,
        selectedMonth: 10,
        currentYear: 2026,
        currentMonth: 2,
        allowNextMonthNavigation: false,
        lookbackMonths: 6,
      });

      expect(options.at(-1)?.value).toBe('2026-02');
      expect(options.some((option) => option.value === '2025-10')).toBe(true);
    });

    it('includes next month when next month navigation is allowed', () => {
      const options = buildBudgetPeriodOptions({
        selectedYear: 2026,
        selectedMonth: 2,
        currentYear: 2026,
        currentMonth: 2,
        allowNextMonthNavigation: true,
        lookbackMonths: 3,
      });

      expect(options.at(-1)?.value).toBe('2026-03');
    });

    it('keeps selected month as latest when selected month is after current month', () => {
      const options = buildBudgetPeriodOptions({
        selectedYear: 2026,
        selectedMonth: 5,
        currentYear: 2026,
        currentMonth: 2,
        allowNextMonthNavigation: false,
        lookbackMonths: 3,
      });

      expect(options.at(-1)?.value).toBe('2026-05');
      expect(options.some((option) => option.value === '2026-05')).toBe(true);
    });
  });

  describe('parseBudgetPeriodKey', () => {
    it('returns null for invalid month keys', () => {
      expect(parseBudgetPeriodKey('2026-13')).toBeNull();
      expect(parseBudgetPeriodKey('invalid')).toBeNull();
      expect(parseBudgetPeriodKey('2026-2')).toBeNull();
    });

    it('parses a valid period key', () => {
      expect(parseBudgetPeriodKey('2026-02')).toEqual({ year: 2026, month: 2 });
    });
  });

  describe('buildBudgetUrlForPeriod', () => {
    it('builds canonical budget URL with period and currency', () => {
      const url = buildBudgetUrlForPeriod('2026-02', 'USD');
      expect(url).toBe('/budget?year=2026&month=2&currency=USD');
    });

    it('falls back to base budget URL with currency for invalid periods', () => {
      const url = buildBudgetUrlForPeriod('invalid-period', 'USD');
      expect(url).toBe('/budget?currency=USD');
    });
  });
});
