import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { workspaces } from './workspaces';
import { users } from './users';
import { categories } from './categories';

export const budgets = sqliteTable(
  'budgets',
  {
    id: text('id').primaryKey(),
    workspace_id: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    created_by_user_id: text('created_by_user_id')
      .notNull()
      .references(() => users.id),
    category_id: text('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    month: integer('month').notNull(), // 1-12
    year: integer('year').notNull(), // e.g., 2025, 2026
    budget_amount: text('budget_amount').notNull(), // Stored as string for decimal precision
    currency: text('currency', { enum: ['IDR', 'USD'] }).notNull(),
    is_closed: integer('is_closed', { mode: 'boolean' }).default(false).notNull(), // For book closing
    notes: text('notes'), // Optional notes for this budget period
    created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
    updated_at: integer('updated_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  },
  (table) => [
    unique('budgets_unique').on(
      table.workspace_id,
      table.category_id,
      table.month,
      table.year,
      table.currency
    ),
  ]
);
