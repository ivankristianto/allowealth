import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { users } from './users';

export const userSettings = sqliteTable('user_settings', {
  user_id: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  primary_currency: text('primary_currency', { enum: ['IDR', 'USD'] })
    .default('IDR')
    .notNull(),
  show_converted_totals: integer('show_converted_totals', { mode: 'boolean' })
    .default(true)
    .notNull(),
  show_individual_currencies: integer('show_individual_currencies', { mode: 'boolean' })
    .default(true)
    .notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
});
