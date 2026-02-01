# Multi-Tenant Workspace Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the personal finance app from single-user to multi-tenant workspace architecture where families share financial data.

**Architecture:** Replace `user_id` with `workspace_id` across all financial tables. Add `created_by_user_id` for audit trails. Users belong to exactly one workspace with role-based access (admin/member).

**Tech Stack:** Drizzle ORM, SQLite (dev), PostgreSQL (prod), Lucia Auth, Astro, TypeScript

**Design Document:** `docs/plans/2026-01-31-multi-tenant-workspace-design.md`

---

## Phase 1: Database Schema (New Tables)

### Task 1.1: Create workspaces table (SQLite)

**Files:**

- Create: `src/db/schema/sqlite/workspaces.ts`

**Step 1: Create the workspaces table schema**

```typescript
// src/db/schema/sqlite/workspaces.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';

export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
});
```

**Step 2: Verify file created**

Run: `cat src/db/schema/sqlite/workspaces.ts`
Expected: File content matches above

---

### Task 1.2: Create workspace_meta table (SQLite)

**Files:**

- Create: `src/db/schema/sqlite/workspace-meta.ts`

**Step 1: Create the workspace_meta table schema**

```typescript
// src/db/schema/sqlite/workspace-meta.ts
import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { workspaces } from './workspaces';

export const workspaceMeta = sqliteTable(
  'workspace_meta',
  {
    id: text('id').primaryKey(),
    workspace_id: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    meta_key: text('meta_key').notNull(),
    meta_value: text('meta_value').notNull(),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
    updated_at: integer('updated_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  },
  (table) => [unique('workspace_meta_unique').on(table.workspace_id, table.meta_key)]
);
```

**Step 2: Verify file created**

Run: `cat src/db/schema/sqlite/workspace-meta.ts`
Expected: File content matches above

---

### Task 1.3: Create workspace_invitations table (SQLite)

**Files:**

- Create: `src/db/schema/sqlite/workspace-invitations.ts`

**Step 1: Create the workspace_invitations table schema**

```typescript
// src/db/schema/sqlite/workspace-invitations.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { workspaces } from './workspaces';
import { users } from './users';

export const workspaceInvitations = sqliteTable('workspace_invitations', {
  id: text('id').primaryKey(),
  workspace_id: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  invited_by_user_id: text('invited_by_user_id').references(() => users.id),
  role: text('role', { enum: ['admin', 'member'] }).notNull(),
  expires_at: integer('expires_at', { mode: 'timestamp' }).notNull(),
  accepted_at: integer('accepted_at', { mode: 'timestamp' }),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
});
```

**Step 2: Verify file created**

Run: `cat src/db/schema/sqlite/workspace-invitations.ts`
Expected: File content matches above

---

### Task 1.4: Modify users table (SQLite)

**Files:**

- Modify: `src/db/schema/sqlite/users.ts`

**Step 1: Update users table with workspace_id, role, and deleted_at**

```typescript
// src/db/schema/sqlite/users.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { workspaces } from './workspaces';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  workspace_id: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role', { enum: ['admin', 'member'] }).notNull(),
  deleted_at: integer('deleted_at', { mode: 'timestamp' }),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
});
```

**Step 2: Verify file updated**

Run: `cat src/db/schema/sqlite/users.ts`
Expected: File contains workspace_id, role, and deleted_at fields

---

### Task 1.5: Update schema index exports (SQLite)

**Files:**

- Modify: `src/db/schema/sqlite/index.ts`

**Step 1: Add new table exports**

```typescript
// src/db/schema/sqlite/index.ts
// Add these exports (order matters for dependencies)
export * from './workspaces';
export * from './workspace-meta';
export * from './workspace-invitations';
export * from './users';
export * from './user-meta';
export * from './sessions';
export * from './password-reset-tokens';
export * from './categories';
export * from './asset-categories';
export * from './transactions';
export * from './assets';
export * from './asset-history';
export * from './asset-update-reminders';
export * from './asset-snapshots';
export * from './asset-snapshot-items';
export * from './exchange-rates';
export * from './audit-logs';
export * from './budgets';

// Export all relations (centralized to avoid circular imports)
export * from './relations';
```

**Step 2: Verify file updated**

Run: `grep -c "workspaces" src/db/schema/sqlite/index.ts`
Expected: At least 2 matches (workspaces, workspace-meta, workspace-invitations)

---

### Task 1.6: Commit Phase 1.1 - New workspace tables

**Step 1: Run quality gates**

```bash
bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck
```

Expected: All pass

**Step 2: Commit**

```bash
git add src/db/schema/sqlite/workspaces.ts src/db/schema/sqlite/workspace-meta.ts src/db/schema/sqlite/workspace-invitations.ts src/db/schema/sqlite/users.ts src/db/schema/sqlite/index.ts
git commit -m "$(cat <<'EOF'
feat(schema): add workspace tables and modify users table

- Add workspaces table (id, name, timestamps)
- Add workspace_meta table (key-value settings)
- Add workspace_invitations table (member invites)
- Update users table with workspace_id, role, deleted_at
EOF
)"
```

---

## Phase 2: Database Schema (Modify Financial Tables)

### Task 2.1: Modify categories table

**Files:**

- Modify: `src/db/schema/sqlite/categories.ts`

**Step 1: Replace user_id with workspace_id, add created_by_user_id**

```typescript
// src/db/schema/sqlite/categories.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { workspaces } from './workspaces';
import { users } from './users';

export const categories = sqliteTable('budget_categories', {
  id: text('id').primaryKey(),
  workspace_id: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  created_by_user_id: text('created_by_user_id')
    .notNull()
    .references(() => users.id),
  name: text('name').notNull(),
  type: text('type', { enum: ['expense', 'income'] }).notNull(),
  description: text('description'),
  icon: text('icon').default('tag').notNull(),
  color: text('color').default('bg-neutral').notNull(),
  is_active: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
});
```

**Step 2: Verify file updated**

Run: `grep "workspace_id" src/db/schema/sqlite/categories.ts`
Expected: workspace_id field present

---

### Task 2.2: Modify asset_categories table

**Files:**

- Modify: `src/db/schema/sqlite/asset-categories.ts`

**Step 1: Replace user_id with workspace_id, add created_by_user_id**

```typescript
// src/db/schema/sqlite/asset-categories.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { workspaces } from './workspaces';
import { users } from './users';

export const assetCategories = sqliteTable('asset_categories', {
  id: text('id').primaryKey(),
  workspace_id: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  created_by_user_id: text('created_by_user_id')
    .notNull()
    .references(() => users.id),
  name: text('name').notNull(),
  description: text('description'),
  is_liability: integer('is_liability', { mode: 'boolean' }).default(false).notNull(),
  is_system: integer('is_system', { mode: 'boolean' }).default(false).notNull(),
  sort_order: integer('sort_order').default(0).notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
});
```

---

### Task 2.3: Modify transactions table

**Files:**

- Modify: `src/db/schema/sqlite/transactions.ts`

**Step 1: Replace user_id with workspace_id, add created_by_user_id**

```typescript
// src/db/schema/sqlite/transactions.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { workspaces } from './workspaces';
import { users } from './users';
import { categories } from './categories';
import { assets } from './assets';

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey(),
  workspace_id: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  created_by_user_id: text('created_by_user_id')
    .notNull()
    .references(() => users.id),
  category_id: text('category_id').references(() => categories.id),
  asset_id: text('asset_id')
    .notNull()
    .references(() => assets.id),
  to_asset_id: text('to_asset_id').references(() => assets.id),
  type: text('type', { enum: ['expense', 'income', 'transfer'] }).notNull(),
  amount: text('amount').notNull(),
  currency: text('currency', { enum: ['IDR', 'USD'] }).notNull(),
  description: text('description'),
  transaction_date: integer('transaction_date', { mode: 'timestamp' }).notNull(),
  deleted_at: integer('deleted_at', { mode: 'timestamp' }),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
});
```

---

### Task 2.4: Modify assets table

**Files:**

- Modify: `src/db/schema/sqlite/assets.ts`

**Step 1: Replace user_id with workspace_id, add created_by_user_id**

```typescript
// src/db/schema/sqlite/assets.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { workspaces } from './workspaces';
import { users } from './users';
import { assetCategories } from './asset-categories';

export const assets = sqliteTable('assets', {
  id: text('id').primaryKey(),
  workspace_id: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  created_by_user_id: text('created_by_user_id')
    .notNull()
    .references(() => users.id),
  name: text('name').notNull(),
  type: text('type', {
    enum: [
      'cash',
      'bank_account',
      'e_wallet',
      'mutual_fund',
      'bond',
      'crypto',
      'stock',
      'other',
      'credit_card',
      'loan',
    ],
  }).notNull(),
  category_id: text('category_id').references(() => assetCategories.id),
  balance: text('balance').notNull(),
  currency: text('currency', { enum: ['IDR', 'USD'] }).notNull(),
  credit_limit: text('credit_limit'),
  is_cash_account: integer('is_cash_account', { mode: 'boolean' }).default(false).notNull(),
  last_updated: integer('last_updated', { mode: 'timestamp' })
    .default(sqliteTimestampNow)
    .notNull(),
  deleted_at: integer('deleted_at', { mode: 'timestamp' }),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  updated_at: integer('updated_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
});
```

---

### Task 2.5: Modify budgets table

**Files:**

- Modify: `src/db/schema/sqlite/budgets.ts`

**Step 1: Replace user_id with workspace_id, add created_by_user_id**

```typescript
// src/db/schema/sqlite/budgets.ts
import { sqliteTable, text, integer, unique } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { workspaces } from './workspaces';
import { users } from './users';
import { categories } from './categories';

export const budgets = sqliteTable(
  'budgets',
  {
    id: text('id').primaryKey(),
    workspace_id: text('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    created_by_user_id: text('created_by_user_id')
      .notNull()
      .references(() => users.id),
    category_id: text('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'cascade' }),
    month: integer('month').notNull(),
    year: integer('year').notNull(),
    budget_amount: text('budget_amount').notNull(),
    currency: text('currency', { enum: ['IDR', 'USD'] }).notNull(),
    is_closed: integer('is_closed', { mode: 'boolean' }).default(false).notNull(),
    notes: text('notes'),
    created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
    updated_at: integer('updated_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
  },
  (table) => [
    unique('budgets_unique').on(table.workspace_id, table.category_id, table.month, table.year),
  ]
);
```

---

### Task 2.6: Modify asset_snapshots table

**Files:**

- Modify: `src/db/schema/sqlite/asset-snapshots.ts`

**Step 1: Replace user_id with workspace_id, add created_by_user_id**

```typescript
// src/db/schema/sqlite/asset-snapshots.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { workspaces } from './workspaces';
import { users } from './users';

export const assetSnapshots = sqliteTable('asset_snapshots', {
  id: text('id').primaryKey(),
  workspace_id: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  created_by_user_id: text('created_by_user_id')
    .notNull()
    .references(() => users.id),
  snapshot_date: integer('snapshot_date', { mode: 'timestamp' }).notNull(),
  month: integer('month').notNull(),
  year: integer('year').notNull(),
  notes: text('notes'),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
});
```

---

### Task 2.7: Modify asset_update_reminders table

**Files:**

- Modify: `src/db/schema/sqlite/asset-update-reminders.ts`

**Step 1: Replace user_id with workspace_id, add created_by_user_id**

```typescript
// src/db/schema/sqlite/asset-update-reminders.ts
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
  frequency: text('frequency', { enum: ['weekly', 'monthly', 'quarterly'] }).notNull(),
  last_updated: integer('last_updated', { mode: 'timestamp' }),
  next_reminder: integer('next_reminder', { mode: 'timestamp' }),
  is_dismissed: integer('is_dismissed', { mode: 'boolean' }).default(false).notNull(),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
});
```

---

### Task 2.8: Modify audit_logs table

**Files:**

- Modify: `src/db/schema/sqlite/audit-logs.ts`

**Step 1: Replace user_id with workspace_id, add user_id for actor**

```typescript
// src/db/schema/sqlite/audit-logs.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';
import { workspaces } from './workspaces';
import { users } from './users';

export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  workspace_id: text('workspace_id')
    .notNull()
    .references(() => workspaces.id, { onDelete: 'cascade' }),
  user_id: text('user_id')
    .notNull()
    .references(() => users.id),
  action: text('action').notNull(),
  entity_type: text('entity_type').notNull(),
  entity_id: text('entity_id'),
  old_value: text('old_value'),
  new_value: text('new_value'),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
});
```

---

### Task 2.9: Update relations file

**Files:**

- Modify: `src/db/schema/sqlite/relations.ts`

**Step 1: Update all relations for workspace-centric schema**

```typescript
// src/db/schema/sqlite/relations.ts
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
```

---

### Task 2.10: Commit Phase 2 - Modified financial tables

**Step 1: Run quality gates**

```bash
bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck
```

Expected: All pass (may have errors until services updated)

**Step 2: Commit**

```bash
git add src/db/schema/sqlite/
git commit -m "$(cat <<'EOF'
feat(schema): convert financial tables to workspace-centric

- Replace user_id with workspace_id in all financial tables
- Add created_by_user_id for audit trail
- Update relations for workspace architecture
- Tables modified: categories, asset_categories, transactions,
  assets, budgets, asset_snapshots, asset_update_reminders, audit_logs
EOF
)"
```

---

## Phase 3: PostgreSQL Schema (Mirror SQLite)

### Task 3.1: Create PostgreSQL workspace tables

**Files:**

- Create: `src/db/schema/postgresql/workspaces.ts`
- Create: `src/db/schema/postgresql/workspace-meta.ts`
- Create: `src/db/schema/postgresql/workspace-invitations.ts`

Mirror the SQLite schemas but use PostgreSQL-specific types (pgTable, timestamp instead of integer timestamps).

---

### Task 3.2: Modify PostgreSQL financial tables

**Files:**

- Modify: `src/db/schema/postgresql/users.ts`
- Modify: `src/db/schema/postgresql/categories.ts`
- Modify: `src/db/schema/postgresql/asset-categories.ts`
- Modify: `src/db/schema/postgresql/transactions.ts`
- Modify: `src/db/schema/postgresql/assets.ts`
- Modify: `src/db/schema/postgresql/budgets.ts`
- Modify: `src/db/schema/postgresql/asset-snapshots.ts`
- Modify: `src/db/schema/postgresql/asset-update-reminders.ts`
- Modify: `src/db/schema/postgresql/audit-logs.ts`

Mirror the SQLite changes for PostgreSQL dialect.

---

### Task 3.3: Update PostgreSQL index and relations

**Files:**

- Modify: `src/db/schema/postgresql/index.ts`
- Modify: `src/db/schema/postgresql/relations.ts`

Mirror the SQLite changes.

---

### Task 3.4: Commit Phase 3 - PostgreSQL schema

```bash
git add src/db/schema/postgresql/
git commit -m "feat(schema): add PostgreSQL workspace schema (mirrors SQLite)"
```

---

## Phase 4: Type Definitions & Constants

### Task 4.1: Add workspace meta keys constant

**Files:**

- Create: `src/lib/constants/workspace-meta-keys.ts`

**Step 1: Create workspace meta keys**

```typescript
// src/lib/constants/workspace-meta-keys.ts
export const WORKSPACE_META_KEYS = {
  CURRENCY: 'currency',
  WEEK_START: 'week_start',
  COMPACT_NUMBERS: 'compact_numbers',
} as const;

export type WorkspaceMetaKey = (typeof WORKSPACE_META_KEYS)[keyof typeof WORKSPACE_META_KEYS];

export const WORKSPACE_META_DEFAULTS: Record<WorkspaceMetaKey, string> = {
  [WORKSPACE_META_KEYS.CURRENCY]: 'IDR',
  [WORKSPACE_META_KEYS.WEEK_START]: 'monday',
  [WORKSPACE_META_KEYS.COMPACT_NUMBERS]: 'true',
};

export const ALLOWED_WORKSPACE_META_KEYS = Object.values(WORKSPACE_META_KEYS);
```

---

### Task 4.2: Update constants index

**Files:**

- Modify: `src/lib/constants/index.ts`

**Step 1: Export workspace meta keys**

Add: `export * from './workspace-meta-keys';`

---

### Task 4.3: Update User type in Lucia

**Files:**

- Modify: `src/lib/auth/lucia.ts`
- Modify: `src/lib/auth/lucia.d.ts`

**Step 1: Update User type to include workspaceId and role**

```typescript
// In lucia.ts getUserAttributes:
getUserAttributes: (databaseUser: any) => {
  return {
    id: databaseUser.id,
    email: databaseUser.email,
    name: databaseUser.name,
    workspaceId: databaseUser.workspace_id,
    role: databaseUser.role as 'admin' | 'member',
    deletedAt: databaseUser.deleted_at,
  };
},
```

**Step 2: Update User type definition**

```typescript
// In lucia.d.ts or lucia.ts:
export type User = {
  id: string;
  email: string;
  name: string;
  workspaceId: string;
  role: 'admin' | 'member';
  deletedAt: Date | null;
};
```

---

### Task 4.4: Update env.d.ts with new User type

**Files:**

- Modify: `src/env.d.ts`

Update the User type import and Locals interface to include workspace context.

---

### Task 4.5: Commit Phase 4 - Types and constants

```bash
git add src/lib/constants/ src/lib/auth/ src/env.d.ts
git commit -m "feat(types): add workspace types and update User type"
```

---

## Phase 5: Services Layer Update

### Task 5.1: Create WorkspaceService

**Files:**

- Create: `src/services/workspace.service.ts`
- Create: `src/services/workspace.service.test.ts`

Implement methods: create, findById, delete, getMembers, etc.

---

### Task 5.2: Create WorkspaceMetaService

**Files:**

- Create: `src/services/workspace-meta.service.ts`
- Create: `src/services/workspace-meta.service.test.ts`

Implement methods: get, set, getAll for workspace settings.

---

### Task 5.3: Create WorkspaceInvitationService

**Files:**

- Create: `src/services/workspace-invitation.service.ts`
- Create: `src/services/workspace-invitation.service.test.ts`

Implement methods: create, findByToken, accept, cancel, resend.

---

### Task 5.4: Update TransactionService

**Files:**

- Modify: `src/services/transaction.service.ts`
- Modify: `src/services/transaction.service.test.ts`

Change all queries from `user_id` to `workspace_id`. Add `created_by_user_id` to create operations.

---

### Task 5.5: Update CategoryService

**Files:**

- Modify: `src/services/category.service.ts`
- Modify: `src/services/category.service.test.ts`

Change all queries from `user_id` to `workspace_id`. Add `created_by_user_id` to create operations.

---

### Task 5.6: Update remaining services

Update all services following the same pattern:

- `asset.service.ts`
- `asset-category.service.ts`
- `budget.service.ts`
- `dashboard.service.ts`
- `report.service.ts`

---

### Task 5.7: Update services index

**Files:**

- Modify: `src/services/index.ts`

Add exports for new workspace services.

---

### Task 5.8: Commit Phase 5 - Services

```bash
git add src/services/
git commit -m "feat(services): update services for workspace-centric architecture"
```

---

## Phase 6: Auth & Middleware Update

### Task 6.1: Update middleware for workspace context

**Files:**

- Modify: `src/middleware.ts`

**Step 1: Add workspace_id and role to locals**

Update the middleware to:

1. Check `user.deleted_at` is null (reject soft-deleted users)
2. Attach `user.workspaceId` and `user.role` to locals

---

### Task 6.2: Create requireAdmin helper

**Files:**

- Modify: `src/lib/auth/requireAuth.ts`

**Step 1: Add requireAdmin function**

```typescript
export function requireAdmin(astro: any): AuthCheckResult {
  const authResult = requireAuth(astro);
  if (authResult) return authResult;

  if (astro.locals?.user?.role !== 'admin') {
    return new Response(JSON.stringify({ error: 'Admin access required' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return null;
}
```

---

### Task 6.3: Update signup flow for invitations

**Files:**

- Modify: `src/pages/api/auth/signup.ts`

Update to handle invitation token flow:

1. If `?token` present, validate invitation
2. Create user with `workspace_id` and `role` from invitation
3. Mark invitation as accepted

---

### Task 6.4: Update login to check deleted_at

**Files:**

- Modify: `src/pages/api/auth/login.ts`

Add check: reject login if `user.deleted_at` is not null.

---

### Task 6.5: Commit Phase 6 - Auth

```bash
git add src/middleware.ts src/lib/auth/ src/pages/api/auth/
git commit -m "feat(auth): update auth for workspace-centric architecture"
```

---

## Phase 7: API Endpoints Update

### Task 7.1: Update getAuthenticatedUser helper

**Files:**

- Modify: `src/lib/api-utils.ts`

Update to return `{ userId, workspaceId, role }` instead of just `userId`.

---

### Task 7.2: Update transaction endpoints

**Files:**

- Modify: `src/pages/api/transactions/index.ts`
- Modify: `src/pages/api/transactions/[id].ts`

Replace `user_id` with `workspace_id` in all queries. Pass `created_by_user_id` on creates.

---

### Task 7.3: Update category endpoints

**Files:**

- Modify: `src/pages/api/categories/index.ts`
- Modify: `src/pages/api/categories/[id].ts`

Replace `user_id` with `workspace_id` in all queries.

---

### Task 7.4: Update remaining endpoints

Update all API endpoints following the same pattern:

- `src/pages/api/assets/`
- `src/pages/api/asset-categories/`
- `src/pages/api/budget/`
- `src/pages/api/budgets/`
- `src/pages/api/reports/`
- `src/pages/api/forecast/`
- `src/pages/api/user/`

---

### Task 7.5: Create workspace management endpoints

**Files:**

- Create: `src/pages/api/workspace/settings.ts` (GET/PUT workspace_meta)
- Create: `src/pages/api/workspace/members.ts` (GET members, DELETE remove member)
- Create: `src/pages/api/workspace/invitations.ts` (POST invite, GET pending, DELETE cancel)

---

### Task 7.6: Commit Phase 7 - API

```bash
git add src/lib/api-utils.ts src/pages/api/
git commit -m "feat(api): update API endpoints for workspace-centric architecture"
```

---

## Phase 8: Database Seed & CLI

### Task 8.1: Update seed script

**Files:**

- Modify: `src/db/seed.ts`

Update to:

1. Create workspace first
2. Create demo user with `workspace_id` and `role: 'admin'`
3. Seed default `workspace_meta` values
4. Update all seeding functions to use `workspace_id` and `created_by_user_id`

---

### Task 8.2: Create CLI for workspace management

**Files:**

- Create: `src/cli/create-workspace.ts`
- Create: `src/cli/list-workspaces.ts`
- Create: `src/cli/delete-workspace.ts`

---

### Task 8.3: Update package.json scripts

**Files:**

- Modify: `package.json`

Add CLI commands:

```json
{
  "scripts": {
    "cli:create-workspace": "bun run src/cli/create-workspace.ts",
    "cli:list-workspaces": "bun run src/cli/list-workspaces.ts",
    "cli:delete-workspace": "bun run src/cli/delete-workspace.ts"
  }
}
```

---

### Task 8.4: Commit Phase 8 - Seed & CLI

```bash
git add src/db/seed.ts src/cli/ package.json
git commit -m "feat(cli): add workspace management CLI and update seed script"
```

---

## Phase 9: Generate Migration & Reset Database

### Task 9.1: Generate new migration

```bash
bun run db:generate
```

This will create migration files for the new schema.

---

### Task 9.2: Reset database with new schema

```bash
bun run db:reset
```

This drops all tables and recreates with new schema.

---

### Task 9.3: Run seed with workspace data

```bash
bun run db:seed
```

Seeds the database with demo workspace and data.

---

### Task 9.4: Verify database structure

```bash
sqlite3 data/expenses.db ".schema"
```

Expected: All tables have workspace_id columns, new workspace tables exist.

---

### Task 9.5: Commit Phase 9 - Migration

```bash
git add drizzle/
git commit -m "chore(db): generate migration for workspace-centric schema"
```

---

## Phase 10: UI Updates (Settings Page)

### Task 10.1: Update settings page for workspace settings

**Files:**

- Modify: `src/pages/settings/index.astro`

Update to:

1. Fetch settings from `/api/workspace/settings`
2. Admin-only sections for member management
3. Role-based UI visibility

---

### Task 10.2: Add member management UI

**Files:**

- Create: `src/components/organisms/MemberList.astro`
- Create: `src/components/organisms/InviteMemberModal.astro`

---

### Task 10.3: Update signup page for invitation flow

**Files:**

- Modify: `src/pages/signup.astro`

Handle `?token` parameter to show invitation-based signup form.

---

### Task 10.4: Commit Phase 10 - UI

```bash
git add src/pages/ src/components/
git commit -m "feat(ui): update settings page for workspace management"
```

---

## Phase 11: Testing & Validation

### Task 11.1: Run all existing tests

```bash
bun test
```

Fix any failing tests due to schema changes.

---

### Task 11.2: Add workspace isolation tests

**Files:**

- Create: `src/services/workspace.service.integration.test.ts`

Test that users in workspace A cannot access workspace B data.

---

### Task 11.3: Add role permission tests

Test that:

- Members cannot invite/remove users
- Members cannot edit workspace settings
- Both roles can CRUD financial data

---

### Task 11.4: Add invitation flow tests

Test:

- Token generation and validation
- Token expiry
- Duplicate email handling
- Successful signup via token

---

### Task 11.5: Run E2E tests

```bash
bun run test:e2e
```

---

### Task 11.6: Commit Phase 11 - Tests

```bash
git add src/services/*.test.ts
git commit -m "test: add workspace isolation and permission tests"
```

---

## Phase 12: Documentation Update

### Task 12.1: Update database schema docs

**Files:**

- Modify: `docs/architecture/004-database-schema.md`

Update ERD and table documentation for workspace-centric schema.

---

### Task 12.2: Update OpenAPI docs

**Files:**

- Modify: `openapi/paths/` (add workspace endpoints)
- Modify: `openapi/schemas/` (add workspace schemas)

---

### Task 12.3: Commit Phase 12 - Documentation

```bash
git add docs/ openapi/
git commit -m "docs: update documentation for workspace architecture"
```

---

## Summary

**Total Tasks:** ~50 discrete tasks across 12 phases

**Implementation Order:**

1. Database schema (new tables, modify existing)
2. Type definitions
3. Services layer
4. Auth & middleware
5. API endpoints
6. Seed & CLI
7. Database migration
8. UI updates
9. Testing
10. Documentation

**Key Files to Modify:**

- 18 schema files (SQLite + PostgreSQL)
- 9 service files
- 20+ API endpoint files
- Middleware, auth helpers, seed script
- Settings UI components

**Testing Strategy:**

- Unit tests for services
- Integration tests for workspace isolation
- E2E tests for invitation flow
- Role permission tests
