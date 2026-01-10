/**
 * Astro Middleware
 *
 * Validates session cookies on every request and attaches user data to Astro.locals.
 * This middleware runs on every request to provide authentication context to pages.
 *
 * @see https://docs.astro.build/en/reference/middleware-reference/
 */

import type { MiddlewareHandler } from 'astro';
import { auth } from './lib/auth/lucia';
import type { User, Session } from 'lucia';

/**
 * Extend Astro.locals to include user and session
 */
declare module 'astro' {
  interface Locals {
    user?: User | null;
    session?: Session | null;
  }
}

/**
 * Session cookie name used by Lucia Auth
 * Note: Lucia uses 'sid' as the default session cookie name when using
 * sessionCookie configuration. This is set in the lucia.ts configuration.
 */
const SESSION_COOKIE_NAME = 'sid';

export const onRequest: MiddlewareHandler = async (context, next) => {
  const sessionId = context.cookies.get(SESSION_COOKIE_NAME)?.value;

  // No session cookie - user is not authenticated
  if (!sessionId) {
    (context.locals as any).user = null;
    (context.locals as any).session = null;
    return next();
  }

  try {
    // Validate session using Lucia
    const { session, user } = await auth.validateSession(sessionId);

    // Session is valid - attach user and session to locals
    (context.locals as any).session = session;
    (context.locals as any).user = user;

    // If session is not fresh (close to expiry), consider refreshing it
    // This is optional and depends on your security requirements
    if (session && session.fresh) {
      // Session is fresh - could set a new cookie if needed
      // For now, we'll just continue
    }

    return next();
  } catch (error) {
    // Session validation failed - clear user data
    console.error('Session validation error:', error);
    (context.locals as any).user = null;
    (context.locals as any).session = null;
    return next();
  }
};
