import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { workspaces } from './workspaces';
import { users } from './users';
import { assetCategories } from './asset-categories';

export const assets = sqliteTable(
  'assets',
  {
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
    status: text('status', { enum: ['active', 'closed'] })
      .notNull()
      .default('active'),
    closed_at: integer('closed_at', { mode: 'timestamp' }),
    closed_by_user_id: text('closed_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    last_updated: integer('last_updated', { mode: 'timestamp' })
      .default(sqliteTimestampNow)
      .notNull(),
    deleted_at: integer('deleted_at', { mode: 'timestamp' }),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
    updated_at: integer('updated_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  },
  (table) => [
    index('assets_workspace_id_idx').on(table.workspace_id),
    index('assets_ws_status_deleted_idx').on(table.workspace_id, table.status, table.deleted_at),
    index('assets_created_by_user_id_idx').on(table.created_by_user_id),
    index('assets_category_id_idx').on(table.category_id),
    index('assets_closed_by_user_id_idx').on(table.closed_by_user_id),
  ]
);
