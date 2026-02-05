import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { workspaces } from './workspaces';
import { users } from './users';

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    workspace_id: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    user_id: text('user_id')
      .notNull()
      .references(() => users.id),
    action: text('action').notNull(),
    entity_type: text('entity_type').notNull(),
    entity_id: text('entity_id'),
    old_value: text('old_value'),
    new_value: text('new_value'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('audit_logs_workspace_id_idx').on(table.workspace_id),
    index('audit_logs_user_id_idx').on(table.user_id),
    index('audit_logs_created_at_idx').on(table.created_at),
  ]
).enableRLS();
