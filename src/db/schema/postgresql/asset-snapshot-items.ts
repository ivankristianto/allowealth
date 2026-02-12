import { pgTable, text, index, pgPolicy } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { assetSnapshots } from './asset-snapshots';
import { assets } from './assets';

export const assetSnapshotItems = pgTable(
  'asset_snapshot_items',
  {
    id: text('id').primaryKey(),
    snapshot_id: text('snapshot_id')
      .notNull()
      .references(() => assetSnapshots.id, { onDelete: 'cascade' }),
    asset_id: text('asset_id')
      .notNull()
      .references(() => assets.id),
    balance: text('balance').notNull(), // Stored as string for decimal precision
    currency: text('currency', { enum: ['IDR', 'USD'] }).notNull(),
  },
  (table) => [
    index('asset_snapshot_items_snapshot_id_idx').on(table.snapshot_id),
    index('asset_snapshot_items_asset_id_idx').on(table.asset_id),
    pgPolicy('asset_snapshot_items_allow_all', {
      as: 'permissive',
      for: 'all',
      using: sql`true`,
      withCheck: sql`true`,
    }),
  ]
).enableRLS();
