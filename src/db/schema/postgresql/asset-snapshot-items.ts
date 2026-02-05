import { pgTable, text } from 'drizzle-orm/pg-core';
import { assetSnapshots } from './asset-snapshots';
import { assets } from './assets';

export const assetSnapshotItems = pgTable('asset_snapshot_items', {
  id: text('id').primaryKey(),
  snapshot_id: text('snapshot_id')
    .notNull()
    .references(() => assetSnapshots.id, { onDelete: 'cascade' }),
  asset_id: text('asset_id')
    .notNull()
    .references(() => assets.id),
  balance: text('balance').notNull(), // Stored as string for decimal precision
  currency: text('currency', { enum: ['IDR', 'USD'] }).notNull(),
}).enableRLS();
