import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampMsNow } from './base';
import { workspaces } from './workspaces';
import { users } from './users';

export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: text('id').primaryKey(),
    // Nullable so the trail outlives a deleted workspace or user, and so
    // super-admin events with no workspace can be recorded.
    workspace_id: text('workspace_id').references(() => workspaces.id, { onDelete: 'set null' }),
    user_id: text('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: text('action').notNull(),
    entity_type: text('entity_type').notNull(),
    entity_id: text('entity_id'),
    old_value: text('old_value'),
    new_value: text('new_value'),
    created_at: integer('created_at', { mode: 'timestamp_ms' })
      .default(sqliteTimestampMsNow)
      .notNull(),
  },
  (table) => [
    index('audit_logs_workspace_id_idx').on(table.workspace_id),
    index('audit_logs_user_id_idx').on(table.user_id),
    index('audit_logs_created_at_idx').on(table.created_at),
    index('audit_logs_workspace_created_idx').on(table.workspace_id, table.created_at),
    index('audit_logs_ws_entity_action_idx').on(
      table.workspace_id,
      table.entity_type,
      table.entity_id,
      table.action
    ),
  ]
);
