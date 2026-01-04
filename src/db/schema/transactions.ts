import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { categories } from './categories';
import { paymentMethods } from './payment-methods';

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  user_id: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  category_id: text('category_id')
    .notNull()
    .references(() => categories.id),
  payment_method_id: text('payment_method_id')
    .notNull()
    .references(() => paymentMethods.id),
  type: text('type', { enum: ['expense', 'income'] }).notNull(),
  amount: text('amount').notNull(), // Stored as string for decimal precision
  currency: text('currency', { enum: ['IDR', 'USD'] }).notNull(),
  description: text('description'),
  transaction_date: integer('transaction_date', { mode: 'timestamp' }).notNull(),
  deleted_at: integer('deleted_at', { mode: 'timestamp' }),
  created_at: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.user_id],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [transactions.category_id],
    references: [categories.id],
  }),
  paymentMethod: one(paymentMethods, {
    fields: [transactions.payment_method_id],
    references: [paymentMethods.id],
  }),
}));
