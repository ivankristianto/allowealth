/**
 * Lucia Auth configuration
 *
 * Provides session-based authentication using Lucia with Drizzle ORM adapter.
 * Sessions are stored in HTTP-only, secure cookies for security.
 *
 * @see https://lucia-auth.com/
 */

import { Lucia, TimeSpan } from 'lucia';
import type { Adapter, DatabaseSession, DatabaseUser } from 'lucia';
import { DrizzleSQLiteAdapter } from '@lucia-auth/adapter-drizzle';
import { eq, lte } from 'drizzle-orm';
import { db, getDatabaseConfig } from '@/db/index';
import * as schema from '@/db/schema';

/**
 * Session expiration time
 * 30 days - sessions expire after 30 days of inactivity
 */
const SESSION_EXPIRATION = new TimeSpan(30, 'd');

/**
 * Custom PostgreSQL adapter for Cloudflare Workers
 *
 * Cloudflare Workers' Buffer.from() cannot serialize Date objects,
 * so we convert dates to ISO strings before passing to Drizzle.
 * This wrapper overrides setSession and updateSessionExpiration.
 */
class CloudflarePostgreSQLAdapter implements Adapter {
  private db: any;
  private sessionTable: any;
  private userTable: any;

  constructor(db: any, sessionTable: any, userTable: any) {
    this.db = db;
    this.sessionTable = sessionTable;
    this.userTable = userTable;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await this.db.delete(this.sessionTable).where(eq(this.sessionTable.id, sessionId));
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await this.db.delete(this.sessionTable).where(eq(this.sessionTable.userId, userId));
  }

  async getSessionAndUser(
    sessionId: string
  ): Promise<[session: DatabaseSession | null, user: DatabaseUser | null]> {
    const result = await this.db
      .select({
        user: this.userTable,
        session: this.sessionTable,
      })
      .from(this.sessionTable)
      .innerJoin(this.userTable, eq(this.sessionTable.userId, this.userTable.id))
      .where(eq(this.sessionTable.id, sessionId));

    if (result.length !== 1) return [null, null];

    const session = result[0].session;
    const user = result[0].user;

    return [
      {
        id: session.id,
        userId: session.userId,
        expiresAt: new Date(session.expiresAt),
        attributes: {},
      },
      {
        id: user.id,
        attributes: user,
      },
    ];
  }

  async getUserSessions(userId: string): Promise<DatabaseSession[]> {
    const result = await this.db
      .select()
      .from(this.sessionTable)
      .where(eq(this.sessionTable.userId, userId));

    return result.map((session: any) => ({
      id: session.id,
      userId: session.userId,
      expiresAt: new Date(session.expiresAt),
      attributes: {},
    }));
  }

  async setSession(session: DatabaseSession): Promise<void> {
    // Convert Date to ISO string for Cloudflare Workers compatibility
    await this.db.insert(this.sessionTable).values({
      id: session.id,
      userId: session.userId,
      expiresAt: session.expiresAt.toISOString(),
      ...session.attributes,
    });
  }

  async updateSessionExpiration(sessionId: string, expiresAt: Date): Promise<void> {
    // Convert Date to ISO string for Cloudflare Workers compatibility
    await this.db
      .update(this.sessionTable)
      .set({ expiresAt: expiresAt.toISOString() })
      .where(eq(this.sessionTable.id, sessionId));
  }

  async deleteExpiredSessions(): Promise<void> {
    // Use ISO string for date comparison
    await this.db
      .delete(this.sessionTable)
      .where(lte(this.sessionTable.expiresAt, new Date().toISOString()));
  }
}

/**
 * Create the appropriate Drizzle adapter based on database dialect
 *
 * Note: DrizzleSQLiteAdapter expects (db, sessionsTable, usersTable)
 * DrizzlePostgreSQLAdapter expects (db, sessionsTable, usersTable)
 * The sessions table must use camelCase property names (userId, expiresAt)
 * for proper adapter compatibility.
 *
 * For PostgreSQL on Cloudflare Workers, we use a custom adapter that
 * converts Date objects to ISO strings to work around Buffer.from() limitations.
 */
function createAdapter() {
  const config = getDatabaseConfig();

  if (config.dialect === 'postgresql') {
    // Use custom adapter for Cloudflare Workers compatibility
    return new CloudflarePostgreSQLAdapter(db as any, schema.sessions as any, schema.users);
  }

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
      secure: import.meta.env.MODE === 'production',

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
      role: databaseUser.role as 'admin' | 'member',
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
export type UserRole = 'admin' | 'member';

/**
 * User data structure (as returned by Lucia)
 */
export type User = {
  id: string;
  email: string;
  name: string;
  workspaceId: string;
  role: UserRole;
  deletedAt: Date | null;
};
