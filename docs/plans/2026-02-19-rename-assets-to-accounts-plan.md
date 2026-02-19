# Rename Assets to Accounts — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rename all "asset(s)" terminology to "account(s)" across the entire codebase — DB schema, types, services, API routes, pages, components, tests, OpenAPI, MCP server, E2E tests, and config.

**Architecture:** Pure find-and-replace rename with no logic changes. Files are renamed with `git mv`, then contents updated with search-replace. Drizzle migrations are regenerated from scratch (drop old, generate new) since the app hasn't launched.

**Tech Stack:** Astro, Drizzle ORM (SQLite + PostgreSQL dual-dialect), TypeScript, DaisyUI, Playwright E2E, MCP server

---

## Naming Convention Reference

Use this table for all renames throughout the plan:

| Old                                     | New                                         |
| --------------------------------------- | ------------------------------------------- |
| `assets` (table/var)                    | `accounts`                                  |
| `asset_categories` (table)              | `account_categories`                        |
| `asset_history` (table)                 | `account_history`                           |
| `asset_snapshots` (table)               | `account_snapshots`                         |
| `asset_snapshot_items` (table)          | `account_snapshot_items`                    |
| `asset_update_reminders` (table)        | `account_update_reminders`                  |
| `AssetType`                             | `AccountType`                               |
| `AssetPriority`                         | `AccountPriority`                           |
| `Asset` / `AssetOutput`                 | `Account` / `AccountOutput`                 |
| `AssetHistory` / `AssetHistoryOutput`   | `AccountHistory` / `AccountHistoryOutput`   |
| `AssetCategory` / `AssetCategoryOutput` | `AccountCategory` / `AccountCategoryOutput` |
| `AssetSummaryByCurrency`                | `AccountSummaryByCurrency`                  |
| `AssetSummaryByType`                    | `AccountSummaryByType`                      |
| `AssetService`                          | `AccountService`                            |
| `AssetCategoryService`                  | `AccountCategoryService`                    |
| `assetService`                          | `accountService`                            |
| `assetCategoryService`                  | `accountCategoryService`                    |
| `ASSET_TYPE_*`                          | `ACCOUNT_TYPE_*`                            |
| `CacheTags.ASSETS`                      | `CacheTags.ACCOUNTS`                        |
| `CacheTags.ASSET_CATEGORIES`            | `CacheTags.ACCOUNT_CATEGORIES`              |
| `CacheKeys.assets`                      | `CacheKeys.accounts`                        |
| `CacheKeys.assetCategories`             | `CacheKeys.accountCategories`               |
| `/assets` (URL)                         | `/accounts`                                 |
| `/api/assets`                           | `/api/accounts`                             |
| `/api/asset-categories`                 | `/api/account-categories`                   |
| `Asset*` (component)                    | `Account*`                                  |
| `AssetsPage` (E2E)                      | `AccountsPage`                              |
| `AssetFormData` (E2E)                   | `AccountFormData`                           |
| UI label "Portfolio"                    | "Accounts"                                  |
| UI label "Asset"                        | "Account"                                   |

**What does NOT change:** `account_class`, `AccountClass` type, enum values (`cash`, `bank_account`, etc.), business logic.

---

### Task 1: Rename DB Schema Files (SQLite)

**Files:**

- Rename: `src/db/schema/sqlite/assets.ts` → `src/db/schema/sqlite/accounts.ts`
- Rename: `src/db/schema/sqlite/asset-categories.ts` → `src/db/schema/sqlite/account-categories.ts`
- Rename: `src/db/schema/sqlite/asset-history.ts` → `src/db/schema/sqlite/account-history.ts`
- Rename: `src/db/schema/sqlite/asset-snapshots.ts` → `src/db/schema/sqlite/account-snapshots.ts`
- Rename: `src/db/schema/sqlite/asset-snapshot-items.ts` → `src/db/schema/sqlite/account-snapshot-items.ts`
- Rename: `src/db/schema/sqlite/asset-update-reminders.ts` → `src/db/schema/sqlite/account-update-reminders.ts`
- Modify: `src/db/schema/sqlite/index.ts` — update imports
- Modify: `src/db/schema/sqlite/relations.ts` — update references
- Modify: `src/db/schema/sqlite/transactions.ts` — update foreign key references to assets table

**Step 1: Rename files with git mv**

```bash
cd src/db/schema/sqlite
git mv assets.ts accounts.ts
git mv asset-categories.ts account-categories.ts
git mv asset-history.ts account-history.ts
git mv asset-snapshots.ts account-snapshots.ts
git mv asset-snapshot-items.ts account-snapshot-items.ts
git mv asset-update-reminders.ts account-update-reminders.ts
```

**Step 2: Update file contents**

In each renamed file, search-replace:

- Table name strings: `'assets'` → `'accounts'`, `'asset_categories'` → `'account_categories'`, etc.
- Exported variable names: `assets` → `accounts`, `assetCategories` → `accountCategories`, `assetHistory` → `accountHistory`, `assetSnapshots` → `accountSnapshots`, `assetSnapshotItems` → `accountSnapshotItems`, `assetUpdateReminders` → `accountUpdateReminders`
- Type references: `AssetType` → `AccountType`, `AssetStatus` → `AccountStatus`
- Foreign key references to assets table

**Step 3: Update index.ts**

Replace all `./asset-*` imports with `./account-*` equivalents, and `./assets` with `./accounts`.

**Step 4: Update relations.ts**

Replace all asset table references with account table references.

**Step 5: Update transactions.ts**

Update the foreign key reference from `assets` to `accounts` table.

---

### Task 2: Rename DB Schema Files (PostgreSQL)

Same as Task 1 but for `src/db/schema/postgresql/`:

**Files:**

- Rename: `src/db/schema/postgresql/assets.ts` → `src/db/schema/postgresql/accounts.ts`
- Rename: `src/db/schema/postgresql/asset-categories.ts` → `src/db/schema/postgresql/account-categories.ts`
- Rename: `src/db/schema/postgresql/asset-history.ts` → `src/db/schema/postgresql/account-history.ts`
- Rename: `src/db/schema/postgresql/asset-snapshots.ts` → `src/db/schema/postgresql/account-snapshots.ts`
- Rename: `src/db/schema/postgresql/asset-snapshot-items.ts` → `src/db/schema/postgresql/account-snapshot-items.ts`
- Rename: `src/db/schema/postgresql/asset-update-reminders.ts` → `src/db/schema/postgresql/account-update-reminders.ts`
- Modify: `src/db/schema/postgresql/index.ts` — update imports
- Modify: `src/db/schema/postgresql/relations.ts` — update references
- Modify: `src/db/schema/postgresql/transactions.ts` — update foreign key references

Follow identical steps as Task 1 for the postgresql directory.

---

### Task 3: Regenerate Drizzle Migrations

Since the app hasn't launched, drop existing migrations and regenerate from new schema.

**Files:**

- Delete: `drizzle/sqlite/0000_woozy_steel_serpent.sql`
- Delete: `drizzle/sqlite/meta/0000_snapshot.json`
- Delete: `drizzle/postgresql/0000_violet_daimon_hellstrom.sql`
- Delete: `drizzle/postgresql/meta/0000_snapshot.json`
- Regenerate: via `bun run db:generate` and `bun run db:generate:prod`

**Step 1: Delete old migrations**

```bash
rm -rf drizzle/sqlite/ drizzle/postgresql/
```

**Step 2: Regenerate SQLite migrations**

```bash
bun run db:generate
```

**Step 3: Regenerate PostgreSQL migrations**

```bash
bun run db:generate:prod
```

**Step 4: Verify new migration files reference `accounts` not `assets`**

```bash
grep -r "asset" drizzle/ || echo "No asset references found - clean!"
```

**Step 5: Update local dev database**

```bash
bun run db:push
```

---

### Task 4: Rename Types

**Files:**

- Rename: `src/lib/types/asset.ts` → `src/lib/types/account.ts`
- Modify: `src/lib/types/index.ts` — update imports and re-exports
- Modify: `src/lib/types/transaction.ts` — update asset references if any

**Step 1: Rename file**

```bash
git mv src/lib/types/asset.ts src/lib/types/account.ts
```

**Step 2: Update type names in `account.ts`**

Search-replace all type names per naming convention table:

- `AssetType` → `AccountType`
- `AssetStatus` → `AccountStatus`
- `Asset` → `Account` (interface)
- `AssetOutput` → `AccountOutput`
- `AssetHistory` → `AccountHistory`
- `AssetHistoryOutput` → `AccountHistoryOutput`
- `AssetSummaryByCurrency` → `AccountSummaryByCurrency`
- `AssetSummaryByType` → `AccountSummaryByType`
- `AssetCategory` → `AccountCategory` (if defined here)
- `ASSET_TYPE_LABELS` → `ACCOUNT_TYPE_LABELS`
- `formatAssetType` → `formatAccountType`
- `getAssetTypeLabel` → `getAccountTypeLabel`
- All references to `asset_categories`, `assets` DB table names in comments

**Step 3: Update `src/lib/types/index.ts`**

- Change `from './asset'` → `from './account'`
- Rename all exported type names to match

**Step 4: Update `src/lib/types/transaction.ts`**

- Rename any `asset_id` field references or `Asset`-related type imports

---

### Task 5: Rename Services

**Files:**

- Rename: `src/services/asset.service.ts` → `src/services/account.service.ts`
- Rename: `src/services/asset-category.service.ts` → `src/services/account-category.service.ts`
- Rename: `src/services/asset-category.service.test.ts` → `src/services/account-category.service.test.ts`
- Modify: `src/services/index.ts` — update imports, class names, singleton names
- Modify: `src/services/service-errors.ts` — update asset error classes/messages
- Modify: `src/services/transaction.service.ts` — update asset references
- Modify: `src/services/transaction.service.test.ts` — update asset references
- Modify: `src/services/dashboard.service.ts` — update asset references
- Modify: `src/services/dashboard.service.test.ts` — update asset references
- Modify: `src/services/report.service.ts` — update asset references
- Modify: `src/services/report.service.test.ts` — update asset references
- Modify: `src/services/workspace.service.ts` — update asset references
- Modify: `src/services/super-admin.service.ts` — update asset references
- Modify: `src/services/auth.service.ts` — update asset references (if any)
- Modify: `src/services/test-helpers/mocks.ts` — update mock references

**Step 1: Rename service files**

```bash
git mv src/services/asset.service.ts src/services/account.service.ts
git mv src/services/asset-category.service.ts src/services/account-category.service.ts
git mv src/services/asset-category.service.test.ts src/services/account-category.service.test.ts
```

**Step 2: Update class names in renamed files**

- `AssetService` → `AccountService`
- `AssetCategoryService` → `AccountCategoryService`
- All internal `asset`/`Asset` variable and method references

**Step 3: Update `src/services/index.ts`**

- Import paths: `./asset.service` → `./account.service`, `./asset-category.service` → `./account-category.service`
- Class names: `AssetService` → `AccountService`, `AssetCategoryService` → `AccountCategoryService`
- Singleton names: `assetService` → `accountService`, `assetCategoryService` → `accountCategoryService`
- Re-exports: update `export *` lines

**Step 4: Update dependent services**

In each file listed above, search-replace:

- `assetService` → `accountService`
- `assetCategoryService` → `accountCategoryService`
- `AssetService` → `AccountService`
- Import paths from `./asset.service` → `./account.service`
- Any string literals referencing "asset" in error messages

---

### Task 6: Rename Service Tests

**Files:**

- Rename all files in `src/services/__tests__/`:
  - `asset-service-cache.test.ts` → `account-service-cache.test.ts`
  - `asset-category-service-cache.test.ts` → `account-category-service-cache.test.ts`
  - `asset-close.test.ts` → `account-close.test.ts`
  - `asset-closed-protection.test.ts` → `account-closed-protection.test.ts`
  - `asset-currency-lock.test.ts` → `account-currency-lock.test.ts`
  - `asset-last-balance-before.test.ts` → `account-last-balance-before.test.ts`
  - `asset-reopen.test.ts` → `account-reopen.test.ts`
  - `asset-snapshot-nplus1.test.ts` → `account-snapshot-nplus1.test.ts`
  - `asset-transfer.test.ts` → `account-transfer.test.ts`
  - `asset-with-history-nplus1.test.ts` → `account-with-history-nplus1.test.ts`
- Modify: `src/services/__tests__/mocks.ts` — update asset references
- Modify: `src/services/__tests__/mocks/dashboard-generator.ts` — update references
- Modify: `src/services/__tests__/mocks/dashboard-mocks.ts` — update references
- Modify: `src/services/__tests__/onboarding-status.test.ts` — update references

**Step 1: Rename test files**

```bash
cd src/services/__tests__
git mv asset-service-cache.test.ts account-service-cache.test.ts
git mv asset-category-service-cache.test.ts account-category-service-cache.test.ts
git mv asset-close.test.ts account-close.test.ts
git mv asset-closed-protection.test.ts account-closed-protection.test.ts
git mv asset-currency-lock.test.ts account-currency-lock.test.ts
git mv asset-last-balance-before.test.ts account-last-balance-before.test.ts
git mv asset-reopen.test.ts account-reopen.test.ts
git mv asset-snapshot-nplus1.test.ts account-snapshot-nplus1.test.ts
git mv asset-transfer.test.ts account-transfer.test.ts
git mv asset-with-history-nplus1.test.ts account-with-history-nplus1.test.ts
```

**Step 2: Update all test file contents**

Search-replace in each file:

- Import paths (service imports, schema imports, type imports)
- Variable names (`asset` → `account`, `assets` → `accounts`)
- Test descriptions ("asset" → "account" in test names/strings)
- Mock data keys and references

**Step 3: Update mock files**

Update `mocks.ts`, `dashboard-generator.ts`, `dashboard-mocks.ts` with same renames.

---

### Task 7: Rename Utilities, Constants, Validation, API Client

**Files:**

- Rename: `src/lib/utils/asset.ts` → `src/lib/utils/account.ts`
- Rename: `src/lib/utils/asset.test.ts` → `src/lib/utils/account.test.ts`
- Rename: `src/lib/constants/asset-categories.ts` → `src/lib/constants/account-categories.ts`
- Rename: `src/lib/validation/asset-categories.ts` → `src/lib/validation/account-categories.ts`
- Rename: `src/lib/api/assetCategoryApiClient.ts` → `src/lib/api/accountCategoryApiClient.ts`
- Rename: `src/lib/assets/` directory → `src/lib/accounts/`
  - `src/lib/assets/priority.ts` → `src/lib/accounts/priority.ts`
  - `src/lib/assets/priority.test.ts` → `src/lib/accounts/priority.test.ts`
- Modify: `src/lib/constants/index.ts` — update import
- Modify: `src/lib/validation/index.ts` — update imports and re-exports
- Modify: `src/lib/cache/tags.ts` — rename `ASSETS` → `ACCOUNTS`, `ASSET_CATEGORIES` → `ACCOUNT_CATEGORIES`
- Modify: `src/lib/cache/keys.ts` — rename `assets` → `accounts`, `assetCategories` → `accountCategories`, update string literals
- Modify: `src/lib/tokens.ts` — update any asset references
- Modify: `src/lib/landing-content.ts` — update UI strings
- Modify: `src/lib/audit-log.ts` — update asset references
- Modify: `src/lib/audit-log.test.ts` — update references
- Modify: `src/lib/perf/collector.ts` — update references
- Modify: `src/lib/forecast/types.ts` — rename `AssetWithHistory` → `AccountWithHistory`
- Modify: `src/lib/forecast/calculations.ts` — update references
- Modify: `src/lib/forecast/calculations.test.ts` — update references
- Modify: `src/lib/stores/transactionFiltersStore.ts` — update references
- Modify: `src/lib/stores/transactionFiltersStore.test.ts` — update references
- Modify: `src/lib/stores/notificationStore.ts` — update references
- Modify: `src/lib/utils/transaction.ts` — update references
- Modify: `src/lib/utils/transaction.test.ts` — update references
- Modify: `src/lib/utils/transaction-grouping.test.ts` — update references
- Modify: `src/lib/validation/transactions.ts` — update references
- Modify: `src/lib/api/transactionsApiClient.ts` — update references

**Step 1: Rename files**

```bash
git mv src/lib/utils/asset.ts src/lib/utils/account.ts
git mv src/lib/utils/asset.test.ts src/lib/utils/account.test.ts
git mv src/lib/constants/asset-categories.ts src/lib/constants/account-categories.ts
git mv src/lib/validation/asset-categories.ts src/lib/validation/account-categories.ts
git mv src/lib/api/assetCategoryApiClient.ts src/lib/api/accountCategoryApiClient.ts
git mv src/lib/assets src/lib/accounts
```

**Step 2: Update contents of renamed files**

In each file, rename all `asset`/`Asset`/`ASSET` occurrences to `account`/`Account`/`ACCOUNT` per convention table.

Key renames in `src/lib/utils/account.ts`:

- `calculateAssetAllocation` → `calculateAccountAllocation`
- `calculatePortfolioTotals` → `calculatePortfolioTotals` (keep — not asset-specific)
- `groupAssetsByClass` → `groupAccountsByClass`
- `groupAssetsByType` → `groupAccountsByType`
- `getAssetTypeColor` → `getAccountTypeColor`
- `ASSET_TYPE_ORDER` → `ACCOUNT_TYPE_ORDER`

Key renames in `src/lib/accounts/priority.ts`:

- `AssetPriority` → `AccountPriority`
- `calculateAssetPriority` → `calculateAccountPriority`
- `needsAssetUpdate` → `needsAccountUpdate`
- `sortAssetsByPriority` → `sortAccountsByPriority`
- `filterAssetsNeedingUpdate` → `filterAccountsNeedingUpdate`
- `getAssetsByPriority` → `getAccountsByPriority`
- `countAssetsByPriority` → `countAccountsByPriority`

Key renames in `src/lib/constants/account-categories.ts`:

- `DEFAULT_ASSET_CATEGORIES` → `DEFAULT_ACCOUNT_CATEGORIES`

Key renames in `src/lib/validation/account-categories.ts`:

- `createAssetCategorySchema` → `createAccountCategorySchema`
- `updateAssetCategorySchema` → `updateAccountCategorySchema`
- All API schema variants and types

**Step 3: Update barrel exports and dependent files**

Update `src/lib/constants/index.ts`, `src/lib/validation/index.ts`, cache tags/keys, and all other dependent files listed above.

---

### Task 8: Rename API Routes

**Files:**

- Rename directory: `src/pages/api/assets/` → `src/pages/api/accounts/`
- Rename directory: `src/pages/api/asset-categories/` → `src/pages/api/account-categories/`
- Modify: `src/pages/api/forecast/index.ts` — update asset imports/references
- Modify: `src/pages/api/reports/index.ts` — update asset imports/references
- Modify: `src/pages/api/reports/category-drilldown.ts` — update references
- Modify: `src/pages/api/transactions/index.ts` — update asset references
- Modify: `src/pages/api/transactions/[id].ts` — update asset references
- Modify: `src/pages/api/transactions/export/index.ts` — update references
- Modify: `src/pages/api/transactions/import/index.ts` — update references
- Modify: `src/pages/api/transactions/template.ts` — update references
- Modify: `src/pages/api/auth/signup.ts` — update references (if any)
- Modify: `src/pages/api/auth/verify-email.ts` — update references (if any)
- Modify: `src/pages/api/admin/workspaces/index.ts` — update references

**Step 1: Rename directories**

```bash
git mv src/pages/api/assets src/pages/api/accounts
git mv src/pages/api/asset-categories src/pages/api/account-categories
```

**Step 2: Update all file contents in renamed directories**

In every file under `api/accounts/` and `api/account-categories/`:

- Update service imports: `assetService` → `accountService`, etc.
- Update type imports
- Update variable names
- Update error messages and response property names

**Step 3: Update dependent API routes**

Update all other API files that reference assets (forecast, reports, transactions, etc.).

---

### Task 9: Rename Pages

**Files:**

- Rename directory: `src/pages/assets/` → `src/pages/accounts/`
  - Includes: `index.astro`, `[id].astro`, `closed.astro`, `history.astro`, `history/[id].astro`, `categories/index.astro`, `categories/asset-categories.client.ts` → `categories/account-categories.client.ts`
- Modify: `src/pages/dashboard.astro` — update asset widget references
- Modify: `src/pages/forecast/index.astro` — update references
- Modify: `src/pages/reports/index.astro` — update references
- Modify: `src/pages/budget/index.astro` — update references
- Modify: `src/pages/transactions/index.astro` — update references
- Modify: `src/pages/transactions/export.astro` — update references
- Modify: `src/pages/settings/index.astro` — update references
- Modify: `src/pages/admin/workspaces/[id].astro` — update references

**Step 1: Rename directory and client script**

```bash
git mv src/pages/assets src/pages/accounts
git mv src/pages/accounts/categories/asset-categories.client.ts src/pages/accounts/categories/account-categories.client.ts
```

**Step 2: Update all page contents**

In each page file:

- Update component imports: `Asset*` → `Account*`
- Update service imports: `assetService` → `accountService`
- Update type imports
- Update all internal variable names
- Update URL references: `/assets` → `/accounts`, `/api/assets` → `/api/accounts`
- Update UI strings: "Portfolio" → "Accounts", "Asset" → "Account"
- Update `data-*` attributes referencing assets
- Update breadcrumb text

---

### Task 10: Rename Components

**Files to rename (atoms):**

- `src/components/atoms/AssetSelect.astro` → `AccountSelect.astro`
- `src/components/atoms/AssetSelect.stories.ts` → `AccountSelect.stories.ts`

**Files to rename (molecules):**

- `src/components/molecules/AssetInlineHistory.client.ts` → `AccountInlineHistory.client.ts`
- `src/components/molecules/AssetItemRow.astro` → `AccountItemRow.astro`
- `src/components/molecules/AssetItemRow.stories.ts` → `AccountItemRow.stories.ts`

**Files to rename (organisms):**

- `src/components/organisms/AssetActions.astro` → `AccountActions.astro`
- `src/components/organisms/AssetCategoriesRenderer.client.ts` → `AccountCategoriesRenderer.client.ts`
- `src/components/organisms/AssetCategoryDeleteDialog.astro` → `AccountCategoryDeleteDialog.astro`
- `src/components/organisms/AssetCategoryModal.astro` → `AccountCategoryModal.astro`
- `src/components/organisms/AssetDeleteConfirmModal.astro` → `AccountDeleteConfirmModal.astro`
- `src/components/organisms/AssetDeleteConfirmModal.stories.ts` → `AccountDeleteConfirmModal.stories.ts`
- `src/components/organisms/AssetFormModal.astro` → `AccountFormModal.astro`
- `src/components/organisms/AssetFormModal.stories.ts` → `AccountFormModal.stories.ts`
- `src/components/organisms/AssetFormModal.test.ts` → `AccountFormModal.test.ts`
- `src/components/organisms/AssetGroupCard.astro` → `AccountGroupCard.astro`
- `src/components/organisms/AssetGroupCard.stories.ts` → `AccountGroupCard.stories.ts`
- `src/components/organisms/AssetHistoryModal.astro` → `AccountHistoryModal.astro`
- `src/components/organisms/AssetHistoryModal.stories.ts` → `AccountHistoryModal.stories.ts`
- `src/components/organisms/AssetHistoryModal.test.ts` → `AccountHistoryModal.test.ts`
- `src/components/organisms/AssetPortfolioSummary.astro` → `AccountPortfolioSummary.astro`
- `src/components/organisms/AssetPortfolioSummary.stories.ts` → `AccountPortfolioSummary.stories.ts`
- `src/components/organisms/AssetReopenModal.astro` → `AccountReopenModal.astro`
- `src/components/organisms/AssetSearch.client.ts` → `AccountSearch.client.ts`
- `src/components/organisms/AssetTransferModal.astro` → `AccountTransferModal.astro`
- `src/components/organisms/AssetUpdateValueModal.astro` → `AccountUpdateValueModal.astro`
- `src/components/organisms/AssetsWidget.astro` → `AccountsWidget.astro`
- `src/components/organisms/AssetsWidget.stories.ts` → `AccountsWidget.stories.ts`
- `src/components/organisms/AssetsWidget.test.ts` → `AccountsWidget.test.ts`

**Files to rename (partials):**

- `src/components/partials/AssetCategoryTablePartial.astro` → `AccountCategoryTablePartial.astro`
- `src/components/partials/AssetHistoryPartial.astro` → `AccountHistoryPartial.astro`

**Other component files to modify (not renamed, but reference assets):**

- `src/components/layouts/Navigation.astro` — update `/assets` link text and href
- `src/components/layouts/Navigation.stories.ts`
- `src/components/layouts/MobileNavigation.astro` — update `/assets` link
- `src/components/layouts/MobileNavigation.stories.ts`
- `src/components/layouts/MobileNavigation.test.ts`
- `src/components/layouts/Header.stories.ts`
- `src/components/organisms/WealthTrajectory.astro` — update references
- `src/components/organisms/WealthTrajectory.stories.ts`
- `src/components/organisms/TransactionList.astro` — update references
- `src/components/organisms/TransactionList.stories.ts`
- `src/components/organisms/TransactionsPage.client.ts`
- `src/components/organisms/TransactionDrawer.client.ts`
- `src/components/organisms/TransactionDrawer.astro`
- `src/components/organisms/SummaryCards.astro`
- `src/components/organisms/SummaryCards.stories.ts`
- `src/components/organisms/OnboardingChecklist.astro`
- `src/components/organisms/MCPSetupInstructionsModal.astro`
- `src/components/organisms/CategoryDrillDownModal.test.ts`
- `src/components/organisms/AdminWorkspaceTable.astro`
- `src/components/molecules/TransactionCard.astro`
- `src/components/molecules/TransactionEntryForm.astro`
- `src/components/molecules/TransactionFilters.astro`
- `src/components/molecules/TransactionFilters.stories.ts`
- `src/components/molecules/QuickActions.stories.ts`
- `src/components/molecules/RecentTransactionsList.stories.ts`
- `src/components/molecules/NotificationItem.stories.ts`
- `src/components/molecules/CSVImportForm.astro`
- `src/components/molecules/CSVImportForm.client.ts`
- `src/components/molecules/AdminWorkspaceStats.astro`
- `src/components/molecules/atomic-design-reclassify.test.ts`
- `src/components/partials/TransactionHistoryPartial.astro`
- `src/components/partials/ReportSummaryCardsPartial.astro`

**Step 1: Rename all component files**

Use `git mv` for each file (30 renames total).

**Step 2: Update all component contents**

In each renamed file:

- Update internal references, type imports, service imports, URL strings
- Update component names in stories `title` fields
- Update `data-*` attributes
- Update UI text ("Asset" → "Account", "Portfolio" → "Accounts")

**Step 3: Update all non-renamed component files**

Update imports pointing to renamed components, URL references, and UI strings.

---

### Task 11: Rename OpenAPI Specs

**Files to rename:**

- `openapi/schemas/Asset.yml` → `Account.yml`
- `openapi/schemas/AssetCategory.yml` → `AccountCategory.yml`
- `openapi/schemas/AssetCategoriesListResponse.yml` → `AccountCategoriesListResponse.yml`
- `openapi/schemas/AssetCategoryResponse.yml` → `AccountCategoryResponse.yml`
- `openapi/schemas/AssetHistoryItem.yml` → `AccountHistoryItem.yml`
- `openapi/schemas/AssetHistoryListResponse.yml` → `AccountHistoryListResponse.yml`
- `openapi/schemas/AssetResponse.yml` → `AccountResponse.yml`
- `openapi/schemas/AssetsListResponse.yml` → `AccountsListResponse.yml`
- `openapi/schemas/CreateAssetRequest.yml` → `CreateAccountRequest.yml`
- `openapi/schemas/CreateAssetCategoryRequest.yml` → `CreateAccountCategoryRequest.yml`
- `openapi/schemas/UpdateAssetRequest.yml` → `UpdateAccountRequest.yml`
- `openapi/schemas/UpdateAssetBalanceRequest.yml` → `UpdateAccountBalanceRequest.yml`
- `openapi/schemas/UpdateAssetCategoryRequest.yml` → `UpdateAccountCategoryRequest.yml`
- `openapi/paths/assets.yml` → `accounts.yml`
- `openapi/paths/asset-categories.yml` → `account-categories.yml`

**Other files to modify:**

- `openapi.yml` (root) — update all `$ref` paths, tag names, descriptions
- `openapi/paths/forecast.yml` — update asset references
- `openapi/schemas/ForecastResponse.yml` — update references
- `openapi/README.md` — update documentation

**Step 1: Rename files**

```bash
cd openapi/schemas
git mv Asset.yml Account.yml
git mv AssetCategory.yml AccountCategory.yml
git mv AssetCategoriesListResponse.yml AccountCategoriesListResponse.yml
git mv AssetCategoryResponse.yml AccountCategoryResponse.yml
git mv AssetHistoryItem.yml AccountHistoryItem.yml
git mv AssetHistoryListResponse.yml AccountHistoryListResponse.yml
git mv AssetResponse.yml AccountResponse.yml
git mv AssetsListResponse.yml AccountsListResponse.yml
git mv CreateAssetRequest.yml CreateAccountRequest.yml
git mv CreateAssetCategoryRequest.yml CreateAccountCategoryRequest.yml
git mv UpdateAssetRequest.yml UpdateAccountRequest.yml
git mv UpdateAssetBalanceRequest.yml UpdateAccountBalanceRequest.yml
git mv UpdateAssetCategoryRequest.yml UpdateAccountCategoryRequest.yml
cd ../paths
git mv assets.yml accounts.yml
git mv asset-categories.yml account-categories.yml
```

**Step 2: Update all file contents**

In each YAML file, rename schema references, property names, descriptions, and `$ref` paths.

**Step 3: Update `openapi.yml` root**

- Update tag name: `Assets` → `Accounts`
- Update all path references: `/api/assets` → `/api/accounts`, `/api/asset-categories` → `/api/account-categories`
- Update all `$ref` paths to schema files
- Update description text

---

### Task 12: Rename MCP Server

**Files:**

- Rename: `mcp-server/src/tools/assets.ts` → `accounts.ts`
- Rename: `mcp-server/src/tools/assets.test.ts` → `accounts.test.ts`
- Modify: `mcp-server/src/tools/index.ts` — update imports and tool names
- Modify: `mcp-server/src/tools/types.ts` — update references
- Modify: `mcp-server/src/tools/dashboard.ts` — update `assetSummaryTool`, `handleGetAssetSummary`
- Modify: `mcp-server/src/tools/transactions.ts` — update references
- Modify: `mcp-server/src/tools/transactions.test.ts` — update references
- Modify: `mcp-server/src/context.ts` — update references

**Step 1: Rename files**

```bash
git mv mcp-server/src/tools/assets.ts mcp-server/src/tools/accounts.ts
git mv mcp-server/src/tools/assets.test.ts mcp-server/src/tools/accounts.test.ts
```

**Step 2: Update contents**

- Rename tool names: `list_assets` → `list_accounts`, `get_asset_summary` → `get_account_summary`
- Rename functions: `handleListAssets` → `handleListAccounts`, `handleGetAssetSummary` → `handleGetAccountSummary`
- Rename variables: `assetTools` → `accountTools`, `assetSummaryTool` → `accountSummaryTool`
- Update import paths and descriptions

---

### Task 13: Rename E2E Tests

**Files:**

- Rename: `e2e/pages/AssetsPage.ts` → `AccountsPage.ts`
- Rename directory: `e2e/tests/assets/` → `e2e/tests/accounts/`
  - `asset-management.spec.ts` → `account-management.spec.ts`
  - `assets-redesign-journey.spec.ts` → `accounts-redesign-journey.spec.ts`
- Modify: `e2e/pages/index.ts` — update exports
- Modify: `e2e/pages/BasePage.ts` — update references
- Modify: `e2e/pages/AddTransactionPage.ts` — update references
- Modify: `e2e/helpers/test-data.ts` — update references
- Modify: `e2e/helpers/api-helpers.ts` — update references
- Modify: `e2e/tests/test.fixture.ts` — update references
- Modify: `e2e/tests/business-critical/business-flow.spec.ts` — update references
- Modify: `e2e/tests/stats-verification/cross-page-totals.spec.ts` — update references
- Modify: `e2e/tests/transactions/add-expense.spec.ts` — update references
- Modify: `e2e/tests/transactions/add-income.spec.ts` — update references

**Step 1: Rename files**

```bash
git mv e2e/pages/AssetsPage.ts e2e/pages/AccountsPage.ts
git mv e2e/tests/assets e2e/tests/accounts
git mv e2e/tests/accounts/asset-management.spec.ts e2e/tests/accounts/account-management.spec.ts
git mv e2e/tests/accounts/assets-redesign-journey.spec.ts e2e/tests/accounts/accounts-redesign-journey.spec.ts
```

**Step 2: Update contents**

- Rename class: `AssetsPage` → `AccountsPage`
- Rename type: `AssetFormData` → `AccountFormData`
- Update all URL references: `/assets` → `/accounts`
- Update selectors and test descriptions

---

### Task 14: Update Config, Navigation, and Misc Files

**Files:**

- Modify: `src/middleware/route-guard.ts` — change `/assets` to `/accounts`
- Modify: `src/layouts/ProtectedLayout.astro` — update references
- Modify: `src/layouts/AdminLayout.astro` — update references
- Modify: `src/db/seed.ts` — update all asset references to account
- Modify: `src/db/empty.ts` — update references
- Modify: `src/db/index.integration.test.ts` — update references
- Modify: `astro.config.ts` — update `./src/pages/assets/index.astro` → `./src/pages/accounts/index.astro`
- Modify: `design-system/styles.json` — update `"assets"` key to `"accounts"`
- Modify: `src/cli/commands/workspace.ts` — update references
- Modify: `src/__tests__/ui-style-consistency.test.ts` — update references
- Modify: `src/__tests__/mobile-view-improvements.test.ts` — update references
- Modify: `src/__tests__/api/auth/signup-turnstile.test.ts` — update references
- Modify: `src/pages/DashboardPage.stories.ts` — update references
- Modify: `src/pages/transactions/ExportPage.stories.ts` — update references
- Modify: `src/pages/transactions/ImportPage.stories.ts` — update references
- Modify: `src/pages/budget/categories/CategoriesPage.stories.ts` — update references

**Step 1: Update each file**

Search-replace all `asset`/`Asset`/`ASSET` references per convention table.

---

### Task 15: Verify and Commit

**Step 1: Run typecheck**

```bash
bun run typecheck
```

Expected: 0 errors

**Step 2: Run linting**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
```

**Step 3: Run unit tests**

```bash
bun run test
```

Expected: All tests pass

**Step 4: Run build**

```bash
bun run build
```

Expected: Build succeeds

**Step 5: Verify no remaining "asset" references (excluding docs/plans)**

```bash
grep -ri "asset" src/ mcp-server/ e2e/ openapi/ openapi.yml astro.config.ts --include="*.ts" --include="*.astro" --include="*.yml" --include="*.json" | grep -v "node_modules" | grep -v "docs/plans" | grep -v ".claude"
```

Expected: No matches (or only false positives like `account_class` comments referencing the old name)

**Step 6: Commit all changes**

Commit in structured layers as described in the design doc, or as one comprehensive commit if the layer-by-layer approach creates too many non-compiling intermediate states.

---

### Task 16: Update Documentation

**Files:**

- Modify: `.claude/CLAUDE.md` — update any references to `/assets`, `Asset*`, `assetService`
- Modify: `.claude/rules/*.md` — update references in workflow rules
- Modify: `openapi/README.md` — update references
- Modify: `docs/architecture/*.md` — update references in ADRs
- Modify: `design-system/*.md` — update references
- Modify: `COMMANDS.md` — update if any commands reference assets

**Step 1: Search for references in docs**

```bash
grep -ri "asset" .claude/ docs/ design-system/ COMMANDS.md --include="*.md" | grep -v "docs/plans/2026-02-19-rename-assets"
```

**Step 2: Update all documentation files**

Replace "asset(s)" with "account(s)" in all doc files found.

**Step 3: Final commit**

```bash
git add -A
git commit -m "docs: update all documentation for assets → accounts rename"
```
