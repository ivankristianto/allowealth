import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { users } from './users';

export const assetCategories = sqliteTable('asset_categories', {
  id: text('id').primaryKey(),
  user_id: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  is_liability: integer('is_liability', { mode: 'boolean' }).default(false).notNull(),
  is_system: integer('is_system', { mode: 'boolean' }).default(false).notNull(),
  sort_order: integer('sort_order').default(0).notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
});
