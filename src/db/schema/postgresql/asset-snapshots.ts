import { pgTable, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';

export const assetSnapshots = pgTable('asset_snapshots', {
  id: text('id').primaryKey(),
  user_id: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  snapshot_date: timestamp('snapshot_date').notNull(),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});
