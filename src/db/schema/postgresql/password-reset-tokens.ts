import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { users } from './users';

/**
 * Password Reset Tokens Table
 *
 * Stores secure tokens for password reset functionality.
 * Tokens expire after 1 hour for security.
 */
export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: text('id').primaryKey(),
    token: text('token').notNull().unique(),
    user_id: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expires_at: timestamp('expires_at').notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('password_reset_tokens_token_idx').on(table.token),
    index('password_reset_tokens_user_id_idx').on(table.user_id),
    index('password_reset_tokens_expires_at_idx').on(table.expires_at),
  ]
).enableRLS();

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.user_id],
    references: [users.id],
  }),
}));
