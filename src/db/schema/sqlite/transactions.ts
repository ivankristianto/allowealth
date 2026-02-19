import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { workspaces } from './workspaces';
import { users } from './users';
import { categories } from './categories';
import { accounts } from './accounts';

export const transactions = sqliteTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    workspace_id: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    created_by_user_id: text('created_by_user_id')
      .notNull()
      .references(() => users.id),
    category_id: text('category_id').references(() => categories.id), // Nullable for transfers
    account_id: text('account_id')
      .notNull()
      .references(() => accounts.id), // Source account (where money comes from)
    to_account_id: text('to_account_id').references(() => accounts.id), // Destination account (for transfers only)
    type: text('type', { enum: ['expense', 'income', 'transfer'] }).notNull(),
    amount: text('amount').notNull(), // Stored as string for decimal precision
    currency: text('currency', { enum: ['IDR', 'USD'] }).notNull(),
    description: text('description'),
    transaction_date: integer('transaction_date', { mode: 'timestamp' }).notNull(),
    updated_by_user_id: text('updated_by_user_id').references(() => users.id),
    deleted_by_user_id: text('deleted_by_user_id').references(() => users.id),
    deleted_at: integer('deleted_at', { mode: 'timestamp' }),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
    updated_at: integer('updated_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  },
  (table) => [
    index('transactions_workspace_id_idx').on(table.workspace_id),
    index('transactions_account_id_idx').on(table.account_id),
    index('transactions_transaction_date_idx').on(table.transaction_date),
    index('transactions_category_id_idx').on(table.category_id),
    index('transactions_ws_type_currency_date_idx').on(
      table.workspace_id,
      table.type,
      table.currency,
      table.transaction_date
    ),
    index('transactions_ws_cat_type_currency_date_idx').on(
      table.workspace_id,
      table.category_id,
      table.type,
      table.currency,
      table.transaction_date
    ),
    index('transactions_ws_user_date_idx').on(
      table.workspace_id,
      table.created_by_user_id,
      table.transaction_date
    ),
    index('transactions_to_account_id_idx').on(table.to_account_id),
    index('transactions_created_by_user_id_idx').on(table.created_by_user_id),
    index('transactions_updated_by_user_id_idx').on(table.updated_by_user_id),
    index('transactions_deleted_by_user_id_idx').on(table.deleted_by_user_id),
  ]
);
