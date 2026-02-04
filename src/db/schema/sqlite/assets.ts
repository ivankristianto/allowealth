import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { workspaces } from './workspaces';
import { users } from './users';
import { assetCategories } from './asset-categories';

export const assets = sqliteTable('assets', {
  id: text('id').primaryKey(),
  workspace_id: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  created_by_user_id: text('created_by_user_id')
    .notNull()
    .references(() => users.id),
  name: text('name').notNull(),
  type: text('type', {
    enum: [
      // Asset types (balance = what you HAVE)
      'cash',
      'bank_account',
      'e_wallet',
      'mutual_fund',
      'bond',
      'crypto',
      'stock',
      'other',
      // Liability types (balance = what you OWE)
      'credit_card',
      'loan',
    ],
  }).notNull(),
  category_id: text('category_id').references(() => assetCategories.id),
  balance: text('balance').notNull(), // Stored as string for decimal precision
  initial_balance: text('initial_balance'), // Original balance at creation, stored as string
  currency: text('currency', { enum: ['IDR', 'USD'] }).notNull(),
  credit_limit: text('credit_limit'), // For credit cards only, stored as string for decimal precision
  is_cash_account: integer('is_cash_account', { mode: 'boolean' }).default(false).notNull(), // Flag for cash-type accounts
  last_updated: integer('last_updated', { mode: 'timestamp' })
    .default(sqliteTimestampNow)
    .notNull(),
  deleted_at: integer('deleted_at', { mode: 'timestamp' }),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
});
