import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { workspaces } from './workspaces';
import { users } from './users';
import { categories } from './categories';
import { assets } from './assets';

export const transactions = sqliteTable('transactions', {
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
  currency: text('currency', { enum: ['IDR', 'USD'] }).notNull(),
  description: text('description'),
  transaction_date: integer('transaction_date', { mode: 'timestamp' }).notNull(),
  updated_by_user_id: text('updated_by_user_id').references(() => users.id),
  deleted_by_user_id: text('deleted_by_user_id').references(() => users.id),
  deleted_at: integer('deleted_at', { mode: 'timestamp' }),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
});
