import { pgTable, text, timestamp, index, pgPolicy } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { workspaces } from './workspaces';
import { users } from './users';
import { categories } from './categories';
import { assets } from './assets';

export const transactions = pgTable(
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
    asset_id: text('asset_id')
      .notNull()
      .references(() => assets.id), // Source asset (where money comes from)
    to_asset_id: text('to_asset_id').references(() => assets.id), // Destination asset (for transfers only)
    type: text('type', { enum: ['expense', 'income', 'transfer'] }).notNull(),
    amount: text('amount').notNull(), // Stored as string for decimal precision
    // P2: TODO - Consider using numeric type for PostgreSQL native decimal support
    currency: text('currency', { enum: ['IDR', 'USD'] }).notNull(),
    description: text('description'),
    transaction_date: timestamp('transaction_date').notNull(),
    updated_by_user_id: text('updated_by_user_id').references(() => users.id),
    deleted_by_user_id: text('deleted_by_user_id').references(() => users.id),
    deleted_at: timestamp('deleted_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('transactions_workspace_id_idx').on(table.workspace_id),
    index('transactions_asset_id_idx').on(table.asset_id),
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
    index('transactions_created_by_user_id_idx').on(table.created_by_user_id),
    index('transactions_updated_by_user_id_idx').on(table.updated_by_user_id),
    index('transactions_deleted_by_user_id_idx').on(table.deleted_by_user_id),
    index('transactions_to_asset_id_idx').on(table.to_asset_id),
    pgPolicy('transactions_allow_all', {
      as: 'permissive',
      for: 'all',
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ]
).enableRLS();
