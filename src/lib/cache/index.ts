/**
 * Cache Module
 *
 * Vendor-agnostic caching layer with support for:
 * - Upstash Redis (production, Cloudflare Workers compatible)
 * - In-memory cache (development)
 * - No-op driver (disabled caching)
 *
 * Usage:
 * ```typescript
 * import { getCacheManager, CacheKeys, CacheTags } from '@/lib/cache';
 *
 * const cache = getCacheManager();
 * const key = CacheKeys.budget(workspaceId, year, month, currency);
 *
 * // Try cache first
 * const cached = await cache.get<BudgetData>(key);
 * if (cached) return cached;
 *
 * // Fetch from DB and cache
 * const data = await fetchFromDb();
 * await cache.set(key, data, {
 *   ttl: 3600,
 *   tags: [CacheTags.workspace(workspaceId), CacheTags.BUDGET],
 * });
 *
 * // Invalidate on mutation
 * await cache.invalidateByTags([CacheTags.workspace(workspaceId), CacheTags.BUDGET]);
 * ```
 */

// Core exports
export { CacheManager, getCacheManager, resetCacheManager } from './cache-manager';
export { CacheKeys, hashFilters } from './keys';
export { CacheTags } from './tags';

// Type exports
export type { CacheDriver, CacheSetOptions, CacheConfig } from './types';
export { DEFAULT_CACHE_CONFIG } from './types';

// Driver exports (for testing/custom usage)
export { MemoryDriver } from './drivers/memory';
export { NoopDriver } from './drivers/noop';
export { UpstashDriver } from './drivers/upstash';
