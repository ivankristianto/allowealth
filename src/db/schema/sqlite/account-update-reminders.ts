import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { workspaces } from './workspaces';
import { users } from './users';
import { accounts } from './accounts';

export const accountUpdateReminders = sqliteTable(
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
    last_updated: integer('last_updated', { mode: 'timestamp' }),
    next_reminder: integer('next_reminder', { mode: 'timestamp' }),
    is_dismissed: integer('is_dismissed', { mode: 'boolean' }).default(false).notNull(),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  },
  (table) => [
    index('account_update_reminders_workspace_id_idx').on(table.workspace_id),
    index('account_update_reminders_created_by_user_id_idx').on(table.created_by_user_id),
    index('account_update_reminders_account_id_idx').on(table.account_id),
    index('account_update_reminders_next_reminder_idx').on(table.next_reminder),
  ]
);
