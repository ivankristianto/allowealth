import { pgTable, text, timestamp, index, pgPolicy } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { users } from './users';

/**
 * Email Verification Tokens Table
 *
 * Stores email verification tokens for user registration.
 * Tokens expire after 24 hours and are deleted after successful verification.
 */
export const emailVerificationTokens = pgTable(
  'email_verification_tokens',
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
    index('email_verification_tokens_user_id_idx').on(table.user_id),
    index('email_verification_tokens_expires_at_idx').on(table.expires_at),
    pgPolicy('email_verification_tokens_allow_all', {
      as: 'permissive',
      for: 'all',
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ]
).enableRLS();

export const emailVerificationTokensRelations = relations(emailVerificationTokens, ({ one }) => ({
  user: one(users, {
    fields: [emailVerificationTokens.user_id],
    references: [users.id],
  }),
}));
