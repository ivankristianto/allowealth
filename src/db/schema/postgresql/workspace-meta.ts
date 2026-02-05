import { pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';

export const workspaceMeta = pgTable(
  'workspace_meta',
  {
    id: text('id').primaryKey(),
    workspace_id: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    meta_key: text('meta_key').notNull(),
    meta_value: text('meta_value').notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [unique('workspace_meta_unique').on(table.workspace_id, table.meta_key)]
).enableRLS();
