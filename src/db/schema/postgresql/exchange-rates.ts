import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const exchangeRates = pgTable('exchange_rates', {
  id: text('id').primaryKey(),
  from_currency: text('from_currency', { enum: ['IDR', 'USD'] }).notNull(),
  to_currency: text('to_currency', { enum: ['IDR', 'USD'] }).notNull(),
  rate: text('rate').notNull(), // Stored as string for decimal precision
  effective_date: timestamp('effective_date').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
}).enableRLS();
