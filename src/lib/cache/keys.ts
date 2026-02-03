/**
 * Cache Key Builders
 *
 * Standardized cache key patterns for consistent naming.
 * All keys are prefixed with 'cache:' for easy identification.
 */

import { createHash } from 'node:crypto';

/** Cache key prefix */
const PREFIX = 'cache';

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

  /** User settings: cache:settings:{userId} */
  settings: (userId: string): string => `${PREFIX}:settings:${userId}`,

  /** Session: cache:session:{sessionId} */
  session: (sessionId: string): string => `${PREFIX}:session:${sessionId}`,

  /** Layout data (categories, assets, settings): cache:layout:{workspaceId}:{userId} */
  layout: (workspaceId: string, userId: string): string =>
    `${PREFIX}:layout:${workspaceId}:${userId}`,
} as const;

/**
 * Hash filter object to create stable cache key
 */
export function hashFilters(filters: Record<string, unknown>): string {
  const cleaned: Record<string, unknown> = {};
  for (const key of Object.keys(filters).sort()) {
    if (filters[key] !== undefined) {
      cleaned[key] = filters[key];
    }
  }
  const json = JSON.stringify(cleaned);
  return createHash('md5').update(json).digest('hex').slice(0, 8);
}
