import { pgTable, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';
import { users } from './users';
import { assetCategories } from './asset-categories';

export const assets = pgTable(
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
    // P2: TODO - Consider using numeric type for PostgreSQL native decimal support
    currency: text('currency', { enum: ['IDR', 'USD'] }).notNull(),
    credit_limit: text('credit_limit'), // For credit cards only, stored as string for decimal precision
    is_cash_account: boolean('is_cash_account').default(false).notNull(), // Flag for cash-type accounts
    status: text('status', { enum: ['active', 'closed'] })
      .notNull()
      .default('active'),
    closed_at: timestamp('closed_at'),
    closed_by_user_id: text('closed_by_user_id').references(() => users.id),
    last_updated: timestamp('last_updated').defaultNow().notNull(),
    deleted_at: timestamp('deleted_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('assets_workspace_id_idx').on(table.workspace_id)]
).enableRLS();
