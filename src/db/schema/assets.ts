import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { users } from './users';

export const assets = sqliteTable('assets', {
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
  balance: text('balance').notNull(), // Stored as string for decimal precision
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
