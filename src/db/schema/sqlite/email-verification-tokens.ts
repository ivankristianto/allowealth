import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { sqliteTimestampNow } from './base';
import { users } from './users';

/**
 * Email Verification Tokens Table
 *
 * App-owned email verification tokens retained for profile email-change flows.
 */
export const emailVerificationTokens = sqliteTable(
  'email_verification_tokens',
  {
    id: text('id').primaryKey(),
    token: text('token').notNull().unique(),
    user_id: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expires_at: integer('expires_at', { mode: 'timestamp' }).notNull(),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  },
  (table) => [
    index('email_verification_tokens_user_id_idx').on(table.user_id),
    index('email_verification_tokens_expires_at_idx').on(table.expires_at),
  ]
);

export const emailVerificationTokensRelations = relations(emailVerificationTokens, ({ one }) => ({
  user: one(users, {
    fields: [emailVerificationTokens.user_id],
    references: [users.id],
  }),
}));
