/**
 * Safe decimal arithmetic utilities
 *
 * All currency amounts are stored as strings to avoid floating-point precision issues.
 * These utilities provide safe arithmetic operations using Decimal.js for exact precision.
 */

import Decimal from 'decimal.js';

// Configure Decimal.js for financial applications (idempotent - safe to call multiple times)
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

/**
 * Multiply two decimal numbers (stored as strings) safely
 * @param a - First number as string
 * @param b - Second number as string or number
 * @returns Product as string
 */
export function decimalMultiply(a: string, b: string | number): string {
  const numA = safeDecimal(a);
  const numB = typeof b === 'string' ? safeDecimal(b) : safeDecimal(b);
  if (numA === null || numB === null) return '0';
  return numA.times(numB).toString();
}

/**
 * Divide two decimal numbers (stored as strings) safely
 * @param a - Numerator as string
 * @param b - Denominator as string or number
 * @param precision - Decimal places (default: 2)
 * @returns Quotient as string
 */
export function decimalDivide(a: string, b: string | number, precision: number = 2): string {
  const numA = safeDecimal(a);
  const numB = typeof b === 'string' ? safeDecimal(b) : safeDecimal(b);

  if (numA === null || numB === null || numB.isZero()) {
    throw new Error('Division by zero');
  }

  return numA.dividedBy(numB).toFixed(precision);
}

/**
 * Add two decimal numbers (stored as strings) safely
 * @param a - First number as string
 * @param b - Second number as string
 * @returns Sum as string
 */
export function decimalAdd(a: string, b: string): string {
  const numA = safeDecimal(a);
  const numB = safeDecimal(b);
  if (numA === null || numB === null) return '0';
  return numA.plus(numB).toString();
}

/**
 * Subtract two decimal numbers (stored as strings) safely
 * @param a - First number as string
 * @param b - Second number as string
 * @returns Difference as string
 */
export function decimalSubtract(a: string, b: string): string {
  const numA = safeDecimal(a);
  const numB = safeDecimal(b);
  if (numA === null || numB === null) return '0';
  return numA.minus(numB).toString();
}

/**
 * Round a decimal number to specific precision
 * @param num - Number as string
 * @param precision - Decimal places (default: 2)
 * @returns Rounded number as string
 */
export function decimalRound(num: string, precision: number = 2): string {
  const value = safeDecimal(num);
  if (value === null) return '0';
  return value.toFixed(precision);
}

/**
 * Compare two decimal numbers
 * @param a - First number as string
 * @param b - Second number as string
 * @returns Comparison result (-1, 0, 1)
 */
export function decimalCompare(a: string, b: string): number {
  const numA = safeDecimal(a);
  const numB = safeDecimal(b);
  if (numA === null || numB === null) return 0;
  return numA.comparedTo(numB);
}

/**
 * Calculate percentage
 * @param part - Part value as string
 * @param total - Total value as string
 * @param precision - Decimal places (default: 2)
 * @returns Percentage as string
 */
export function decimalPercentage(part: string, total: string, precision: number = 2): string {
  const numPart = safeDecimal(part);
  const numTotal = safeDecimal(total);

  if (numPart === null || numTotal === null || numTotal.isZero()) {
    return '0';
  }

  return numPart.dividedBy(numTotal).times(100).toFixed(precision);
}

/**
 * Sum an array of decimal numbers
 * @param numbers - Array of numbers as strings
 * @returns Sum as string
 */
export function decimalSum(numbers: string[]): string {
  return numbers.reduce((sum, num) => decimalAdd(sum, num), '0');
}

/**
 * Average of an array of decimal numbers
 * @param numbers - Array of numbers as strings
 * @param precision - Decimal places (default: 2)
 * @returns Average as string
 */
export function decimalAverage(numbers: string[], precision: number = 2): string {
  if (numbers.length === 0) {
    return '0';
  }

  const sum = decimalSum(numbers);
  return decimalDivide(sum, numbers.length, precision);
}

/**
 * Check if a decimal number is zero
 * @param num - Number as string
 * @returns True if number is zero
 */
export function decimalIsZero(num: string): boolean {
  const value = safeDecimal(num);
  return value === null || value.isZero();
}

/**
 * Check if a decimal number is positive
 * @param num - Number as string
 * @returns True if number is greater than zero
 */
export function decimalIsPositive(num: string): boolean {
  const value = safeDecimal(num);
  return value !== null && value.isPositive();
}

/**
 * Check if a decimal number is negative
 * @param num - Number as string
 * @returns True if number is less than zero
 */
export function decimalIsNegative(num: string): boolean {
  const value = safeDecimal(num);
  return value !== null && value.isNegative();
}

/**
 * Get absolute value of a decimal number
 * @param num - Number as string
 * @returns Absolute value as string
 */
export function decimalAbs(num: string): string {
  const value = safeDecimal(num);
  if (value === null) return '0';
  return value.abs().toString();
}

/**
 * Clamp a decimal number between min and max
 * @param num - Number as string
 * @param min - Minimum value as string
 * @param max - Maximum value as string
 * @returns Clamped value as string
 */
export function decimalClamp(num: string, min: string, max: string): string {
  const value = safeDecimal(num);
  const minVal = safeDecimal(min);
  const maxVal = safeDecimal(max);

  if (value === null || minVal === null || maxVal === null) return '0';
  if (value.lt(minVal)) return minVal.toString();
  if (value.gt(maxVal)) return maxVal.toString();
  return value.toString();
}
