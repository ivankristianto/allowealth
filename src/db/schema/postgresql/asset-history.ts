import { pgTable, text, timestamp, index } from 'drizzle-orm/pg-core';
import { assets } from './assets';

export const assetHistory = pgTable(
  'asset_history',
  {
    id: text('id').primaryKey(),
    asset_id: text('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'cascade' }),
    balance: text('balance').notNull(), // Stored as string for decimal precision
    // P2: TODO - Consider using numeric type for PostgreSQL native decimal support
    notes: text('notes'),
    recorded_at: timestamp('recorded_at').defaultNow().notNull(),
  },
  (table) => [index('asset_history_recorded_at_idx').on(table.recorded_at)]
).enableRLS();
