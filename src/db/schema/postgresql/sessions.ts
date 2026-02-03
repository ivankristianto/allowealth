import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Sessions table
 *
 * Stores user sessions for authentication.
 *
 * IMPORTANT: Column names use camelCase for proper Lucia Drizzle adapter compatibility.
 * The adapter expects properties: userId, expiresAt (not user_id, expires_at).
 *
 * Note: PostgreSQL uses native timestamp type for Lucia PostgreSQL adapter compatibility.
 * SQLite uses integer (Unix timestamp) for its adapter.
 *
 * @see https://lucia-auth.com/adapters/drizzle
 */
export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Use mode: 'string' for Cloudflare Workers compatibility
    // Date objects can't be serialized by Workers' Buffer.from()
    // Our custom Lucia adapter handles Date <-> string conversion
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
  },
  (table) => [index('sessions_expires_at_idx').on(table.expiresAt)]
);
