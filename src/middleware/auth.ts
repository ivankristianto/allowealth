/**
 * Authentication Middleware
 *
 * Validates the session cookie and attaches user/session data to Astro.locals.
 * Uses an in-memory cache to avoid a database round-trip on every request.
 * On failure (expired, invalid, soft-deleted user) locals are set to null
 * so downstream middleware (routeGuard) can decide what to do. Members of an
 * archived workspace are turned away here: 403 on the API, login on pages.
 *
 * Also manages the `auth_hint` cookie — a non-httpOnly indicator that allows
 * client-side scripts on static pages to detect authentication state.
 */

import type { MiddlewareHandler } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { users, workspaces } from '@/db/schema';
import { auth, AUTH_PATH_PREFIX, getSessionCookieName } from '@/lib/auth/server';
import type { AuthSession, AuthUser, BetterAuthUser } from '@/lib/auth/types';
import { logError } from '@/lib/logger';

/** Non-httpOnly cookie for client-side auth detection on static pages */
const AUTH_HINT_COOKIE = 'auth_hint';
const AUTH_HINT_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds
const WORKSPACE_INACTIVE_REDIRECT = '/login?error=workspace_inactive';

export const authentication: MiddlewareHandler = async (context, next) => {
  const perf = context.locals.perf;
  const authStart = performance.now();

  if (context.isPrerendered) {
    context.locals.user = null;
    context.locals.session = null;
    perf?.recordPhase('mw.auth', performance.now() - authStart);
    return next();
  }

  const sessionCookieName = getSessionCookieName();
  const sessionCookie = context.cookies.get(sessionCookieName)?.value;

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
      clearAuthenticatedLocals(context, isAuthApi, sessionCookieName);
    } else {
      const hydrated = await hydrateUser(result.user as BetterAuthUser);
      const hydratedUser = hydrated?.user;

      if (!hydratedUser || hydratedUser.deletedAt) {
        clearAuthenticatedLocals(context, isAuthApi, sessionCookieName);
      } else if (hydrated.workspaceInactive && hydratedUser.role !== 'super_admin') {
        clearAuthenticatedLocals(context, isAuthApi, sessionCookieName);
        // Better Auth routes enforce this themselves and must still allow sign-out.
        if (!isAuthApi) {
          perf?.recordPhase('mw.auth', performance.now() - authStart);
          return rejectInactiveWorkspace(context);
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
    clearAuthenticatedLocals(context, isAuthApi, sessionCookieName);
  }

  perf?.recordPhase('mw.auth', performance.now() - authStart);
  return next();
};

function clearAuthenticatedLocals(
  context: Parameters<MiddlewareHandler>[0],
  isAuthApi: boolean,
  sessionCookieName: string
): void {
  context.locals.user = null;
  context.locals.session = null;

  if (!isAuthApi) {
    context.cookies.delete(AUTH_HINT_COOKIE, { path: '/' });
    context.cookies.delete(sessionCookieName, { path: '/' });
  }
}

function rejectInactiveWorkspace(context: Parameters<MiddlewareHandler>[0]): Response {
  if (context.url.pathname.startsWith('/api/')) {
    return new Response(
      JSON.stringify({
        success: false,
        error: { message: 'This workspace has been archived', code: 'WORKSPACE_INACTIVE' },
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return context.redirect(WORKSPACE_INACTIVE_REDIRECT, 302);
}

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

interface HydratedUser {
  user: AuthUser;
  workspaceInactive: boolean;
}

async function hydrateUser(authUser: BetterAuthUser): Promise<HydratedUser | null> {
  // One query per request: the workspace status rides along with the user row.
  const [row] = await db
    .select({ user: users, workspaceStatus: workspaces.status })
    .from(users)
    .leftJoin(workspaces, eq(workspaces.id, users.workspace_id))
    .where(eq(users.id, authUser.id))
    .limit(1);

  if (!row) {
    return null;
  }

  const domainUser = row.user;
  const user: AuthUser = {
    id: domainUser.id,
    email: domainUser.email ?? authUser.email,
    name: domainUser.name ?? authUser.name,
    role: domainUser.role,
    workspaceId: domainUser.workspace_id ?? null,
    avatarUrl: domainUser.avatar_url ?? authUser.image ?? null,
    deletedAt: domainUser.deleted_at ?? null,
  };

  return {
    user,
    workspaceInactive: domainUser.workspace_id != null && row.workspaceStatus !== 'active',
  };
}
