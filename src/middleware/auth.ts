/**
 * Authentication Middleware
 *
 * Validates the session cookie and attaches user/session data to Astro.locals.
 * Uses an in-memory cache to avoid a database round-trip on every request.
 * On failure (expired, invalid, soft-deleted user) locals are set to null
 * so downstream middleware (routeGuard) can decide what to do.
 */

import type { MiddlewareHandler } from 'astro';
import { auth, type User, type Session } from '@/lib/auth/lucia';
import { logError } from '@/lib/utils/error-logger';
import { getCachedSession, cacheSession } from '@/lib/auth/session-cache';

/** Session cookie name set in lucia.ts configuration */
const SESSION_COOKIE_NAME = 'sid';

export const authentication: MiddlewareHandler = async (context, next) => {
  const sessionId = context.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionId) {
    context.locals.user = null;
    context.locals.session = null;
    return next();
  }

  try {
    const result = await validateSession(sessionId, context.locals);

    if (!result.user || (result.user.deletedAt !== null && result.user.deletedAt !== undefined)) {
      context.locals.user = null;
      context.locals.session = null;
      return next();
    }

    context.locals.session = result.session;
    context.locals.user = result.user;
  } catch (error) {
    logError('Session validation error', error);
    context.locals.user = null;
    context.locals.session = null;
  }

  return next();
};

/** Resolve session from cache or database, recording timings when PERF_DEBUG is on */
async function validateSession(
  sessionId: string,
  locals: App.Locals
): Promise<{ session: Session | null; user: User | null }> {
  const timings = locals.serverTimings;
  const authStart = performance.now();

  // Try cache first
  const cached = await getCachedSession(sessionId, locals.perf);

  if (cached) {
    if (timings) timings['auth.cacheHit'] = performance.now() - authStart;
    if (timings) timings['auth.validateSession'] = performance.now() - authStart;
    if (timings) timings['auth.source'] = 1;
    return cached;
  }

  // Cache miss — validate with database
  const dbStart = performance.now();
  const result = await auth.validateSession(sessionId);
  const session = result.session;
  const user = result.user as User | null;

  if (timings) timings['auth.dbValidate'] = performance.now() - dbStart;
  if (timings) timings['auth.validateSession'] = performance.now() - authStart;
  if (timings) timings['auth.source'] = 0;

  // Populate cache for future requests
  if (session && user) {
    await cacheSession(sessionId, session, user);
  }

  return { session, user };
}
