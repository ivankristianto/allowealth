# Workspace Onboarding Checklist — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a sequential onboarding checklist card to the dashboard that guides new users through 5 setup steps (currency, categories, budgets, assets, first transaction) and auto-disappears once all are complete.

**Architecture:** Server-rendered Astro component on the dashboard. Completion status is detected by querying existing data (no new DB tables). A new `getOnboardingStatus()` method on `WorkspaceService` runs 5 lightweight queries. Dashboard conditionally renders the checklist and hides financial widgets until currency is set.

**Tech Stack:** Astro 5, DaisyUI v5, Drizzle ORM, bun:test, Lucide icons

**Design doc:** `docs/plans/2026-02-09-workspace-onboarding-checklist-design.md`

---

## Task 1: Add `workspaceMeta` and `workspaces` to test mock database

The mock database in `src/services/test-helpers/mocks.ts` is missing `workspaceMeta` and `workspaces` query objects. These are needed to test the new `getOnboardingStatus()` method.

**Files:**

- Modify: `src/services/test-helpers/mocks.ts`

**Step 1: Add `workspaceMeta` and `workspaces` to `createMockDatabase()`**

In `src/services/test-helpers/mocks.ts`, inside the `query` object (after `apiKeys` around line 71), add:

```typescript
workspaceMeta: {
  findFirst: mock(() => Promise.resolve(undefined)),
  findMany: mock(() => Promise.resolve([])),
},
workspaces: {
  findFirst: mock(() => Promise.resolve(undefined)),
  findMany: mock(() => Promise.resolve([])),
},
```

**Step 2: Add reset calls to `resetMockDatabase()`**

In the `resetMockDatabase()` function (around line 240), add after the `apiKeys` resets:

```typescript
(mockDb.query.workspaceMeta.findFirst as any).mockClear();
(mockDb.query.workspaceMeta.findMany as any).mockClear();
(mockDb.query.workspaces.findFirst as any).mockClear();
(mockDb.query.workspaces.findMany as any).mockClear();
```

**Step 3: Run existing tests to verify no regressions**

Run: `bun test src/services/__tests__/`
Expected: All existing tests still pass.

**Step 4: Commit**

```bash
git add src/services/test-helpers/mocks.ts
git commit -m "test: add workspaceMeta and workspaces to mock database"
```

---

## Task 2: Add `OnboardingStatus` type and `getOnboardingStatus()` to `WorkspaceService`

**Files:**

- Modify: `src/services/workspace.service.ts`
- Test: `src/services/__tests__/onboarding-status.test.ts`

**Step 1: Write the failing test**

Create `src/services/__tests__/onboarding-status.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { WorkspaceService } from '../workspace.service';
import { createMockDatabase, resetMockDatabase } from '../test-helpers/mocks';
import { resetCacheManager } from '@/lib/cache';

describe('WorkspaceService.getOnboardingStatus()', () => {
  let mockDb: ReturnType<typeof createMockDatabase>;
  let workspaceService: WorkspaceService;

  beforeEach(() => {
    resetCacheManager();
    mockDb = createMockDatabase();
    resetMockDatabase(mockDb);
    workspaceService = new WorkspaceService(mockDb);
  });

  it('should return all false for a fresh workspace', async () => {
    // All queries return undefined/empty (default mock behavior)
    const status = await workspaceService.getOnboardingStatus('workspace-1');

    expect(status.currency).toBe(false);
    expect(status.categories).toBe(false);
    expect(status.budgets).toBe(false);
    expect(status.assets).toBe(false);
    expect(status.transactions).toBe(false);
  });

  it('should detect currency as set when workspace meta has currency entry', async () => {
    (mockDb.query.workspaceMeta.findFirst as any).mockResolvedValueOnce({
      id: 'meta-1',
      workspace_id: 'workspace-1',
      meta_key: 'currency',
      meta_value: 'USD',
    });

    const status = await workspaceService.getOnboardingStatus('workspace-1');

    expect(status.currency).toBe(true);
    expect(status.categories).toBe(false);
  });

  it('should detect categories as set when at least one expense category exists', async () => {
    // Currency not set
    (mockDb.query.workspaceMeta.findFirst as any).mockResolvedValueOnce(undefined);
    // Category exists
    (mockDb.query.categories.findFirst as any).mockResolvedValueOnce({
      id: 'cat-1',
    });

    const status = await workspaceService.getOnboardingStatus('workspace-1');

    expect(status.categories).toBe(true);
  });

  it('should detect budgets as set when current month has a non-zero budget', async () => {
    // Currency not set
    (mockDb.query.workspaceMeta.findFirst as any).mockResolvedValueOnce(undefined);
    // No categories
    (mockDb.query.categories.findFirst as any).mockResolvedValueOnce(undefined);
    // Budget exists with non-zero amount
    (mockDb.query.budgets.findFirst as any).mockResolvedValueOnce({
      id: 'budget-1',
    });

    const status = await workspaceService.getOnboardingStatus('workspace-1');

    expect(status.budgets).toBe(true);
  });

  it('should detect assets as set when at least one non-deleted asset exists', async () => {
    // Currency not set
    (mockDb.query.workspaceMeta.findFirst as any).mockResolvedValueOnce(undefined);
    // No categories
    (mockDb.query.categories.findFirst as any).mockResolvedValueOnce(undefined);
    // No budgets
    (mockDb.query.budgets.findFirst as any).mockResolvedValueOnce(undefined);
    // Asset exists
    (mockDb.query.assets.findFirst as any).mockResolvedValueOnce({
      id: 'asset-1',
    });

    const status = await workspaceService.getOnboardingStatus('workspace-1');

    expect(status.assets).toBe(true);
  });

  it('should detect transactions as set when at least one non-deleted transaction exists', async () => {
    // Currency not set
    (mockDb.query.workspaceMeta.findFirst as any).mockResolvedValueOnce(undefined);
    // No categories
    (mockDb.query.categories.findFirst as any).mockResolvedValueOnce(undefined);
    // No budgets
    (mockDb.query.budgets.findFirst as any).mockResolvedValueOnce(undefined);
    // No assets
    (mockDb.query.assets.findFirst as any).mockResolvedValueOnce(undefined);
    // Transaction exists
    (mockDb.query.transactions.findFirst as any).mockResolvedValueOnce({
      id: 'txn-1',
    });

    const status = await workspaceService.getOnboardingStatus('workspace-1');

    expect(status.transactions).toBe(true);
  });

  it('should return all true when all steps are complete', async () => {
    (mockDb.query.workspaceMeta.findFirst as any).mockResolvedValueOnce({
      id: 'meta-1',
      meta_key: 'currency',
      meta_value: 'IDR',
    });
    (mockDb.query.categories.findFirst as any).mockResolvedValueOnce({ id: 'cat-1' });
    (mockDb.query.budgets.findFirst as any).mockResolvedValueOnce({ id: 'budget-1' });
    (mockDb.query.assets.findFirst as any).mockResolvedValueOnce({ id: 'asset-1' });
    (mockDb.query.transactions.findFirst as any).mockResolvedValueOnce({ id: 'txn-1' });

    const status = await workspaceService.getOnboardingStatus('workspace-1');

    expect(status.currency).toBe(true);
    expect(status.categories).toBe(true);
    expect(status.budgets).toBe(true);
    expect(status.assets).toBe(true);
    expect(status.transactions).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/services/__tests__/onboarding-status.test.ts`
Expected: FAIL — `getOnboardingStatus` is not a function.

**Step 3: Add `OnboardingStatus` type and implement `getOnboardingStatus()`**

In `src/services/workspace.service.ts`:

Add the type after the existing type exports (around line 49):

```typescript
/**
 * Onboarding completion status for a workspace
 * Each field indicates whether that setup step has been completed
 */
export interface OnboardingStatus {
  currency: boolean;
  categories: boolean;
  budgets: boolean;
  assets: boolean;
  transactions: boolean;
}
```

Add the imports needed at the top (merge with existing imports on line 13):

```typescript
import { eq, and, isNull, sql } from 'drizzle-orm';
```

Note: `sql` may already be available — check. If not, add it to the import.

Add the method to the `WorkspaceService` class (after `updateName` method):

```typescript
/**
 * Get onboarding completion status for a workspace
 *
 * Checks whether each setup step has been completed by querying existing data.
 * No stored onboarding state — purely derived from data presence.
 *
 * @param workspaceId - Workspace ID
 * @returns OnboardingStatus with boolean for each step
 */
async getOnboardingStatus(workspaceId: string): Promise<OnboardingStatus> {
  // Run all 5 checks in parallel for performance
  const [currencyMeta, expenseCategory, nonZeroBudget, asset, transaction] =
    await Promise.all([
      // 1. Currency: workspace meta has an explicit currency entry
      this.db.query.workspaceMeta.findFirst({
        where: and(
          eq(this.schema.workspaceMeta.workspace_id, workspaceId),
          eq(this.schema.workspaceMeta.meta_key, 'currency')
        ),
        columns: { id: true },
      }),

      // 2. Categories: at least 1 active expense category
      this.db.query.categories.findFirst({
        where: and(
          eq(this.schema.categories.workspace_id, workspaceId),
          eq(this.schema.categories.type, 'expense'),
          eq(this.schema.categories.is_active, true)
        ),
        columns: { id: true },
      }),

      // 3. Budgets: current month has at least 1 budget with non-zero amount
      (() => {
        const now = new Date();
        return this.db.query.budgets.findFirst({
          where: and(
            eq(this.schema.budgets.workspace_id, workspaceId),
            eq(this.schema.budgets.month, now.getMonth() + 1),
            eq(this.schema.budgets.year, now.getFullYear()),
            sql`CAST(${this.schema.budgets.budget_amount} AS REAL) > 0`
          ),
          columns: { id: true },
        });
      })(),

      // 4. Assets: at least 1 non-deleted asset
      this.db.query.assets.findFirst({
        where: and(
          eq(this.schema.assets.workspace_id, workspaceId),
          isNull(this.schema.assets.deleted_at)
        ),
        columns: { id: true },
      }),

      // 5. Transactions: at least 1 non-deleted transaction
      this.db.query.transactions.findFirst({
        where: and(
          eq(this.schema.transactions.workspace_id, workspaceId),
          isNull(this.schema.transactions.deleted_at)
        ),
        columns: { id: true },
      }),
    ]);

  return {
    currency: !!currencyMeta,
    categories: !!expenseCategory,
    budgets: !!nonZeroBudget,
    assets: !!asset,
    transactions: !!transaction,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `bun test src/services/__tests__/onboarding-status.test.ts`
Expected: All 7 tests PASS.

**Step 5: Run typecheck**

Run: `bun run typecheck`
Expected: No errors.

**Step 6: Commit**

```bash
git add src/services/workspace.service.ts src/services/__tests__/onboarding-status.test.ts
git commit -m "feat(onboarding): add getOnboardingStatus to WorkspaceService"
```

---

## Task 3: Create `OnboardingChecklist.astro` component

**Files:**

- Create: `src/components/organisms/OnboardingChecklist.astro`

**Step 1: Create the component**

Create `src/components/organisms/OnboardingChecklist.astro`:

```astro
---
/**
 * OnboardingChecklist Component
 *
 * Sequential setup checklist for new workspaces.
 * Renders at the top of the dashboard to guide users through initial setup.
 * Auto-disappears when all steps are complete (caller should not render it).
 *
 * Steps unlock sequentially: each step requires the previous to be complete.
 * Step 5 opens the TransactionDrawer instead of navigating to a page.
 */

import { Check, Lock, ArrowRight } from '@lucide/astro';
import Card from '@/components/atoms/Card.astro';
import type { OnboardingStatus } from '@/services/workspace.service';

export interface Props {
  status: OnboardingStatus;
}

const { status } = Astro.props;

interface Step {
  id: number;
  title: string;
  description: string;
  href: string;
  complete: boolean;
  unlocked: boolean;
}

const steps: Step[] = [
  {
    id: 1,
    title: 'Set your currency',
    description: 'Choose your default currency',
    href: '/settings',
    complete: status.currency,
    unlocked: true,
  },
  {
    id: 2,
    title: 'Create categories',
    description: 'Add expense and income categories',
    href: '/budget/categories',
    complete: status.categories,
    unlocked: status.currency,
  },
  {
    id: 3,
    title: 'Set up budgets',
    description: 'Initialize and set monthly budget amounts',
    href: '/budget',
    complete: status.budgets,
    unlocked: status.categories,
  },
  {
    id: 4,
    title: 'Add your accounts',
    description: 'Track bank accounts, wallets, or cash',
    href: '/assets',
    complete: status.assets,
    unlocked: status.budgets,
  },
  {
    id: 5,
    title: 'Record a transaction',
    description: 'Log your first expense or income',
    href: '#',
    complete: status.transactions,
    unlocked: status.assets,
  },
];

const completedCount = steps.filter((s) => s.complete).length;
const progressPercent = (completedCount / steps.length) * 100;
---

<Card data-testid="onboarding-checklist" aria-label="Workspace setup checklist">
  <div class="space-y-5">
    {/* Header */}
    <div>
      <h2 class="text-lg font-semibold text-base-content">Set up your workspace</h2>
      <p class="text-sm text-base-content/60 mt-1">
        Complete these steps to start tracking your finances
      </p>
    </div>

    {/* Progress bar */}
    <div>
      <div class="flex items-center justify-between mb-2">
        <span class="text-sm font-medium text-base-content/70">
          {completedCount} of {steps.length} complete
        </span>
      </div>
      <div class="w-full bg-base-200 rounded-full h-2">
        <div
          class="bg-success rounded-full h-2 transition-all duration-300"
          style={`width: ${progressPercent}%`}
        >
        </div>
      </div>
    </div>

    {/* Steps */}
    <ul class="space-y-1" role="list">
      {
        steps.map((step) => {
          const isCurrent = step.unlocked && !step.complete;

          return (
            <li
              class:list={[
                'flex items-center gap-3 rounded-lg px-3 py-3 transition-colors',
                step.complete && 'opacity-60',
                isCurrent && 'bg-primary/5',
                !step.unlocked && !step.complete && 'opacity-40',
              ]}
              data-testid={`onboarding-step-${step.id}`}
            >
              {/* Status icon */}
              <div
                class:list={[
                  'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                  step.complete && 'bg-success/20 text-success',
                  isCurrent && 'bg-primary/20 text-primary',
                  !step.unlocked && !step.complete && 'bg-base-200 text-base-content/30',
                ]}
              >
                {step.complete ? (
                  <Check size={16} />
                ) : isCurrent ? (
                  <ArrowRight size={16} />
                ) : (
                  <Lock size={14} />
                )}
              </div>

              {/* Content */}
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-base-content">{step.title}</div>
                <div class="text-xs text-base-content/50">{step.description}</div>
              </div>

              {/* Action */}
              {isCurrent && step.id !== 5 && (
                <a href={step.href} class="btn btn-primary btn-sm btn-outline">
                  Start
                </a>
              )}
              {isCurrent && step.id === 5 && (
                <button
                  type="button"
                  class="btn btn-primary btn-sm btn-outline"
                  data-onboarding-open-drawer
                >
                  Start
                </button>
              )}
            </li>
          );
        })
      }
    </ul>
  </div>
</Card>

<script>
  document.querySelectorAll('[data-onboarding-open-drawer]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('open-transaction-drawer'));
    });
  });
</script>
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/components/organisms/OnboardingChecklist.astro
git commit -m "feat(onboarding): create OnboardingChecklist component"
```

---

## Task 4: Integrate checklist into dashboard

Replace the hardcoded currency with workspace meta lookup and conditionally render the checklist.

**Files:**

- Modify: `src/pages/dashboard.astro`

**Step 1: Update imports in `dashboard.astro`**

Add to the existing imports at the top of the frontmatter (around line 20):

```typescript
import OnboardingChecklist from '@/components/organisms/OnboardingChecklist.astro';
import { workspaceMetaService, workspaceService } from '@/services';
import type { OnboardingStatus } from '@/services/workspace.service';
```

**Step 2: Replace hardcoded currency with onboarding status check**

Replace this block (lines 36-66):

```typescript
// TODO: Get workspace currency from workspace settings
// For now, use IDR as default since currency is now workspace-scoped
const primaryCurrency = 'IDR';

// Get current month and year
const now = new Date();
const currentMonth = now.getMonth() + 1;
const currentYear = now.getFullYear();

// Fetch dashboard data using parallel promises
let dashboardData: DashboardData | null = null;
let error: Error | null = null;

try {
  // Defensive check: user should be authenticated due to middleware protection
  if (!user) {
    throw new Error('User not authenticated. Please log in again.');
  }

  dashboardData = await dashboardService.getDashboardData(
    user.workspaceId,
    currentMonth,
    currentYear,
    primaryCurrency,
    perf
  );
} catch (err) {
  console.error('Error loading dashboard data:', err);
  error = err instanceof Error ? err : new Error('Unknown error occurred');
  dashboardData = null;
}
```

With:

```typescript
// Get current month and year
const now = new Date();
const currentMonth = now.getMonth() + 1;
const currentYear = now.getFullYear();

// Check onboarding status and get currency
let onboardingStatus: OnboardingStatus | null = null;
let primaryCurrency: string | null = null;
let dashboardData: DashboardData | null = null;
let error: Error | null = null;

try {
  if (!user) {
    throw new Error('User not authenticated. Please log in again.');
  }

  // Get onboarding status (parallel queries)
  onboardingStatus = await workspaceService.getOnboardingStatus(user.workspaceId);

  const allComplete =
    onboardingStatus.currency &&
    onboardingStatus.categories &&
    onboardingStatus.budgets &&
    onboardingStatus.assets &&
    onboardingStatus.transactions;

  // Get currency from workspace meta (null if not set)
  if (onboardingStatus.currency) {
    const currencyValue = await workspaceMetaService.get(user.workspaceId, 'currency');
    primaryCurrency = currencyValue;
  }

  // Only fetch dashboard data if currency is set
  if (primaryCurrency) {
    dashboardData = await dashboardService.getDashboardData(
      user.workspaceId,
      currentMonth,
      currentYear,
      primaryCurrency,
      perf
    );
  }
} catch (err) {
  console.error('Error loading dashboard data:', err);
  error = err instanceof Error ? err : new Error('Unknown error occurred');
  dashboardData = null;
}
```

**Step 3: Update the template section**

Replace the dashboard content block (lines 160-212) with conditional rendering:

```astro
<!-- Onboarding Checklist (shown when setup is incomplete) -->{
  onboardingStatus &&
    !(
      onboardingStatus.currency &&
      onboardingStatus.categories &&
      onboardingStatus.budgets &&
      onboardingStatus.assets &&
      onboardingStatus.transactions
    ) && <OnboardingChecklist status={onboardingStatus} />
}

<!-- Dashboard Content (only shown when currency is set) -->
{
  !error && primaryCurrency && (
    <>
      {/* Spending Summary Card & Spending Analysis Chart (side by side) */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        <SpendingCard
          spent={safeParseFloat(dashboardData?.monthlySpent.total)}
          budget={safeParseFloat(dashboardData?.monthlySpent.budget)}
          income={safeParseFloat(dashboardData?.monthlyIncome.total)}
          currency={primaryCurrency}
          remainingLabel={`Budget Remaining for ${currentMonthName}`}
          alertMessage={
            dashboardData?.monthlySpent.percentage && dashboardData.monthlySpent.percentage >= 80
              ? `You've reached ${Math.round(dashboardData.monthlySpent.percentage)}% of your monthly budget.`
              : undefined
          }
          loading={!dashboardData}
        />
        <SpendingChart
          data={spendingCategories}
          totalSpent={safeParseFloat(dashboardData?.monthlySpent.total)}
          totalBudget={safeParseFloat(dashboardData?.monthlySpent.budget)}
          loading={!dashboardData}
        />
      </div>

      {/* Recent Transactions & Net Worth Widget (side by side) */}
      <div class="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
        <div class="xl:col-span-2">
          <RecentTransactionsList
            transactions={recentTransactions}
            loading={!dashboardData}
            viewAllUrl="/transactions"
          />
        </div>

        <div class="space-y-6 sm:space-y-8">
          <NetWorthWidget
            totalIDR={safeParseFloat(dashboardData?.totalAssets.idr)}
            totalUSD={safeParseFloat(dashboardData?.totalAssets.usd)}
            localAssets={safeParseFloat(dashboardData?.totalAssets.idr)}
            globalAssets={safeParseFloat(dashboardData?.totalAssets.usd)}
            growthPercentage={0}
            loading={!dashboardData}
          />
          <CashFlowWidget items={cashFlowItems} loading={!dashboardData} />
        </div>
      </div>
    </>
  )
}
```

Note: The error block at the top stays as-is. The key change is:

- Checklist renders when onboarding is incomplete
- Widgets render only when `primaryCurrency` is set (step 1 complete)
- When all steps complete, checklist is not rendered, widgets render normally

**Step 4: Run typecheck and build**

Run: `bun run typecheck && bun run build`
Expected: No errors.

**Step 5: Commit**

```bash
git add src/pages/dashboard.astro
git commit -m "feat(onboarding): integrate checklist into dashboard with conditional widgets"
```

---

## Task 5: Verify the full flow manually and run quality gates

**Step 1: Run all tests**

Run: `bun test`
Expected: All tests pass.

**Step 2: Run quality gates**

```bash
bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck
```

Expected: All pass.

**Step 3: Run build**

Run: `bun run build`
Expected: Build succeeds.

**Step 4: Manual verification**

Start the dev server: `bun run dev`

Test scenarios:

1. **Fresh workspace (no currency set):** Dashboard should show only the onboarding checklist card. No financial widgets visible. Step 1 should be highlighted as current. Steps 2-5 should be locked.
2. **After setting currency in /settings:** Dashboard should show checklist + financial widgets. Step 1 should be checked. Step 2 should be the current step.
3. **After creating categories at /budget/categories:** Step 2 checked, step 3 unlocked.
4. **After initializing budgets with non-zero amounts:** Step 3 checked, step 4 unlocked.
5. **After adding an asset at /assets:** Step 4 checked, step 5 unlocked. The "Start" button on step 5 should open the TransactionDrawer.
6. **After recording a transaction:** All steps checked. On next dashboard load, no checklist rendered — normal dashboard only.

**Step 5: Fix any issues found, then commit if changes were needed**

---

## Task 6: Final commit and cleanup

**Step 1: Run full quality gates one more time**

```bash
bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck && bun run build
```

**Step 2: Verify git status is clean**

Run: `git status`
Expected: Only committed files, working tree clean.
