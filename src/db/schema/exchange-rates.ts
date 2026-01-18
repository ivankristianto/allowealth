import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';

export const exchangeRates = sqliteTable('exchange_rates', {
  id: text('id').primaryKey(),
  from_currency: text('from_currency', { enum: ['IDR', 'USD'] }).notNull(),
  to_currency: text('to_currency', { enum: ['IDR', 'USD'] }).notNull(),
  rate: text('rate').notNull(), // Stored as string for decimal precision
  effective_date: integer('effective_date', { mode: 'timestamp' }).notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
});
