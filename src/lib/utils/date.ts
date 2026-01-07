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
