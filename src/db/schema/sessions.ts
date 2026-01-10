import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
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
export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => ({
    expiresAtIdx: index('sessions_expires_at_idx').on(table.expiresAt),
  })
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));
