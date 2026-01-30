/**
 * Client-safe currency formatting utilities
 *
 * These functions work with plain JavaScript numbers and do NOT import Decimal.js.
 * Use this module for client-side code to avoid bundling Decimal.js (~33KB gzipped).
 *
 * For server-side code that needs precise decimal arithmetic, use currency.ts instead.
 *
 * @TODO: P2 - Add this module to ADR-005 Quick Reference table as client-safe import.
 * @TODO: P2 - Standardize fallback format consistency between functions (Rp 0 vs Rp0).
 *             This mirrors existing inconsistency in currency.ts - fix both together.
 */

import type { Currency } from '@/lib/enums';

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
 * Format a currency amount from number (for client-side code)
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
 * Format currency in compact notation (e.g., "Rp1.5M", "$1.2K")
 * Useful for charts and compact displays
 * @param amount - The amount as a number
 * @param currency - The currency code (IDR or USD)
 * @returns Compact formatted string (e.g., "Rp1.5M" or "$1.2K")
 *
 * @TODO: P3 - Consider improving negative number formatting. Currently outputs "Rp-1.5M"
 *             instead of "-Rp1.5M". Evaluate if sign position matters for UX.
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
