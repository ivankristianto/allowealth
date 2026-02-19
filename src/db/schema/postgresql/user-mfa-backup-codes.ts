import { pgTable, text, timestamp, index, pgPolicy } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { userMfa } from './user-mfa';

/**
 * User MFA Backup Codes Table
 *
 * Stores hashed single-use backup codes for account recovery.
 * Each code is hashed with PBKDF2-SHA256 before storage.
 */
export const userMfaBackupCodes = pgTable(
  'user_mfa_backup_codes',
  {
    id: text('id').primaryKey(),
    user_mfa_id: text('user_mfa_id')
      .notNull()
      .references(() => userMfa.id, { onDelete: 'cascade' }),
    code_hash: text('code_hash').notNull(),
    used_at: timestamp('used_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('user_mfa_backup_codes_mfa_id_idx').on(table.user_mfa_id),
    pgPolicy('user_mfa_backup_codes_allow_all', {
      as: 'permissive',
      for: 'all',
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ]
).enableRLS();
