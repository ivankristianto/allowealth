/**
 * Amount Utility Functions for Seeder
 */

export type BaseScale = 'primary' | 'secondary';

/**
 * Scales hardcoded template amounts (which are IDR-based for primary, USD-based for secondary)
 * to realistic values for the target currency.
 */
function scale(amount: number, targetCurrency: string, baseScale: BaseScale): number {
  if (baseScale === 'primary' && targetCurrency !== 'IDR') {
    // Primary templates are written with IDR scale (e.g., 15,000,000).
    // Convert to standard currency magnitude (e.g. ~1:15000 ratio).
    return amount / 15000;
  }
  if (baseScale === 'secondary' && targetCurrency === 'IDR') {
    // Secondary templates are written with USD scale (e.g., 5,000).
    // Convert up to IDR magnitude if the user explicitly makes secondary IDR.
    return amount * 15000;
  }
  return amount;
}

/**
 * Format amount as string (for Decimal.js compatibility)
 * Rounds to 2 decimal places max. If currency is IDR, rounds to nearest 100.
 */
export function amt(
  rawAmount: number,
  currency: string = 'IDR',
  baseScale: BaseScale = 'primary'
): string {
  const amount = scale(rawAmount, currency, baseScale);
  if (currency === 'IDR') {
    return (Math.round(amount / 100) * 100).toString();
  }
  return Number(amount.toFixed(2)).toString();
}

/**
 * Generate random amount within range
 */
export function randomAmount(
  min: number,
  max: number,
  currency: string = 'IDR',
  baseScale: BaseScale = 'primary'
): string {
  const amount = min + Math.random() * (max - min);
  // amt will scale the generated raw IDR/USD amount for us
  return amt(amount, currency, baseScale);
}

/**
 * Format budget amounts for high-level overviews.
 * Rounds IDR to nearest 10,000 or 50,000.
 * Rounds other currencies to nearest 10 or 50.
 */
export function approxAmt(
  rawAmount: number,
  currency: string = 'IDR',
  baseScale: BaseScale = 'primary'
): string {
  const amount = scale(rawAmount, currency, baseScale);
  if (currency === 'IDR') {
    // Round to nearest 50,000 if amount is large, else nearest 10,000
    if (amount >= 500000) {
      return (Math.round(amount / 50000) * 50000).toString();
    }
    return (Math.round(amount / 10000) * 10000).toString();
  }

  // For USD/other currencies
  if (amount >= 500) {
    return (Math.round(amount / 50) * 50).toString();
  }
  return (Math.round(amount / 10) * 10).toString();
}
