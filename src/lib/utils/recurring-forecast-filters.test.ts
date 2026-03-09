import { describe, expect, test } from 'bun:test';
import {
  MAX_FORECAST_ACCOUNT_IDS,
  buildForecastFilters,
  normalizeForecastAccountIds,
  normalizeForecastFilters,
  parseForecastMonthCount,
} from './recurring-forecast-filters';

describe('normalizeForecastAccountIds', () => {
  test('sorts and deduplicates account ids', () => {
    expect(normalizeForecastAccountIds(['acc_b', 'acc_a', 'acc_a'])).toEqual(['acc_a', 'acc_b']);
  });

  test('drops invalid ids and applies max cap', () => {
    const large = Array.from({ length: MAX_FORECAST_ACCOUNT_IDS + 10 }).map((_, i) => `acc_${i}`);
    const normalized = normalizeForecastAccountIds([
      ...large,
      'bad id with spaces',
      '',
      'valid-id_1',
    ]);

    expect(normalized).toBeDefined();
    expect(normalized!.length).toBe(MAX_FORECAST_ACCOUNT_IDS);
    expect(normalized).not.toContain('bad id with spaces');
  });
});

describe('buildForecastFilters', () => {
  test('parses repeated and comma-separated account params', () => {
    const params = new URLSearchParams();
    params.append('accounts', 'acc_2');
    params.append('accounts', 'acc_1,acc_2');
    params.append('status', 'all');
    params.append('type', 'expense');

    expect(buildForecastFilters(params)).toEqual({
      type: 'expense',
      status: 'all',
      accountIds: ['acc_1', 'acc_2'],
      monthCount: 12,
    });
  });

  test('parses monthCount from params', () => {
    const params = new URLSearchParams();
    params.set('monthCount', '6');

    expect(buildForecastFilters(params)).toEqual({
      status: 'active',
      monthCount: 6,
    });
  });
});

describe('parseForecastMonthCount', () => {
  test('returns valid month counts', () => {
    expect(parseForecastMonthCount('3')).toBe(3);
    expect(parseForecastMonthCount('6')).toBe(6);
    expect(parseForecastMonthCount('12')).toBe(12);
    expect(parseForecastMonthCount('24')).toBe(24);
  });

  test('defaults to 12 for invalid values', () => {
    expect(parseForecastMonthCount(null)).toBe(12);
    expect(parseForecastMonthCount(undefined)).toBe(12);
    expect(parseForecastMonthCount('')).toBe(12);
    expect(parseForecastMonthCount('7')).toBe(12);
    expect(parseForecastMonthCount('abc')).toBe(12);
  });
});

describe('normalizeForecastFilters', () => {
  test('defaults status to active when missing or invalid', () => {
    expect(normalizeForecastFilters({})).toEqual({ status: 'active' });
    expect(normalizeForecastFilters({ status: 'invalid' as any })).toEqual({ status: 'active' });
  });
});
