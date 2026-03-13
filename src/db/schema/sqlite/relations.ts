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
import { user, session, account, verification, twoFactor, passkey } from './better-auth';
import { users } from './users';
import { userMeta } from './user-meta';
import { sessions } from './sessions';
import { categories } from './categories';
import { accountCategories } from './account-categories';
import { transactions } from './transactions';
import { recurringTemplates } from './recurring-templates';
import { recurringOccurrences } from './recurring-occurrences';
import { accounts } from './accounts';
import { accountHistory } from './account-history';
import { accountUpdateReminders } from './account-update-reminders';
import { accountSnapshots } from './account-snapshots';
import { accountSnapshotItems } from './account-snapshot-items';
import { budgets } from './budgets';
import { auditLogs } from './audit-logs';
import { apiKeys } from './api-keys';
import { oauthAccounts } from './oauth-accounts';

// Better Auth relations
export const authUsersRelations = relations(user, ({ many, one }) => ({
  sessions: many(session),
  accounts: many(account),
  twoFactor: one(twoFactor, {
    fields: [user.id],
    references: [twoFactor.userId],
  }),
}));

export const authSessionsRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const authAccountsRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const authVerificationsRelations = relations(verification, () => ({}));

export const authTwoFactorsRelations = relations(twoFactor, ({ one }) => ({
  user: one(user, {
    fields: [twoFactor.userId],
    references: [user.id],
  }),
}));

export const authPasskeysRelations = relations(passkey, ({ one }) => ({
  user: one(user, {
    fields: [passkey.userId],
    references: [user.id],
  }),
}));

// Workspace relations
export const workspacesRelations = relations(workspaces, ({ many }) => ({
  meta: many(workspaceMeta),
  invitations: many(workspaceInvitations),
  users: many(users),
  categories: many(categories),
  accountCategories: many(accountCategories),
  transactions: many(transactions),
  recurringTemplates: many(recurringTemplates),
  recurringOccurrences: many(recurringOccurrences),
  accounts: many(accounts),
  accountSnapshots: many(accountSnapshots),
  accountUpdateReminders: many(accountUpdateReminders),
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
  createdAccountCategories: many(accountCategories),
  createdTransactions: many(transactions),
  createdRecurringTemplates: many(recurringTemplates),
  createdAccounts: many(accounts),
  createdAccountSnapshots: many(accountSnapshots),
  createdAccountUpdateReminders: many(accountUpdateReminders),
  createdBudgets: many(budgets),
  apiKeys: many(apiKeys),
  oauthAccounts: many(oauthAccounts),
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
  recurringTemplates: many(recurringTemplates),
  budgets: many(budgets),
}));

// Account categories relations
export const accountCategoriesRelations = relations(accountCategories, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [accountCategories.workspace_id],
    references: [workspaces.id],
  }),
  createdBy: one(users, {
    fields: [accountCategories.created_by_user_id],
    references: [users.id],
  }),
  accounts: many(accounts),
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
  account: one(accounts, {
    fields: [transactions.account_id],
    references: [accounts.id],
    relationName: 'transactionAccount',
  }),
  toAccount: one(accounts, {
    fields: [transactions.to_account_id],
    references: [accounts.id],
    relationName: 'transactionToAccount',
  }),
}));

// Recurring templates relations
export const recurringTemplatesRelations = relations(recurringTemplates, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [recurringTemplates.workspace_id],
    references: [workspaces.id],
  }),
  createdBy: one(users, {
    fields: [recurringTemplates.created_by_user_id],
    references: [users.id],
  }),
  category: one(categories, {
    fields: [recurringTemplates.category_id],
    references: [categories.id],
  }),
  account: one(accounts, {
    fields: [recurringTemplates.account_id],
    references: [accounts.id],
  }),
  occurrences: many(recurringOccurrences),
}));

// Recurring occurrences relations
export const recurringOccurrencesRelations = relations(recurringOccurrences, ({ one }) => ({
  template: one(recurringTemplates, {
    fields: [recurringOccurrences.template_id],
    references: [recurringTemplates.id],
  }),
  workspace: one(workspaces, {
    fields: [recurringOccurrences.workspace_id],
    references: [workspaces.id],
  }),
  transaction: one(transactions, {
    fields: [recurringOccurrences.transaction_id],
    references: [transactions.id],
  }),
}));

// Accounts relations
export const accountsRelations = relations(accounts, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [accounts.workspace_id],
    references: [workspaces.id],
  }),
  createdBy: one(users, {
    fields: [accounts.created_by_user_id],
    references: [users.id],
  }),
  category: one(accountCategories, {
    fields: [accounts.category_id],
    references: [accountCategories.id],
  }),
  history: many(accountHistory),
  reminders: many(accountUpdateReminders),
  snapshotItems: many(accountSnapshotItems),
  transactions: many(transactions, { relationName: 'transactionAccount' }),
  incomingTransfers: many(transactions, { relationName: 'transactionToAccount' }),
  recurringTemplates: many(recurringTemplates),
}));

// Account history relations
export const accountHistoryRelations = relations(accountHistory, ({ one }) => ({
  account: one(accounts, {
    fields: [accountHistory.account_id],
    references: [accounts.id],
  }),
}));

// Account update reminders relations
export const accountUpdateRemindersRelations = relations(accountUpdateReminders, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [accountUpdateReminders.workspace_id],
    references: [workspaces.id],
  }),
  createdBy: one(users, {
    fields: [accountUpdateReminders.created_by_user_id],
    references: [users.id],
  }),
  account: one(accounts, {
    fields: [accountUpdateReminders.account_id],
    references: [accounts.id],
  }),
}));

// Account snapshots relations
export const accountSnapshotsRelations = relations(accountSnapshots, ({ one, many }) => ({
  workspace: one(workspaces, {
    fields: [accountSnapshots.workspace_id],
    references: [workspaces.id],
  }),
  createdBy: one(users, {
    fields: [accountSnapshots.created_by_user_id],
    references: [users.id],
  }),
  items: many(accountSnapshotItems),
}));

// Account snapshot items relations
export const accountSnapshotItemsRelations = relations(accountSnapshotItems, ({ one }) => ({
  snapshot: one(accountSnapshots, {
    fields: [accountSnapshotItems.snapshot_id],
    references: [accountSnapshots.id],
  }),
  account: one(accounts, {
    fields: [accountSnapshotItems.account_id],
    references: [accounts.id],
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

// OAuth accounts relations
export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
  user: one(users, {
    fields: [oauthAccounts.user_id],
    references: [users.id],
  }),
}));
