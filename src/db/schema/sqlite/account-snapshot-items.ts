import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { accountSnapshots } from './account-snapshots';
import { accounts } from './accounts';

export const accountSnapshotItems = sqliteTable(
  'account_snapshot_items',
  {
    id: text('id').primaryKey(),
    snapshot_id: text('snapshot_id')
      .notNull()
      .references(() => accountSnapshots.id, { onDelete: 'cascade' }),
    account_id: text('account_id')
      .notNull()
      .references(() => accounts.id),
    balance: text('balance').notNull(), // Stored as string for decimal precision
    currency: text('currency').notNull(),
  },
  (table) => [
    index('account_snapshot_items_snapshot_id_idx').on(table.snapshot_id),
    index('account_snapshot_items_account_id_idx').on(table.account_id),
  ]
);
