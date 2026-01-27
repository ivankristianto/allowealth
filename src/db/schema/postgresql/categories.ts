import { pgTable, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const categories = pgTable(
  'categories',
  {
    id: text('id').primaryKey(),
    user_id: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    type: text('type', { enum: ['expense', 'income'] }).notNull(),
    icon: text('icon').default('tag').notNull(), // Lucide icon name
    color: text('color').default('bg-neutral').notNull(), // DaisyUI semantic color class
    percentage: text('percentage').default('0').notNull(), // Stored as string for decimal precision
    budget_amount: text('budget_amount').default('0').notNull(), // Stored as string for decimal precision
    // P2: TODO - Consider using numeric type for PostgreSQL native decimal support
    currency: text('currency', { enum: ['IDR', 'USD'] }).notNull(),
    is_active: boolean('is_active').default(true).notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('categories_user_id_idx').on(table.user_id)]
);
