import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { users } from './users';

export const assetSnapshots = sqliteTable('asset_snapshots', {
  id: text('id').primaryKey(),
  user_id: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  snapshot_date: integer('snapshot_date', { mode: 'timestamp' }).notNull(),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  notes: text('notes'),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
});
