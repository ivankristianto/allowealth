import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { assets } from './assets';

export const assetHistory = sqliteTable('asset_history', {
  id: text('id').primaryKey(),
  asset_id: text('asset_id')
    .notNull()
    .references(() => assets.id, { onDelete: 'cascade' }),
  balance: text('balance').notNull(), // Stored as string for decimal precision
  notes: text('notes'),
  recorded_at: integer('recorded_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const assetHistoryRelations = relations(assetHistory, ({ one }) => ({
  asset: one(assets, {
    fields: [assetHistory.asset_id],
    references: [assets.id],
  }),
}));
