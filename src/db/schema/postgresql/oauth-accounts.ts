import { pgTable, text, timestamp, index, unique } from 'drizzle-orm/pg-core';
import { users } from './users';

export const oauthAccounts = pgTable(
  'oauth_accounts',
  {
    id: text('id').primaryKey(),
    user_id: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(),
    provider_account_id: text('provider_account_id').notNull(),
    email: text('email').notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    unique('oauth_accounts_provider_account_unique').on(table.provider, table.provider_account_id),
    index('oauth_accounts_user_id_idx').on(table.user_id),
  ]
).enableRLS();
