/**
 * Lucia Auth configuration
 *
 * Provides session-based authentication using Lucia with Drizzle ORM adapter.
 * Sessions are stored in HTTP-only, secure cookies for security.
 *
 * @see https://lucia-auth.com/
 */

import { Lucia, TimeSpan } from 'lucia';
import { DrizzleSQLiteAdapter } from '@lucia-auth/adapter-drizzle';
import { db } from '@/db/index';
import * as schema from '@/db/schema';

/**
 * Session expiration time
 * 30 days - sessions expire after 30 days of inactivity
 */
const SESSION_EXPIRATION = new TimeSpan(30, 'd');

/**
 * Lucia auth instance
 *
 * Configured with:
 * - Drizzle adapter for SQLite database
 * - HTTP-only cookies to prevent XSS attacks
 * - Secure cookies (HTTPS-only in production)
 * - SameSite lax to prevent CSRF attacks
 * - 30-day session expiration
 *
 * Note: DrizzleSQLiteAdapter expects (db, sessionsTable, usersTable)
 * The sessions table must use camelCase property names (userId, expiresAt)
 * for proper adapter compatibility.
 */
const adapter = new DrizzleSQLiteAdapter(db, schema.sessions as any, schema.users);

export const auth = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      // HTTP-only: prevents JavaScript access to the cookie (XSS protection)
      // Note: httpOnly is handled by Lucia internally

      // Secure: only send cookie over HTTPS (disabled in development)
      secure: process.env.NODE_ENV === 'production',

      // SameSite: helps prevent CSRF attacks
      sameSite: 'lax',
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
 * User data structure (as returned by Lucia)
 */
export type User = {
  id: string;
  email: string;
  name: string;
};
