import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { sqliteTimestampNow } from './base';
import { userSettings } from './user-settings';
import { categories } from './categories';
import { paymentMethods } from './payment-methods';
import { transactions } from './transactions';
import { assets } from './assets';
import { assetUpdateReminders } from './asset-update-reminders';
import { assetSnapshots } from './asset-snapshots';
import { sessions } from './sessions';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  name: text('name').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  settings: many(userSettings),
  categories: many(categories),
  paymentMethods: many(paymentMethods),
  transactions: many(transactions),
  assets: many(assets),
  assetUpdateReminders: many(assetUpdateReminders),
  assetSnapshots: many(assetSnapshots),
  sessions: many(sessions),
}));
