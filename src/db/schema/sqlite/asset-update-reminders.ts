import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { workspaces } from './workspaces';
import { users } from './users';
import { assets } from './assets';

export const assetUpdateReminders = sqliteTable('asset_update_reminders', {
  id: text('id').primaryKey(),
  workspace_id: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  created_by_user_id: text('created_by_user_id')
    .notNull()
    .references(() => users.id),
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
