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
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users } from '@/db/schema';
import { isAppOnly } from '@/lib/auth/app-mode';
import { auth, AUTH_PATH_PREFIX, AUTH_SESSION_COOKIE_NAME } from '@/lib/auth/server';
import type { AuthSession, AuthUser, BetterAuthUser } from '@/lib/auth/types';
import { logError } from '@/lib/logger';

/** Non-httpOnly cookie for client-side auth detection on static pages */
const AUTH_HINT_COOKIE = 'auth_hint';
const AUTH_HINT_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds
const PUBLIC_STATIC_PATHS = new Set(['/', '/privacy', '/terms']);

export const authentication: MiddlewareHandler = async (context, next) => {
  const perf = context.locals.perf;
  const authStart = performance.now();
  const isPublicStaticPath = PUBLIC_STATIC_PATHS.has(context.url.pathname);

  if (context.isPrerendered || (isPublicStaticPath && !isAppOnly())) {
    context.locals.user = null;
    context.locals.session = null;
    perf?.recordPhase('mw.auth', performance.now() - authStart);
    return next();
  }

  const sessionCookie = context.cookies.get(AUTH_SESSION_COOKIE_NAME)?.value;

  const isAuthApi = context.url.pathname.startsWith(AUTH_PATH_PREFIX);

  if (!sessionCookie) {
    context.locals.user = null;
    context.locals.session = null;
    if (!isAuthApi && context.cookies.get(AUTH_HINT_COOKIE)?.value) {
      context.cookies.delete(AUTH_HINT_COOKIE, { path: '/' });
    }
    perf?.recordPhase('mw.auth', performance.now() - authStart);
    return next();
  }

  try {
    const result = await auth.api.getSession({
      headers: context.request.headers,
    });

    if (!result?.session || !result.user) {
      context.locals.user = null;
      context.locals.session = null;
      if (!isAuthApi) {
        context.cookies.delete(AUTH_HINT_COOKIE, { path: '/' });
      }
    } else {
      const hydratedUser = await hydrateUser(result.user as BetterAuthUser);

      if (!hydratedUser || hydratedUser.deletedAt) {
        context.locals.user = null;
        context.locals.session = null;

        if (!isAuthApi) {
          context.cookies.delete(AUTH_HINT_COOKIE, { path: '/' });
        }
      } else {
        context.locals.session = mapSession(result.session);
        context.locals.user = hydratedUser;

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

function mapSession(session: Record<string, unknown>): AuthSession {
  return {
    id: String(session.id),
    userId: String(session.userId),
    token: String(session.token),
    expiresAt: new Date(session.expiresAt as string | number | Date),
    createdAt: new Date(session.createdAt as string | number | Date),
    updatedAt: new Date(session.updatedAt as string | number | Date),
    ipAddress: typeof session.ipAddress === 'string' ? session.ipAddress : null,
    userAgent: typeof session.userAgent === 'string' ? session.userAgent : null,
  };
}

async function hydrateUser(authUser: BetterAuthUser): Promise<AuthUser | null> {
  const domainUser = await db.query.users.findFirst({
    where: eq(users.id, authUser.id),
  });

  if (!domainUser) {
    return null;
  }

  return {
    id: domainUser.id,
    email: domainUser.email ?? authUser.email,
    name: domainUser.name ?? authUser.name,
    role: domainUser.role,
    workspaceId: domainUser.workspace_id ?? null,
    avatarUrl: domainUser.avatar_url ?? authUser.image ?? null,
    deletedAt: domainUser.deleted_at ?? null,
  };
}
