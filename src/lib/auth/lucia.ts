/**
 * Lucia Auth configuration
 *
 * Provides session-based authentication using Lucia with Drizzle ORM adapter.
 * Sessions are stored in HTTP-only, secure cookies for security.
 *
 * @see https://lucia-auth.com/
 */

import { DrizzleSQLiteAdapter } from '@lucia-auth/adapter-drizzle';
import { Lucia, TimeSpan } from 'lucia';
import { db } from '@/db/index';
import * as schema from '@/db/schema';
import { getEnv } from '@/lib/env';

/**
 * Session expiration time
 * 30 days - sessions expire after 30 days of inactivity
 */
const SESSION_EXPIRATION = new TimeSpan(30, 'd');

/**
 * Create the Drizzle adapter.
 *
 * The sessions table must use camelCase property names (userId, expiresAt)
 * for proper adapter compatibility.
 */
function createAdapter() {
  return new DrizzleSQLiteAdapter(db, schema.sessions as any, schema.users);
}

const adapter = createAdapter();

export const auth = new Lucia(adapter, {
  sessionCookie: {
    // Explicitly set cookie name to match middleware's SESSION_COOKIE_NAME
    // This ensures the cookie created during login is found by the middleware
    // See: src/middleware.ts line 29
    name: 'sid',

    // HTTP-only: prevents JavaScript access to the cookie (XSS protection)
    // Lucia automatically sets httpOnly=true for all session cookies - this cannot be disabled
    // See: https://lucia-auth.com/reference/main/lucia/#sessioncookie
    // This is a critical security feature that protects against XSS attacks by preventing
    // JavaScript from accessing the session cookie via document.cookie
    attributes: {
      // Secure: only send cookie over HTTPS (disabled in development for local testing)
      // In production, this prevents cookies from being sent over unencrypted HTTP connections
      // Note: Use runtime check via getEnv() instead of import.meta.env.MODE which is
      // evaluated at build time and would always be 'production' in built output
      secure: getEnv('NODE_ENV') === 'production',

      // SameSite: helps prevent CSRF attacks
      // - 'lax': allows cookies to be sent with top-level navigations (safe for most use cases)
      // - 'strict': would block cookies on all cross-site requests (too restrictive for redirects)
      // - 'none': allows cookies on all requests (requires secure=true, not recommended)
      // We use 'lax' as it provides good CSRF protection while allowing legitimate navigation
      sameSite: 'lax',

      // Path: restrict cookie to specific path (default: '/')
      // We use default to make session available app-wide
      // path: '/',

      // Domain: restrict cookie to specific domain (default: current domain)
      // We use default to allow subdomain sharing if needed
      // domain: undefined,

      // MaxAge: cookie expiration in seconds (handled by sessionExpiresIn)
      // Priority: priority of the cookie (not set, uses browser default)
    },
  },

  // Session expiration time (30 days)
  sessionExpiresIn: SESSION_EXPIRATION,

  getSessionAttributes: () => ({}),
  getUserAttributes: (databaseUser: any) => {
    return {
      id: databaseUser.id,
      email: databaseUser.email,
      name: databaseUser.name,
      workspaceId: databaseUser.workspace_id,
      role: databaseUser.role as 'admin' | 'member' | 'super_admin',
      avatarUrl: databaseUser.avatar_url,
      deletedAt: databaseUser.deleted_at,
    };
  },
});

/**
 * Type exports for TypeScript
 */
export type Auth = typeof auth;

/**
 * Session data structure
 */
export type Session = {
  id: string;
  userId: string;
  expiresAt: Date;
  fresh: boolean;
};

/**
 * User role in a workspace
 */
export type UserRole = 'admin' | 'member' | 'super_admin';

/**
 * User data structure (as returned by Lucia)
 */
export type User = {
  id: string;
  email: string;
  name: string;
  workspaceId: string | null;
  role: UserRole;
  avatarUrl: string | null;
  deletedAt: Date | null;
};
