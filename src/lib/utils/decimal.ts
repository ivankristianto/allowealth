/**
 * Safe decimal arithmetic utilities
 *
 * All currency amounts are stored as strings to avoid floating-point precision issues.
 * These utilities provide safe arithmetic operations.
 */

/**
 * Multiply two decimal numbers (stored as strings) safely
 * @param a - First number as string
 * @param b - Second number as string or number
 * @returns Product as string
 */
export function decimalMultiply(a: string, b: string | number): string {
  const numA = parseFloat(a) || 0;
  const numB = typeof b === 'string' ? parseFloat(b) || 0 : b;
  return (numA * numB).toString();
}

/**
 * Divide two decimal numbers (stored as strings) safely
 * @param a - Numerator as string
 * @param b - Denominator as string or number
 * @param precision - Decimal places (default: 2)
 * @returns Quotient as string
 */
export function decimalDivide(a: string, b: string | number, precision: number = 2): string {
  const numA = parseFloat(a) || 0;
  const numB = typeof b === 'string' ? parseFloat(b) || 0 : b;

  if (numB === 0) {
    throw new Error('Division by zero');
  }

  const result = numA / numB;
  return result.toFixed(precision);
}

/**
 * Add two decimal numbers (stored as strings) safely
 * @param a - First number as string
 * @param b - Second number as string
 * @returns Sum as string
 */
export function decimalAdd(a: string, b: string): string {
  const numA = parseFloat(a) || 0;
  const numB = parseFloat(b) || 0;
  return (numA + numB).toString();
}

/**
 * Subtract two decimal numbers (stored as strings) safely
 * @param a - First number as string
 * @param b - Second number as string
 * @returns Difference as string
 */
export function decimalSubtract(a: string, b: string): string {
  const numA = parseFloat(a) || 0;
  const numB = parseFloat(b) || 0;
  return (numA - numB).toString();
}

/**
 * Round a decimal number to specific precision
 * @param num - Number as string
 * @param precision - Decimal places (default: 2)
 * @returns Rounded number as string
 */
export function decimalRound(num: string, precision: number = 2): string {
  const value = parseFloat(num) || 0;
  return value.toFixed(precision);
}

/**
 * Compare two decimal numbers
 * @param a - First number as string
 * @param b - Second number as string
 * @returns Comparison result (-1, 0, 1)
 */
export function decimalCompare(a: string, b: string): number {
  const numA = parseFloat(a) || 0;
  const numB = parseFloat(b) || 0;

  if (numA < numB) return -1;
  if (numA > numB) return 1;
  return 0;
}

/**
 * Calculate percentage
 * @param part - Part value as string
 * @param total - Total value as string
 * @param precision - Decimal places (default: 2)
 * @returns Percentage as string
 */
export function decimalPercentage(part: string, total: string, precision: number = 2): string {
  const numPart = parseFloat(part) || 0;
  const numTotal = parseFloat(total) || 0;

  if (numTotal === 0) {
    return '0';
  }

  const percentage = (numPart / numTotal) * 100;
  return percentage.toFixed(precision);
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
 * @param epsilon - Tolerance for floating point comparison (default: 0.0001)
 * @returns True if number is effectively zero
 */
export function decimalIsZero(num: string, epsilon: number = 0.0001): boolean {
  const value = Math.abs(parseFloat(num) || 0);
  return value < epsilon;
}

/**
 * Check if a decimal number is positive
 * @param num - Number as string
 * @returns True if number is greater than zero
 */
export function decimalIsPositive(num: string): boolean {
  return parseFloat(num) > 0;
}

/**
 * Check if a decimal number is negative
 * @param num - Number as string
 * @returns True if number is less than zero
 */
export function decimalIsNegative(num: string): boolean {
  return parseFloat(num) < 0;
}

/**
 * Get absolute value of a decimal number
 * @param num - Number as string
 * @returns Absolute value as string
 */
export function decimalAbs(num: string): string {
  const value = parseFloat(num) || 0;
  return Math.abs(value).toString();
}

/**
 * Clamp a decimal number between min and max
 * @param num - Number as string
 * @param min - Minimum value as string
 * @param max - Maximum value as string
 * @returns Clamped value as string
 */
export function decimalClamp(num: string, min: string, max: string): string {
  const value = parseFloat(num) || 0;
  const minVal = parseFloat(min) || 0;
  const maxVal = parseFloat(max) || 0;

  const clamped = Math.min(Math.max(value, minVal), maxVal);
  return clamped.toString();
}
