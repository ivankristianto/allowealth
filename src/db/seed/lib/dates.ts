/**
 * Date Utility Functions for Seeder
 */

// Seeding configuration constants
export const SEED_TIME_HOUR = 10; // 10 AM to avoid timezone boundary issues

/**
 * Generate a date N days ago
 */
export function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(SEED_TIME_HOUR, 0, 0, 0); // Set to 10 AM for consistency
  return date;
}

/**
 * Generate a date for specific year, month, day
 * Returns null if the date would be in the future
 */
export function specificDate(year: number, month: number, day: number): Date | null {
  const date = new Date(year, month - 1, day);
  date.setHours(SEED_TIME_HOUR, 0, 0, 0);

  // Don't create dates in the future
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  if (date > today) {
    return null;
  }

  return date;
}

/**
 * Compute the N months ending at current month
 * All months guaranteed in the past — no null dates, no fallback.
 */
export function getTrailingMonths(count: number): Array<{ year: number; month: number }> {
  const now = new Date();
  const months: Array<{ year: number; month: number }> = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return months;
}

/**
 * Max usable day for a month — caps to today for the current month
 * so we never generate future-dated transactions.
 */
export function maxDayForMonth(year: number, month: number): number {
  const now = new Date();
  const daysInMonth = new Date(year, month, 0).getDate();
  if (year === now.getFullYear() && month === now.getMonth() + 1) {
    return Math.min(now.getDate(), daysInMonth);
  }
  return daysInMonth;
}

/**
 * Compute the 3 months to seed: current month + 2 previous months
 * Uses dynamic dates so seed data always includes the current month.
 */
export function getSeedMonths(): Array<{ year: number; month: number }> {
  return getTrailingMonths(3);
}
