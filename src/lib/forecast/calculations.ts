/**
 * Forecast Calculation Utilities
 *
 * Functions for calculating wealth trajectory projections, aggregating
 * historical asset data, and merging forecast with real data.
 */

import Decimal from 'decimal.js';
import type { ForecastDataPoint, AssetWithHistory, MonthlyHistoricalData } from './types';

// Exchange rate constant (IDR per USD)
// @TODO: Wire with backend - fetch real exchange rates from database
// @TODO: Mock data - Consider using environment variable or config for testing with different exchange rates
const IDR_PER_USD = 15000;

/**
 * Calculate forecast data points for wealth trajectory
 *
 * @param currentTotal - Current total asset value in IDR
 * @param monthlyTopup - Monthly contribution amount in IDR
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
 * Aggregate asset history by month
 *
 * Consolidates multiple assets' historical data into monthly totals.
 * Converts all amounts to IDR for aggregation.
 *
 * @param assets - Array of assets with their history
 * @returns Monthly aggregated historical data
 */
export function aggregateAssetHistory(assets: AssetWithHistory[]): MonthlyHistoricalData[] {
  const monthlyTotals: Record<string, { balance: number; interest: number }> = {};

  assets.forEach((asset) => {
    asset.history?.forEach((point) => {
      const date = typeof point.date === 'string' ? new Date(point.date) : point.date;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      // Convert to IDR if needed
      const amountInIdr = convertCurrency(point.amount, asset.currency, 'IDR');

      if (!monthlyTotals[key]) {
        monthlyTotals[key] = { balance: 0, interest: 0 };
      }

      // Accumulate balance from all assets for this month
      // Interest calculation from historical data is complex, so we set it to 0
      monthlyTotals[key].balance += amountInIdr;
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
 * Combines historical asset data with forecast calculations.
 * Real data takes precedence over forecast for overlapping months.
 *
 * @param realData - Monthly historical data from assets
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
 * Convert currency amount
 *
 * @param amount - Amount to convert
 * @param fromCurrency - Source currency
 * @param toCurrency - Target currency
 * @param exchangeRate - Optional custom exchange rate (IDR per USD)
 * @returns Converted amount
 */
export function convertCurrency(
  amount: number,
  fromCurrency: 'IDR' | 'USD',
  toCurrency: 'IDR' | 'USD',
  exchangeRate: number = IDR_PER_USD
): number {
  if (fromCurrency === toCurrency) return amount;

  if (fromCurrency === 'USD' && toCurrency === 'IDR') {
    return new Decimal(amount).times(exchangeRate).toNumber();
  }

  if (fromCurrency === 'IDR' && toCurrency === 'USD') {
    return new Decimal(amount).dividedBy(exchangeRate).toNumber();
  }

  return amount;
}

/**
 * Calculate current total from assets
 *
 * @param assets - Array of assets with balance and currency
 * @returns Total value in IDR
 */
export function calculateCurrentTotal(assets: AssetWithHistory[]): number {
  return assets.reduce((sum, asset) => {
    const amountInIdr = convertCurrency(asset.balance, asset.currency, 'IDR');
    return new Decimal(sum).plus(amountInIdr).toNumber();
  }, 0);
}
