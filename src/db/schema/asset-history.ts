import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { assets } from './assets';

export const assetHistory = sqliteTable('asset_history', {
  id: text('id').primaryKey(),
  asset_id: text('asset_id')
    .notNull()
    .references(() => assets.id, { onDelete: 'cascade' }),
  balance: text('balance').notNull(), // Stored as string for decimal precision
  notes: text('notes'),
  recorded_at: integer('recorded_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
});
