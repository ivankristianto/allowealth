import Decimal from 'decimal.js';
import type { Currency } from '@/lib/enums';

/**
 * Currency formatting and parsing utilities
 */

// Configure Decimal.js for financial applications
Decimal.set({
  precision: 28, // Standard financial precision
  rounding: Decimal.ROUND_HALF_UP, // Commercial rounding
});

/**
 * Helper to safely create a Decimal instance
 * @returns Decimal instance or null if invalid
 */
function safeDecimal(value: unknown): Decimal | null {
  try {
    const strValue = (value ?? '0') as string | number;
    const decimal = new Decimal(strValue);
    return decimal.isFinite() ? decimal : null;
  } catch {
    return null;
  }
}

// Number formatters for each currency (cached)
const formatters = {
  IDR: new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }),
  USD: new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }),
};

/**
 * Format a currency amount for display
 * @param amount - The amount as a string (decimal stored as string)
 * @param currency - The currency code (IDR or USD)
 * @returns Formatted currency string (e.g., "Rp 1.000.000" or "$1,000.00")
 */
export function formatCurrency(amount: string, currency: Currency): string {
  const decimal = safeDecimal(amount);
  if (decimal === null) {
    return `${currency === 'IDR' ? 'Rp' : '$'} 0`;
  }
  // Intl.NumberFormat requires a number; for typical currency amounts this is safe
  // Note: Very large amounts (> Number.MAX_SAFE_INTEGER) may lose display precision
  return formatters[currency].format(decimal.toNumber());
}

/**
 * Format a currency amount from number (for stories/tests/client code)
 * @param amount - The amount as a number
 * @param currency - The currency code (IDR or USD)
 * @returns Formatted currency string (e.g., "Rp 1.000.000" or "$1,000.00")
 */
export function formatCurrencyFromNumber(amount: number, currency: Currency): string {
  if (!Number.isFinite(amount)) {
    return `${currency === 'IDR' ? 'Rp' : '$'} 0`;
  }
  return formatters[currency].format(amount);
}

/**
 * Format currency without symbol (for tables/calculations)
 * @param amount - The amount as a string
 * @param currency - The currency code
 * @returns Formatted number string (e.g., "1.000.000" or "1,000.00")
 */
export function formatCurrencyNumber(amount: string, currency: Currency): string {
  const decimal = safeDecimal(amount);
  if (decimal === null) {
    return '0';
  }

  const options: Intl.NumberFormatOptions = {
    minimumFractionDigits: currency === 'IDR' ? 0 : 2,
    maximumFractionDigits: currency === 'IDR' ? 0 : 2,
  };

  const locale = currency === 'IDR' ? 'id-ID' : 'en-US';
  // Intl.NumberFormat requires a number; for typical currency amounts this is safe
  // Note: Very large amounts (> Number.MAX_SAFE_INTEGER) may lose display precision
  return new Intl.NumberFormat(locale, options).format(decimal.toNumber());
}

/**
 * Parse user input for currency amount
 * Handles common formats: "1.5M", "1.5k", "1500000", "1,500,000"
 * @param input - User input string
 * @returns Parsed amount as string (decimal)
 */
export function parseCurrencyInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return '0';
  }

  // Trim and validate length to prevent abuse
  const trimmed = input.trim();
  if (trimmed.length > 50) {
    return '0';
  }

  // Remove all non-numeric characters except dots and minus
  let cleaned = trimmed.replace(/[^\d.,-]/g, '');

  // Validate we have something reasonable left
  if (!cleaned || cleaned === '' || cleaned === '-' || cleaned === '.' || cleaned === ',') {
    return '0';
  }

  // Check for invalid patterns (multiple dots/commas in wrong places)
  const dotCount = (cleaned.match(/\./g) || []).length;
  const commaCount = (cleaned.match(/,/g) || []).length;
  if (dotCount > 1 || commaCount > 1) {
    return '0';
  }

  // Handle multipliers
  const multiplierMatch = cleaned.match(/^([\d.,]+)([mkMK])$/i);
  if (multiplierMatch) {
    const numStr = multiplierMatch[1];
    const multiplier = multiplierMatch[2]?.toLowerCase();
    if (!numStr || !multiplier) return '0';

    const baseNum = safeDecimal(numStr.replace(/,/g, ''));
    if (baseNum === null || baseNum.isNegative()) return '0';

    let num = baseNum;
    if (multiplier === 'k') num = num.times(1000);
    if (multiplier === 'm') num = num.times(1000000);

    // Sanity check for reasonable range
    if (num.gt(1e15)) return '0';

    return num.toString();
  }

  // Handle comma as decimal separator (Indonesian format)
  if (cleaned.includes(',') && !cleaned.includes('.')) {
    // Only comma, treat as decimal separator
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',') && cleaned.includes('.')) {
    // Both present, assume comma is thousands separator
    cleaned = cleaned.replace(/,/g, '');
  }

  const parsed = safeDecimal(cleaned);
  if (parsed === null) return '0';

  // Sanity check for reasonable range
  if (parsed.isNegative() || parsed.gt(1e15)) return '0';

  return parsed.toString();
}

/**
 * Convert currency amount using an exchange rate
 * @param amount - Amount as string
 * @param fromCurrency - Source currency
 * @param toCurrency - Target currency
 * @param rate - Exchange rate (from to to)
 * @returns Converted amount as string
 */
export function convertCurrency(
  amount: string,
  fromCurrency: Currency,
  toCurrency: Currency,
  rate: string
): string {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const num = safeDecimal(amount);
  const rateNum = safeDecimal(rate);

  if (num === null || rateNum === null || rateNum.isZero()) {
    return '0';
  }

  return num.times(rateNum).toString();
}

/**
 * Add two currency amounts (safe for decimals stored as strings)
 * @param a - First amount
 * @param b - Second amount
 * @returns Sum as string
 */
export function addCurrency(a: string, b: string): string {
  const numA = safeDecimal(a);
  const numB = safeDecimal(b);
  if (numA === null || numB === null) return '0';
  return numA.plus(numB).toString();
}

/**
 * Subtract two currency amounts (safe for decimals stored as strings)
 * @param a - First amount
 * @param b - Second amount
 * @returns Difference as string
 */
export function subtractCurrency(a: string, b: string): string {
  const numA = safeDecimal(a);
  const numB = safeDecimal(b);
  if (numA === null || numB === null) return '0';
  return numA.minus(numB).toString();
}

/**
 * Multiply currency amount by a factor
 * @param amount - Amount
 * @param factor - Multiplier
 * @returns Product as string
 */
export function multiplyCurrency(amount: string, factor: number): string {
  const num = safeDecimal(amount);
  if (num === null) return '0';
  return num.times(factor).toString();
}

/**
 * Divide currency amount by a factor
 * @param amount - Amount
 * @param divisor - Divisor
 * @returns Quotient as string
 */
export function divideCurrency(amount: string, divisor: number): string {
  const num = safeDecimal(amount);
  if (num === null || divisor === 0) return '0';
  return num.dividedBy(divisor).toString();
}

/**
 * Format currency in compact notation (e.g., "Rp1.5M", "$1.2K")
 * Useful for charts and compact displays
 * @param amount - The amount as a number
 * @param currency - The currency code (IDR or USD)
 * @returns Compact formatted string (e.g., "Rp1.5M" or "$1.2K")
 */
export function formatCurrencyCompact(amount: number, currency: Currency = 'IDR'): string {
  if (!Number.isFinite(amount)) {
    return `${currency === 'IDR' ? 'Rp' : '$'}0`;
  }

  const absAmount = Math.abs(amount);
  const symbol = currency === 'IDR' ? 'Rp' : '$';

  if (absAmount >= 1_000_000_000) {
    return `${symbol}${(amount / 1_000_000_000).toFixed(1)}B`;
  } else if (absAmount >= 1_000_000) {
    return `${symbol}${(amount / 1_000_000).toFixed(1)}M`;
  } else if (absAmount >= 1_000) {
    return `${symbol}${(amount / 1_000).toFixed(1)}K`;
  } else {
    const locale = currency === 'IDR' ? 'id-ID' : 'en-US';
    return `${symbol}${amount.toLocaleString(locale)}`;
  }
}
