import { pgTable, text, integer, index } from 'drizzle-orm/pg-core';
import { users } from './users';

/**
 * Sessions table
 *
 * Stores user sessions for authentication.
 *
 * IMPORTANT: Column names use camelCase for proper Lucia Drizzle adapter compatibility.
 * The adapter expects properties: userId, expiresAt (not user_id, expires_at).
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
    // Unix timestamp in milliseconds (for Lucia adapter compatibility)
    // P2: TODO - Consider using timestamp type with conversion layer for native PostgreSQL support
    expiresAt: integer('expires_at').notNull(),
  },
  (table) => [index('sessions_expires_at_idx').on(table.expiresAt)]
);
