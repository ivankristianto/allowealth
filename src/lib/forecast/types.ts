/**
 * Forecast Calculation Types
 *
 * Type definitions for wealth trajectory forecasting and projections.
 * Used across forecast utilities, API endpoints, and components.
 */

/**
 * Single month data point in the forecast
 */
export interface ForecastDataPoint {
  /** Month key in YYYY-MM format */
  key: string;
  /** Display label for the month (e.g., "Jan 2026") */
  dateLabel: string;
  /** Forecasted balance for this month */
  forecastBalance: number;
  /** Forecasted interest earned this month */
  forecastInterest: number;
  /** Actual balance from historical data (null if future month) */
  realBalance: number | null;
  /** Actual interest from historical data (null if future month) */
  realInterest: number | null;
}

/**
 * User inputs for forecast calculation
 */
export interface ForecastInput {
  /** Monthly contribution amount in IDR */
  monthlyTopup: number;
  /** Annual percentage yield (e.g., 7 for 7%) */
  annualRate: number;
  /** Number of years to forecast (default: 10) */
  years: number;
}

/**
 * Complete forecast result with data and summary
 */
export interface ForecastResult {
  /** Array of monthly data points (months = years * 12) */
  dataPoints: ForecastDataPoint[];
  /** Summary statistics */
  summary: {
    /** Target balance at end of forecast period */
    year10Target: number;
    /** Total interest earned over forecast period */
    totalInterest: number;
    /** Growth multiple (final / initial) */
    growthMultiple: number;
    /** Current total account value */
    currentTotal: number;
  };
  /** Input parameters used for calculation */
  input: ForecastInput;
}

/**
 * Historical account data point
 */
export interface HistoricalDataPoint {
  /** Date in YYYY-MM-DD format or timestamp */
  date: string | Date;
  /** Account balance at this date */
  amount: number;
}

/**
 * Account with history for aggregation
 */
export interface AccountWithHistory {
  /** Account balance */
  balance: number;
  /** Account currency */
  currency: Currency;
  /** Historical balance records */
  history?: HistoricalDataPoint[];
}

/**
 * Aggregated monthly historical data
 */
export interface MonthlyHistoricalData {
  /** Month key in YYYY-MM format */
  key: string;
  /** Total balance across all accounts */
  balance: number;
  /** Interest earned (0 for historical data without interest tracking) */
  interest: number;
}
