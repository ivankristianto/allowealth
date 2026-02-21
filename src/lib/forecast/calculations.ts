/**
 * Forecast Calculation Utilities
 *
 * Functions for calculating wealth trajectory projections, aggregating
 * historical account data, and merging forecast with real data.
 */

import Decimal from 'decimal.js';
import type { ForecastDataPoint, AccountWithHistory, MonthlyHistoricalData } from './types';

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

  accounts.forEach((account) => {
    account.history?.forEach((point) => {
      const date = typeof point.date === 'string' ? new Date(point.date) : point.date;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

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
  return accounts.reduce((sum, account) => {
    return new Decimal(sum).plus(account.balance).toNumber();
  }, 0);
}
