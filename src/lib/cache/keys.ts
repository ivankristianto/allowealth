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

  /** User settings: cache:settings:{userId} */
  settings: (userId: string): string => `${PREFIX}:settings:${userId}`,

  /** Session: cache:session:{sessionId} */
  session: (sessionId: string): string => `${PREFIX}:session:${sessionId}`,

  /** Layout data (categories, assets, settings): cache:layout:{workspaceId}:{userId} */
  layout: (workspaceId: string, userId: string): string =>
    `${PREFIX}:layout:${workspaceId}:${userId}`,

  /** API key auth context: cache:apikey:{keyHash} */
  apiKey: (keyHash: string): string => `${PREFIX}:apikey:${keyHash}`,

  /** All assets: cache:assets:{workspaceId}:{filtersHash} */
  assets: (workspaceId: string, filtersHash: string): string =>
    `${PREFIX}:assets:${workspaceId}:${filtersHash}`,
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
