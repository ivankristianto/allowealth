/**
 * Period validation utilities
 *
 * Validates and parses period strings for monthly and yearly reports.
 * Prevents SQL injection and ensures valid date ranges.
 */

export const MIN_YEAR = 2000;
export const MAX_YEAR = 2100;

export interface ParsedPeriod {
  year: number;
  month?: number;
}

/**
 * Validate and parse period string based on range type
 * @param period - Period string ('YYYY-MM' for monthly, 'YYYY' for yearly)
 * @param range - Range type ('monthly' or 'yearly')
 * @returns Parsed period with year and optional month
 * @throws Error if period format is invalid or values are out of range
 */
export function validatePeriod(period: string, range: 'monthly' | 'yearly'): ParsedPeriod {
  if (range === 'monthly') {
    const match = /^(\d{4})-(\d{2})$/.exec(period);
    if (!match) {
      throw new Error(`Invalid monthly period format. Expected 'YYYY-MM', got '${period}'.`);
    }
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);

    if (month < 1 || month > 12) {
      throw new Error(`Invalid month: ${month}. Must be between 1 and 12.`);
    }
    if (year < MIN_YEAR || year > MAX_YEAR) {
      throw new Error(`Invalid year: ${year}. Must be between ${MIN_YEAR} and ${MAX_YEAR}.`);
    }
    return { year, month };
  } else {
    const match = /^(\d{4})$/.exec(period);
    if (!match) {
      throw new Error(`Invalid yearly period format. Expected 'YYYY', got '${period}'.`);
    }
    const year = parseInt(match[1], 10);
    if (year < MIN_YEAR || year > MAX_YEAR) {
      throw new Error(`Invalid year: ${year}. Must be between ${MIN_YEAR} and ${MAX_YEAR}.`);
    }
    return { year };
  }
}
