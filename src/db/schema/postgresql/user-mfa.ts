import { pgTable, text, boolean, timestamp, pgPolicy } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './users';

/**
 * User MFA Table
 *
 * Stores TOTP MFA configuration per user.
 * TOTP secret is encrypted at rest using AES-GCM.
 */
export const userMfa = pgTable(
  'user_mfa',
  {
    id: text('id').primaryKey(),
    user_id: text('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    mfa_enabled: boolean('mfa_enabled').notNull().default(false),
    totp_secret: text('totp_secret').notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  () => [
    pgPolicy('user_mfa_allow_all', {
      as: 'permissive',
      for: 'all',
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ]
).enableRLS();
