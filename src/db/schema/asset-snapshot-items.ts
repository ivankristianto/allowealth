import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { assetSnapshots } from './asset-snapshots';
import { assets } from './assets';

export const assetSnapshotItems = sqliteTable('asset_snapshot_items', {
  id: text('id').primaryKey(),
  snapshot_id: text('snapshot_id')
    .notNull()
    .references(() => assetSnapshots.id, { onDelete: 'cascade' }),
  asset_id: text('asset_id')
    .notNull()
    .references(() => assets.id),
  balance: text('balance').notNull(), // Stored as string for decimal precision
  currency: text('currency', { enum: ['IDR', 'USD'] }).notNull(),
});

export const assetSnapshotItemsRelations = relations(assetSnapshotItems, ({ one }) => ({
  snapshot: one(assetSnapshots, {
    fields: [assetSnapshotItems.snapshot_id],
    references: [assetSnapshots.id],
  }),
  asset: one(assets, {
    fields: [assetSnapshotItems.asset_id],
    references: [assets.id],
  }),
}));
