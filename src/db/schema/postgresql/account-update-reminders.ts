import { pgTable, text, boolean, timestamp, index, pgPolicy } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { workspaces } from './workspaces';
import { users } from './users';
import { accounts } from './accounts';

export const accountUpdateReminders = pgTable(
  'account_update_reminders',
  {
    id: text('id').primaryKey(),
    workspace_id: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    created_by_user_id: text('created_by_user_id')
      .notNull()
      .references(() => users.id),
    account_id: text('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    frequency: text('frequency', { enum: ['weekly', 'monthly', 'quarterly'] })
      .default('monthly')
      .notNull(),
    last_updated: timestamp('last_updated'),
    next_reminder: timestamp('next_reminder'),
    is_dismissed: boolean('is_dismissed').default(false).notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('account_update_reminders_workspace_id_idx').on(table.workspace_id),
    index('account_update_reminders_created_by_user_id_idx').on(table.created_by_user_id),
    index('account_update_reminders_account_id_idx').on(table.account_id),
    pgPolicy('account_update_reminders_allow_all', {
      as: 'permissive',
      for: 'all',
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ]
).enableRLS();
