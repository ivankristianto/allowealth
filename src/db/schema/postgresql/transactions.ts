import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { categories } from './categories';
import { assets } from './assets';

export const transactions = pgTable(
  'transactions',
  {
    id: text('id').primaryKey(),
    user_id: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
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
    deleted_at: timestamp('deleted_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('transactions_user_id_idx').on(table.user_id),
    index('transactions_asset_id_idx').on(table.asset_id),
    index('transactions_transaction_date_idx').on(table.transaction_date),
    index('transactions_category_id_idx').on(table.category_id),
  ]
);
