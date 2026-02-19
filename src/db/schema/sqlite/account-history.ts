import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { accounts } from './accounts';

export const accountHistory = sqliteTable(
  'account_history',
  {
    id: text('id').primaryKey(),
    account_id: text('account_id')
      .notNull()
      .references(() => accounts.id, { onDelete: 'cascade' }),
    balance: text('balance').notNull(), // Stored as string for decimal precision
    notes: text('notes'),
    recorded_at: integer('recorded_at', { mode: 'timestamp' })
      .default(sqliteTimestampNow)
      .notNull(),
  },
  (table) => [
    index('account_history_account_id_idx').on(table.account_id),
    index('account_history_account_recorded_idx').on(table.account_id, table.recorded_at),
  ]
);
