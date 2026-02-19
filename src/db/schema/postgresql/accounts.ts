import { pgTable, text, boolean, timestamp, index, pgPolicy } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { workspaces } from './workspaces';
import { users } from './users';
import { accountCategories } from './account-categories';

export const accounts = pgTable(
  'accounts',
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
        // Account types (balance = what you HAVE)
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
    account_class: text('account_class', {
      enum: ['liquid', 'non_liquid', 'debt'],
    })
      .notNull()
      .default('liquid'),
    category_id: text('category_id').references(() => accountCategories.id),
    balance: text('balance').notNull(), // Stored as string for decimal precision
    initial_balance: text('initial_balance'), // Original balance at creation, stored as string
    // P2: TODO - Consider using numeric type for PostgreSQL native decimal support
    currency: text('currency', { enum: ['IDR', 'USD'] }).notNull(),
    credit_limit: text('credit_limit'), // For credit cards only, stored as string for decimal precision
    is_cash_account: boolean('is_cash_account').default(false).notNull(), // Flag for cash-type accounts
    status: text('status', { enum: ['active', 'closed'] })
      .notNull()
      .default('active'),
    closed_at: timestamp('closed_at'),
    closed_by_user_id: text('closed_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    last_updated: timestamp('last_updated').defaultNow().notNull(),
    deleted_at: timestamp('deleted_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('accounts_workspace_id_idx').on(table.workspace_id),
    index('accounts_created_by_user_id_idx').on(table.created_by_user_id),
    index('accounts_category_id_idx').on(table.category_id),
    index('accounts_closed_by_user_id_idx').on(table.closed_by_user_id),
    index('accounts_ws_status_deleted_idx').on(table.workspace_id, table.status, table.deleted_at),
    pgPolicy('accounts_allow_all', {
      as: 'permissive',
      for: 'all',
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ]
).enableRLS();
