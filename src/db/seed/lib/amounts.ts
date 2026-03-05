/**
 * Amount Utility Functions for Seeder
 */

/**
 * Format amount as string (for Decimal.js compatibility)
 */
export function amt(amount: number): string {
  return amount.toString();
}

/**
 * Generate random amount within range
 */
export function randomAmount(min: number, max: number): string {
  return amt(min + Math.random() * (max - min));
}
