import { sqliteTable, text, integer, index, unique } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { workspaces } from './workspaces';
import { users } from './users';

export const accountCategories = sqliteTable(
  'account_categories',
  {
    id: text('id').primaryKey(),
    workspace_id: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    created_by_user_id: text('created_by_user_id')
      .notNull()
      .references(() => users.id),
    name: text('name').notNull(),
    description: text('description'),
    is_liability: integer('is_liability', { mode: 'boolean' }).default(false).notNull(),
    is_system: integer('is_system', { mode: 'boolean' }).default(false).notNull(),
    sort_order: integer('sort_order').default(0).notNull(),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
    updated_at: integer('updated_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  },
  (table) => [
    index('account_categories_workspace_id_idx').on(table.workspace_id),
    index('account_categories_created_by_user_id_idx').on(table.created_by_user_id),
    unique('account_categories_workspace_name_unique').on(table.workspace_id, table.name),
  ]
);
