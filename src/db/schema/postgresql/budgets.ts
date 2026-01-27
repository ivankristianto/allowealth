import { pgTable, text, integer, boolean, timestamp, unique } from 'drizzle-orm/pg-core';
import { users } from './users';
import { categories } from './categories';

export const budgets = pgTable(
  'budgets',
  {
    id: text('id').primaryKey(),
    user_id: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    category_id: text('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    month: integer('month').notNull(), // 1-12
    year: integer('year').notNull(), // e.g., 2025, 2026
    budget_amount: text('budget_amount').notNull(), // Stored as string for decimal precision
    currency: text('currency', { enum: ['IDR', 'USD'] }).notNull(),
    is_closed: boolean('is_closed').default(false).notNull(), // For book closing
    notes: text('notes'), // Optional notes for this budget period
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [unique().on(table.user_id, table.category_id, table.month, table.year)]
);
