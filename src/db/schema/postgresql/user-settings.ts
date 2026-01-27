import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

export const userSettings = pgTable('user_settings', {
  user_id: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  primary_currency: text('primary_currency', { enum: ['IDR', 'USD'] })
    .default('IDR')
    .notNull(),
  show_converted_totals: boolean('show_converted_totals').default(true).notNull(),
  show_individual_currencies: boolean('show_individual_currencies').default(true).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});
