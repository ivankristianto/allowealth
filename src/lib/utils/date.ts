/**
 * Date formatting and validation utilities
 */

/**
 * Format a date for display
 * @param date - Date to format
 * @param format - Format style ('short', 'long', 'iso', 'relative')
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | string,
  format: 'short' | 'long' | 'iso' | 'relative' = 'short',
  locale: string = 'en-US'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  switch (format) {
    case 'short':
      return (
        dateObj.toLocaleDateString(locale, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }) ?? dateObj.toLocaleDateString()
      );
    case 'long':
      return (
        dateObj.toLocaleDateString(locale, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }) ?? dateObj.toLocaleDateString()
      );
    case 'iso':
      return dateObj.toISOString().split('T')[0] ?? '';
    case 'relative':
      return formatRelativeDate(dateObj);
    default:
      return dateObj.toLocaleDateString(locale) ?? dateObj.toLocaleDateString();
  }
}

/**
 * Format date as "Month Year" (e.g., "January 2026")
 * @param date - Date to format
 * @param locale - Locale for formatting
 * @returns Formatted month-year string
 */
export function formatMonthYear(date: Date | string, locale: string = 'en-US'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
  });
}

/**
 * Format a date and time for display
 * @param date - Date to format
 * @param locale - Locale for formatting
 * @returns Formatted date-time string
 */
export function formatDateTime(date: Date | string, locale: string = 'en-US'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format relative date (e.g., "2 days ago", "in 3 hours")
 * @param date - Date to format
 * @returns Relative date string
 */
export function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    const formatted = formatDate(date, 'short');
    return formatted ?? date.toLocaleDateString();
  }
}

/**
 * Check if a date is in the future
 * @param date - Date to check
 * @returns True if date is in the future
 */
export function isFutureDate(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj > new Date();
}

/**
 * Check if a date is in the past
 * @param date - Date to check
 * @returns True if date is in the past
 */
export function isPastDate(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj < new Date();
}

/**
 * Check if a date is today
 * @param date - Date to check
 * @returns True if date is today
 */
export function isToday(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const today = new Date();
  return (
    dateObj.getDate() === today.getDate() &&
    dateObj.getMonth() === today.getMonth() &&
    dateObj.getFullYear() === today.getFullYear()
  );
}

/**
 * Get the start of a date (midnight)
 * @param date - Date
 * @returns New date set to midnight of the given date
 */
export function getStartOfDay(date: Date | string = new Date()): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
}

/**
 * Get the end of a date (end of day)
 * @param date - Date
 * @returns New date set to end of day of the given date
 */
export function getEndOfDay(date: Date | string = new Date()): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 23, 59, 59, 999);
}

/**
 * Get the start of a month
 * @param date - Date
 * @returns New date set to first day of the month at midnight
 */
export function getStartOfMonth(date: Date | string = new Date()): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Date(dateObj.getFullYear(), dateObj.getMonth(), 1);
}

/**
 * Get the end of a month
 * @param date - Date
 * @returns New date set to last day of the month at end of day
 */
export function getEndOfMonth(date: Date | string = new Date()): Date {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0, 23, 59, 59, 999);
}

/**
 * Get days between two dates
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Number of days between dates
 */
export function getDaysBetween(startDate: Date | string, endDate: Date | string): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Get current date in ISO format (YYYY-MM-DD)
 * @returns Current date as ISO string
 */
export function getCurrentDateISO(): string {
  return new Date().toISOString().split('T')[0] ?? '';
}

// ============================================
// Month Key Utilities
// Format: "MM-YYYY" (e.g., "01-2026")
// ============================================

/**
 * Parse a month key (MM-YYYY) to start and end dates
 *
 * @param monthKey - Month key in MM-YYYY format (e.g., "01-2026")
 * @returns Object with start and end dates, or null if invalid
 *
 * @example
 * parseMonthKey("01-2026")
 * // { start: Date(2026-01-01), end: Date(2026-01-31) }
 */
export function parseMonthKey(monthKey: string): { start: Date; end: Date } | null {
  const match = monthKey.match(/^(\d{2})-(\d{4})$/);
  if (!match) return null;

  const month = parseInt(match[1], 10) - 1; // 0-indexed
  const year = parseInt(match[2], 10);

  if (month < 0 || month > 11 || isNaN(year)) return null;

  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0); // Last day of month

  return { start, end };
}

/**
 * Parse a month key to ISO date strings for API use
 *
 * @param monthKey - Month key in MM-YYYY format
 * @returns Object with startDate and endDate as YYYY-MM-DD strings, or null if invalid
 */
export function parseMonthKeyToISO(
  monthKey: string
): { startDate: string; endDate: string } | null {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return null;

  const formatDateISO = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  return {
    startDate: formatDateISO(parsed.start),
    endDate: formatDateISO(parsed.end),
  };
}

/**
 * Format a month key (MM-YYYY) to readable format (e.g., "January 2026")
 *
 * @param monthKey - Month key in MM-YYYY format
 * @param locale - Locale for formatting (default: 'en-US')
 * @returns Formatted month label or original key if invalid
 *
 * @example
 * formatMonthKey("01-2026") // "January 2026"
 */
export function formatMonthKey(monthKey: string, locale: string = 'en-US'): string {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return monthKey;

  return parsed.start.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

/**
 * Create a month key from a Date object
 *
 * @param date - Date object
 * @returns Month key in MM-YYYY format
 *
 * @example
 * createMonthKey(new Date(2026, 0, 15)) // "01-2026"
 */
export function createMonthKey(date: Date): string {
  return `${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
}

/**
 * Get the current month key
 *
 * @returns Current month key in MM-YYYY format
 */
export function getCurrentMonthKey(): string {
  return createMonthKey(new Date());
}

/**
 * Month data structure for available months selector
 */
export interface AvailableMonth {
  key: string; // MM-YYYY format
  label: string; // Human-readable format (e.g., "January 2026")
}

/**
 * Extract available months from an array of items with transaction_date field.
 *
 * Used to build month selector dropdowns for filtering transactions.
 * Returns unique months sorted chronologically (oldest first).
 *
 * @param items - Array of objects with transaction_date property
 * @param locale - Locale for formatting labels (default: 'en-US')
 * @returns Array of available months with keys and labels, sorted chronologically
 *
 * @example
 * const transactions = [
 *   { transaction_date: '2026-01-15' },
 *   { transaction_date: '2026-02-20' },
 *   { transaction_date: '2026-01-05' }
 * ];
 * extractAvailableMonths(transactions);
 * // [
 * //   { key: '01-2026', label: 'January 2026' },
 * //   { key: '02-2026', label: 'February 2026' }
 * // ]
 */
export function extractAvailableMonths<T extends { transaction_date: string | Date }>(
  items: T[],
  locale: string = 'en-US'
): AvailableMonth[] {
  const monthMap = new Map<string, string>();

  items.forEach((item) => {
    const date =
      item.transaction_date instanceof Date
        ? item.transaction_date
        : new Date(item.transaction_date);

    // Skip invalid dates
    if (isNaN(date.getTime())) return;

    const key = createMonthKey(date);
    if (!monthMap.has(key)) {
      monthMap.set(key, formatMonthKey(key, locale));
    }
  });

  // Sort chronologically (oldest first)
  const sortedKeys = Array.from(monthMap.keys()).sort((a, b) => {
    const [monthA, yearA] = a.split('-').map(Number);
    const [monthB, yearB] = b.split('-').map(Number);
    return yearA !== yearB ? yearA - yearB : monthA - monthB;
  });

  return sortedKeys.map((key) => ({
    key,
    label: monthMap.get(key) || key,
  }));
}
