/**
 * Centralized relations file
 *
 * All Drizzle ORM relations are defined here to avoid circular imports
 * between table definition files.
 */
import { relations } from 'drizzle-orm';

// Import all tables
import { users } from './users';
import { userMeta } from './user-meta';
import { sessions } from './sessions';
import { categories } from './categories';
import { transactions } from './transactions';
import { assets } from './assets';
import { assetHistory } from './asset-history';
import { assetUpdateReminders } from './asset-update-reminders';
import { assetSnapshots } from './asset-snapshots';
import { assetSnapshotItems } from './asset-snapshot-items';
import { budgets } from './budgets';

// User relations
export const usersRelations = relations(users, ({ many }) => ({
  meta: many(userMeta),
  categories: many(categories),
  transactions: many(transactions),
  assets: many(assets),
  assetUpdateReminders: many(assetUpdateReminders),
  assetSnapshots: many(assetSnapshots),
  sessions: many(sessions),
}));

// User meta relations
export const userMetaRelations = relations(userMeta, ({ one }) => ({
  user: one(users, {
    fields: [userMeta.user_id],
    references: [users.id],
  }),
}));

// Sessions relations
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

// Categories relations
export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.user_id],
    references: [users.id],
  }),
  transactions: many(transactions),
  budgets: many(budgets),
}));

// Transactions relations
export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.user_id],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [transactions.category_id],
    references: [categories.id],
  }),
  asset: one(assets, {
    fields: [transactions.asset_id],
    references: [assets.id],
    relationName: 'transactionAsset',
  }),
  toAsset: one(assets, {
    fields: [transactions.to_asset_id],
    references: [assets.id],
    relationName: 'transactionToAsset',
  }),
}));

// Assets relations
export const assetsRelations = relations(assets, ({ one, many }) => ({
  user: one(users, {
    fields: [assets.user_id],
    references: [users.id],
  }),
  history: many(assetHistory),
  reminders: many(assetUpdateReminders),
  snapshotItems: many(assetSnapshotItems),
  transactions: many(transactions, { relationName: 'transactionAsset' }),
  incomingTransfers: many(transactions, { relationName: 'transactionToAsset' }),
}));

// Asset history relations
export const assetHistoryRelations = relations(assetHistory, ({ one }) => ({
  asset: one(assets, {
    fields: [assetHistory.asset_id],
    references: [assets.id],
  }),
}));

// Asset update reminders relations
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

// Asset snapshots relations
export const assetSnapshotsRelations = relations(assetSnapshots, ({ one, many }) => ({
  user: one(users, {
    fields: [assetSnapshots.user_id],
    references: [users.id],
  }),
  items: many(assetSnapshotItems),
}));

// Asset snapshot items relations
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

// Budgets relations
export const budgetsRelations = relations(budgets, ({ one }) => ({
  user: one(users, {
    fields: [budgets.user_id],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [budgets.category_id],
    references: [categories.id],
  }),
}));
