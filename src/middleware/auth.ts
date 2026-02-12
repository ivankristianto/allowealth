/**
 * Authentication Middleware
 *
 * Validates the session cookie and attaches user/session data to Astro.locals.
 * Uses an in-memory cache to avoid a database round-trip on every request.
 * On failure (expired, invalid, soft-deleted user) locals are set to null
 * so downstream middleware (routeGuard) can decide what to do.
 *
 * Also manages the `auth_hint` cookie — a non-httpOnly indicator that allows
 * client-side scripts on static pages to detect authentication state.
 */

import type { MiddlewareHandler } from 'astro';
import { auth, type User, type Session } from '@/lib/auth/lucia';
import { logError } from '@/lib/logger';
import { getCachedSession, cacheSession } from '@/lib/auth/session-cache';

/** Session cookie name set in lucia.ts configuration */
const SESSION_COOKIE_NAME = 'sid';

/** Non-httpOnly cookie for client-side auth detection on static pages */
const AUTH_HINT_COOKIE = 'auth_hint';
const AUTH_HINT_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

export const authentication: MiddlewareHandler = async (context, next) => {
  const perf = context.locals.perf;
  const authStart = performance.now();

  const sessionId = context.cookies.get(SESSION_COOKIE_NAME)?.value;

  // Auth API endpoints manage auth_hint themselves via raw Set-Cookie headers.
  // Using context.cookies here would conflict (Astro applies context.cookies
  // operations AFTER response headers, so a delete here would override login.ts's set).
  const isAuthApi = context.url.pathname.startsWith('/api/auth/');

  if (!sessionId) {
    context.locals.user = null;
    context.locals.session = null;
    // Clear stale auth_hint if session cookie is gone (e.g. browser expired it)
    if (!isAuthApi && context.cookies.get(AUTH_HINT_COOKIE)?.value) {
      context.cookies.delete(AUTH_HINT_COOKIE, { path: '/' });
    }
    perf?.recordPhase('mw.auth', performance.now() - authStart);
    return next();
  }

  try {
    const result = await validateSession(sessionId, context.locals);

    if (!result.user || (result.user.deletedAt !== null && result.user.deletedAt !== undefined)) {
      context.locals.user = null;
      context.locals.session = null;
      // Had a session cookie but validation failed — clear stale auth_hint
      if (!isAuthApi) {
        context.cookies.delete(AUTH_HINT_COOKIE, { path: '/' });
      }
    } else {
      context.locals.session = result.session;
      context.locals.user = result.user;

      // Set auth_hint for client-side detection on static pages
      if (!isAuthApi) {
        context.cookies.set(AUTH_HINT_COOKIE, '1', {
          path: '/',
          httpOnly: false,
          secure: import.meta.env.PROD,
          sameSite: 'lax',
          maxAge: AUTH_HINT_MAX_AGE,
        });
      }
    }
  } catch (error) {
    logError('Session validation error', error);
    context.locals.user = null;
    context.locals.session = null;
    // Validation threw — clear stale auth_hint
    if (!isAuthApi) {
      context.cookies.delete(AUTH_HINT_COOKIE, { path: '/' });
    }
  }

  perf?.recordPhase('mw.auth', performance.now() - authStart);
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
