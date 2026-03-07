import { describe, expect, test } from 'bun:test';
import * as calculations from './calculations';
import type { AccountWithHistory } from './types';

type ForecastCalculationsWithRealityCheck = typeof calculations & {
  buildForecastRealityCheck: (input: {
    accounts: AccountWithHistory[];
    actualNetSavings: Array<{
      key: string;
      income: number;
      expenses: number;
      netSavings: number;
    }>;
    monthlyTopup: number;
    annualRate: number;
  }) => {
    timeline: Array<{
      key: string;
      actualBalance: number | null;
      plannedBalance: number | null;
      currentTrajectoryBalance: number | null;
      forecastInterest: number | null;
      actualNetSavings: number | null;
    }>;
    chartWindow: {
      startIndex: number;
      endIndex: number;
      startKey: string | null;
      endKey: string | null;
      latestActualKey: string | null;
    };
    yearlyBreakdown: Array<{
      year: number;
      yearLabel: string;
      months: Array<{ key: string }>;
    }>;
    summary: Record<string, unknown>;
  };
};

const forecastCalculations = calculations as ForecastCalculationsWithRealityCheck;

function createRealityCheckInput() {
  return {
    accounts: [
      {
        balance: 1200,
        currency: 'IDR',
        accountClass: 'asset',
        history: [
          { date: '2024-01-15', amount: 1000 },
          { date: '2024-02-15', amount: 1100 },
          { date: '2024-03-15', amount: 1200 },
        ],
      } as AccountWithHistory,
      {
        balance: 3800,
        currency: 'IDR',
        accountClass: 'debt',
        history: [
          { date: '2024-01-15', amount: 4000 },
          { date: '2024-02-15', amount: 3900 },
          { date: '2024-03-15', amount: 3800 },
        ],
      } as AccountWithHistory,
    ],
    actualNetSavings: [
      { key: '2024-01', income: 800, expenses: 300, netSavings: 500 },
      { key: '2024-02', income: 400, expenses: 600, netSavings: -200 },
      { key: '2024-03', income: 700, expenses: 400, netSavings: 300 },
    ],
    monthlyTopup: 100,
    annualRate: 12,
  };
}

function buildRealityCheckResult() {
  expect(typeof forecastCalculations.buildForecastRealityCheck).toBe('function');
  return forecastCalculations.buildForecastRealityCheck(createRealityCheckInput());
}

describe('buildForecastRealityCheck', () => {
  test('starts the timeline at the earliest historical balance month', () => {
    const result = buildRealityCheckResult();

    expect(result.timeline[0]?.key).toBe('2024-01');
  });

  test('excludes debt accounts before actual balances are totaled', () => {
    const result = buildRealityCheckResult();
    const january = result.timeline.find((point) => point.key === '2024-01');

    expect(january?.actualBalance).toBe(1000);
  });

  test('compounds planned balance month by month from the first actual balance month', () => {
    const result = buildRealityCheckResult();
    const january = result.timeline.find((point) => point.key === '2024-01');
    const february = result.timeline.find((point) => point.key === '2024-02');
    const march = result.timeline.find((point) => point.key === '2024-03');

    expect(january?.plannedBalance).toBe(1000);
    expect(february?.plannedBalance).toBe(1110);
    expect(february?.forecastInterest).toBe(10);
    expect(march?.plannedBalance).toBe(1221);
    expect(march?.forecastInterest).toBe(11);
  });

  test('starts current trajectory at the latest actual balance month using trailing average net savings', () => {
    const result = buildRealityCheckResult();
    const march = result.timeline.find((point) => point.key === '2024-03');
    const april = result.timeline.find((point) => point.key === '2024-04');
    const may = result.timeline.find((point) => point.key === '2024-05');

    expect(march?.currentTrajectoryBalance).toBe(1200);
    expect(april?.currentTrajectoryBalance).toBe(1412);
    expect(may?.currentTrajectoryBalance).toBe(1626);
    expect(result.summary.trailingAverageNetSavings).toBe(200);
  });

  test('clamps the focused chart window to 12 months back and 24 months forward from the latest actual month', () => {
    const result = buildRealityCheckResult();

    expect(result.chartWindow).toEqual({
      startIndex: 0,
      endIndex: 26,
      startKey: '2024-01',
      endKey: '2026-03',
      latestActualKey: '2024-03',
    });
  });

  test('groups the timeline into yearly buckets with monthly children', () => {
    const result = buildRealityCheckResult();

    expect(result.yearlyBreakdown.map((year) => year.year)).toEqual([2024, 2025, 2026]);
    expect(result.yearlyBreakdown[0]?.yearLabel).toBe('2024');
    expect(result.yearlyBreakdown[0]?.months).toHaveLength(12);
    expect(result.yearlyBreakdown[0]?.months[0]?.key).toBe('2024-01');
    expect(result.yearlyBreakdown[1]?.months).toHaveLength(12);
    expect(result.yearlyBreakdown[2]?.months).toHaveLength(3);
  });

  test('uses fixed-horizon summary fields instead of year10Target naming', () => {
    const result = buildRealityCheckResult();

    expect(result.summary.plannedEndingBalance).toBeDefined();
    expect(result.summary.currentTrajectoryEndingBalance).toBeDefined();
    expect(result.summary.latestActualBalance).toBe(1200);
    expect(result.summary).not.toHaveProperty('year10Target');
  });
});
