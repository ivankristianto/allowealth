import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { workspaces } from './workspaces';
import { users } from './users';

export const assetSnapshots = sqliteTable(
  'asset_snapshots',
  {
    id: text('id').primaryKey(),
    workspace_id: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    created_by_user_id: text('created_by_user_id')
      .notNull()
      .references(() => users.id),
    snapshot_date: integer('snapshot_date', { mode: 'timestamp' }).notNull(),
    month: integer('month').notNull(),
    year: integer('year').notNull(),
    notes: text('notes'),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  },
  (table) => [
    index('asset_snapshots_workspace_id_idx').on(table.workspace_id),
    index('asset_snapshots_created_by_user_id_idx').on(table.created_by_user_id),
  ]
);
