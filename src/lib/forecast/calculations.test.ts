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
      actualNetSavingsTotal: number | null;
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
  test('uses the latest snapshot per account when multiple balance snapshots exist in the same month', () => {
    expect(typeof calculations.aggregateAccountHistory).toBe('function');

    const actualBalances = calculations.aggregateAccountHistory([
      {
        balance: 1000,
        currency: 'IDR',
        accountClass: 'asset',
        history: [
          { date: '2024-01-01', amount: 900 },
          { date: '2024-01-31', amount: 1000 },
          { date: '2024-02-15', amount: 1100 },
        ],
      },
      {
        balance: 500,
        currency: 'IDR',
        accountClass: 'asset',
        history: [
          { date: '2024-01-20', amount: 500 },
          { date: '2024-02-20', amount: 550 },
        ],
      },
    ] as AccountWithHistory[]);

    expect(actualBalances).toEqual([
      { key: '2024-01', balance: 1500, interest: 0 },
      { key: '2024-02', balance: 1650, interest: 0 },
    ]);
  });

  test('carries forward the latest known account balance across months without a fresh snapshot', () => {
    expect(typeof calculations.aggregateAccountHistory).toBe('function');

    const actualBalances = calculations.aggregateAccountHistory([
      {
        balance: 1200,
        currency: 'IDR',
        accountClass: 'asset',
        history: [
          { date: '2024-01-31', amount: 1000 },
          { date: '2024-03-31', amount: 1200 },
        ],
      },
      {
        balance: 600,
        currency: 'IDR',
        accountClass: 'asset',
        history: [
          { date: '2024-01-31', amount: 500 },
          { date: '2024-02-29', amount: 550 },
          { date: '2024-03-31', amount: 600 },
        ],
      },
    ] as AccountWithHistory[]);

    expect(actualBalances).toEqual([
      { key: '2024-01', balance: 1500, interest: 0 },
      { key: '2024-02', balance: 1550, interest: 0 },
      { key: '2024-03', balance: 1800, interest: 0 },
    ]);
  });

  test('keeps each account balance carried through the shared latest historical month', () => {
    expect(typeof calculations.aggregateAccountHistory).toBe('function');

    const actualBalances = calculations.aggregateAccountHistory([
      {
        balance: 1000,
        currency: 'IDR',
        accountClass: 'asset',
        history: [{ date: '2024-01-31', amount: 1000 }],
      },
      {
        balance: 1400,
        currency: 'IDR',
        accountClass: 'asset',
        history: [
          { date: '2024-01-31', amount: 1200 },
          { date: '2024-02-29', amount: 1300 },
          { date: '2024-03-31', amount: 1400 },
        ],
      },
    ] as AccountWithHistory[]);

    expect(actualBalances).toEqual([
      { key: '2024-01', balance: 2200, interest: 0 },
      { key: '2024-02', balance: 2300, interest: 0 },
      { key: '2024-03', balance: 2400, interest: 0 },
    ]);
  });

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

  test('fills missing actual net savings months with zeros before computing trailing averages', () => {
    const result = forecastCalculations.buildForecastRealityCheck({
      ...createRealityCheckInput(),
      actualNetSavings: [
        { key: '2024-01', income: 800, expenses: 300, netSavings: 500 },
        { key: '2024-03', income: 700, expenses: 400, netSavings: 300 },
      ],
    });

    const february = result.timeline.find((point) => point.key === '2024-02');
    const april = result.timeline.find((point) => point.key === '2024-04');

    expect(february?.actualNetSavings).toBe(0);
    expect(result.summary.trailingAverageNetSavings).toBe(267);
    expect(april?.currentTrajectoryBalance).toBe(1479);
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

  test('keeps yearly actual net savings totals null when a year has no actual months', () => {
    const result = buildRealityCheckResult();

    expect(result.yearlyBreakdown[1]?.actualNetSavingsTotal).toBeNull();
    expect(result.yearlyBreakdown[2]?.actualNetSavingsTotal).toBeNull();
  });

  test('uses fixed-horizon summary fields instead of year10Target naming', () => {
    const result = buildRealityCheckResult();

    expect(result.summary.plannedEndingBalance).toBeDefined();
    expect(result.summary.currentTrajectoryEndingBalance).toBeDefined();
    expect(result.summary.latestActualBalance).toBe(1200);
    expect(result.summary).not.toHaveProperty('year10Target');
  });

  test('reuses precomputed actual balances when they are provided', () => {
    const result = forecastCalculations.buildForecastRealityCheck({
      accounts: [],
      actualBalanceTimeline: [
        { key: '2024-01', balance: 1000, interest: 0 },
        { key: '2024-02', balance: 1100, interest: 0 },
      ],
      actualNetSavings: [
        { key: '2024-01', income: 500, expenses: 100, netSavings: 400 },
        { key: '2024-02', income: 500, expenses: 200, netSavings: 300 },
      ],
      monthlyTopup: 100,
      annualRate: 12,
      monthsForward: 2,
    } as any);

    expect(result.timeline.map((point) => point.key)).toEqual([
      '2024-01',
      '2024-02',
      '2024-03',
      '2024-04',
    ]);
    expect(result.timeline[0]?.actualBalance).toBe(1000);
    expect(result.summary.latestActualBalance).toBe(1100);
  });
});
