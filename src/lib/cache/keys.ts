/**
 * Cache Key Builders
 *
 * Standardized cache key patterns for consistent naming.
 * All keys are prefixed with 'cache:' for easy identification.
 */

/** Cache key prefix */
const PREFIX = 'cache';

/**
 * Simple hash function (djb2 variant) for cross-runtime compatibility.
 * Works in Node.js, Bun, and Cloudflare Workers without native crypto.
 */
export function simpleHash(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  // Convert to unsigned 32-bit integer and then to hex
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Build cache keys for different data types
 */
export const CacheKeys = {
  /** Budget overview: cache:budget:{workspaceId}:{year}:{month}:{currency} */
  budget: (workspaceId: string, year: number, month: number, currency: string): string =>
    `${PREFIX}:budget:${workspaceId}:${year}:${month}:${currency}`,

  /** Dashboard data: cache:dashboard:{workspaceId}:{year}:{month}:{currency} */
  dashboard: (workspaceId: string, year: number, month: number, currency: string): string =>
    `${PREFIX}:dashboard:${workspaceId}:${year}:${month}:${currency}`,

  /** Transaction list: cache:transactions:{workspaceId}:{filtersHash} */
  transactions: (workspaceId: string, filtersHash: string): string =>
    `${PREFIX}:transactions:${workspaceId}:${filtersHash}`,

  /** Recurring templates list: cache:recurring:{workspaceId}:{filtersHash} */
  recurring: (workspaceId: string, filtersHash: string): string =>
    `${PREFIX}:recurring:${workspaceId}:${filtersHash}`,

  /** Recurring stats: cache:recurring-stats:{workspaceId} */
  recurringStats: (workspaceId: string): string => `${PREFIX}:recurring-stats:${workspaceId}`,

  /** Recurring occurrences list: cache:recurring-occurrences:{workspaceId}:{filtersHash} */
  recurringOccurrences: (workspaceId: string, filtersHash: string): string =>
    `${PREFIX}:recurring-occurrences:${workspaceId}:${filtersHash}`,

  /** Recurring calendar: cache:recurring-calendar:{workspaceId}:{year}:{month} */
  recurringCalendar: (workspaceId: string, year: number, month: number): string =>
    `${PREFIX}:recurring-calendar:${workspaceId}:${year}:${month}`,

  /** User settings: cache:settings:{userId} */
  settings: (userId: string): string => `${PREFIX}:settings:${userId}`,

  /** Session: cache:session:{sessionId} */
  session: (sessionId: string): string => `${PREFIX}:session:${sessionId}`,

  /** Layout data (categories, accounts, settings): cache:layout:{workspaceId}:{userId} */
  layout: (workspaceId: string, userId: string): string =>
    `${PREFIX}:layout:${workspaceId}:${userId}`,

  /** API key auth context: cache:apikey:{keyHash} */
  apiKey: (keyHash: string): string => `${PREFIX}:apikey:${keyHash}`,

  /** All accounts: cache:accounts:{workspaceId}:{filtersHash} */
  accounts: (workspaceId: string, filtersHash: string): string =>
    `${PREFIX}:accounts:${workspaceId}:${filtersHash}`,

  /** All categories: cache:categories:{workspaceId}:{filtersHash} */
  categories: (workspaceId: string, filtersHash: string): string =>
    `${PREFIX}:categories:${workspaceId}:${filtersHash}`,

  /** All account categories: cache:account-categories:{workspaceId}:{filtersHash} */
  accountCategories: (workspaceId: string, filtersHash: string): string =>
    `${PREFIX}:account-categories:${workspaceId}:${filtersHash}`,
} as const;

/**
 * Hash filter object to create stable cache key.
 * Uses a simple hash function for cross-runtime compatibility
 * (works in Node.js, Bun, and Cloudflare Workers).
 */
export function hashFilters(filters: Record<string, unknown>): string {
  const cleaned: Record<string, unknown> = {};
  for (const key of Object.keys(filters).sort()) {
    if (filters[key] !== undefined) {
      cleaned[key] = filters[key];
    }
  }
  const json = JSON.stringify(cleaned);
  return simpleHash(json);
}
