import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { users } from './users';
import { assets } from './assets';

export const assetUpdateReminders = pgTable('asset_update_reminders', {
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
  last_updated: timestamp('last_updated'),
  next_reminder: timestamp('next_reminder'),
  is_dismissed: boolean('is_dismissed').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});
