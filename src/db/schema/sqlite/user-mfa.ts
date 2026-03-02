import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { users } from './users';

/**
 * User MFA Table
 *
 * Stores TOTP MFA configuration per user.
 * TOTP secret is encrypted at rest using AES-GCM.
 */
export const userMfa = sqliteTable(
  'user_mfa',
  {
    id: text('id').primaryKey(),
    user_id: text('user_id')
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: 'cascade' }),
    mfa_enabled: integer('mfa_enabled', { mode: 'boolean' }).notNull().default(false),
    totp_secret: text('totp_secret').notNull(),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
    updated_at: integer('updated_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  },
  () => []
);
