import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { transactions } from './transactions';

export const paymentMethods = sqliteTable('payment_methods', {
  id: text('id').primaryKey(),
  user_id: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type', {
    enum: ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'e_wallet'],
  }).notNull(),
  is_active: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const paymentMethodsRelations = relations(paymentMethods, ({ one, many }) => ({
  user: one(users, {
    fields: [paymentMethods.user_id],
    references: [users.id],
  }),
  transactions: many(transactions),
}));
