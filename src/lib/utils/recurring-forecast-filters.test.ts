import { describe, expect, test } from 'bun:test';
import {
  MAX_FORECAST_ACCOUNT_IDS,
  buildForecastFilters,
  normalizeForecastAccountIds,
  normalizeForecastFilters,
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
    });
  });
});

describe('normalizeForecastFilters', () => {
  test('defaults status to active when missing or invalid', () => {
    expect(normalizeForecastFilters({})).toEqual({ status: 'active' });
    expect(normalizeForecastFilters({ status: 'invalid' as any })).toEqual({ status: 'active' });
  });
});
