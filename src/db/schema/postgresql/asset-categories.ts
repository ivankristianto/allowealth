import { pgTable, text, boolean, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const assetCategories = pgTable(
  'asset_categories',
  {
    id: text('id').primaryKey(),
    user_id: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    description: text('description'),
    is_liability: boolean('is_liability').default(false).notNull(),
    is_system: boolean('is_system').default(false).notNull(),
    sort_order: integer('sort_order').default(0).notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('asset_categories_user_id_idx').on(table.user_id)]
);
