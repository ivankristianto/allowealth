import { pgTable, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';
import { users } from './users';

export const categories = pgTable(
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
    is_active: boolean('is_active').default(true).notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [index('budget_categories_workspace_id_idx').on(table.workspace_id)]
).enableRLS();
