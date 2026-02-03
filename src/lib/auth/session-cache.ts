/**
 * Session Cache
 *
 * In-memory cache for session validation to reduce database round-trips.
 * Sessions are valid for 30 days, so we cache for a shorter duration (5 minutes)
 * to balance performance with security.
 *
 * This is especially important when database latency is high (e.g., 400ms RTT).
 *
 * Note: This cache is per-process, so in clustered environments each process
 * will have its own cache. For distributed caching, use Redis or similar.
 */

import type { User, Session } from './lucia';

interface CachedSession {
  session: Session;
  user: User;
  cachedAt: number;
}

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL_MS = 5 * 60 * 1000;

// Maximum cache size to prevent memory bloat
const MAX_CACHE_SIZE = 1000;

// Session cache map
const sessionCache = new Map<string, CachedSession>();

/**
 * Get a cached session if it exists and hasn't expired
 */
export function getCachedSession(sessionId: string): { session: Session; user: User } | null {
  const cached = sessionCache.get(sessionId);

  if (!cached) {
    return null;
  }

  // Check if cache entry has expired
  const age = Date.now() - cached.cachedAt;
  if (age > CACHE_TTL_MS) {
    sessionCache.delete(sessionId);
    return null;
  }

  // Check if session itself has expired
  if (cached.session.expiresAt < new Date()) {
    sessionCache.delete(sessionId);
    return null;
  }

  return { session: cached.session, user: cached.user };
}

/**
 * Cache a validated session
 */
export function cacheSession(sessionId: string, session: Session, user: User): void {
  // Enforce max cache size (LRU-like: delete oldest if at capacity)
  if (sessionCache.size >= MAX_CACHE_SIZE) {
    // Delete the oldest entry (first in map)
    const firstKey = sessionCache.keys().next().value;
    if (firstKey) {
      sessionCache.delete(firstKey);
    }
  }

  sessionCache.set(sessionId, {
    session,
    user,
    cachedAt: Date.now(),
  });
}

/**
 * Invalidate a cached session (call on logout or session update)
 */
export function invalidateSession(sessionId: string): void {
  sessionCache.delete(sessionId);
}

/**
 * Invalidate all sessions for a user (call on password change, etc.)
 */
export function invalidateUserSessions(userId: string): void {
  for (const [sessionId, cached] of sessionCache.entries()) {
    if (cached.user.id === userId) {
      sessionCache.delete(sessionId);
    }
  }
}

/**
 * Clear the entire session cache
 */
export function clearSessionCache(): void {
  sessionCache.clear();
}

/**
 * Get cache statistics for monitoring
 */
export function getSessionCacheStats(): {
  size: number;
  maxSize: number;
  ttlMs: number;
} {
  return {
    size: sessionCache.size,
    maxSize: MAX_CACHE_SIZE,
    ttlMs: CACHE_TTL_MS,
  };
}
