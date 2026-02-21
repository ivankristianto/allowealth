# Budget UX Triage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the budget page a triage-first tool — worst problems shown first, with aggregate health stats, better card layout, grouped toolbar, and modal navigation.

**Architecture:** Server-side default sort by percentage_used desc. Triage counts computed from existing BudgetOverview[] data (no new DB queries). Client-side filter toggle hides/shows cards via CSS. Prev/next modal nav dispatches existing custom events.

**Tech Stack:** Astro components (server-rendered), DaisyUI v5 + Tailwind CSS v4, TypeScript, existing Badge/Button/ProgressBar atoms

**Design Doc:** `docs/plans/2026-02-21-budget-ux-triage-design.md`

---

## Task 1: Add CRITICAL badge logic to getBudgetStatus utility

**Files:**

- Modify: `src/lib/utils/budget.ts:14-49` (getBudgetStatus function + BudgetStatusSummary type)
- Test: `src/components/organisms/BudgetCard.test.ts`

**Step 1: Write the failing test**

Add to `src/components/organisms/BudgetCard.test.ts` at end of file:

```typescript
import { getBudgetStatus } from '@/lib/utils/budget';

describe('BudgetCard - CRITICAL badge for 150%+', () => {
  it('should return exceeded badge for 100-149%', () => {
    const result = getBudgetStatus(125);
    expect(result.status).toBe('danger');
    expect(result.badgeVariant).toBe('exceeded');
    expect(result.isCritical).toBe(false);
  });

  it('should return critical badge for 150%+', () => {
    const result = getBudgetStatus(150);
    expect(result.status).toBe('danger');
    expect(result.badgeVariant).toBe('exceeded');
    expect(result.isCritical).toBe(true);
  });

  it('should return critical badge for 225%', () => {
    const result = getBudgetStatus(225);
    expect(result.isCritical).toBe(true);
  });

  it('should not be critical below 150%', () => {
    expect(getBudgetStatus(0).isCritical).toBe(false);
    expect(getBudgetStatus(79).isCritical).toBe(false);
    expect(getBudgetStatus(80).isCritical).toBe(false);
    expect(getBudgetStatus(100).isCritical).toBe(false);
    expect(getBudgetStatus(149).isCritical).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/components/organisms/BudgetCard.test.ts`
Expected: FAIL — `isCritical` property doesn't exist on `BudgetStatusSummary`

**Step 3: Write minimal implementation**

In `src/lib/utils/budget.ts`, add `isCritical` to the `BudgetStatusSummary` interface and update `getBudgetStatus`:

```typescript
export interface BudgetStatusSummary {
  status: BudgetUsageStatus;
  badgeVariant: 'optimal' | 'review' | 'exceeded';
  label: string;
  isCritical: boolean;
}

export function getBudgetStatus(percentage: number): BudgetStatusSummary {
  if (percentage > 100) {
    return {
      status: 'danger',
      badgeVariant: 'exceeded',
      label: 'Over Budget',
      isCritical: percentage >= 150,
    };
  }

  if (percentage === 100) {
    return {
      status: 'warning',
      badgeVariant: 'review',
      label: 'On Budget',
      isCritical: false,
    };
  }

  if (percentage >= 80) {
    return {
      status: 'warning',
      badgeVariant: 'review',
      label: 'Near Limit',
      isCritical: false,
    };
  }

  return {
    status: 'ok',
    badgeVariant: 'optimal',
    label: 'On Track',
    isCritical: false,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `bun test src/components/organisms/BudgetCard.test.ts`
Expected: PASS

**Step 5: Run typecheck to verify no breakage**

Run: `bun run typecheck`
Expected: 0 errors (existing consumers of `getBudgetStatus` only access existing fields)

**Step 6: Commit**

```bash
git add src/lib/utils/budget.ts src/components/organisms/BudgetCard.test.ts
git commit -m "feat(budget): add isCritical flag to getBudgetStatus for 150%+ threshold"
```

---

## Task 2: Update BudgetCard — CRITICAL badge text + card layout swap

**Files:**

- Modify: `src/components/organisms/BudgetCard.astro:247-259` (badge section) and `:282-321` (body section — swap Spent/Budget columns)

**Step 1: Update badge text in BudgetCard.astro**

Find the badge section (lines 247-259). Replace the badge content:

```astro
<span class="inline-block mt-1 md:mt-2" data-status-badge data-testid="budget-percentage">
  <Badge
    variant={budgetStatus.badgeVariant}
    size="sm"
    className={`text-xs md:text-xs uppercase tracking-wider ${budgetStatus.isCritical ? 'font-extrabold' : ''}`}
  >
    {
      budgetStatus.isCritical
        ? `CRITICAL ${Math.round(percentageUsed)}%`
        : `${Math.round(percentageUsed)}% Used`
    }
  </Badge>
</span>
```

**Step 2: Swap card body — Budget left (prominent), Spent right (secondary)**

Replace the body section (lines 283-321) so Budget is left/prominent and Spent is right/secondary:

```astro
{/* Body: Budget/Spent amounts and Progress bar */}
<div class="space-y-2 @xs:space-y-3 flex-grow flex flex-col">
  <div class="flex justify-between items-end">
    <div>
      <StatLabel size="sm" className="text-xs md:text-xs"> Budget </StatLabel>
      <div class="flex items-center gap-1 mt-0.5 md:mt-1">
        <p
          class="text-base md:text-lg font-bold text-base-content leading-none"
          data-budget-amount
          data-testid="budget-amount"
        >
          {formatCurrency(budget, currency)}
        </p>
        <button
          type="button"
          class="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-md text-base-content/40 hover:text-accent hover:bg-accent/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          data-budget-editable={categoryId}
          data-budget-raw={budget}
          data-testid="budget-edit-btn"
          aria-label={`Edit ${categoryName} budget: ${formatCurrency(budget, currency)}`}
        >
          <Pencil size={12} class="stroke-current md:hidden" aria-hidden="true" />
          <Pencil size={14} class="stroke-current hidden md:block" aria-hidden="true" />
        </button>
      </div>
    </div>
    <div class="text-right">
      <StatLabel size="sm" className="text-xs md:text-xs"> Spent </StatLabel>
      <p
        class="text-xs md:text-sm font-bold mt-0.5 md:mt-1 text-base-content/60 leading-none"
        data-testid="budget-spent"
      >
        {formatCurrency(spent, currency)}
      </p>
    </div>
  </div>
</div>
```

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

**Step 4: Commit**

```bash
git add src/components/organisms/BudgetCard.astro
git commit -m "feat(budget): add CRITICAL badge for 150%+, swap card layout (budget as anchor)"
```

---

## Task 3: Change default sort to percentage_used desc + add sort option

**Files:**

- Modify: `src/components/organisms/BudgetCardGrid.astro:59-64` (sort logic)
- Modify: `src/components/organisms/BudgetCardGrid.astro:136-142` (add data-sort-usage and data-budget-status to card wrapper)
- Modify: `src/components/molecules/BudgetFilterControls.astro:51-56` (add usage-desc option)
- Modify: `src/components/organisms/BudgetPage.client.ts:393-415` (add usage-desc case to sortBudgets)
- Test: `src/components/organisms/BudgetCardGrid.test.ts`

**Step 1: Write the failing test for default sort by percentage**

Add to `src/components/organisms/BudgetCardGrid.test.ts`:

```typescript
describe('BudgetCardGrid - default sort by percentage_used descending', () => {
  it('should sort by percentage_used descending (highest usage first)', () => {
    const budgets: BudgetData[] = [
      {
        category_id: '1',
        category_name: 'Food',
        spent_amount: '3600000',
        budget_amount: '5000000',
        percentage_used: 72,
        status: 'ok',
      },
      {
        category_id: '2',
        category_name: 'Work Support',
        spent_amount: '4500000',
        budget_amount: '2000000',
        percentage_used: 225,
        status: 'exceeded',
      },
      {
        category_id: '3',
        category_name: 'Housing',
        spent_amount: '37680000',
        budget_amount: '40000000',
        percentage_used: 94,
        status: 'warning',
      },
    ];

    const sorted = [...budgets].sort((a, b) => b.percentage_used - a.percentage_used);

    expect(sorted[0].category_name).toBe('Work Support'); // 225%
    expect(sorted[1].category_name).toBe('Housing'); // 94%
    expect(sorted[2].category_name).toBe('Food'); // 72%
  });
});
```

**Step 2: Run test to verify it passes (pure logic, no component dependency)**

Run: `bun test src/components/organisms/BudgetCardGrid.test.ts`
Expected: PASS (test validates the sort algorithm, not the component)

**Step 3: Update BudgetCardGrid.astro — change sort from budget_amount to percentage_used**

Replace lines 59-64:

```astro
// Sort budgets by percentage_used in descending order (highest usage first — triage order) const
sortedBudgets = [...budgets].sort((a, b) => b.percentage_used - a.percentage_used);
```

**Step 4: Add data-sort-usage and data-budget-status to card wrapper**

Update the card wrapper div (around line 136) to include the new data attributes:

```astro
<div
  role="listitem"
  class="h-full @container"
  data-sort-title={budget.category_name}
  data-sort-budget={budgetAmt}
  data-sort-spent={spentAmt}
  data-sort-usage={budget.percentage_used}
  data-budget-status={budget.status}
>
</div>
```

**Step 5: Add usage-desc option to BudgetFilterControls.astro**

Replace the sort select options (lines 51-56):

```astro
<select id="budget-sort-select" class={sortSelectClass} aria-label="Sort budgets">
  <option value="usage-desc">% Used ↓</option>
  <option value="budget-desc">Budget ↓</option>
  <option value="spent-desc">Spent ↓</option>
  <option value="title-asc">Title A-Z</option>
  <option value="title-desc">Title Z-A</option>
</select>
```

**Step 6: Add usage-desc case to sortBudgets in BudgetPage.client.ts**

In the `sortBudgets` function (line 393), add the `usage-desc` sort case. Update both card view and table view sort logic:

```typescript
function sortBudgets(sortKey: string): void {
  // Sort card view
  const cardGrid = document.querySelector('[role="list"][aria-label="Budget categories"]');
  if (cardGrid) {
    const items = Array.from(
      cardGrid.querySelectorAll<HTMLElement>('[role="listitem"][data-sort-title]')
    );
    items.sort((a, b) => {
      if (sortKey === 'usage-desc') {
        return parseFloat(b.dataset.sortUsage || '0') - parseFloat(a.dataset.sortUsage || '0');
      }
      if (sortKey === 'title-asc') {
        return (a.dataset.sortTitle || '').localeCompare(b.dataset.sortTitle || '');
      }
      if (sortKey === 'title-desc') {
        return (b.dataset.sortTitle || '').localeCompare(a.dataset.sortTitle || '');
      }
      if (sortKey === 'spent-desc') {
        return parseFloat(b.dataset.sortSpent || '0') - parseFloat(a.dataset.sortSpent || '0');
      }
      // Default: budget-desc
      return parseFloat(b.dataset.sortBudget || '0') - parseFloat(a.dataset.sortBudget || '0');
    });
    for (const item of items) {
      cardGrid.appendChild(item);
    }
  }

  // Sort table view
  const tableBody = document.querySelector('[data-budget-table] tbody');
  if (tableBody) {
    const rows = Array.from(tableBody.querySelectorAll<HTMLElement>('[data-budget-table-row]'));
    rows.sort((a, b) => {
      if (sortKey === 'usage-desc') {
        return parseFloat(b.dataset.sortUsage || '0') - parseFloat(a.dataset.sortUsage || '0');
      }
      if (sortKey === 'title-asc') {
        return (a.dataset.sortTitle || '').localeCompare(b.dataset.sortTitle || '');
      }
      if (sortKey === 'title-desc') {
        return (b.dataset.sortTitle || '').localeCompare(a.dataset.sortTitle || '');
      }
      if (sortKey === 'spent-desc') {
        return parseFloat(b.dataset.sortSpent || '0') - parseFloat(a.dataset.sortSpent || '0');
      }
      // budget-desc
      return parseFloat(b.dataset.sortBudget || '0') - parseFloat(a.dataset.sortBudget || '0');
    });
    for (const row of rows) {
      tableBody.appendChild(row);
    }
  }
}
```

**Step 7: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

**Step 8: Commit**

```bash
git add src/components/organisms/BudgetCardGrid.astro src/components/molecules/BudgetFilterControls.astro src/components/organisms/BudgetPage.client.ts src/components/organisms/BudgetCardGrid.test.ts
git commit -m "feat(budget): default sort by % used desc, add usage-desc sort option"
```

---

## Task 4: Add triage counts to BudgetSummary + visual hierarchy fix

**Files:**

- Modify: `src/components/organisms/BudgetSummary.astro:40-56` (Props interface) and `:155-206` (left column metrics)
- Modify: `src/components/partials/BudgetSummaryPartial.astro:27-43` (Props interface, pass new props)
- Modify: `src/pages/api/budget/overview.ts:113-121` (compute triage counts from categories, pass to partial)
- Test: `src/components/organisms/BudgetSummary.test.ts`

**Step 1: Write the failing test for triage count computation**

Add to `src/components/organisms/BudgetSummary.test.ts`:

```typescript
describe('BudgetSummary - triage count computation', () => {
  it('should count overbudget categories (status === exceeded)', () => {
    const categories = [
      { status: 'ok', percentage_used: 50 },
      { status: 'exceeded', percentage_used: 125 },
      { status: 'warning', percentage_used: 85 },
      { status: 'exceeded', percentage_used: 225 },
      { status: 'exceeded', percentage_used: 160 },
    ];
    const overBudgetCount = categories.filter((c) => c.status === 'exceeded').length;
    expect(overBudgetCount).toBe(3);
  });

  it('should count critical categories (percentage_used >= 150)', () => {
    const categories = [
      { status: 'exceeded', percentage_used: 125 },
      { status: 'exceeded', percentage_used: 225 },
      { status: 'exceeded', percentage_used: 160 },
      { status: 'ok', percentage_used: 50 },
    ];
    const criticalCount = categories.filter((c) => c.percentage_used >= 150).length;
    expect(criticalCount).toBe(2);
  });

  it('should return 0 counts when all categories are healthy', () => {
    const categories = [
      { status: 'ok', percentage_used: 50 },
      { status: 'ok', percentage_used: 30 },
    ];
    const overBudgetCount = categories.filter((c) => c.status === 'exceeded').length;
    const criticalCount = categories.filter((c) => c.percentage_used >= 150).length;
    expect(overBudgetCount).toBe(0);
    expect(criticalCount).toBe(0);
  });
});
```

**Step 2: Run test to verify it passes**

Run: `bun test src/components/organisms/BudgetSummary.test.ts`
Expected: PASS (pure logic test)

**Step 3: Add triage props to BudgetSummary.astro**

Update the Props interface (around line 40):

```typescript
export interface Props {
  totalAllocated: number;
  totalSpent: number;
  distribution: DistributionItem[];
  currency?: 'IDR' | 'USD';
  totalCategories?: number;
  overBudgetCount?: number;
  criticalCount?: number;
  loading?: boolean;
  className?: string;
}
```

Update destructuring (around line 49):

```typescript
const {
  totalAllocated,
  totalSpent,
  distribution,
  currency = 'IDR',
  totalCategories = 0,
  overBudgetCount = 0,
  criticalCount = 0,
  loading = false,
  className = '',
} = Astro.props;
```

**Step 4: Update visual hierarchy and add triage strip to BudgetSummary.astro**

In the left column metrics section (lines 155-206), make these changes:

1. Remove `color="warning"` from the "Total Budget Spent" StatLabel (visual hierarchy fix — stop using orange for the label)
2. Remove `color` prop from the Overbudget StatLabel (use neutral label, error only on amount)
3. Add the triage strip below the three stats

Replace the left column content inside `<div class="flex flex-col gap-6">` with:

```astro
{/* Total Monthly Pot */}
<div>
  <StatLabel size="sm" className="uppercase tracking-widest"> Allocated Budget </StatLabel>
  <p
    class="text-2xl @3xl:text-3xl font-bold mt-2 @3xl:mt-3 text-base-content tracking-tight leading-none"
  >
    {formatCurrency(totalAllocated, currency)}
  </p>
</div>

{/* Aggregate Spending — neutral label (visual hierarchy fix) */}
<div>
  <StatLabel size="sm" className="uppercase tracking-widest"> Total Budget Spent </StatLabel>
  <div class="flex items-baseline gap-2 mt-2 @3xl:mt-3">
    <p
      class:list={[
        'text-2xl @3xl:text-3xl font-bold tracking-tight leading-none',
        spentAmountColorClass,
      ]}
    >
      {formatCurrency(totalSpent, currency)}
    </p>
    <span class="text-xs font-bold text-base-content/40">
      / {overallUsage.toFixed(1)}%
    </span>
  </div>
</div>

{/* Remaining / Overbudget — neutral label, colored amount only */}
<div>
  <StatLabel size="sm" className="uppercase tracking-widest">
    {remainingMetric.label}
  </StatLabel>
  <p
    class:list={[
      'text-2xl @3xl:text-3xl font-bold mt-2 @3xl:mt-3 tracking-tight leading-none',
      remainingMetric.tone === 'error' ? 'text-error' : 'text-success',
    ]}
  >
    {formatCurrency(remainingMetric.value, currency)}
  </p>
</div>
```

Then add the triage strip after the closing `</div>` of the `flex flex-col gap-6` container but still inside the left column:

```astro
{/* Triage summary strip */}
{
  totalCategories > 0 && (
    <div
      class:list={[
        'p-3 @3xl:p-4 rounded-xl @3xl:rounded-2xl border',
        overBudgetCount > 0 ? 'bg-error/5 border-error/10' : 'bg-success/5 border-success/10',
      ]}
      data-triage-strip
    >
      {overBudgetCount > 0 ? (
        <div class="space-y-2">
          <p class="text-xs font-bold text-base-content leading-tight">
            <span class="text-error">{overBudgetCount}</span>
            <span class="text-base-content/60"> of {totalCategories} over budget</span>
            {criticalCount > 0 && (
              <span class="text-base-content/60">
                {' · '}
                <span class="text-error">{criticalCount}</span> critical
              </span>
            )}
          </p>
          <button
            type="button"
            class="text-xs font-bold text-accent hover:text-accent/80 transition-colors uppercase tracking-wider"
            data-overbudget-filter-toggle
          >
            Show overbudget only
          </button>
        </div>
      ) : (
        <p class="text-xs font-bold text-success leading-tight">All categories within budget</p>
      )}
    </div>
  )
}
```

**Step 5: Update BudgetSummaryPartial.astro to accept and pass triage props**

Update the Props interface and pass them through:

```astro
---
import BudgetSummary from '@components/organisms/BudgetSummary.astro';
import type { AllocationDistribution } from '@/lib/utils/budget';

export interface DistributionItem {
  name: string;
  weight: number;
  color: string;
}

export interface Props {
  totalAllocated: number;
  totalSpent: number;
  distribution: DistributionItem[] | AllocationDistribution[];
  currency: 'IDR' | 'USD';
  totalCategories?: number;
  overBudgetCount?: number;
  criticalCount?: number;
}

const {
  totalAllocated,
  totalSpent,
  distribution,
  currency,
  totalCategories,
  overBudgetCount,
  criticalCount,
} = Astro.props;
---

<BudgetSummary
  totalAllocated={totalAllocated}
  totalSpent={totalSpent}
  distribution={distribution}
  currency={currency}
  totalCategories={totalCategories}
  overBudgetCount={overBudgetCount}
  criticalCount={criticalCount}
  loading={false}
/>
```

**Step 6: Compute triage counts in API overview endpoint**

In `src/pages/api/budget/overview.ts`, around line 113, compute the triage counts from `budgetData.categories` and pass them to the partial:

```typescript
// Compute triage counts from category data
const totalCategories = budgetData.categories.length;
const overBudgetCount = budgetData.categories.filter((cat) => cat.status === 'exceeded').length;
const criticalCount = budgetData.categories.filter((cat) => cat.percentage_used >= 150).length;

const summaryHtml = await container.renderToString(BudgetSummaryPartial, {
  props: {
    totalAllocated: parseFloat(budgetData.total_budget || '0'),
    totalSpent: parseFloat(budgetData.total_spent || '0'),
    distribution,
    currency: selectedCurrency,
    totalCategories,
    overBudgetCount,
    criticalCount,
  },
});
```

Also update the initial page render in `src/pages/budget/index.astro` — find where `BudgetSummary` or `BudgetSummaryPartial` is rendered and add the same triage props. Grep for it:

```bash
grep -n 'BudgetSummary\|BudgetSummaryPartial' src/pages/budget/index.astro
```

Pass the same computed triage counts there.

**Step 7: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

**Step 8: Commit**

```bash
git add src/components/organisms/BudgetSummary.astro src/components/partials/BudgetSummaryPartial.astro src/pages/api/budget/overview.ts src/pages/budget/index.astro src/components/organisms/BudgetSummary.test.ts
git commit -m "feat(budget): add triage summary strip to header, fix visual hierarchy"
```

---

## Task 5: Add client-side overbudget filter toggle

**Files:**

- Modify: `src/components/organisms/BudgetPage.client.ts` (add overbudget filter handler)

**Step 1: Add overbudget filter function**

Add a new section after the `CLIENT-SIDE FILTERING` section in `BudgetPage.client.ts`:

```typescript
// =============================================================================
// OVERBUDGET FILTER TOGGLE
// =============================================================================

let overbudgetFilterActive = false;

/**
 * Toggle overbudget-only filter
 *
 * Shows/hides cards based on data-budget-status attribute.
 * When active, only shows cards with status="exceeded".
 */
function toggleOverbudgetFilter(): void {
  overbudgetFilterActive = !overbudgetFilterActive;

  // Update button text
  const toggleBtn = document.querySelector('[data-overbudget-filter-toggle]');
  if (toggleBtn) {
    toggleBtn.textContent = overbudgetFilterActive ? 'Show all categories' : 'Show overbudget only';
  }

  // Filter card view
  const cards = document.querySelectorAll<HTMLElement>('[role="listitem"][data-budget-status]');
  cards.forEach((card) => {
    if (!overbudgetFilterActive) {
      card.style.display = '';
      card.removeAttribute('aria-hidden');
    } else {
      const status = card.getAttribute('data-budget-status');
      if (status === 'exceeded') {
        card.style.display = '';
        card.removeAttribute('aria-hidden');
      } else {
        card.style.display = 'none';
        card.setAttribute('aria-hidden', 'true');
      }
    }
  });

  // Update empty state
  const cardGrid = document.getElementById('budget-cards-container');
  if (cardGrid) {
    const visibleCards = cardGrid.querySelectorAll(
      '[role="listitem"]:not([style*="display: none"])'
    ).length;
    const noResultsEl = cardGrid.querySelector('[data-filter-no-results]');
    if (noResultsEl) {
      noResultsEl.classList.toggle('hidden', visibleCards > 0);
    }
  }
}

/**
 * Set up overbudget filter toggle handler
 */
function setupOverbudgetFilterToggle(): void {
  const toggleBtn = document.querySelector('[data-overbudget-filter-toggle]');
  if (!toggleBtn) return;

  toggleBtn.addEventListener('click', toggleOverbudgetFilter);
}
```

**Step 2: Wire up in handleContentUpdated and initBudgetPage**

In `handleContentUpdated` (around line 231), add:

```typescript
setupOverbudgetFilterToggle();
overbudgetFilterActive = false; // Reset filter on content update
```

In `initBudgetPage` (around line 466), add:

```typescript
setupOverbudgetFilterToggle();
```

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

**Step 4: Commit**

```bash
git add src/components/organisms/BudgetPage.client.ts
git commit -m "feat(budget): add overbudget filter toggle for triage"
```

---

## Task 6: Toolbar grouping — visual divider + hide Initialize All when 0

**Files:**

- Modify: `src/components/molecules/BudgetActions.astro:107-140` (Initialize All section)
- Modify: `src/components/molecules/ActionBar.astro:56-62` (add divider before primary slot)

**Step 1: Update ActionBar.astro — add divider before primary slot**

Replace the primary slot section (around line 53-62):

```astro
{
  /* Primary Actions — first on mobile (order-first), pushed right on desktop (order-last + ml-auto) */
}
{
  hasPrimary && (
    <div class="order-first md:order-last md:ml-auto shrink-0 flex items-center gap-1 md:gap-2">
      <div class="hidden md:block w-px h-6 bg-base-300" aria-hidden="true" />
      <slot name="primary" />
    </div>
  )
}
```

**Step 2: Remove disabled state for Initialize All in BudgetActions.astro**

Replace lines 107-140 (the Initialize All section) — remove the disabled branch entirely, only render when `uninitializedCount > 0`:

```astro
{/* Initialize All Budgets — only shown when there are uninitialized categories */}
{
  uninitializedCount > 0 && (
    <div class="tooltip tooltip-bottom" data-tip="Initialize all uninitialized budgets">
      <button
        type="button"
        class={ghostBtn}
        id="initialize-budgets-btn"
        data-target-modal="initialize-budgets-modal"
        aria-label="Initialize all budgets"
        data-testid="initialize-budgets-btn"
      >
        <Zap size={16} class="stroke-current md:hidden" aria-hidden="true" />
        <Zap size={18} class="stroke-current hidden md:block" aria-hidden="true" />
        <span class="text-xs sm:text-sm">Initialize All</span>
      </button>
    </div>
  )
}
```

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

**Step 4: Commit**

```bash
git add src/components/molecules/BudgetActions.astro src/components/molecules/ActionBar.astro
git commit -m "feat(budget): group toolbar with divider, hide Initialize All when 0"
```

---

## Task 7: Prev/Next navigation in drilldown modal

**Files:**

- Modify: `src/components/organisms/CategoryDrillDownModal.astro:34-164` (script section)
- Modify: `src/components/organisms/BudgetPage.client.ts` (expose ordered category list)

**Step 1: Expose ordered category list from BudgetPage.client.ts**

Add a module-level export to `BudgetPage.client.ts` that builds the ordered category list from the DOM:

```typescript
// =============================================================================
// CATEGORY ORDER FOR MODAL NAVIGATION
// =============================================================================

export interface CategoryNavItem {
  categoryId: string;
  categoryName: string;
  categoryIcon: string;
  categoryColor: string;
  spent: number;
  budgetLimit: number;
  period: string;
}

/**
 * Get ordered list of categories from current card grid DOM
 *
 * Reads from visible cards in their current sort order.
 * Used by CategoryDrillDownModal for prev/next navigation.
 */
export function getOrderedCategories(): CategoryNavItem[] {
  const cards = document.querySelectorAll<HTMLElement>('[data-view-details]');
  const items: CategoryNavItem[] = [];

  cards.forEach((btn) => {
    const listItem = btn.closest('[role="listitem"]');
    // Skip hidden (filtered out) cards
    if (listItem && (listItem as HTMLElement).style.display === 'none') return;

    items.push({
      categoryId: btn.getAttribute('data-category-id') || '',
      categoryName: btn.getAttribute('data-category-name') || '',
      categoryIcon: btn.getAttribute('data-category-icon') || 'tag',
      categoryColor: btn.getAttribute('data-category-color') || '',
      spent: parseFloat(btn.getAttribute('data-spent') || '0'),
      budgetLimit: parseFloat(btn.getAttribute('data-budget-limit') || '0'),
      period: btn.getAttribute('data-period') || '',
    });
  });

  return items;
}
```

**Step 2: Update CategoryDrillDownModal script to add prev/next navigation**

Replace the script section in `CategoryDrillDownModal.astro` to add nav buttons and keyboard support:

```typescript
<script>
  import { initTransactionHistory } from '../molecules/TransactionHistory.client';
  import { getOrderedCategories, type CategoryNavItem } from './BudgetPage.client';
  initTransactionHistory();

  const initializedModals = new WeakSet<Element>();

  interface CategoryDrillDownData {
    categoryId: string;
    categoryName: string;
    categoryIcon?: string;
    categoryColor?: string;
    spent: number;
    budgetLimit?: number | null;
    period: string;
  }

  function initCategoryDrillDownModal() {
    document.querySelectorAll('[data-category-drilldown-modal-container]').forEach((container) => {
      if (initializedModals.has(container)) return;
      initializedModals.add(container);

      const id = container.getAttribute('data-id');
      if (!id) return;

      const modal = document.getElementById(id) as HTMLDialogElement | null;
      if (!modal) return;

      const loadingContainer = container.querySelector('[data-modal-loading]');
      const contentContainer = container.querySelector('[data-modal-content]');

      let currentData: CategoryDrillDownData | null = null;

      async function fetchDrilldownHTML(data: CategoryDrillDownData): Promise<string> {
        const range = data.period.includes('-') ? 'monthly' : 'yearly';
        const params = new URLSearchParams({
          categoryId: data.categoryId,
          categoryName: data.categoryName,
          categoryIcon: data.categoryIcon || 'tag',
          categoryColor: data.categoryColor || 'bg-base-300',
          spent: String(data.spent),
          period: data.period,
          range,
          _render: 'html',
        });
        if (data.budgetLimit !== null && data.budgetLimit !== undefined) {
          params.set('budgetLimit', String(data.budgetLimit));
        }
        const response = await fetch(`/api/reports/category-drilldown?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch drilldown content: ${response.statusText}`);
        }
        return await response.text();
      }

      /**
       * Navigate to adjacent category in the modal
       */
      function navigateToCategory(direction: 'prev' | 'next'): void {
        if (!currentData) return;
        const categories = getOrderedCategories();
        const currentIndex = categories.findIndex(c => c.categoryId === currentData!.categoryId);
        if (currentIndex === -1) return;

        const targetIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= categories.length) return;

        const target = categories[targetIndex];
        document.dispatchEvent(
          new CustomEvent('open-category-drilldown', {
            detail: {
              categoryId: target.categoryId,
              categoryName: target.categoryName,
              categoryIcon: target.categoryIcon,
              categoryColor: target.categoryColor,
              spent: target.spent,
              budgetLimit: target.budgetLimit || null,
              period: target.period,
            },
          })
        );
      }

      /**
       * Inject prev/next nav buttons into content
       */
      function injectNavButtons(): void {
        if (!contentContainer || !currentData) return;
        const categories = getOrderedCategories();
        const currentIndex = categories.findIndex(c => c.categoryId === currentData!.categoryId);
        if (currentIndex === -1) return;

        const hasPrev = currentIndex > 0;
        const hasNext = currentIndex < categories.length - 1;

        // Only add nav if there are multiple categories
        if (categories.length <= 1) return;

        const navHtml = `
          <div class="flex justify-between items-center pt-2 border-t border-base-300" data-modal-nav>
            <button
              type="button"
              class="btn btn-ghost btn-sm gap-1 ${hasPrev ? '' : 'invisible'}"
              data-nav-prev
              aria-label="Previous category"
            >
              ← Prev
            </button>
            <span class="text-xs text-base-content/40 font-bold">
              ${currentIndex + 1} / ${categories.length}
            </span>
            <button
              type="button"
              class="btn btn-ghost btn-sm gap-1 ${hasNext ? '' : 'invisible'}"
              data-nav-next
              aria-label="Next category"
            >
              Next →
            </button>
          </div>
        `;

        // Remove existing nav if any
        contentContainer.querySelector('[data-modal-nav]')?.remove();
        contentContainer.insertAdjacentHTML('beforeend', navHtml);

        // Attach click handlers
        contentContainer.querySelector('[data-nav-prev]')?.addEventListener('click', () => navigateToCategory('prev'));
        contentContainer.querySelector('[data-nav-next]')?.addEventListener('click', () => navigateToCategory('next'));
      }

      const handleOpenDrillDown = (async (e: CustomEvent<CategoryDrillDownData>) => {
        currentData = e.detail;

        loadingContainer?.classList.remove('hidden');
        contentContainer?.classList.add('hidden');
        if (!modal.open) modal.showModal();

        try {
          const html = await fetchDrilldownHTML(currentData);
          if (contentContainer) {
            contentContainer.innerHTML = html;
          }
          loadingContainer?.classList.add('hidden');
          contentContainer?.classList.remove('hidden');
          injectNavButtons();
        } catch (error) {
          console.error('Error fetching category drilldown:', error);
          if (contentContainer) {
            contentContainer.innerHTML = `
              <div class="flex flex-col items-center justify-center py-12 text-center">
                <p class="text-error text-base font-semibold mb-2">Failed to load category details</p>
                <p class="text-base-content/60 text-sm mb-4">Please try again later</p>
                <form method="dialog">
                  <button type="submit" class="btn btn-outline btn-accent">Close</button>
                </form>
              </div>
            `;
          }
          loadingContainer?.classList.add('hidden');
          contentContainer?.classList.remove('hidden');
        }
      }) as EventListener;

      // Keyboard navigation
      function handleKeyDown(e: KeyboardEvent): void {
        if (!modal.open) return;
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          navigateToCategory('prev');
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          navigateToCategory('next');
        }
      }

      document.addEventListener('open-category-drilldown', handleOpenDrillDown);
      document.addEventListener('keydown', handleKeyDown);

      document.addEventListener(
        'astro:before-swap',
        () => {
          document.removeEventListener('open-category-drilldown', handleOpenDrillDown);
          document.removeEventListener('keydown', handleKeyDown);
        },
        { once: true }
      );

      modal.addEventListener('close', () => {
        currentData = null;
        if (contentContainer) {
          contentContainer.innerHTML = '';
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCategoryDrillDownModal);
  } else {
    initCategoryDrillDownModal();
  }
  document.addEventListener('astro:page-load', initCategoryDrillDownModal);
</script>
```

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

**Step 4: Commit**

```bash
git add src/components/organisms/CategoryDrillDownModal.astro src/components/organisms/BudgetPage.client.ts
git commit -m "feat(budget): add prev/next navigation in drilldown modal with keyboard support"
```

---

## Task 8: Quality gates + build verification

**Files:** None (verification only)

**Step 1: Run all quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

Expected: All pass with 0 errors

**Step 2: Run build**

```bash
bun run build
```

Expected: Build succeeds

**Step 3: Run relevant tests**

```bash
bun test src/components/organisms/BudgetCard.test.ts
bun test src/components/organisms/BudgetCardGrid.test.ts
bun test src/components/organisms/BudgetSummary.test.ts
bun test src/components/molecules/BudgetActions.test.ts
```

Expected: All pass

**Step 4: Fix any issues found, then commit**

```bash
git add -A
git commit -m "chore: fix quality gate issues from budget UX triage"
```

---

## Task 9: Visual verification in browser

**Files:** None (verification only)

**Step 1: Start dev server**

```bash
bun run dev
```

**Step 2: Visual checks (use Chrome MCP tools)**

Navigate to `/budget` and verify:

1. Cards are sorted by % used descending (highest usage first)
2. Categories at 150%+ show "CRITICAL X%" badge in red bold
3. Each card shows Budget (left, large) and Spent (right, smaller)
4. Header summary shows triage strip: "X of Y over budget · Z critical"
5. "Show overbudget only" button filters cards correctly
6. Sort dropdown has "% Used ↓" as default option
7. Toolbar has visual divider before New Budget
8. Initialize All is hidden when all categories have budgets
9. Clicking Details on a card opens modal
10. Prev/Next buttons appear in modal, navigate between categories
11. Arrow keys navigate in modal
12. Check mobile responsive behavior
