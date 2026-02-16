# Assets Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add account classification (liquid/non_liquid/debt), decouple transaction balance mutations, restructure portfolio summary, and add account detail page with transaction view.

**Architecture:** Add `account_class` enum column to assets schema (both SQLite and PostgreSQL). Auto-derive from `type` at service layer. Remove balance mutation from transaction/transfer flows. Add new `getCalculatedBalance()` and `getTransactionsByAsset()` service methods. Restructure portfolio UI into Assets/Debt/Net Worth sections. Create new `/assets/[id]` detail page.

**Tech Stack:** Astro 5, Drizzle ORM (dual SQLite/PostgreSQL), DaisyUI v5, Bun

---

### Task 1: Add `account_class` to Schema

**Files:**

- Modify: `src/db/schema/sqlite/assets.ts`
- Modify: `src/db/schema/postgresql/assets.ts`

**Step 1: Add `account_class` column to SQLite schema**

In `src/db/schema/sqlite/assets.ts`, add after the `type` column (line 33):

```typescript
account_class: text('account_class', {
  enum: ['liquid', 'non_liquid', 'debt'],
}).notNull(),
```

**Step 2: Add `account_class` column to PostgreSQL schema**

In `src/db/schema/postgresql/assets.ts`, add after the `type` column (line 33):

```typescript
account_class: text('account_class', {
  enum: ['liquid', 'non_liquid', 'debt'],
}).notNull(),
```

**Step 3: Regenerate migrations and reset DB**

Run:

```bash
bun run db:generate
bun run db:push
```

**Step 4: Verify typecheck passes**

Run: `bun run typecheck`
Expected: PASS (new column is additive, existing code doesn't reference it yet)

**Step 5: Commit**

```bash
git add src/db/schema/sqlite/assets.ts src/db/schema/postgresql/assets.ts
git commit -m "feat(schema): add account_class column to assets table"
```

---

### Task 2: Add `AccountClass` Type and Derivation Logic

**Files:**

- Modify: `src/lib/types/asset.ts`
- Modify: `src/lib/constants/asset-categories.ts`

**Step 1: Add AccountClass type and mapping to `src/lib/types/asset.ts`**

Add after the `AssetType` definition (line 20):

```typescript
/**
 * Account classification for transaction rules and portfolio grouping.
 * Auto-derived from AssetType at creation time.
 */
export type AccountClass = 'liquid' | 'non_liquid' | 'debt';

/**
 * Mapping from granular asset type to account class
 */
export const ASSET_TYPE_TO_CLASS: Record<AssetType, AccountClass> = {
  cash: 'liquid',
  bank_account: 'liquid',
  e_wallet: 'liquid',
  mutual_fund: 'non_liquid',
  bond: 'non_liquid',
  crypto: 'non_liquid',
  stock: 'non_liquid',
  other: 'non_liquid',
  credit_card: 'debt',
  loan: 'debt',
};

/**
 * Derive account class from asset type
 */
export function deriveAccountClass(type: AssetType): AccountClass {
  return ASSET_TYPE_TO_CLASS[type];
}

/**
 * Display labels for account classes
 */
export const ACCOUNT_CLASS_LABELS: Record<AccountClass, string> = {
  liquid: 'Liquid',
  non_liquid: 'Non-Liquid',
  debt: 'Debt',
};
```

Add `account_class` to the `Asset` interface (after `type` field, line 39):

```typescript
account_class: AccountClass;
```

Add `account_class` to the `AssetOutput` interface (after `type` field, line 62):

```typescript
account_class: AccountClass;
```

**Step 2: Verify typecheck**

Run: `bun run typecheck`
Expected: FAIL — services and pages referencing `Asset`/`AssetOutput` don't provide `account_class` yet. This is expected and will be fixed in subsequent tasks.

**Step 3: Commit**

```bash
git add src/lib/types/asset.ts
git commit -m "feat(types): add AccountClass type, derivation mapping, and labels"
```

---

### Task 3: Update AssetService — Create with `account_class`

**Files:**

- Modify: `src/services/asset.service.ts`

**Step 1: Import `deriveAccountClass` and update `CreateAssetInput`**

At the top of `src/services/asset.service.ts` (line 11), change:

```typescript
import type { AssetType, Currency } from '@/lib/types/asset';
```

to:

```typescript
import type { AssetType, Currency, AccountClass } from '@/lib/types/asset';
import { deriveAccountClass } from '@/lib/types/asset';
```

**Step 2: Update `create()` method to auto-set `account_class`**

In the `create()` method (~line 97), add `account_class` to the `.values()` call. After the `type: input.type,` line add:

```typescript
account_class: deriveAccountClass(input.type),
```

**Step 3: Update `update()` method to re-derive `account_class` when `type` changes**

Find the `update()` method. In the `.set()` call, when `type` is being updated, also update `account_class`. Add logic so that if `input.type` is provided, `account_class` is also set:

In the update set object, add:

```typescript
...(input.type ? { account_class: deriveAccountClass(input.type) } : {}),
```

**Step 4: Verify typecheck**

Run: `bun run typecheck`

**Step 5: Commit**

```bash
git add src/services/asset.service.ts
git commit -m "feat(asset-service): auto-derive account_class on create and update"
```

---

### Task 4: Remove Balance Mutation from Transfer Service

**Files:**

- Modify: `src/services/asset.service.ts`

**Step 1: Simplify `transfer()` method**

Replace the current `transfer()` method (lines 373-487) with a simplified version that no longer mutates balances or creates history entries. The transfer method should:

1. Keep validation: both assets exist, both active, same currency, positive amount
2. Remove: the `runTransaction` block that deducts/adds balance and creates history
3. Remove: the insufficient balance check (`decimalCompare(fromAsset.balance, amount) < 0`)
4. Return the assets as-is (no balance changes)

The new transfer method body should be:

```typescript
async transfer(
  fromId: string,
  toId: string,
  amount: string,
  notes: string | undefined,
  workspaceId: string
): Promise<{ fromAsset: AssetRow | undefined; toAsset: AssetRow | undefined }> {
  if (fromId === toId) {
    throw new Error(
      `Cannot transfer an asset to itself (assetId: ${fromId}, workspaceId: ${workspaceId})`
    );
  }

  const fromAsset = await this.findByIdIncludingClosed(fromId, workspaceId);
  const toAsset = await this.findByIdIncludingClosed(toId, workspaceId);

  if (!fromAsset || !toAsset) {
    throw new AssetServiceError(ServiceErrorCode.ASSET_NOT_FOUND, 'Asset not found', 404);
  }

  if (fromAsset.status === 'closed' || toAsset.status === 'closed') {
    throw new AssetServiceError(
      ServiceErrorCode.ACCOUNT_CLOSED,
      'Cannot transfer — one or both accounts are deactivated',
      400
    );
  }

  if (fromAsset.currency !== toAsset.currency) {
    throw new Error('Cannot transfer between different currencies');
  }

  if (decimalCompare(amount, '0') <= 0) {
    throw new Error('Transfer amount must be positive');
  }

  // No balance mutation — transfer is recorded as a transaction only
  return { fromAsset, toAsset };
}
```

**Step 2: Verify typecheck**

Run: `bun run typecheck`

**Step 3: Run existing tests**

Run: `bun test src/services/__tests__/asset-transfer.test.ts`

Tests will likely fail because they expect balance mutations. Update tests to match new behavior (no balance changes expected).

**Step 4: Commit**

```bash
git add src/services/asset.service.ts
git commit -m "refactor(asset-service): remove balance mutation from transfer method"
```

---

### Task 5: Add `getCalculatedBalance()` and `getTransactionsByAsset()` Service Methods

**Files:**

- Modify: `src/services/asset.service.ts`
- Modify: `src/services/transaction.service.ts`

**Step 1: Add `getCalculatedBalance()` to AssetService**

Add this method to `AssetService` class:

```typescript
/**
 * Calculate balance from transactions (reference only, not stored).
 * calculated = initial_balance + SUM(income) - SUM(expenses)
 */
async getCalculatedBalance(assetId: string, workspaceId: string): Promise<string> {
  const asset = await this.findByIdIncludingClosed(assetId, workspaceId);
  if (!asset) {
    throw new AssetServiceError(ServiceErrorCode.ASSET_NOT_FOUND, 'Asset not found', 404);
  }

  const initialBalance = asset.initial_balance || '0';

  // Sum income transactions for this asset
  const incomeResult = await (this.db as any)
    .select({
      total: sql<string>`COALESCE(SUM(CAST(${this.schema.transactions.amount} AS NUMERIC)), 0)`,
    })
    .from(this.schema.transactions)
    .where(
      and(
        eq(this.schema.transactions.asset_id, assetId),
        eq(this.schema.transactions.workspace_id, workspaceId),
        eq(this.schema.transactions.type, 'income'),
        sql`${this.schema.transactions.deleted_at} IS NULL`
      )
    );

  // Sum expense transactions for this asset
  const expenseResult = await (this.db as any)
    .select({
      total: sql<string>`COALESCE(SUM(CAST(${this.schema.transactions.amount} AS NUMERIC)), 0)`,
    })
    .from(this.schema.transactions)
    .where(
      and(
        eq(this.schema.transactions.asset_id, assetId),
        eq(this.schema.transactions.workspace_id, workspaceId),
        eq(this.schema.transactions.type, 'expense'),
        sql`${this.schema.transactions.deleted_at} IS NULL`
      )
    );

  const income = parseFloat(incomeResult[0]?.total || '0');
  const expense = parseFloat(expenseResult[0]?.total || '0');
  const initial = parseFloat(initialBalance);

  return String(initial + income - expense);
}
```

**Step 2: Add `getTransactionsByAsset()` to TransactionService**

Add this method to `TransactionService` class:

```typescript
/**
 * Get transactions for a specific asset, with monthly totals.
 * Returns transactions and summary for the given month.
 */
async getTransactionsByAsset(
  assetId: string,
  workspaceId: string,
  year: number,
  month: number
): Promise<{
  transactions: any[];
  summary: {
    totalIncome: string;
    totalExpenses: string;
    totalTransfersIn: string;
    totalTransfersOut: string;
  };
}> {
  const startOfMonth = new Date(year, month - 1, 1);
  const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

  // Get all transactions where this asset is source or destination
  const transactions = await this.db.query.transactions.findMany({
    where: and(
      eq(this.schema.transactions.workspace_id, workspaceId),
      sql`${this.schema.transactions.deleted_at} IS NULL`,
      sql`${this.schema.transactions.transaction_date} >= ${startOfMonth}`,
      sql`${this.schema.transactions.transaction_date} <= ${endOfMonth}`,
      sql`(${this.schema.transactions.asset_id} = ${assetId} OR ${this.schema.transactions.to_asset_id} = ${assetId})`
    ),
    orderBy: (t: any, { desc }: any) => [desc(t.transaction_date)],
  });

  // Calculate monthly summaries
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalTransfersIn = 0;
  let totalTransfersOut = 0;

  for (const tx of transactions) {
    const amount = parseFloat(tx.amount || '0');
    if (tx.type === 'income' && tx.asset_id === assetId) {
      totalIncome += amount;
    } else if (tx.type === 'expense' && tx.asset_id === assetId) {
      totalExpenses += amount;
    } else if (tx.type === 'transfer') {
      if (tx.asset_id === assetId) {
        totalTransfersOut += amount;
      }
      if (tx.to_asset_id === assetId) {
        totalTransfersIn += amount;
      }
    }
  }

  return {
    transactions,
    summary: {
      totalIncome: String(totalIncome),
      totalExpenses: String(totalExpenses),
      totalTransfersIn: String(totalTransfersIn),
      totalTransfersOut: String(totalTransfersOut),
    },
  };
}
```

**Step 3: Verify typecheck**

Run: `bun run typecheck`

**Step 4: Commit**

```bash
git add src/services/asset.service.ts src/services/transaction.service.ts
git commit -m "feat(services): add getCalculatedBalance and getTransactionsByAsset methods"
```

---

### Task 6: Update `getTotalByCurrency()` to Separate Assets from Debt

**Files:**

- Modify: `src/services/asset.service.ts`

**Step 1: Add `getTotalByClass()` method**

Add a new method that returns totals grouped by `account_class` and `currency`:

```typescript
/**
 * Get total balances by account class and currency.
 * Used for portfolio summary: Assets (liquid+non_liquid) vs Debt.
 */
async getTotalByClass(workspaceId: string, perf?: PerfCollector) {
  return trackQuery('AssetService.getTotalByClass', perf, async () => {
    const result = await (this.db as any)
      .select({
        account_class: this.schema.assets.account_class,
        currency: this.schema.assets.currency,
        total: sql<string>`sum(CAST(${this.schema.assets.balance} AS NUMERIC))`,
        count: sql<number>`count(*)`,
      })
      .from(this.schema.assets)
      .where(
        and(
          eq(this.schema.assets.workspace_id, workspaceId),
          sql`${this.schema.assets.deleted_at} IS NULL`,
          eq(this.schema.assets.status, 'active')
        )
      )
      .groupBy(this.schema.assets.account_class, this.schema.assets.currency);

    return result;
  });
}
```

**Step 2: Verify typecheck**

Run: `bun run typecheck`

**Step 3: Commit**

```bash
git add src/services/asset.service.ts
git commit -m "feat(asset-service): add getTotalByClass for portfolio summary"
```

---

### Task 7: Update Portfolio Utilities — Group by Account Class

**Files:**

- Modify: `src/lib/utils/asset.ts`
- Modify: `src/lib/utils/asset.test.ts` (update tests)

**Step 1: Update `calculatePortfolioTotals()` to exclude debt**

In `src/lib/utils/asset.ts`, update `calculatePortfolioTotals()` to only sum `liquid` and `non_liquid` assets:

```typescript
export function calculatePortfolioTotals(assets: AssetOutput[]): PortfolioTotals {
  let totalIdr = 0;
  let totalUsd = 0;

  for (const asset of assets) {
    // Exclude debt accounts from total assets
    if (asset.account_class === 'debt') continue;

    const balance = parseFloat(asset.balance || '0');
    if (isNaN(balance) || balance <= 0) continue;

    if (asset.currency === 'USD') {
      totalUsd += balance;
    } else {
      totalIdr += balance;
    }
  }

  return { totalIdr, totalUsd };
}
```

**Step 2: Add `calculateDebtTotals()` function**

```typescript
/**
 * Calculate total debt by currency (absolute values)
 */
export interface DebtTotals {
  debtIdr: number;
  debtUsd: number;
}

export function calculateDebtTotals(assets: AssetOutput[]): DebtTotals {
  let debtIdr = 0;
  let debtUsd = 0;

  for (const asset of assets) {
    if (asset.account_class !== 'debt') continue;

    const balance = Math.abs(parseFloat(asset.balance || '0'));
    if (isNaN(balance)) continue;

    if (asset.currency === 'USD') {
      debtUsd += balance;
    } else {
      debtIdr += balance;
    }
  }

  return { debtIdr, debtUsd };
}
```

**Step 3: Add `groupAssetsByClass()` function**

```typescript
import type { AccountClass } from '@/lib/types/asset';

/**
 * Group assets by account class (liquid, non_liquid, debt)
 */
export function groupAssetsByClass(assets: AssetOutput[]): Record<AccountClass, AssetOutput[]> {
  const groups: Record<AccountClass, AssetOutput[]> = {
    liquid: [],
    non_liquid: [],
    debt: [],
  };

  for (const asset of assets) {
    const cls = asset.account_class || 'liquid';
    groups[cls].push(asset);
  }

  return groups;
}
```

**Step 4: Update tests in `src/lib/utils/asset.test.ts`**

Add `account_class` to all test asset fixtures. Update `calculatePortfolioTotals` tests to verify debt exclusion.

**Step 5: Verify tests pass**

Run: `bun test src/lib/utils/asset.test.ts`

**Step 6: Commit**

```bash
git add src/lib/utils/asset.ts src/lib/utils/asset.test.ts
git commit -m "feat(utils): add groupAssetsByClass, calculateDebtTotals, exclude debt from portfolio totals"
```

---

### Task 8: Update AssetPortfolioSummary Component

**Files:**

- Modify: `src/components/organisms/AssetPortfolioSummary.astro`

**Step 1: Add debt and net worth props**

Update the `Props` interface to include:

```typescript
export interface Props {
  totalIdr: number;
  totalUsd: number;
  debtIdr: number;
  debtUsd: number;
  distribution: AllocationItem[];
  loading?: boolean;
  className?: string;
  latestUpdate?: Date | string | null;
  isHistoricalView?: boolean;
}
```

**Step 2: Update the template**

Change the grid from 2 columns (IDR/USD) to show:

1. **Total Assets** — sum of IDR (with note showing USD if > 0)
2. **Total Debt** — absolute value of debt
3. **Net Worth** — assets minus debt

Use the existing design patterns: `StatLabel`, icon boxes, color coding. Use `text-error` for debt, `text-warning` for net worth (or `text-success` if positive).

Import `CreditCard` from `@lucide/astro` for the debt icon and `TrendingUp` for net worth.

**Step 3: Verify build**

Run: `bun run build`

**Step 4: Commit**

```bash
git add src/components/organisms/AssetPortfolioSummary.astro
git commit -m "feat(portfolio-summary): show total assets, debt, and net worth separately"
```

---

### Task 9: Update Assets List Page — Group by Account Class

**Files:**

- Modify: `src/pages/assets/index.astro`

**Step 1: Import new utilities**

Add to imports:

```typescript
import { groupAssetsByClass, calculateDebtTotals } from '@/lib/utils/asset';
import { ACCOUNT_CLASS_LABELS } from '@/lib/types/asset';
import type { AccountClass } from '@/lib/types/asset';
```

**Step 2: Add `account_class` to asset mapping**

In both the historical view and current view asset mapping blocks (~lines 144-190), add `account_class` to the mapped objects. For current view:

```typescript
account_class: asset.account_class,
```

For historical view, derive from type:

```typescript
account_class: deriveAccountClass(snapshot.type),
```

(Also import `deriveAccountClass` at top.)

**Step 3: Calculate debt totals**

After `calculatePortfolioTotals()` call, add:

```typescript
const debtTotals = calculateDebtTotals(assets);
```

**Step 4: Pass new props to AssetPortfolioSummary**

Add `debtIdr` and `debtUsd`:

```astro
<AssetPortfolioSummary
  totalIdr={portfolioTotals.totalIdr}
  totalUsd={portfolioTotals.totalUsd}
  debtIdr={debtTotals.debtIdr}
  debtUsd={debtTotals.debtUsd}
  distribution={assetAllocation}
  ...
/>
```

**Step 5: Group assets by account class instead of type**

Replace `groupAssetsByType()` usage with `groupAssetsByClass()`. Render three sections: Liquid Accounts, Non-Liquid Accounts, Debt — each as an `AssetGroupCard`.

**Step 6: Verify build**

Run: `bun run build`

**Step 7: Commit**

```bash
git add src/pages/assets/index.astro
git commit -m "feat(assets-page): group by account class, pass debt totals to summary"
```

---

### Task 10: Filter Transaction Form Assets by Account Class

**Files:**

- Modify: `src/layouts/ProtectedLayout.astro`
- Modify: `src/components/organisms/TransactionDrawer.astro`
- Modify: `src/components/molecules/TransactionEntryForm.astro`

**Step 1: Update ProtectedLayout to pass `account_class` with assets**

In `src/layouts/ProtectedLayout.astro` (~line 60), change the assets type:

```typescript
let assets: Array<{ id: string; name: string; type: string; account_class: string }> = [];
```

In the `assetService.findAll()` result mapping (~line 87), include `account_class`:

```typescript
assets = rawAssets.map((a) => ({
  id: a.id,
  name: a.name,
  type: a.type,
  account_class: a.account_class,
}));
```

**Step 2: Update TransactionDrawer props**

In `src/components/organisms/TransactionDrawer.astro` (~line 15), update the assets prop type to include `account_class`:

```typescript
assets: Array<{ id: string; name: string; type: string; account_class: string }>;
```

**Step 3: Update TransactionEntryForm to filter assets**

In `src/components/molecules/TransactionEntryForm.astro`, update the `Props` interface:

```typescript
assets: Array<{ id: string; name: string; type: string; account_class: string }>;
```

In the frontmatter, filter assets based on transaction type:

```typescript
// For expense/income: only liquid and debt accounts
// For transfer: handled separately (all accounts shown)
const filteredAssets = assets.filter(
  (a) => a.account_class === 'liquid' || a.account_class === 'debt'
);
```

Use `filteredAssets` in the template instead of `assets` for the select dropdown.

**Step 4: Update AssetSelect component props (if needed)**

In `src/components/atoms/AssetSelect.astro`, update the assets prop type to include `account_class`:

```typescript
assets: Array<{ id: string; name: string; type: string; account_class?: string }>;
```

**Step 5: Update TransferModal to show all assets**

Verify that `AssetTransferModal` uses its own asset list and shows ALL accounts (not filtered). Since transfers allow all account types, the transfer modal should receive unfiltered assets.

**Step 6: Verify build**

Run: `bun run build`

**Step 7: Commit**

```bash
git add src/layouts/ProtectedLayout.astro src/components/organisms/TransactionDrawer.astro src/components/molecules/TransactionEntryForm.astro src/components/atoms/AssetSelect.astro
git commit -m "feat(transaction-form): filter assets by account_class for expense/income"
```

---

### Task 11: Create Account Detail Page

**Files:**

- Create: `src/pages/assets/[id].astro`

**Step 1: Create the page**

Create `src/pages/assets/[id].astro` with:

1. **Layout**: Use `ProtectedLayout`
2. **Data loading**:
   - Get asset by ID via `assetService.findById()`
   - Get calculated balance via `assetService.getCalculatedBalance()`
   - Get transactions for current month via `transactionService.getTransactionsByAsset()`
   - Support month navigation via `year`/`month` query params
3. **Template sections**:
   - Back link to `/assets`
   - Asset header: name, account class label, type label, edit button
   - Balance card: current (manual) balance + calculated balance
   - Month navigator (reuse `PeriodicSelector`)
   - Monthly summary stats: income, expenses, transfers in, transfers out
   - Transaction list for the selected month

**Step 2: Follow existing page patterns**

Reference `src/pages/assets/history/[id].astro` for the dynamic route pattern with auth guard and asset lookup. Reference `src/pages/assets/index.astro` for the `PeriodicSelector` integration.

**Step 3: Template structure**

```astro
---
import ProtectedLayout from '@/layouts/ProtectedLayout.astro';
import PeriodicSelector from '@/components/molecules/PeriodicSelector.astro';
import { assetService, transactionService } from '@/services';
import { formatCurrency } from '@/lib/formatting';
import { ACCOUNT_CLASS_LABELS, formatAssetType } from '@/lib/types/asset';
import { ArrowLeft, Pencil } from '@lucide/astro';

const user = Astro.locals.user!;
const { id } = Astro.params;

// Fetch asset
const asset = await assetService.findById(id!, user.workspaceId);
if (!asset) return Astro.redirect('/assets');

// Month navigation
const url = new URL(Astro.url);
const now = new Date();
const selectedYear = parseInt(url.searchParams.get('year') || String(now.getFullYear()));
const selectedMonth = parseInt(url.searchParams.get('month') || String(now.getMonth() + 1));

// Fetch data
const calculatedBalance = await assetService.getCalculatedBalance(id!, user.workspaceId);
const { transactions, summary } = await transactionService.getTransactionsByAsset(
  id!,
  user.workspaceId,
  selectedYear,
  selectedMonth
);
---
```

Render: header with back button, balance cards (current vs calculated), month selector, summary stats (4 stat cards), transaction list (date, description, amount with +/- sign).

Follow design system: DaisyUI classes, `bg-base-100` cards, `rounded-card`, `border-base-300`, responsive grid.

**Step 4: Verify build**

Run: `bun run build`

**Step 5: Commit**

```bash
git add src/pages/assets/\[id\].astro
git commit -m "feat(assets): add account detail page with transaction view and monthly summary"
```

---

### Task 12: Add Link from Asset List to Detail Page

**Files:**

- Modify: `src/components/molecules/AssetItemRow.astro`

**Step 1: Make asset name a link**

In `AssetItemRow.astro`, wrap the asset name in an anchor tag linking to `/assets/{id}`:

```html
<a href={`/assets/${asset.id}`} class="font-bold text-sm hover:text-accent transition-colors">
  {asset.name}
</a>
```

**Step 2: Verify build**

Run: `bun run build`

**Step 3: Commit**

```bash
git add src/components/molecules/AssetItemRow.astro
git commit -m "feat(asset-row): link asset name to detail page"
```

---

### Task 13: Update Asset Seeder/Constants for `account_class`

**Files:**

- Modify: Any seed scripts or CLI tools that create assets

**Step 1: Find and update asset creation in seeders**

Search for seed scripts that create assets:

```bash
grep -r "type.*bank_account\|type.*credit_card\|type.*cash" src/cli/ src/scripts/ --include="*.ts" -l
```

Update each to include `account_class` (derived from type) in the insert values.

**Step 2: Update DEFAULT_ASSET_CATEGORIES if needed**

The `src/lib/constants/asset-categories.ts` `DEFAULT_ASSET_CATEGORIES` array has `isLiability` flag. No change needed — this is for categories, not for the asset `account_class` column.

**Step 3: Verify build**

Run: `bun run build`

**Step 4: Run quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat(seeders): include account_class in asset seed data"
```

---

### Task 14: Update Tests

**Files:**

- Modify: `src/services/__tests__/asset-transfer.test.ts`
- Modify: `src/services/__tests__/asset-closed-protection.test.ts`
- Modify: `src/services/transaction.service.test.ts`
- Modify: `src/__tests__/review-feedback-regressions.test.ts`
- Modify: `src/__tests__/ui-style-consistency.test.ts`

**Step 1: Update asset transfer tests**

Remove tests that verify balance changes after transfer. Add tests that verify transfer only validates inputs (assets exist, same currency, positive amount) without modifying balances.

**Step 2: Update asset mock fixtures**

Add `account_class` to all mock asset objects in test files.

**Step 3: Run all tests**

Run: `bun test`

Fix any failures.

**Step 4: Commit**

```bash
git add -A
git commit -m "test: update asset and transfer tests for balance decoupling"
```

---

### Task 15: Final Quality Gates and Verification

**Step 1: Run full quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
bun run build
bun test
```

**Step 2: Manual verification checklist**

- [ ] Asset creation auto-sets `account_class`
- [ ] Transaction form (expense/income) shows only liquid + debt accounts
- [ ] Transfer form shows all account types
- [ ] Creating a transaction does NOT change asset balance
- [ ] Manual "Update Balance" still works
- [ ] Portfolio summary shows Assets / Debt / Net Worth
- [ ] Asset list groups by account class (Liquid / Non-Liquid / Debt)
- [ ] Clicking asset name opens detail page
- [ ] Detail page shows current balance + calculated balance
- [ ] Detail page shows monthly transaction summary
- [ ] Detail page month navigation works

**Step 3: Final commit if needed**

```bash
git add -A
git commit -m "chore: final cleanup for assets redesign"
```
