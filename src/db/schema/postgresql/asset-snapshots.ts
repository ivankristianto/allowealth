import { pgTable, text, integer, timestamp, pgPolicy } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { workspaces } from './workspaces';
import { users } from './users';

export const assetSnapshots = pgTable(
  'asset_snapshots',
  {
    id: text('id').primaryKey(),
    workspace_id: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    created_by_user_id: text('created_by_user_id')
      .notNull()
      .references(() => users.id),
    snapshot_date: timestamp('snapshot_date').notNull(),
    month: integer('month').notNull(),
    year: integer('year').notNull(),
    notes: text('notes'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  () => [
    pgPolicy('asset_snapshots_allow_all', {
      as: 'permissive',
      for: 'all',
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ]
).enableRLS();
