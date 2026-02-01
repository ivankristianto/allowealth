import {
  pgTable,
  text,
  boolean,
  integer,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';
import { users } from './users';

export const assetCategories = pgTable(
  'asset_categories',
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
    is_liability: boolean('is_liability').default(false).notNull(),
    is_system: boolean('is_system').default(false).notNull(),
    sort_order: integer('sort_order').default(0).notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('asset_categories_workspace_id_idx').on(table.workspace_id),
    uniqueIndex('asset_categories_workspace_name_unique').on(table.workspace_id, table.name),
  ]
);
