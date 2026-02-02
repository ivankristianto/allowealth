/**
 * Forecast Calculation Tests
 *
 * Unit tests for forecast calculation utilities using bun:test.
 * @TODO: P2 - Test coverage: Add edge case tests for negative interest rates, 0% APY, 30 years max, month boundary issues
 */

import { describe, test, expect } from 'bun:test';
import {
  calculateForecast,
  aggregateAssetHistory,
  mergeRealAndForecast,
  calculateGrowthMultiple,
  convertCurrency,
  calculateCurrentTotal,
} from './calculations';
import type { AssetWithHistory, MonthlyHistoricalData } from './types';

describe('calculateForecast', () => {
  test('should calculate basic forecast with no topup', () => {
    const result = calculateForecast(1000000, 0, 7, 1);

    expect(result).toHaveLength(13); // 12 months + initial
    expect(result[0].forecastBalance).toBeGreaterThan(1000000);
    expect(result[0].forecastInterest).toBeGreaterThan(0);
  });

  test('should calculate forecast with monthly topup', () => {
    const result = calculateForecast(1000000, 100000, 7, 1);

    expect(result).toHaveLength(13);
    // Final balance should be higher with topup
    expect(result[12].forecastBalance).toBeGreaterThan(1000000 + 100000 * 12);
  });

  test('should calculate 10-year forecast correctly', () => {
    const result = calculateForecast(1000000, 5000000, 7, 10);

    expect(result).toHaveLength(121); // 120 months + initial
    expect(result[0].key).toMatch(/^\d{4}-\d{2}$/);
    expect(result[0].dateLabel).toMatch(/^[A-Za-z]{3} \d{4}$/);
  });

  test('should handle zero initial balance', () => {
    const result = calculateForecast(0, 1000000, 7, 1);

    expect(result).toHaveLength(13);
    expect(result[0].forecastBalance).toBeGreaterThan(0);
  });

  test('should have null real data initially', () => {
    const result = calculateForecast(1000000, 100000, 7, 1);

    result.forEach((point) => {
      expect(point.realBalance).toBeNull();
      expect(point.realInterest).toBeNull();
    });
  });
});

describe('aggregateAssetHistory', () => {
  test('should aggregate single asset history', () => {
    const assets: AssetWithHistory[] = [
      {
        balance: 1000000,
        currency: 'IDR',
        history: [
          { date: '2026-01-15', amount: 800000 },
          { date: '2026-02-15', amount: 900000 },
        ],
      },
    ];

    const result = aggregateAssetHistory(assets);

    expect(result).toHaveLength(2);
    expect(result[0].key).toBe('2026-01');
    expect(result[0].balance).toBe(800000);
    expect(result[1].key).toBe('2026-02');
    expect(result[1].balance).toBe(900000);
  });

  test('should aggregate multiple assets', () => {
    const assets: AssetWithHistory[] = [
      {
        balance: 1000000,
        currency: 'IDR',
        history: [{ date: '2026-01-15', amount: 800000 }],
      },
      {
        balance: 500000,
        currency: 'IDR',
        history: [{ date: '2026-01-20', amount: 400000 }],
      },
    ];

    const result = aggregateAssetHistory(assets);

    expect(result).toHaveLength(1);
    expect(result[0].key).toBe('2026-01');
    // Should accumulate balances from all assets for this month
    expect(result[0].balance).toBe(1200000); // 800000 + 400000
  });

  test('should convert USD to IDR', () => {
    const assets: AssetWithHistory[] = [
      {
        balance: 100,
        currency: 'USD',
        history: [{ date: '2026-01-15', amount: 80 }],
      },
    ];

    const result = aggregateAssetHistory(assets);

    expect(result).toHaveLength(1);
    expect(result[0].balance).toBe(80 * 15000); // 1,200,000 IDR
  });

  test('should handle assets with no history', () => {
    const assets: AssetWithHistory[] = [
      {
        balance: 1000000,
        currency: 'IDR',
        history: [],
      },
    ];

    const result = aggregateAssetHistory(assets);

    expect(result).toHaveLength(0);
  });

  test('should sort results by month key', () => {
    const assets: AssetWithHistory[] = [
      {
        balance: 1000000,
        currency: 'IDR',
        history: [
          { date: '2026-03-15', amount: 1000000 },
          { date: '2026-01-15', amount: 800000 },
          { date: '2026-02-15', amount: 900000 },
        ],
      },
    ];

    const result = aggregateAssetHistory(assets);

    expect(result).toHaveLength(3);
    expect(result[0].key).toBe('2026-01');
    expect(result[1].key).toBe('2026-02');
    expect(result[2].key).toBe('2026-03');
  });
});

describe('mergeRealAndForecast', () => {
  // Helper to get month key from offset (0 = current month, 1 = next month, etc.)
  function getMonthKey(monthOffset: number): string {
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);
    return `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`;
  }

  test('should merge real data into forecast', () => {
    // Use month keys that match the forecast (which starts from current month)
    const currentMonthKey = getMonthKey(0);
    const nextMonthKey = getMonthKey(1);

    const realData: MonthlyHistoricalData[] = [
      { key: currentMonthKey, balance: 1000000, interest: 5000 },
      { key: nextMonthKey, balance: 1100000, interest: 5500 },
    ];

    const forecast = calculateForecast(1000000, 100000, 7, 1);
    const result = mergeRealAndForecast(realData, forecast);

    expect(result).toHaveLength(forecast.length);

    // Check that real data is merged
    const currentMonth = result.find((p) => p.key === currentMonthKey);
    expect(currentMonth?.realBalance).toBe(1000000);
    expect(currentMonth?.realInterest).toBe(5000);

    const nextMonth = result.find((p) => p.key === nextMonthKey);
    expect(nextMonth?.realBalance).toBe(1100000);
    expect(nextMonth?.realInterest).toBe(5500);
  });

  test('should keep null for months without real data', () => {
    const currentMonthKey = getMonthKey(0);
    const realData: MonthlyHistoricalData[] = [
      { key: currentMonthKey, balance: 1000000, interest: 0 },
    ];

    const forecast = calculateForecast(1000000, 100000, 7, 1);
    const result = mergeRealAndForecast(realData, forecast);

    // Find a future month (not the current month)
    const futureMonth = result.find((p) => p.key !== currentMonthKey);
    expect(futureMonth?.realBalance).toBeNull();
    expect(futureMonth?.realInterest).toBeNull();
  });

  test('should handle empty real data', () => {
    const forecast = calculateForecast(1000000, 100000, 7, 1);
    const result = mergeRealAndForecast([], forecast);

    expect(result).toHaveLength(forecast.length);
    result.forEach((point) => {
      expect(point.realBalance).toBeNull();
      expect(point.realInterest).toBeNull();
    });
  });
});

describe('calculateGrowthMultiple', () => {
  test('should calculate growth multiple correctly', () => {
    expect(calculateGrowthMultiple(2860000, 1000000)).toBe(2.86);
    expect(calculateGrowthMultiple(5000000, 2000000)).toBe(2.5);
    expect(calculateGrowthMultiple(1500000, 1000000)).toBe(1.5);
  });

  test('should handle zero initial balance', () => {
    expect(calculateGrowthMultiple(1000000, 0)).toBe(0);
  });

  test('should handle same initial and final balance', () => {
    expect(calculateGrowthMultiple(1000000, 1000000)).toBe(1);
  });
});

describe('convertCurrency', () => {
  test('should convert USD to IDR', () => {
    expect(convertCurrency(100, 'USD', 'IDR')).toBe(1500000);
    expect(convertCurrency(1, 'USD', 'IDR')).toBe(15000);
  });

  test('should convert IDR to USD', () => {
    expect(convertCurrency(1500000, 'IDR', 'USD')).toBe(100);
    expect(convertCurrency(15000, 'IDR', 'USD')).toBe(1);
  });

  test('should return same amount for same currency', () => {
    expect(convertCurrency(1000000, 'IDR', 'IDR')).toBe(1000000);
    expect(convertCurrency(100, 'USD', 'USD')).toBe(100);
  });

  test('should accept custom exchange rate', () => {
    expect(convertCurrency(100, 'USD', 'IDR', 16000)).toBe(1600000);
  });
});

describe('calculateCurrentTotal', () => {
  test('should calculate total for IDR assets', () => {
    const assets: AssetWithHistory[] = [
      { balance: 1000000, currency: 'IDR' },
      { balance: 500000, currency: 'IDR' },
    ];

    expect(calculateCurrentTotal(assets)).toBe(1500000);
  });

  test('should calculate total for mixed currencies', () => {
    const assets: AssetWithHistory[] = [
      { balance: 1000000, currency: 'IDR' },
      { balance: 100, currency: 'USD' },
    ];

    expect(calculateCurrentTotal(assets)).toBe(1000000 + 100 * 15000); // 2,500,000
  });

  test('should handle empty assets array', () => {
    expect(calculateCurrentTotal([])).toBe(0);
  });

  test('should handle all USD assets', () => {
    const assets: AssetWithHistory[] = [
      { balance: 100, currency: 'USD' },
      { balance: 50, currency: 'USD' },
    ];

    expect(calculateCurrentTotal(assets)).toBe((100 + 50) * 15000); // 2,250,000
  });
});
