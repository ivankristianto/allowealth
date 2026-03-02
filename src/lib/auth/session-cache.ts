/**
 * Session Cache
 *
 * Caches session validation results to reduce database round-trips.
 * Uses the cache abstraction layer for vendor-agnostic storage.
 */

import type { User, Session } from './lucia';
import type { PerfCollector } from '@/lib/perf';
import { getCacheManager, CacheKeys, CacheTags } from '@/lib/cache';

// Cache TTL in seconds (15 minutes — reduced cache miss frequency on Workers)
const SESSION_CACHE_TTL = 15 * 60;

interface CachedSessionData {
  session: Session;
  user: User;
}

/**
 * Get a cached session if it exists and hasn't expired
 */
export async function getCachedSession(
  sessionId: string,
  perf?: PerfCollector
): Promise<{ session: Session; user: User } | null> {
  const cache = getCacheManager();
  const cacheKey = CacheKeys.session(sessionId);

  const cached = await cache.get<CachedSessionData>(cacheKey, perf);
  if (!cached) {
    return null;
  }

  // Check if session itself has expired
  const expiresAt = new Date(cached.session.expiresAt);
  if (expiresAt < new Date()) {
    await cache.delete(cacheKey);
    return null;
  }

  return cached;
}

/**
 * Cache a validated session
 */
export async function cacheSession(sessionId: string, session: Session, user: User): Promise<void> {
  const cache = getCacheManager();
  const cacheKey = CacheKeys.session(sessionId);

  await cache.set<CachedSessionData>(
    cacheKey,
    { session, user },
    {
      ttl: SESSION_CACHE_TTL,
      tags: [CacheTags.session(sessionId), CacheTags.user(user.id), CacheTags.SESSION],
    }
  );
}

/**
 * Invalidate a cached session (call on logout or session update)
 */
export async function invalidateSession(sessionId: string): Promise<void> {
  const cache = getCacheManager();
  await cache.invalidateByTags([CacheTags.session(sessionId)]);
}

/**
 * Invalidate all sessions for a user (call on password change, etc.)
 */
export async function invalidateUserSessions(userId: string): Promise<void> {
  const cache = getCacheManager();
  await cache.invalidateByTags([CacheTags.user(userId), CacheTags.SESSION]);
}

/**
 * Clear the entire session cache
 * @deprecated Use invalidateByTags for targeted invalidation
 */
export async function clearSessionCache(): Promise<void> {
  const cache = getCacheManager();
  await cache.invalidateByTags([CacheTags.SESSION]);
}
