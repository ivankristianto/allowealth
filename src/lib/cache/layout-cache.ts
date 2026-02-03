/**
 * Layout Data Cache
 *
 * Caches frequently-accessed layout data (categories, assets, user settings)
 * to reduce database round-trips on every page load.
 *
 * Cache is scoped per user/workspace to ensure data isolation.
 * TTL is short (1 minute) to balance freshness with performance.
 */

import type { UserSettings } from '@/lib/constants/user-meta-keys';

interface LayoutData {
  categories: Array<{ id: string; name: string; type: string; currency?: string }>;
  assets: Array<{ id: string; name: string; type: string }>;
  userSettings: UserSettings;
}

interface CachedLayoutData {
  data: LayoutData;
  cachedAt: number;
}

// Cache TTL in milliseconds (1 minute)
const CACHE_TTL_MS = 60 * 1000;

// Maximum cache entries
const MAX_CACHE_SIZE = 100;

// Layout cache map keyed by `${workspaceId}:${userId}`
const layoutCache = new Map<string, CachedLayoutData>();

/**
 * Generate cache key from workspace and user IDs
 */
function getCacheKey(workspaceId: string, userId: string): string {
  return `${workspaceId}:${userId}`;
}

/**
 * Get cached layout data if available and not expired
 */
export function getCachedLayoutData(workspaceId: string, userId: string): LayoutData | null {
  const key = getCacheKey(workspaceId, userId);
  const cached = layoutCache.get(key);

  if (!cached) {
    return null;
  }

  // Check if expired
  const age = Date.now() - cached.cachedAt;
  if (age > CACHE_TTL_MS) {
    layoutCache.delete(key);
    return null;
  }

  return cached.data;
}

/**
 * Cache layout data
 */
export function cacheLayoutData(workspaceId: string, userId: string, data: LayoutData): void {
  const key = getCacheKey(workspaceId, userId);

  // Enforce max size
  if (layoutCache.size >= MAX_CACHE_SIZE) {
    const firstKey = layoutCache.keys().next().value;
    if (firstKey) {
      layoutCache.delete(firstKey);
    }
  }

  layoutCache.set(key, {
    data,
    cachedAt: Date.now(),
  });
}

/**
 * Invalidate layout cache for a workspace (call when categories/assets change)
 */
export function invalidateWorkspaceLayoutCache(workspaceId: string): void {
  for (const key of layoutCache.keys()) {
    if (key.startsWith(`${workspaceId}:`)) {
      layoutCache.delete(key);
    }
  }
}

/**
 * Invalidate layout cache for a user (call when user settings change)
 */
export function invalidateUserLayoutCache(userId: string): void {
  for (const key of layoutCache.keys()) {
    if (key.endsWith(`:${userId}`)) {
      layoutCache.delete(key);
    }
  }
}

/**
 * Clear entire layout cache
 */
export function clearLayoutCache(): void {
  layoutCache.clear();
}

/**
 * Get cache statistics
 */
export function getLayoutCacheStats(): {
  size: number;
  maxSize: number;
  ttlMs: number;
} {
  return {
    size: layoutCache.size,
    maxSize: MAX_CACHE_SIZE,
    ttlMs: CACHE_TTL_MS,
  };
}
