import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { transactions } from './transactions';

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  user_id: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type', { enum: ['expense', 'income'] }).notNull(),
  percentage: text('percentage').default('0').notNull(), // Stored as string for decimal precision
  budget_amount: text('budget_amount').default('0').notNull(), // Stored as string for decimal precision
  currency: text('currency', { enum: ['IDR', 'USD'] }).notNull(),
  is_active: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.user_id],
    references: [users.id],
  }),
  transactions: many(transactions),
}));
