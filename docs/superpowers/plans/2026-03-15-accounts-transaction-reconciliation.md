# Accounts Transaction Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a transaction reconciliation card to the accounts page that compares income/expense net flow against account balance changes, highlighting discrepancies per currency.

**Architecture:** All data fetched server-side in `index.astro` frontmatter using existing services. A pure `calculateReconciliation()` helper computes the variance. A new `AccountReconciliationCard.astro` component renders the result. `getSnapshotForMonth` gets a cache layer to avoid double `findAll` cost.

**Tech Stack:** Astro 5 (SSR), Bun, Drizzle ORM, DaisyUI v5, `bun:test`, existing `CacheKeys`/`CacheTags`/`cacheOrFetch` infrastructure.

**Spec:** `docs/superpowers/specs/2026-03-15-accounts-transaction-reconciliation-design.md`

---

## File Map

| File                                                       | Action | Responsibility                                  |
| ---------------------------------------------------------- | ------ | ----------------------------------------------- |
| `src/lib/types/account.ts`                                 | Modify | Add `ReconciliationCurrencyRow` interface       |
| `src/lib/cache/keys.ts`                                    | Modify | Add `CacheKeys.accountSnapshot` builder         |
| `src/services/account.service.ts`                          | Modify | Add `cacheOrFetch` to `getSnapshotForMonth`     |
| `src/lib/utils/account.ts`                                 | Modify | Add `calculateReconciliation()` pure helper     |
| `src/lib/utils/account.test.ts`                            | Modify | Add unit tests for `calculateReconciliation()`  |
| `src/components/organisms/AccountReconciliationCard.astro` | Create | Render reconciliation rows with variance badges |
| `src/pages/accounts/index.astro`                           | Modify | Fetch data, compute reconciliation, render card |

---

## Chunk 1: Foundation — Types, Cache Key, Service Cache

### Task 1: Add `ReconciliationCurrencyRow` type

**Files:**

- Modify: `src/lib/types/account.ts`

- [ ] **Step 1: Add the interface**

  Open `src/lib/types/account.ts` and append at the end of the file:

  ```typescript
  /**
   * One row of reconciliation data per currency.
   * Compares transaction net flow against account balance change for the period.
   */
  export interface ReconciliationCurrencyRow {
    currency: Currency;
    income: number;
    expenses: number;
    netFlow: number; // income - expenses
    balanceChange: number; // endBalance - startBalance (asset accounts only, excludes debt)
    variance: number; // balanceChange - netFlow
    isBalanced: boolean; // Math.abs(variance) < 0.01
  }
  ```

- [ ] **Step 2: Verify typecheck passes**

  ```bash
  bun run typecheck
  ```

  Expected: no new errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/lib/types/account.ts
  git commit -m "feat(ALL-49): add ReconciliationCurrencyRow type"
  ```

---

### Task 2: Add `CacheKeys.accountSnapshot` and cache `getSnapshotForMonth`

**Files:**

- Modify: `src/lib/cache/keys.ts`
- Modify: `src/services/account.service.ts`

**Background:** `getSnapshotForMonth` calls `findAll` internally. The accounts page now calls it twice for historical months (start + end of period). Past month-end snapshots are immutable, so caching them avoids redundant DB work. The existing `cacheOrFetch` helper (already imported in `account.service.ts`) wraps async functions with cache read/write. Cache invalidation uses `[CacheTags.workspace(workspaceId), CacheTags.ACCOUNTS]` — the same two-tag set used by all account mutations.

- [ ] **Step 1: Add `CacheKeys.accountSnapshot` to `src/lib/cache/keys.ts`**

  In `src/lib/cache/keys.ts`, add inside the `CacheKeys` object after the `accountCategories` entry (before the closing `} as const`):

  Note: the key must include a filters hash to prevent collisions when callers use different `owner_user_id`, `currency`, or `type` filters. `hashFilters` is already exported from `src/lib/cache/keys.ts` and imported in `account.service.ts`.

  ```typescript
  /** Account month snapshot: cache:accounts-snapshot:{workspaceId}:{year}:{month}:{filtersHash} */
  accountSnapshot: (workspaceId: string, year: number, month: number, filtersHash: string): string =>
    `${PREFIX}:accounts-snapshot:${workspaceId}:${year}:${month}:${filtersHash}`,
  ```

- [ ] **Step 2: Wrap `getSnapshotForMonth` with `cacheOrFetch`**

  In `src/services/account.service.ts`, locate `getSnapshotForMonth` (around line 648). The method currently returns `trackQuery(...)` directly. Wrap the entire body in `cacheOrFetch`:

  Replace:

  ```typescript
  async getSnapshotForMonth(
    workspaceId: string,
    year: number,
    month: number,
    filters?: {
      type?: AccountType;
      category_id?: string;
      currency?: Currency;
      owner_user_id?: string;
    },
    perf?: PerfCollector
  ) {
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    return trackQuery('AccountService.getSnapshotForMonth', perf, async () => {
  ```

  With:

  ```typescript
  async getSnapshotForMonth(
    workspaceId: string,
    year: number,
    month: number,
    filters?: {
      type?: AccountType;
      category_id?: string;
      currency?: Currency;
      owner_user_id?: string;
    },
    perf?: PerfCollector
  ) {
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
    const cacheKey = CacheKeys.accountSnapshot(workspaceId, year, month, hashFilters(filters ?? {}));

    return cacheOrFetch(
      cacheKey,
      { ttl: 3600, tags: [CacheTags.workspace(workspaceId), CacheTags.ACCOUNTS] },
      () => trackQuery('AccountService.getSnapshotForMonth', perf, async () => {
  ```

  And close the new wrapper at the end of the method (before the closing `}`):

  Replace the final closing braces:

  ```typescript
      return snapshots;
    });
  }
  ```

  With (note `}));` at 4-space indent — matching the existing `});` that it replaces):

  ```typescript
      return snapshots;
    }));
  }
  ```

  > **Note:** `cacheOrFetch` is already imported at the top of `account.service.ts` (line 11). `CacheKeys` and `CacheTags` are also already imported (line 10).

- [ ] **Step 3: Verify typecheck passes**

  ```bash
  bun run typecheck
  ```

  Expected: no errors.

- [ ] **Step 4: Run existing account service tests**

  ```bash
  bun test src/services/account.service.test.ts --reporter=verbose 2>&1 | tail -20
  ```

  Expected: all existing tests pass. (The cache wrapper is transparent — tests use an in-memory cache that returns `null` on miss, falling through to the real logic.)

- [ ] **Step 5: Commit**

  ```bash
  git add src/lib/cache/keys.ts src/services/account.service.ts
  git commit -m "feat(ALL-49): add accountSnapshot cache key and cache getSnapshotForMonth"
  ```

---

## Chunk 2: Core Logic — `calculateReconciliation()` Helper

### Task 3: Write failing tests for `calculateReconciliation`

**Files:**

- Modify: `src/lib/utils/account.test.ts`

**Background:** The helper takes arrays of `{ currency, balance, account_class }` for start/end snapshots, plus transaction summaries per currency. It returns one `ReconciliationCurrencyRow` per currency. Key invariant: only asset accounts (`account_class !== 'debt'`) count toward balance change.

- [ ] **Step 1: Add import and test suite to `src/lib/utils/account.test.ts`**

  At the top of the file, add `calculateReconciliation` to the existing value import from `./account`:

  ```typescript
  import {
    // ... existing imports ...
    calculateReconciliation,
  } from './account';
  ```

  Merge `ReconciliationCurrencyRow` into the **existing** type import (line 24 — do not add a second import line):

  ```typescript
  import type { AccountOutput, ReconciliationCurrencyRow } from '@/lib/types/account';
  ```

  At the end of the file, add:

  ```typescript
  describe('calculateReconciliation', () => {
    const makeSnapshot = (
      currency: string,
      balance: string,
      account_class: 'liquid' | 'non_liquid' | 'debt' = 'liquid'
    ) => ({ currency: currency as any, balance, account_class });

    it('returns balanced row when net flow equals balance change', () => {
      const result = calculateReconciliation({
        currencies: ['IDR' as any],
        startSnapshots: [makeSnapshot('IDR', '7000000')],
        endAccounts: [makeSnapshot('IDR', '10000000')],
        transactionSummaries: [{ currency: 'IDR' as any, income: 5000000, expenses: 2000000 }],
      });

      expect(result).toHaveLength(1);
      expect(result[0].income).toBe(5000000);
      expect(result[0].expenses).toBe(2000000);
      expect(result[0].netFlow).toBe(3000000);
      expect(result[0].balanceChange).toBe(3000000);
      expect(result[0].variance).toBe(0);
      expect(result[0].isBalanced).toBe(true);
    });

    it('returns gap row when balance changed more than transactions explain', () => {
      const result = calculateReconciliation({
        currencies: ['IDR' as any],
        startSnapshots: [makeSnapshot('IDR', '7000000')],
        endAccounts: [makeSnapshot('IDR', '11500000')],
        transactionSummaries: [{ currency: 'IDR' as any, income: 5000000, expenses: 2000000 }],
      });

      expect(result[0].variance).toBe(1500000);
      expect(result[0].isBalanced).toBe(false);
    });

    it('excludes debt accounts from balance change calculation', () => {
      const result = calculateReconciliation({
        currencies: ['IDR' as any],
        startSnapshots: [
          makeSnapshot('IDR', '7000000', 'liquid'),
          makeSnapshot('IDR', '2000000', 'debt'), // should be ignored
        ],
        endAccounts: [
          makeSnapshot('IDR', '10000000', 'liquid'),
          makeSnapshot('IDR', '1500000', 'debt'), // should be ignored
        ],
        transactionSummaries: [{ currency: 'IDR' as any, income: 5000000, expenses: 2000000 }],
      });

      // Balance change = 10,000,000 - 7,000,000 = 3,000,000 (debt excluded)
      expect(result[0].balanceChange).toBe(3000000);
      expect(result[0].isBalanced).toBe(true);
    });

    it('returns all-zero row for a period with no transactions and no balance change', () => {
      const result = calculateReconciliation({
        currencies: ['IDR' as any],
        startSnapshots: [makeSnapshot('IDR', '5000000')],
        endAccounts: [makeSnapshot('IDR', '5000000')],
        transactionSummaries: [{ currency: 'IDR' as any, income: 0, expenses: 0 }],
      });

      expect(result[0].income).toBe(0);
      expect(result[0].expenses).toBe(0);
      expect(result[0].netFlow).toBe(0);
      expect(result[0].balanceChange).toBe(0);
      expect(result[0].variance).toBe(0);
      expect(result[0].isBalanced).toBe(true);
    });

    it('shows gap when balance changed but no transactions recorded', () => {
      const result = calculateReconciliation({
        currencies: ['IDR' as any],
        startSnapshots: [makeSnapshot('IDR', '5000000')],
        endAccounts: [makeSnapshot('IDR', '6000000')],
        transactionSummaries: [{ currency: 'IDR' as any, income: 0, expenses: 0 }],
      });

      expect(result[0].balanceChange).toBe(1000000);
      expect(result[0].variance).toBe(1000000);
      expect(result[0].isBalanced).toBe(false);
    });

    it('treats missing currency in transactionSummaries as zero income/expenses', () => {
      // If a currency has accounts but no transaction data at all (not even a zero row),
      // income and expenses default to 0 via the `?? 0` fallback.
      const result = calculateReconciliation({
        currencies: ['IDR' as any],
        startSnapshots: [makeSnapshot('IDR', '5000000')],
        endAccounts: [makeSnapshot('IDR', '6000000')],
        transactionSummaries: [], // IDR is absent
      });

      expect(result[0].income).toBe(0);
      expect(result[0].expenses).toBe(0);
      expect(result[0].balanceChange).toBe(1000000);
      expect(result[0].variance).toBe(1000000);
      expect(result[0].isBalanced).toBe(false);
    });

    it('handles multiple currencies independently', () => {
      const result = calculateReconciliation({
        currencies: ['IDR' as any, 'USD' as any],
        startSnapshots: [makeSnapshot('IDR', '7000000'), makeSnapshot('USD', '100')],
        endAccounts: [makeSnapshot('IDR', '10000000'), makeSnapshot('USD', '150')],
        transactionSummaries: [
          { currency: 'IDR' as any, income: 5000000, expenses: 2000000 },
          { currency: 'USD' as any, income: 100, expenses: 50 },
        ],
      });

      expect(result).toHaveLength(2);
      expect(result[0].currency).toBe('IDR');
      expect(result[0].isBalanced).toBe(true);
      expect(result[1].currency).toBe('USD');
      expect(result[1].isBalanced).toBe(true);
    });

    it('uses 0.01 epsilon for isBalanced to handle floating point', () => {
      const result = calculateReconciliation({
        currencies: ['USD' as any],
        startSnapshots: [makeSnapshot('USD', '100.00')],
        endAccounts: [makeSnapshot('USD', '150.005')],
        transactionSummaries: [{ currency: 'USD' as any, income: 100, expenses: 50 }],
      });

      // variance = 0.005 < 0.01 → balanced
      expect(result[0].isBalanced).toBe(true);
    });
  });
  ```

- [ ] **Step 2: Run tests to confirm they fail (function not yet exported)**

  ```bash
  bun test src/lib/utils/account.test.ts --reporter=verbose 2>&1 | grep -E "FAIL|error|calculateReconciliation" | head -10
  ```

  Expected: error about `calculateReconciliation` not being exported.

---

### Task 4: Implement `calculateReconciliation`

**Files:**

- Modify: `src/lib/utils/account.ts`

- [ ] **Step 1: Add the import at the top of `src/lib/utils/account.ts`**

  The file already imports `AccountClass` and `Currency` types. Confirm `ReconciliationCurrencyRow` is importable from `@/lib/types/account`. If the types file is co-located, adjust import path as needed. Add to the existing type imports at the top of `account.ts`:

  ```typescript
  import type { ReconciliationCurrencyRow } from '@/lib/types/account';
  ```

- [ ] **Step 2: Append `calculateReconciliation` to `src/lib/utils/account.ts`**

  Add at the end of the file:

  ```typescript
  /**
   * Calculate transaction reconciliation per currency.
   *
   * Compares income/expense net flow against asset account balance changes for the period.
   * Debt accounts (credit_card, loan) are excluded from balance change — paying off a credit
   * card reduces both an asset and a liability, which would cancel out and mask real variances.
   *
   * @param currencies - Ordered list of workspace currencies to produce rows for
   * @param startSnapshots - Account snapshots at the start of the period (end of prior month)
   * @param endAccounts - Account snapshots/live balances at the end of the period
   * @param transactionSummaries - Income/expense totals per currency for the period
   */
  export function calculateReconciliation(params: {
    currencies: Currency[];
    startSnapshots: Array<{ currency: Currency; balance: string; account_class: AccountClass }>;
    endAccounts: Array<{ currency: Currency; balance: string; account_class: AccountClass }>;
    transactionSummaries: Array<{ currency: Currency; income: number; expenses: number }>;
  }): ReconciliationCurrencyRow[] {
    const isAsset = (a: { account_class: AccountClass }) => a.account_class !== 'debt';

    return params.currencies.map((currency) => {
      const startBalance = params.startSnapshots
        .filter((s) => s.currency === currency && isAsset(s))
        .reduce((sum, s) => sum + parseFloat(s.balance || '0'), 0);

      const endBalance = params.endAccounts
        .filter((a) => a.currency === currency && isAsset(a))
        .reduce((sum, a) => sum + parseFloat(a.balance || '0'), 0);

      const summary = params.transactionSummaries.find((s) => s.currency === currency);
      const income = summary?.income ?? 0;
      const expenses = summary?.expenses ?? 0;

      const netFlow = income - expenses;
      const balanceChange = endBalance - startBalance;
      const variance = balanceChange - netFlow;

      return {
        currency,
        income,
        expenses,
        netFlow,
        balanceChange,
        variance,
        isBalanced: Math.abs(variance) < 0.01,
      };
    });
  }
  ```

- [ ] **Step 3: Run the tests**

  ```bash
  bun test src/lib/utils/account.test.ts --reporter=verbose 2>&1 | tail -20
  ```

  Expected: all new tests pass; all pre-existing tests still pass.

- [ ] **Step 4: Typecheck**

  ```bash
  bun run typecheck
  ```

  Expected: no errors.

- [ ] **Step 5: Commit**

  ```bash
  git add src/lib/utils/account.ts src/lib/utils/account.test.ts
  git commit -m "feat(ALL-49): add calculateReconciliation helper with unit tests"
  ```

---

## Chunk 3: UI Layer — Component and Page Wiring

> **Prerequisite:** Chunks 1 and 2 must be committed before starting this chunk. `ReconciliationCurrencyRow` and `calculateReconciliation` must exist for Tasks 5 and 6 to typecheck.

### Task 5: Build `AccountReconciliationCard.astro`

**Files:**

- Create: `src/components/organisms/AccountReconciliationCard.astro`

**Background:** This card renders one section per currency showing income, expenses, net flow, balance change, and variance. A green `BALANCED` badge or amber `GAP` badge indicates reconciliation status. The card renders nothing when all rows are fully zero (no transactions and no balance change).

- [ ] **Step 1: Create the component**

  ```astro
  ---
  /**
   * AccountReconciliationCard Component
   *
   * Shows income, expenses, net flow, and balance change for the selected period.
   * Compares net flow against balance change to surface reconciliation gaps.
   *
   * Renders nothing when all currencies show zero activity (no transactions, no balance change).
   */
  import { ArrowUpDown, CheckCircle, AlertTriangle, Info } from '@lucide/astro';
  import { formatCurrency } from '@/lib/formatting';
  import type { ReconciliationCurrencyRow } from '@/lib/types/account';

  export interface Props {
    reconciliation: ReconciliationCurrencyRow[];
    periodLabel: string;
  }

  const { reconciliation, periodLabel } = Astro.props;

  // Render nothing when all rows are entirely zero
  const hasActivity = reconciliation.some(
    (row) => row.income !== 0 || row.expenses !== 0 || row.balanceChange !== 0
  );

  const card = 'bg-base-100 border border-base-300 rounded-card shadow-sm p-5 lg:p-6';
  ---

  {
    hasActivity && (
      <div class={card} data-testid="reconciliation-card">
        {/* Header */}
        <div class="flex items-center justify-between mb-5">
          <div class="flex items-center gap-2">
            <ArrowUpDown size={16} class="stroke-current text-base-content/50" aria-hidden="true" />
            <h3 class="font-bold text-sm uppercase tracking-wider text-base-content">
              Transaction Flow
            </h3>
          </div>
          <span class="text-xs text-base-content/40 font-medium">{periodLabel}</span>
        </div>

        {/* Per-currency sections */}
        <div class="space-y-6">
          {reconciliation.map((row) => (
            <div>
              {/* Currency label (only shown when multiple currencies) */}
              {reconciliation.length > 1 && (
                <p class="text-xs font-bold uppercase tracking-widest text-base-content/40 mb-3">
                  {row.currency}
                </p>
              )}

              {/* Income / Expenses / Net Flow */}
              <div class="space-y-2 text-sm">
                <div class="flex justify-between items-center">
                  <span class="text-base-content/60">Income</span>
                  <span class="font-semibold text-success tabular-nums">
                    {formatCurrency(row.income, row.currency)}
                  </span>
                </div>

                <div class="flex justify-between items-center">
                  <span class="text-base-content/60">Expenses</span>
                  <span class="font-semibold text-error tabular-nums">
                    − {formatCurrency(row.expenses, row.currency)}
                  </span>
                </div>

                <div class="flex justify-between items-center pt-1 border-t border-base-300">
                  <span class="text-base-content/60 font-medium">Net Flow</span>
                  <span
                    class={`font-bold tabular-nums ${row.netFlow >= 0 ? 'text-base-content' : 'text-error'}`}
                  >
                    {formatCurrency(row.netFlow, row.currency)}
                  </span>
                </div>

                {/* Divider before balance reconciliation */}
                <div class="border-t border-dashed border-base-300 pt-2 mt-2" />

                <div class="flex justify-between items-center">
                  <span class="text-base-content/60">Balance Change</span>
                  <span
                    class={`font-semibold tabular-nums ${row.balanceChange >= 0 ? 'text-base-content' : 'text-error'}`}
                  >
                    {formatCurrency(row.balanceChange, row.currency)}
                  </span>
                </div>

                {/* Variance row */}
                <div class="flex justify-between items-center">
                  <div class="flex items-center gap-1.5">
                    <span class="text-base-content/60">Variance</span>
                    {!row.isBalanced && (
                      <div
                        class="tooltip tooltip-right"
                        data-tip="Balance changed more or less than recorded transactions. May indicate unrecorded income, missing expenses, or manual balance adjustments."
                      >
                        <button
                          type="button"
                          class="inline-flex items-center justify-center text-base-content/30 hover:text-base-content/60 transition-colors"
                          aria-label="What does this variance mean?"
                        >
                          <Info size={13} class="stroke-current" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div class="flex items-center gap-2">
                    {row.isBalanced ? (
                      <>
                        <span class="text-xs font-bold text-success tabular-nums">
                          {formatCurrency(0, row.currency)}
                        </span>
                        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-success/10 text-success">
                          <CheckCircle size={11} class="stroke-current" aria-hidden="true" />
                          Balanced
                        </span>
                      </>
                    ) : (
                      <>
                        <span class="text-xs font-bold text-warning tabular-nums">
                          {row.variance > 0 ? '+' : ''}
                          {formatCurrency(row.variance, row.currency)}
                        </span>
                        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider bg-warning/10 text-warning">
                          <AlertTriangle size={11} class="stroke-current" aria-hidden="true" />
                          Gap
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  ```

- [ ] **Step 2: Typecheck**

  ```bash
  bun run typecheck
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/organisms/AccountReconciliationCard.astro
  git commit -m "feat(ALL-49): add AccountReconciliationCard component"
  ```

---

### Task 6: Wire up in `index.astro`

**Files:**

- Modify: `src/pages/accounts/index.astro`

**Background:** The page fetches accounts in two branches: current month (`findAll`) and historical month (`getSnapshotForMonth`). The `accounts` array is always normalized to `{ balance, account_class, ... }` before this point. We add three new fetches (all in `Promise.all`), compute reconciliation, then render the new card after `AccountPortfolioSummary`.

- [ ] **Step 1: Add imports to `index.astro` frontmatter**

  In the imports section (around line 26), add `transactionService` to the services import, and add the new component and helper:

  ```typescript
  // Add to existing services import:
  import {
    accountService,
    accountCategoryService,
    workspaceMetaService,
    workspaceService,
    transactionService, // ← add this
  } from '@/services';

  // Add new component import:
  import AccountReconciliationCard from '@components/organisms/AccountReconciliationCard.astro';

  // Add to existing utils import from '@/lib/utils/account':
  import {
    calculateAccountAllocation,
    calculateAccountTotalsByCurrency,
    calculateDebtTotalsByCurrency,
    groupAccountsByClass,
    calculateGroupTotalsByCurrency,
    calculateReconciliation, // ← add this
  } from '@/lib/utils/account';

  // Add type import:
  import { deriveAccountClass } from '@/lib/types/account';
  ```

  > **Note:** `deriveAccountClass` may already be imported — check line 32 before adding.

- [ ] **Step 2: Compute period start/end dates**

  After line ~113 (where `selectedPeriod` is computed), add:

  ```typescript
  // Date range for the selected period (used for transaction summary)
  const periodStartDate = new Date(selectedYear, selectedMonth - 1, 1);
  const periodEndDate = new Date(selectedYear, selectedMonth, 0, 23, 59, 59, 999);
  ```

- [ ] **Step 3: Fetch reconciliation data in parallel (after `accounts` array is set)**

  After the existing account fetching block (after line ~241, once `accounts` is populated), add:

  ```typescript
  // Fetch reconciliation data in parallel:
  // - outer Promise.all runs both fetches concurrently
  // - inner Promise.all handles per-currency summary calls
  // This two-level structure gives TypeScript a concrete [A, B[]] tuple so types resolve correctly.
  // (Avoid rest-spread destructuring of Promise.all — TypeScript collapses it to (A|B)[].)
  const [startSnapshots, txSummaries] = await Promise.all([
    accountService.getSnapshotForMonth(
      user.workspaceId,
      selectedYear,
      selectedMonth - 1, // end of previous month = start of selected period
      filters,
      Astro.locals.perf
    ),
    Promise.all(
      orderedWorkspaceCurrencies.map((currency) =>
        transactionService
          .getMonthSummary(
            {
              workspace_id: user.workspaceId,
              currency,
              created_by_user_id: ownerUserId,
              start_date: periodStartDate,
              end_date: periodEndDate,
            },
            Astro.locals.perf
          )
          .then((s) => ({ currency, ...s }))
      )
    ),
  ]);

  const reconciliation = calculateReconciliation({
    currencies: orderedWorkspaceCurrencies,
    startSnapshots: startSnapshots.map((s) => ({
      currency: s.currency,
      balance: s.snapshot_balance,
      account_class: s.account_class ?? deriveAccountClass(s.type),
    })),
    endAccounts: accounts.map((a) => ({
      currency: a.currency,
      balance: a.balance,
      account_class: a.account_class,
    })),
    transactionSummaries: txSummaries,
  });
  ```

- [ ] **Step 4: Render the card in the template**

  In the template section (around line 341), after `<AccountPortfolioSummary ... />` and before `<AccountActions ... />`, add:

  ```astro
  {/* Transaction Reconciliation */}
  <AccountReconciliationCard reconciliation={reconciliation} periodLabel={currentMonthDisplay} />
  ```

- [ ] **Step 5: Typecheck**

  ```bash
  bun run typecheck
  ```

  Expected: no errors.

- [ ] **Step 6: Run full test suite**

  ```bash
  bun run test 2>&1 | tail -20
  ```

  Expected: all tests pass.

- [ ] **Step 7: Build check**

  ```bash
  bun run build 2>&1 | tail -20
  ```

  Expected: build succeeds with no errors.

- [ ] **Step 8: Run quality gates**

  ```bash
  bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck
  ```

  Expected: all pass.

- [ ] **Step 9: Commit**

  ```bash
  git add src/pages/accounts/index.astro
  git commit -m "feat(ALL-49): wire transaction reconciliation into accounts page"
  ```

---

## Acceptance Criteria Checklist

Before marking complete, verify:

- [ ] Portfolio summary displays income, expenses, and net transaction flow for selected period
- [ ] Net flow is compared against account balance change (ending − starting balance)
- [ ] Variance shown with color indicator (green = balanced, amber = gap)
- [ ] Tooltip explains variance on gap rows
- [ ] Works for both current month and historical month views
- [ ] Respects existing filters (currency, owner, account type)
- [ ] Card hidden when all rows are fully zero (no transactions, no balance change)
- [ ] Debt accounts excluded from balance change calculation
- [ ] Transfer transactions excluded (already handled by `getMonthSummary`)
- [ ] All quality gates pass (`lint:fix`, `stylelint:fix`, `format:fix`, `typecheck`)
- [ ] Build succeeds
