/**
 * Currency Conversion Helper
 * ==========================
 * Provides currency conversion utilities for IDR and USD.
 * Uses exchange rates from database with fallback to hardcoded rate.
 */

import { db, exchangeRates } from '@/db';
import { desc, eq } from 'drizzle-orm';

/**
 * Default exchange rate (1 USD = 15,000 IDR)
 * Used as fallback when no rate is available in database
 */
export const DEFAULT_EXCHANGE_RATE = 15000;

/**
 * Supported currencies
 */
export type Currency = 'IDR' | 'USD';

/**
 * Convert amount from one currency to another
 *
 * @param amount - Amount to convert
 * @param from - Source currency
 * @param to - Target currency
 * @param rate - Optional exchange rate (USD to IDR). If not provided, fetches from database
 * @returns Converted amount rounded to 2 decimal places
 *
 * @example
 * convertCurrency(100, 'USD', 'IDR', 15000) // Returns 1500000
 * convertCurrency(1500000, 'IDR', 'USD', 15000) // Returns 100
 * convertCurrency(100, 'USD', 'USD', 15000) // Returns 100 (same currency)
 */
export async function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
  rate?: number
): Promise<number> {
  // Handle same currency
  if (from === to) {
    return roundToDecimals(amount);
  }

  // Handle invalid or zero amount
  if (isNaN(amount) || amount < 0) {
    throw new Error(`Invalid amount: ${amount}. Must be a non-negative number.`);
  }

  // Get exchange rate if not provided
  let exchangeRate = rate;
  if (exchangeRate === undefined) {
    exchangeRate = await getLatestExchangeRate();
  }

  // Convert based on direction
  let result: number;
  if (from === 'USD' && to === 'IDR') {
    // USD to IDR: multiply by rate
    result = amount * exchangeRate;
  } else if (from === 'IDR' && to === 'USD') {
    // IDR to USD: divide by rate
    result = amount / exchangeRate;
  } else {
    // Should never reach here due to same currency check above
    return roundToDecimals(amount);
  }

  return roundToDecimals(result);
}

/**
 * Synchronous version of convertCurrency that doesn't query database
 * Useful for calculations where you already have the rate
 *
 * @param amount - Amount to convert
 * @param from - Source currency
 * @param to - Target currency
 * @param rate - Exchange rate (USD to IDR)
 * @returns Converted amount rounded to 2 decimal places
 */
export function convertCurrencySync(
  amount: number,
  from: Currency,
  to: Currency,
  rate: number = DEFAULT_EXCHANGE_RATE
): number {
  // Handle same currency
  if (from === to) {
    return roundToDecimals(amount);
  }

  // Handle invalid or zero amount
  if (isNaN(amount) || amount < 0) {
    throw new Error(`Invalid amount: ${amount}. Must be a non-negative number.`);
  }

  // Handle invalid rate
  if (isNaN(rate) || rate <= 0) {
    throw new Error(`Invalid exchange rate: ${rate}. Must be a positive number.`);
  }

  // Convert based on direction
  let result: number;
  if (from === 'USD' && to === 'IDR') {
    result = amount * rate;
  } else if (from === 'IDR' && to === 'USD') {
    result = amount / rate;
  } else {
    return roundToDecimals(amount);
  }

  return roundToDecimals(result);
}

/**
 * Get the latest exchange rate from database
 *
 * @returns Latest USD to IDR exchange rate, or default if not found
 */
export async function getLatestExchangeRate(): Promise<number> {
  try {
    // Query for USD to IDR rate, ordered by effective_date descending
    const [latestRate] = await db
      .select({
        rate: exchangeRates.rate,
      })
      .from(exchangeRates)
      .where(eq(exchangeRates.from_currency, 'USD'))
      .orderBy(desc(exchangeRates.effective_date))
      .limit(1);

    if (latestRate) {
      const parsedRate = parseFloat(latestRate.rate);
      if (!isNaN(parsedRate) && parsedRate > 0) {
        return parsedRate;
      }
    }

    // Return default if no rate found or invalid
    return DEFAULT_EXCHANGE_RATE;
  } catch (error) {
    // Log error but return default rate to avoid breaking the app
    console.error('Error fetching exchange rate from database:', error);
    return DEFAULT_EXCHANGE_RATE;
  }
}

/**
 * Round number to specified decimal places (default: 2)
 *
 * @param value - Value to round
 * @param decimals - Number of decimal places (default: 2)
 * @returns Rounded value
 */
export function roundToDecimals(value: number, decimals: number = 2): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Format currency amount as string with symbol
 *
 * @param amount - Amount to format
 * @param currency - Currency code
 * @returns Formatted currency string
 */
export function formatCurrencyAmount(amount: number, currency: Currency): string {
  const rounded = roundToDecimals(amount);
  const symbol = currency === 'IDR' ? 'Rp' : '$';
  const decimals = currency === 'IDR' ? 0 : 2;

  return `${symbol}${rounded.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

/**
 * Calculate percentage of budget used
 *
 * @param spent - Amount spent
 * @param budget - Budget amount
 * @returns Percentage (0-100+)
 */
export function calculatePercentageUsed(spent: number, budget: number): number {
  if (budget <= 0) {
    return 0;
  }
  return roundToDecimals((spent / budget) * 100, 1);
}
