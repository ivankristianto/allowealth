/**
 * Forecast Calculation Utilities
 *
 * Functions for calculating wealth trajectory projections, aggregating
 * historical account data, and merging forecast with real data.
 */

import Decimal from 'decimal.js';
import type {
  AccountWithHistory,
  ForecastChartWindow,
  ForecastDataPoint,
  ForecastRealityCheckInput,
  ForecastRealityCheckResult,
  ForecastTimelinePoint,
  ForecastYearBreakdownRow,
  MonthlyHistoricalData,
} from './types';

const DEFAULT_HISTORY_MONTHS_BACK = 12;
const DEFAULT_FORECAST_MONTHS_FORWARD = 24;

function isDebtAccount(account: AccountWithHistory): boolean {
  return account.accountClass === 'debt';
}

function getForecastAccounts(accounts: AccountWithHistory[]): AccountWithHistory[] {
  return accounts.filter((account) => !isDebtAccount(account));
}

function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function fromMonthKey(key: string): Date {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function toDateLabel(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

function roundCurrency(value: Decimal.Value): number {
  return new Decimal(value).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();
}

function createMonthRange(startKey: string, endKey: string): string[] {
  const monthKeys: string[] = [];
  const startDate = fromMonthKey(startKey);
  const endDate = fromMonthKey(endKey);

  for (
    let currentDate = new Date(startDate);
    currentDate <= endDate;
    currentDate = addMonths(currentDate, 1)
  ) {
    monthKeys.push(toMonthKey(currentDate));
  }

  return monthKeys;
}

function calculateTrailingAverageNetSavings(
  actualNetSavings: ForecastRealityCheckInput['actualNetSavings'],
  latestActualKey: string
): number {
  const trailingWindow = actualNetSavings
    .filter((point) => point.key <= latestActualKey)
    .sort((left, right) => left.key.localeCompare(right.key))
    .slice(-3);

  if (trailingWindow.length === 0) {
    return 0;
  }

  const totalNetSavings = trailingWindow.reduce(
    (sum, point) => new Decimal(sum).plus(point.netSavings),
    new Decimal(0)
  );

  return roundCurrency(totalNetSavings.dividedBy(trailingWindow.length));
}

/**
 * Calculate forecast data points for wealth trajectory
 *
 * @param currentTotal - Current total account value in the active currency
 * @param monthlyTopup - Monthly contribution amount in the active currency
 * @param annualRate - Annual percentage yield (e.g., 7 for 7%)
 * @param years - Number of years to forecast
 * @returns Array of forecast data points
 */
export function calculateForecast(
  currentTotal: number,
  monthlyTopup: number,
  annualRate: number,
  years: number
): ForecastDataPoint[] {
  const dataPoints: ForecastDataPoint[] = [];
  const monthlyRate = annualRate / 100 / 12;
  const months = years * 12;
  const today = new Date();

  // Use Decimal.js for precise financial calculations
  let balance = new Decimal(currentTotal);

  for (let i = 0; i <= months; i++) {
    const currentDate = new Date(today);
    // Always use the 1st day to avoid date overflow issues (e.g., Jan 31 + 1 month = Mar 3)
    currentDate.setDate(1);
    currentDate.setMonth(today.getMonth() + i);

    const key = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    const dateLabel = currentDate.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });

    // Calculate interest for this month
    const interest = balance.times(monthlyRate);

    // Update balance: current + interest + topup
    balance = balance.plus(interest).plus(monthlyTopup);

    dataPoints.push({
      key,
      dateLabel,
      forecastBalance: Math.round(balance.toNumber()),
      forecastInterest: Math.round(interest.toNumber()),
      realBalance: null,
      realInterest: null,
    });
  }

  return dataPoints;
}

/**
 * Aggregate account history by month
 *
 * Consolidates multiple accounts' historical data into monthly totals.
 * Assumes all accounts are already scoped to the same currency.
 *
 * @param accounts - Array of accounts with their history
 * @returns Monthly aggregated historical data
 */
export function aggregateAccountHistory(accounts: AccountWithHistory[]): MonthlyHistoricalData[] {
  const monthlyTotals: Record<string, { balance: number; interest: number }> = {};

  getForecastAccounts(accounts).forEach((account) => {
    account.history?.forEach((point) => {
      const date = typeof point.date === 'string' ? new Date(point.date) : point.date;
      const key = toMonthKey(date);

      if (!monthlyTotals[key]) {
        monthlyTotals[key] = { balance: 0, interest: 0 };
      }

      // Accumulate balance from all accounts for this month
      // Interest calculation from historical data is complex, so we set it to 0
      monthlyTotals[key].balance += point.amount;
      monthlyTotals[key].interest = 0;
    });
  });

  return Object.entries(monthlyTotals)
    .map(([key, data]) => ({
      key,
      balance: data.balance,
      interest: data.interest,
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * Merge real historical data with forecast projections
 *
 * Combines historical account data with forecast calculations.
 * Real data takes precedence over forecast for overlapping months.
 *
 * @param realData - Monthly historical data from accounts
 * @param forecastData - Calculated forecast data points
 * @returns Merged forecast data points with real data filled in
 */
export function mergeRealAndForecast(
  realData: MonthlyHistoricalData[],
  forecastData: ForecastDataPoint[]
): ForecastDataPoint[] {
  // Create a map of real data by month key
  const realDataMap = new Map(realData.map((d) => [d.key, d]));

  // Merge real data into forecast
  return forecastData.map((point) => {
    const real = realDataMap.get(point.key);
    if (real) {
      return {
        ...point,
        realBalance: real.balance,
        realInterest: real.interest,
      };
    }
    return point;
  });
}

/**
 * Calculate growth multiple
 *
 * @param finalBalance - Final balance at end of period
 * @param initialBalance - Initial balance at start of period
 * @returns Growth multiple (e.g., 2.86 means 2.86x growth)
 */
export function calculateGrowthMultiple(finalBalance: number, initialBalance: number): number {
  if (initialBalance === 0) return 0;
  return new Decimal(finalBalance).dividedBy(initialBalance).toDecimalPlaces(2).toNumber();
}

/**
 * Calculate current total from accounts
 *
 * @param accounts - Array of accounts with balance and currency
 * @returns Total value in the scoped currency
 */
export function calculateCurrentTotal(accounts: AccountWithHistory[]): number {
  return getForecastAccounts(accounts).reduce((sum, account) => {
    return new Decimal(sum).plus(account.balance).toNumber();
  }, 0);
}

export function calculateFocusedChartWindow(
  timeline: ForecastTimelinePoint[],
  latestActualKey: string | null,
  monthsBack = DEFAULT_HISTORY_MONTHS_BACK,
  monthsForward = DEFAULT_FORECAST_MONTHS_FORWARD
): ForecastChartWindow {
  if (!latestActualKey || timeline.length === 0) {
    return {
      startIndex: 0,
      endIndex: -1,
      startKey: null,
      endKey: null,
      latestActualKey: null,
    };
  }

  const latestActualIndex = timeline.findIndex((point) => point.key === latestActualKey);
  const startIndex = Math.max(0, latestActualIndex - monthsBack);
  const endIndex = Math.min(timeline.length - 1, latestActualIndex + monthsForward);

  return {
    startIndex,
    endIndex,
    startKey: timeline[startIndex]?.key ?? null,
    endKey: timeline[endIndex]?.key ?? null,
    latestActualKey,
  };
}

export function groupForecastTimelineByYear(
  timeline: ForecastTimelinePoint[]
): ForecastYearBreakdownRow[] {
  const grouped = new Map<number, ForecastTimelinePoint[]>();

  for (const point of timeline) {
    const year = Number(point.key.slice(0, 4));
    const existing = grouped.get(year) ?? [];
    existing.push(point);
    grouped.set(year, existing);
  }

  return Array.from(grouped.entries())
    .sort(([leftYear], [rightYear]) => leftYear - rightYear)
    .map(([year, months]) => {
      const actualEndingBalance =
        months.findLast((point) => point.actualBalance !== null)?.actualBalance ?? null;
      const currentTrajectoryEndingBalance =
        months.findLast((point) => point.currentTrajectoryBalance !== null)
          ?.currentTrajectoryBalance ?? null;

      const forecastInterestTotal = months.reduce(
        (sum, point) => new Decimal(sum).plus(point.forecastInterest ?? 0),
        new Decimal(0)
      );
      const actualNetSavingsTotal = months.reduce(
        (sum, point) => new Decimal(sum).plus(point.actualNetSavings ?? 0),
        new Decimal(0)
      );

      return {
        year,
        yearLabel: String(year),
        plannedEndingBalance: months[months.length - 1]?.plannedBalance ?? null,
        actualEndingBalance,
        currentTrajectoryEndingBalance,
        forecastInterestTotal: roundCurrency(forecastInterestTotal),
        actualNetSavingsTotal: roundCurrency(actualNetSavingsTotal),
        months,
      };
    });
}

export function buildForecastRealityCheck(
  input: ForecastRealityCheckInput
): ForecastRealityCheckResult {
  const {
    accounts,
    actualNetSavings,
    monthlyTopup,
    annualRate,
    monthsBack = DEFAULT_HISTORY_MONTHS_BACK,
    monthsForward = DEFAULT_FORECAST_MONTHS_FORWARD,
  } = input;

  const actualBalanceTimeline = aggregateAccountHistory(accounts);
  if (actualBalanceTimeline.length === 0) {
    return {
      timeline: [],
      chartWindow: calculateFocusedChartWindow([], null, monthsBack, monthsForward),
      yearlyBreakdown: [],
      summary: {
        latestActualKey: null,
        latestActualBalance: 0,
        plannedEndingBalance: 0,
        currentTrajectoryEndingBalance: 0,
        totalForecastInterest: 0,
        trailingAverageNetSavings: 0,
      },
    };
  }

  const earliestActualKey = actualBalanceTimeline[0].key;
  const latestActualKey = actualBalanceTimeline[actualBalanceTimeline.length - 1].key;
  const latestActualBalance = actualBalanceTimeline[actualBalanceTimeline.length - 1].balance;
  const endKey = toMonthKey(addMonths(fromMonthKey(latestActualKey), monthsForward));
  const monthKeys = createMonthRange(earliestActualKey, endKey);
  const actualBalanceMap = new Map(
    actualBalanceTimeline.map((point) => [point.key, point.balance])
  );
  const actualNetSavingsMap = new Map(actualNetSavings.map((point) => [point.key, point]));
  const trailingAverageNetSavings = calculateTrailingAverageNetSavings(
    actualNetSavings,
    latestActualKey
  );
  const monthlyRate = new Decimal(annualRate).dividedBy(100).dividedBy(12);

  let plannedBalance = new Decimal(actualBalanceTimeline[0].balance);
  let currentTrajectoryBalance = new Decimal(latestActualBalance);

  const timeline: ForecastTimelinePoint[] = monthKeys.map((key, index) => {
    const monthDate = fromMonthKey(key);
    const actualSavingsPoint = actualNetSavingsMap.get(key);

    let forecastInterest = 0;
    if (index > 0) {
      const interest = plannedBalance.times(monthlyRate);
      plannedBalance = plannedBalance.plus(interest).plus(monthlyTopup);
      forecastInterest = roundCurrency(interest);
    }

    let currentTrajectoryPoint: number | null = null;
    if (key === latestActualKey) {
      currentTrajectoryPoint = roundCurrency(currentTrajectoryBalance);
    } else if (key > latestActualKey) {
      const interest = currentTrajectoryBalance.times(monthlyRate);
      currentTrajectoryBalance = currentTrajectoryBalance
        .plus(interest)
        .plus(trailingAverageNetSavings);
      currentTrajectoryPoint = roundCurrency(currentTrajectoryBalance);
    }

    return {
      key,
      dateLabel: toDateLabel(monthDate),
      actualBalance: actualBalanceMap.get(key) ?? null,
      plannedBalance: roundCurrency(plannedBalance),
      currentTrajectoryBalance: currentTrajectoryPoint,
      forecastInterest,
      actualNetSavings: actualSavingsPoint?.netSavings ?? null,
      income: actualSavingsPoint?.income ?? null,
      expenses: actualSavingsPoint?.expenses ?? null,
    };
  });

  const chartWindow = calculateFocusedChartWindow(
    timeline,
    latestActualKey,
    monthsBack,
    monthsForward
  );
  const yearlyBreakdown = groupForecastTimelineByYear(timeline);
  const totalForecastInterest = timeline.reduce(
    (sum, point) => new Decimal(sum).plus(point.forecastInterest ?? 0),
    new Decimal(0)
  );

  return {
    timeline,
    chartWindow,
    yearlyBreakdown,
    summary: {
      latestActualKey,
      latestActualBalance,
      plannedEndingBalance: timeline[timeline.length - 1]?.plannedBalance ?? 0,
      currentTrajectoryEndingBalance:
        timeline.findLast((point) => point.currentTrajectoryBalance !== null)
          ?.currentTrajectoryBalance ?? latestActualBalance,
      totalForecastInterest: roundCurrency(totalForecastInterest),
      trailingAverageNetSavings,
    },
  };
}
