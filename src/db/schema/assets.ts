import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { users } from './users';
import { assetHistory } from './asset-history';
import { assetUpdateReminders } from './asset-update-reminders';
import { assetSnapshotItems } from './asset-snapshot-items';

export const assets = sqliteTable('assets', {
  id: text('id').primaryKey(),
  user_id: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type', {
    enum: ['bank_account', 'mutual_fund', 'bond', 'crypto', 'stock', 'other'],
  }).notNull(),
  balance: text('balance').notNull(), // Stored as string for decimal precision
  currency: text('currency', { enum: ['IDR', 'USD'] }).notNull(),
  last_updated: integer('last_updated', { mode: 'timestamp' }).defaultNow().notNull(),
  deleted_at: integer('deleted_at', { mode: 'timestamp' }),
  created_at: integer('created_at', { mode: 'timestamp' }).defaultNow().notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).defaultNow().notNull(),
});

export const assetsRelations = relations(assets, ({ one, many }) => ({
  user: one(users, {
    fields: [assets.user_id],
    references: [users.id],
  }),
  history: many(assetHistory),
  reminders: many(assetUpdateReminders),
  snapshotItems: many(assetSnapshotItems),
}));
