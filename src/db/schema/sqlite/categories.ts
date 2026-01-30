import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { users } from './users';

export const categories = sqliteTable('budget_categories', {
  id: text('id').primaryKey(),
  user_id: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type', { enum: ['expense', 'income'] }).notNull(),
  description: text('description'), // Optional description, max 200 chars (validated at API layer)
  icon: text('icon').default('tag').notNull(), // Lucide icon name
  color: text('color').default('bg-neutral').notNull(), // DaisyUI semantic color class
  is_active: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
});
