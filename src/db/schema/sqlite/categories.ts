import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { workspaces } from './workspaces';
import { users } from './users';

export const categories = sqliteTable(
  'budget_categories',
  {
    id: text('id').primaryKey(),
    workspace_id: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    created_by_user_id: text('created_by_user_id')
      .notNull()
      .references(() => users.id),
    name: text('name').notNull(),
    type: text('type', { enum: ['expense', 'income'] }).notNull(),
    description: text('description'), // Optional description, max 200 chars (validated at API layer)
    icon: text('icon').default('tag').notNull(), // Lucide icon name
    color: text('color').default('bg-neutral').notNull(), // DaisyUI semantic color class
    is_active: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
    updated_at: integer('updated_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  },
  (table) => [
    index('budget_categories_workspace_id_idx').on(table.workspace_id),
    index('budget_categories_created_by_user_id_idx').on(table.created_by_user_id),
  ]
);
