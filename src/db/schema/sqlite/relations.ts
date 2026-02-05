/**
 * Centralized relations file
 *
 * All Drizzle ORM relations are defined here to avoid circular imports
 * between table definition files.
 */
import { relations } from 'drizzle-orm';

// Import all tables
import { workspaces } from './workspaces';
import { workspaceMeta } from './workspace-meta';
import { workspaceInvitations } from './workspace-invitations';
import { users } from './users';
import { userMeta } from './user-meta';
import { sessions } from './sessions';
import { categories } from './categories';
import { assetCategories } from './asset-categories';
import { transactions } from './transactions';
import { assets } from './assets';
import { assetHistory } from './asset-history';
import { assetUpdateReminders } from './asset-update-reminders';
import { assetSnapshots } from './asset-snapshots';
import { assetSnapshotItems } from './asset-snapshot-items';
import { budgets } from './budgets';
import { auditLogs } from './audit-logs';
import { apiKeys } from './api-keys';

// Workspace relations
export const workspacesRelations = relations(workspaces, ({ many }) => ({
  meta: many(workspaceMeta),
  invitations: many(workspaceInvitations),
  users: many(users),
  categories: many(categories),
  assetCategories: many(assetCategories),
  transactions: many(transactions),
  assets: many(assets),
  assetSnapshots: many(assetSnapshots),
  assetUpdateReminders: many(assetUpdateReminders),
  budgets: many(budgets),
  auditLogs: many(auditLogs),
  apiKeys: many(apiKeys),
}));

// Workspace meta relations
export const workspaceMetaRelations = relations(workspaceMeta, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMeta.workspace_id],
    references: [workspaces.id],
  }),
}));

// Workspace invitations relations
export const workspaceInvitationsRelations = relations(workspaceInvitations, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceInvitations.workspace_id],
    references: [workspaces.id],
  }),
  invitedBy: one(users, {
    fields: [workspaceInvitations.invited_by_user_id],
    references: [users.id],
  }),
}));

// User relations
export const usersRelations = relations(users, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [users.workspace_id],
    references: [workspaces.id],
  }),
  meta: many(userMeta),
  sessions: many(sessions),
  createdCategories: many(categories),
  createdAssetCategories: many(assetCategories),
  createdTransactions: many(transactions),
  createdAssets: many(assets),
  createdAssetSnapshots: many(assetSnapshots),
  createdAssetUpdateReminders: many(assetUpdateReminders),
  createdBudgets: many(budgets),
  apiKeys: many(apiKeys),
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
  workspace: one(workspaces, {
    fields: [categories.workspace_id],
    references: [workspaces.id],
  }),
  createdBy: one(users, {
    fields: [categories.created_by_user_id],
    references: [users.id],
  }),
  transactions: many(transactions),
  budgets: many(budgets),
}));

// Asset categories relations
export const assetCategoriesRelations = relations(assetCategories, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [assetCategories.workspace_id],
    references: [workspaces.id],
  }),
  createdBy: one(users, {
    fields: [assetCategories.created_by_user_id],
    references: [users.id],
  }),
  assets: many(assets),
}));

// Transactions relations
export const transactionsRelations = relations(transactions, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [transactions.workspace_id],
    references: [workspaces.id],
  }),
  createdBy: one(users, {
    fields: [transactions.created_by_user_id],
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
  workspace: one(workspaces, {
    fields: [assets.workspace_id],
    references: [workspaces.id],
  }),
  createdBy: one(users, {
    fields: [assets.created_by_user_id],
    references: [users.id],
  }),
  category: one(assetCategories, {
    fields: [assets.category_id],
    references: [assetCategories.id],
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
  workspace: one(workspaces, {
    fields: [assetUpdateReminders.workspace_id],
    references: [workspaces.id],
  }),
  createdBy: one(users, {
    fields: [assetUpdateReminders.created_by_user_id],
    references: [users.id],
  }),
  asset: one(assets, {
    fields: [assetUpdateReminders.asset_id],
    references: [assets.id],
  }),
}));

// Asset snapshots relations
export const assetSnapshotsRelations = relations(assetSnapshots, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [assetSnapshots.workspace_id],
    references: [workspaces.id],
  }),
  createdBy: one(users, {
    fields: [assetSnapshots.created_by_user_id],
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
  workspace: one(workspaces, {
    fields: [budgets.workspace_id],
    references: [workspaces.id],
  }),
  createdBy: one(users, {
    fields: [budgets.created_by_user_id],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [budgets.category_id],
    references: [categories.id],
  }),
}));

// Audit logs relations
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [auditLogs.workspace_id],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [auditLogs.user_id],
    references: [users.id],
  }),
}));

// API keys relations
export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [apiKeys.workspace_id],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [apiKeys.user_id],
    references: [users.id],
  }),
}));
