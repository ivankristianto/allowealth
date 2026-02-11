import { sqliteTable, text, integer, index, unique } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { users } from './users';

export const oauthAccounts = sqliteTable(
  'oauth_accounts',
  {
    id: text('id').primaryKey(),
    user_id: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    provider_account_id: text('provider_account_id').notNull(),
    email: text('email').notNull(),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  },
  (table) => [
    unique('oauth_accounts_provider_account_unique').on(table.provider, table.provider_account_id),
    index('oauth_accounts_user_id_idx').on(table.user_id),
  ]
);
