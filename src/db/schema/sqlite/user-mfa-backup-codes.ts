import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { userMfa } from './user-mfa';

/**
 * Deprecated custom MFA backup-code table.
 * Better Auth now stores backup codes in its own `twoFactor` table.
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
