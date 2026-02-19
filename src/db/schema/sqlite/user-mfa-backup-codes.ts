import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { userMfa } from './user-mfa';

/**
 * User MFA Backup Codes Table
 *
 * Stores hashed single-use backup codes for account recovery.
 * Each code is hashed with PBKDF2-SHA256 before storage.
 */
export const userMfaBackupCodes = sqliteTable(
  'user_mfa_backup_codes',
  {
    id: text('id').primaryKey(),
    user_mfa_id: text('user_mfa_id')
      .notNull()
      .references(() => userMfa.id, { onDelete: 'cascade' }),
    code_hash: text('code_hash').notNull(),
    used_at: integer('used_at', { mode: 'timestamp' }),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  },
  (table) => [index('user_mfa_backup_codes_mfa_id_idx').on(table.user_mfa_id)]
);
