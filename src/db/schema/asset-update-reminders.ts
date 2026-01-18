import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { sqliteTimestampNow } from './base';
import { users } from './users';
import { assets } from './assets';

export const assetUpdateReminders = sqliteTable('asset_update_reminders', {
  id: text('id').primaryKey(),
  user_id: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  asset_id: text('asset_id')
    .notNull()
    .references(() => assets.id, { onDelete: 'cascade' }),
  frequency: text('frequency', { enum: ['weekly', 'monthly', 'quarterly'] })
    .default('monthly')
    .notNull(),
  last_updated: integer('last_updated', { mode: 'timestamp' }),
  next_reminder: integer('next_reminder', { mode: 'timestamp' }),
  is_dismissed: integer('is_dismissed', { mode: 'boolean' }).default(false).notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
});

export const assetUpdateRemindersRelations = relations(assetUpdateReminders, ({ one }) => ({
  user: one(users, {
    fields: [assetUpdateReminders.user_id],
    references: [users.id],
  }),
  asset: one(assets, {
    fields: [assetUpdateReminders.asset_id],
    references: [assets.id],
  }),
}));
