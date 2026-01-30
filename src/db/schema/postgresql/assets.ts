import { pgTable, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { assetCategories } from './asset-categories';

export const assets = pgTable(
  'assets',
  {
    id: text('id').primaryKey(),
    user_id: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
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
    // P2: TODO - Consider using numeric type for PostgreSQL native decimal support
    currency: text('currency', { enum: ['IDR', 'USD'] }).notNull(),
    credit_limit: text('credit_limit'), // For credit cards only, stored as string for decimal precision
    is_cash_account: boolean('is_cash_account').default(false).notNull(), // Flag for cash-type accounts
    last_updated: timestamp('last_updated').defaultNow().notNull(),
    deleted_at: timestamp('deleted_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('assets_user_id_idx').on(table.user_id)]
);
