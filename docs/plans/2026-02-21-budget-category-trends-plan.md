# Budget Category Trends Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Category Trends" tab to the budget history page that shows categories as rows and months as columns, enabling instant visual scanning of per-category spending trends.

**Architecture:** Reuse the existing cached `getMonthlyOverview()` service calls and pivot the data in a new `getCategoryTrends()` method. A new API endpoint serves HTML partials via the established Astro Container pattern (ADR-002). Client-side tab switching swaps content between Monthly Totals and Category Trends views.

**Tech Stack:** Astro 5 components, Nano Stores, server-rendered HTML fragments, DaisyUI v5, `@lucide/astro` icons.

**Design doc:** `docs/plans/2026-02-21-budget-category-trends-design.md`

---

## Task 1: Add `getCategoryTrends()` to BudgetService

**Files:**

- Modify: `src/services/budget.service.ts` (add types + method after `getBudgetHistory` ~line 299)
- Test: `src/services/budget.service.test.ts`

**Context:**

- `BudgetService.getMonthlyOverview()` returns `BudgetSummary` which has `categories: BudgetOverview[]` with `category_id`, `category_name`, `category_icon`, `category_color`, `spent_amount`, `budget_amount`, `percentage_used`, `status`.
- `getBudgetHistory()` at line 256 loops N months calling `getMonthlyOverview()` — we do the same but keep per-category data and pivot it.
- `MONTH_NAMES` is imported from `@/lib/utils/date`.

**Step 1: Write the failing test**

Add to `src/services/budget.service.test.ts` after the `getBudgetHistory` describe block (~line 531):

```typescript
describe('getCategoryTrends', () => {
  it('should pivot category data across months sorted by worst adherence', async () => {
    const userId = 'user-1';
    const currency = 'IDR' as const;

    // Mock: 2 months of data, each with 2 categories
    const mockBudgets = [
      createMockBudgetWithCategory(
        { id: 'b1', category_id: 'cat-food', budget_amount: '1000000', month: 1, year: 2026 },
        {
          id: 'cat-food',
          name: 'Food',
          type: 'expense',
          is_active: true,
          icon: 'Utensils',
          color: 'bg-success',
        }
      ),
      createMockBudgetWithCategory(
        { id: 'b2', category_id: 'cat-transport', budget_amount: '500000', month: 1, year: 2026 },
        {
          id: 'cat-transport',
          name: 'Transport',
          type: 'expense',
          is_active: true,
          icon: 'Car',
          color: 'bg-info',
        }
      ),
    ];

    // Both months return same budgets but different spend
    (mockDb.query.budgets.findMany as any).mockResolvedValue(mockBudgets);

    // Mock transactions: Food overspends (120%), Transport is ok (60%)
    const mockSelectResult = [
      { category_id: 'cat-food', total: '1200000' },
      { category_id: 'cat-transport', total: '300000' },
    ];
    (mockDb as any).select.mockReturnValue({
      from: mock(() => ({
        where: mock(() => ({
          groupBy: mock(() => Promise.resolve(mockSelectResult)),
        })),
      })),
    });

    const result = await budgetService.getCategoryTrends(userId, currency, 2);

    // Should have 2 month columns
    expect(result.months).toHaveLength(2);

    // Should have 2 category rows
    expect(result.categories).toHaveLength(2);

    // Food (120% avg) should sort before Transport (60% avg) — worst first
    expect(result.categories[0].category_name).toBe('Food');
    expect(result.categories[0].avg_percentage_used).toBeGreaterThan(100);
    expect(result.categories[1].category_name).toBe('Transport');

    // Each category should have data for each month
    expect(result.categories[0].months).toHaveLength(2);
    expect(result.categories[1].months).toHaveLength(2);

    // Check month data structure
    const foodMonth = result.categories[0].months[0];
    expect(foodMonth).toHaveProperty('month');
    expect(foodMonth).toHaveProperty('year');
    expect(foodMonth).toHaveProperty('month_name');
    expect(foodMonth).toHaveProperty('spent_amount');
    expect(foodMonth).toHaveProperty('budget_amount');
    expect(foodMonth).toHaveProperty('percentage_used');
    expect(foodMonth).toHaveProperty('status');
  });

  it('should validate months parameter', async () => {
    await expect(budgetService.getCategoryTrends('user-1', 'IDR', 0)).rejects.toThrow(
      'Invalid months parameter'
    );
    await expect(budgetService.getCategoryTrends('user-1', 'IDR', 25)).rejects.toThrow(
      'Invalid months parameter'
    );
  });

  it('should return empty categories when no budget data exists', async () => {
    (mockDb.query.budgets.findMany as any).mockResolvedValue([]);
    (mockDb as any).select.mockReturnValue({
      from: mock(() => ({
        where: mock(() => ({
          groupBy: mock(() => Promise.resolve([])),
        })),
      })),
    });

    const result = await budgetService.getCategoryTrends('user-1', 'IDR', 3);
    expect(result.months).toHaveLength(3);
    expect(result.categories).toHaveLength(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/services/budget.service.test.ts --filter "getCategoryTrends"`
Expected: FAIL — `getCategoryTrends` is not a function.

**Step 3: Write the implementation**

Add these exported interfaces after `MonthlyBudgetHistory` (~line 71) in `src/services/budget.service.ts`:

```typescript
export interface CategoryMonthData {
  month: number;
  year: number;
  month_name: string;
  spent_amount: string;
  budget_amount: string;
  percentage_used: number;
  status: 'ok' | 'warning' | 'exceeded';
}

export interface CategoryTrendRow {
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  avg_percentage_used: number;
  months: CategoryMonthData[];
}

export interface CategoryTrendData {
  months: { month: number; year: number; month_name: string }[];
  categories: CategoryTrendRow[];
}
```

Add the method to `BudgetService` class, right after `getBudgetHistory()`:

```typescript
/**
 * Get category trends across multiple months
 * Pivots the data: rows = categories, columns = months
 * Sorted by worst average adherence (highest percentage_used first)
 */
async getCategoryTrends(
  workspaceId: string,
  currency: 'IDR' | 'USD',
  months: number = 6,
  perf?: PerfCollector
): Promise<CategoryTrendData> {
  if (!Number.isInteger(months) || months < 1 || months > 24) {
    throw new Error('Invalid months parameter (must be 1-24)');
  }

  const now = new Date();
  const monthColumns: CategoryTrendData['months'] = [];
  const categoryMap = new Map<string, {
    category_id: string;
    category_name: string;
    category_icon: string;
    category_color: string;
    months: CategoryMonthData[];
    totalPercentage: number;
    monthCount: number;
  }>();

  // Collect per-category data for each month
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const monthName = MONTH_NAMES[month - 1] ?? `Month ${month}`;

    monthColumns.push({ month, year, month_name: monthName });

    const overview = await this.getMonthlyOverview(workspaceId, year, month, currency, perf);

    for (const cat of overview.categories) {
      let entry = categoryMap.get(cat.category_id);
      if (!entry) {
        entry = {
          category_id: cat.category_id,
          category_name: cat.category_name,
          category_icon: cat.category_icon,
          category_color: cat.category_color,
          months: [],
          totalPercentage: 0,
          monthCount: 0,
        };
        categoryMap.set(cat.category_id, entry);
      }

      entry.months.push({
        month,
        year,
        month_name: monthName,
        spent_amount: cat.spent_amount,
        budget_amount: cat.budget_amount,
        percentage_used: cat.percentage_used,
        status: cat.status,
      });
      entry.totalPercentage += cat.percentage_used;
      entry.monthCount += 1;
    }
  }

  // Fill missing months with zeroes for categories not present every month
  for (const entry of categoryMap.values()) {
    for (const col of monthColumns) {
      const hasMonth = entry.months.some(m => m.month === col.month && m.year === col.year);
      if (!hasMonth) {
        entry.months.push({
          month: col.month,
          year: col.year,
          month_name: col.month_name,
          spent_amount: '0',
          budget_amount: '0',
          percentage_used: 0,
          status: 'ok',
        });
      }
    }
    // Sort months chronologically
    entry.months.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  }

  // Build sorted category rows (worst adherence first)
  const categories: CategoryTrendRow[] = Array.from(categoryMap.values())
    .map(entry => ({
      category_id: entry.category_id,
      category_name: entry.category_name,
      category_icon: entry.category_icon,
      category_color: entry.category_color,
      avg_percentage_used: entry.monthCount > 0
        ? Math.round((entry.totalPercentage / entry.monthCount) * 100) / 100
        : 0,
      months: entry.months,
    }))
    .sort((a, b) => b.avg_percentage_used - a.avg_percentage_used);

  return { months: monthColumns, categories };
}
```

**Step 4: Export the new types from services index**

Check `src/services/index.ts` — it already has `export * from './budget.service'`, so the new types auto-export.

**Step 5: Run tests to verify they pass**

Run: `bun test src/services/budget.service.test.ts --filter "getCategoryTrends"`
Expected: PASS (3 tests).

**Step 6: Run full quality gates**

Run: `bun run typecheck`
Expected: 0 errors.

**Step 7: Commit**

```bash
git add src/services/budget.service.ts src/services/budget.service.test.ts
git commit -m "feat(budget): add getCategoryTrends() service method (#265)

Pivots per-category budget data across months for trend analysis.
Reuses cached getMonthlyOverview() calls, sorted by worst adherence."
```

---

## Task 2: Add store state for view mode and month range

**Files:**

- Modify: `src/lib/stores/budgetHistoryStore.ts`

**Context:**

- Store uses Nano Stores (`atom`, `computed` from `nanostores`).
- Existing atoms: `selectedYear`, `isLoading`, `availableYears`, `currency`.
- Existing init function: `initBudgetHistoryStore()` hydrates from SSR data.

**Step 1: Add new atoms and update init**

Add after the existing `currency` atom (~line 21):

```typescript
export type HistoryViewMode = 'monthly' | 'trends';
export const viewMode = atom<HistoryViewMode>('monthly');
export const monthRange = atom<3 | 6 | 12>(6);
```

Update `BudgetHistoryState` interface to include:

```typescript
export interface BudgetHistoryState {
  selectedYear: number;
  isLoading: boolean;
  availableYears: number[];
  currency: 'IDR' | 'USD';
  viewMode: HistoryViewMode;
  monthRange: 3 | 6 | 12;
}
```

Update `initBudgetHistoryStore` to handle optional new fields:

```typescript
if (data.viewMode !== undefined) {
  viewMode.set(data.viewMode);
}
if (data.monthRange !== undefined) {
  monthRange.set(data.monthRange);
}
```

Add setter functions:

```typescript
export function setViewMode(mode: HistoryViewMode): void {
  viewMode.set(mode);
}

export function setMonthRange(range: 3 | 6 | 12): void {
  monthRange.set(range);
}
```

Update `getState()` to include new fields:

```typescript
export function getState(): BudgetHistoryState {
  return {
    selectedYear: selectedYear.get(),
    isLoading: isLoading.get(),
    availableYears: availableYears.get(),
    currency: currency.get(),
    viewMode: viewMode.get(),
    monthRange: monthRange.get(),
  };
}
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors.

**Step 3: Commit**

```bash
git add src/lib/stores/budgetHistoryStore.ts
git commit -m "feat(store): add viewMode and monthRange to budget history store (#265)"
```

---

## Task 3: Add API client function for category trends

**Files:**

- Modify: `src/lib/api/budgetHistoryApiClient.ts`

**Context:**

- Existing pattern: `fetchBudgetHistoryHtml()` builds URL, creates AbortController, fetches, parses HTML response, returns `{ html, partials }`.
- The new endpoint will be at `/api/budget/category-trends`.
- It should return HTML that we inject into the same `#budget-history-table-body` container.

**Step 1: Add the fetch function**

Add after `fetchBudgetHistoryJson()` (~line 200):

```typescript
/**
 * Fetch category trends as HTML fragment
 *
 * @param months - Number of months to show (3, 6, or 12)
 * @param currency - Currency code
 */
export async function fetchCategoryTrendsHtml(
  months: 3 | 6 | 12,
  currency: 'IDR' | 'USD'
): Promise<FetchBudgetHistoryHtmlResponse> {
  cancelPendingRequest();
  activeController = new AbortController();

  const params = new URLSearchParams();
  params.set('months', String(months));
  params.set('currency', currency);
  params.set('_render', 'html');

  const url = `/api/budget/category-trends?${params.toString()}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'text/html' },
      signal: activeController.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(errorText || `HTTP error ${response.status}`);
    }

    const html = await response.text();
    activeController = null;

    return {
      html,
      partials: parseHtmlPartials(html),
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { html: '', partials: {} };
    }
    activeController = null;
    throw error;
  }
}
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors.

**Step 3: Commit**

```bash
git add src/lib/api/budgetHistoryApiClient.ts
git commit -m "feat(api-client): add fetchCategoryTrendsHtml() (#265)"
```

---

## Task 4: Create the Category Trends partial component

**Files:**

- Create: `src/components/partials/BudgetCategoryTrendsPartial.astro`

**Context:**

- Follow the pattern from `BudgetHistoryTablePartial.astro`: receives data as props, renders HTML only (no wrapper container).
- Uses `formatCurrencyCompact` from `@/lib/formatting` for compact amounts.
- Status colors: `text-success` (ok, <80%), `text-warning` (warning, 80-99%), `text-error` (exceeded, >=100%).
- Category icons use `@lucide/astro` dynamic icons — but since Lucide doesn't support dynamic component lookup by string name at build time, use the category's hex color with a small colored dot instead. The category icon name will be shown as a text fallback.
- Links: each cell links to `/budget?year=YYYY&month=M` (existing budget detail page).
- Mobile: horizontal scroll with sticky first column.

**Step 1: Create the partial**

Create `src/components/partials/BudgetCategoryTrendsPartial.astro`:

```astro
---
/**
 * Budget Category Trends Partial
 *
 * Renders the category × month matrix as an HTML fragment.
 * Used for server-rendered HTML responses (HTMX-style).
 *
 * Rows = categories (sorted by worst adherence)
 * Columns = months (chronological, oldest → newest)
 * Each cell = compact spent amount + colored status dot
 */

import { formatCurrencyCompact } from '@/lib/formatting';
import { sanitizeColor } from '@/lib/utils/budget';
import EmptyState from '../atoms/EmptyState.astro';
import type { CategoryTrendData } from '@/services';

export interface Props {
  trends: CategoryTrendData;
  currency: 'IDR' | 'USD';
}

const { trends, currency } = Astro.props;
const { months, categories } = trends;

const getStatusDotClass = (status: 'ok' | 'warning' | 'exceeded'): string => {
  switch (status) {
    case 'exceeded':
      return 'bg-error';
    case 'warning':
      return 'bg-warning';
    default:
      return 'bg-success';
  }
};

const buildBudgetUrl = (year: number, month: number): string =>
  `/budget?year=${year}&month=${month}`;
---

<div class="@container" data-trends-view>
  {
    categories.length > 0 ? (
      <div class="overflow-x-auto">
        <table class="w-full border-collapse min-w-max">
          {/* Header row: Category + month columns */}
          <thead>
            <tr class="border-b border-base-200">
              <th class="sticky left-0 z-10 bg-base-100 px-4 @4xl:px-6 py-4 text-left text-xs font-bold text-base-content/40 uppercase tracking-widest min-w-[140px] @3xl:min-w-[180px]">
                Category
              </th>
              {months.map((col) => (
                <th class="px-3 @4xl:px-4 py-4 text-center text-xs font-bold text-base-content/40 uppercase tracking-widest min-w-[80px] @3xl:min-w-[100px]">
                  <div>{col.month_name.slice(0, 3)}</div>
                  <div class="text-base-content/25 font-medium">{col.year}</div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Category rows */}
          <tbody class="divide-y divide-base-100">
            {categories.map((cat) => (
              <tr class="group hover:bg-base-200/30 transition-colors" data-trend-row>
                {/* Sticky category column */}
                <td class="sticky left-0 z-10 bg-base-100 group-hover:bg-base-200/30 transition-colors px-4 @4xl:px-6 py-4">
                  <div class="flex items-center gap-2.5">
                    <span
                      class="w-2.5 h-2.5 rounded-full shrink-0"
                      style={`background-color: ${sanitizeColor(cat.category_color)}`}
                      aria-hidden="true"
                    />
                    <div class="min-w-0">
                      <div class="text-sm font-bold truncate">{cat.category_name}</div>
                      <div class="text-xs text-base-content/40 font-medium">
                        avg: {cat.avg_percentage_used.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </td>

                {/* Month cells */}
                {cat.months.map((m) => {
                  const spentAmount = parseFloat(m.spent_amount);
                  const hasData = spentAmount > 0 || parseFloat(m.budget_amount) > 0;
                  return (
                    <td class="px-3 @4xl:px-4 py-4 text-center">
                      {hasData ? (
                        <a
                          href={buildBudgetUrl(m.year, m.month)}
                          class="inline-flex items-center gap-1.5 text-sm font-bold hover:underline decoration-base-content/20 underline-offset-2"
                          title={`${cat.category_name} — ${m.month_name} ${m.year}: ${m.percentage_used.toFixed(0)}% of budget`}
                        >
                          <span
                            class={`w-2 h-2 rounded-full shrink-0 ${getStatusDotClass(m.status)}`}
                            aria-label={
                              m.status === 'exceeded'
                                ? 'Over budget'
                                : m.status === 'warning'
                                  ? 'Near limit'
                                  : 'On track'
                            }
                          />
                          <span>{formatCurrencyCompact(spentAmount, currency)}</span>
                        </a>
                      ) : (
                        <span class="text-sm text-base-content/20 font-bold">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Legend */}
        <div class="flex items-center justify-center gap-6 py-4 border-t border-base-200">
          <div class="flex items-center gap-1.5 text-xs text-base-content/50">
            <span class="w-2 h-2 rounded-full bg-success" aria-hidden="true" />
            <span>&lt;80%</span>
          </div>
          <div class="flex items-center gap-1.5 text-xs text-base-content/50">
            <span class="w-2 h-2 rounded-full bg-warning" aria-hidden="true" />
            <span>80–99%</span>
          </div>
          <div class="flex items-center gap-1.5 text-xs text-base-content/50">
            <span class="w-2 h-2 rounded-full bg-error" aria-hidden="true" />
            <span>&ge;100%</span>
          </div>
        </div>
      </div>
    ) : (
      <div class="py-16 text-center">
        <EmptyState
          title="No category data available"
          message="Category trends will appear here once you have budget data for at least one month."
          iconName="trendingUp"
          variant="centered"
          className="py-0"
        />
      </div>
    )
  }
</div>
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors.

**Step 3: Commit**

```bash
git add src/components/partials/BudgetCategoryTrendsPartial.astro
git commit -m "feat(ui): add BudgetCategoryTrendsPartial component (#265)

Server-rendered matrix of categories × months with status color dots,
compact currency amounts, sticky category column, and a status legend."
```

---

## Task 5: Create the API endpoint

**Files:**

- Create: `src/pages/api/budget/category-trends.ts`

**Context:**

- Follow the pattern from `src/pages/api/budget/history.ts`: use `createRenderHelper`, `getAuthenticatedUser`, `AstroContainer`, return HTML or JSON.
- Query params: `months` (3|6|12, default 6), `currency` (IDR|USD, default IDR), `_render` (html|json).
- Import `BudgetCategoryTrendsPartial` for HTML rendering.
- Use `budgetService.getCategoryTrends()` for data.

**Step 1: Create the endpoint**

Create `src/pages/api/budget/category-trends.ts`:

```typescript
import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { budgetService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { createRenderHelper } from '@/lib/api/renderResponse';

import BudgetCategoryTrendsPartial from '@/components/partials/BudgetCategoryTrendsPartial.astro';

/**
 * GET /api/budget/category-trends
 * Get category trend data (categories × months matrix)
 * Query params:
 *   - currency: 'IDR' | 'USD' (default: 'IDR')
 *   - months: 3 | 6 | 12 (default: 6)
 *   - _render: 'html' | 'json' (default: 'json')
 */
export const GET: APIRoute = async (context) => {
  const { url } = context;
  const render = createRenderHelper(url);

  try {
    const auth = getAuthenticatedUser(context);
    const perf = context.locals.perf;

    const currency = (url.searchParams.get('currency') as 'IDR' | 'USD') || 'IDR';
    const monthsParam = url.searchParams.get('months');
    const months = monthsParam ? parseInt(monthsParam, 10) : 6;

    if (currency !== 'IDR' && currency !== 'USD') {
      return render.wantsHtml()
        ? render.error('Invalid currency parameter', 400)
        : errorResponse('Invalid currency parameter', 400);
    }

    const validMonths = [3, 6, 12];
    if (!validMonths.includes(months)) {
      return render.wantsHtml()
        ? render.error('Invalid months parameter (must be 3, 6, or 12)', 400)
        : errorResponse('Invalid months parameter (must be 3, 6, or 12)', 400);
    }

    const trends = await budgetService.getCategoryTrends(auth.workspaceId, currency, months, perf);

    if (render.wantsHtml()) {
      const container = await AstroContainer.create();
      const html = await container.renderToString(BudgetCategoryTrendsPartial, {
        props: { trends, currency },
      });
      return render.html(`<!-- PARTIAL:table -->\n${html}`);
    }

    return successResponse(trends);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return render.wantsHtml()
        ? render.error('Unauthorized', 401)
        : errorResponse('Unauthorized', 401);
    }
    logError('Error fetching category trends', error);
    return render.wantsHtml()
      ? render.error('Failed to fetch category trends', 500)
      : errorResponse('Failed to fetch category trends', 500);
  }
};
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors.

**Step 3: Commit**

```bash
git add src/pages/api/budget/category-trends.ts
git commit -m "feat(api): add /api/budget/category-trends endpoint (#265)

Serves category trend data as JSON or HTML partial via _render=html.
Supports months=3|6|12 and currency=IDR|USD query parameters."
```

---

## Task 6: Update the history page with tab bar and month range selector

**Files:**

- Modify: `src/pages/budget/history.astro`
- Modify: `src/components/organisms/BudgetHistoryPage.client.ts`
- Modify: `src/components/organisms/BudgetHistoryRenderer.client.ts`

**Context:**

- The history page currently has: header with title + YearToggle + export button, then a table card with header row + `#budget-history-table-body`.
- We need to add a tab bar between the header and the table card.
- The tab bar replaces `ViewToggle.astro` from the design — but we can reuse the existing `TabSwitcher.astro` concept or build simpler inline markup since we only have 2 tabs with no icons needed. Simpler inline markup is preferred (YAGNI — no need for a generic component for 2 tabs).
- When "Category Trends" tab is active: hide the year toggle, show the month range selector (3/6/12), and fetch/render trends data.
- When "Monthly Totals" tab is active: show the year toggle, hide the month range selector, show the existing table with its desktop header row.

**Step 1: Update `history.astro`**

Add tab bar and month range selector between the header section and the table card. Add `data-*` attributes for client-side toggling. The SSR default is "Monthly Totals" active.

After the header `</div>` (line 115), before the error check (line 117), add:

```astro
{/* Tab Bar & Controls */}
<div class="flex flex-col @sm:flex-row items-start @sm:items-center justify-between gap-4">
  {/* View Mode Tabs */}
  <div
    class="flex bg-base-200 p-1 rounded-xl shrink-0"
    role="tablist"
    aria-label="History view mode"
    data-view-tabs
  >
    <button
      type="button"
      role="tab"
      aria-selected="true"
      class="px-4 py-2.5 min-h-11 text-xs font-bold rounded-lg transition-all bg-base-100 shadow text-primary"
      data-view-tab="monthly"
    >
      Monthly Totals
    </button>
    <button
      type="button"
      role="tab"
      aria-selected="false"
      class="px-4 py-2.5 min-h-11 text-xs font-bold rounded-lg transition-all text-base-content/50 hover:text-base-content/70"
      data-view-tab="trends"
    >
      Category Trends
    </button>
  </div>

  {/* Month Range Selector (hidden by default, shown when trends tab active) */}
  <div class="hidden" data-month-range-group role="group" aria-label="Month range">
    <div class="flex bg-base-200 p-1 rounded-xl shrink-0">
      {
        [3, 6, 12].map((range) => (
          <button
            type="button"
            class:list={[
              'px-3 py-2 min-h-9 text-xs font-bold rounded-lg transition-all',
              range === 6
                ? 'bg-base-100 shadow text-primary'
                : 'text-base-content/50 hover:text-base-content/70',
            ]}
            data-month-range={range}
            aria-pressed={range === 6 ? 'true' : 'false'}
          >
            {range}mo
          </button>
        ))
      }
    </div>
  </div>
</div>
```

Also wrap the desktop header row (`hidden @3xl:grid grid-cols-7...`) in a container with `data-monthly-header` so we can show/hide it:

```astro
<div data-monthly-header>
  {/* existing desktop header row markup unchanged */}
</div>
```

Update `ssrData` to include `viewMode` and `monthRange`:

```typescript
const ssrData = {
  selectedYear,
  availableYears,
  currency: selectedCurrency,
  viewMode: 'monthly' as const,
  monthRange: 6 as const,
};
```

**Step 2: Update `BudgetHistoryPage.client.ts`**

Import new store atoms and API client:

```typescript
import {
  initBudgetHistoryStore,
  setSelectedYear,
  setLoading,
  setViewMode,
  setMonthRange,
  selectedYear,
  isLoading,
  viewMode,
  monthRange,
  getState,
} from '@/lib/stores/budgetHistoryStore';
import { fetchBudgetHistoryHtml, fetchCategoryTrendsHtml } from '@/lib/api/budgetHistoryApiClient';
```

Add in `initBudgetHistoryPage()`:

```typescript
// Set up tab switching
setupViewTabListeners();
setupMonthRangeListeners();

// Subscribe to view mode changes
viewMode.subscribe((mode) => {
  updateViewMode(mode);
});

monthRange.subscribe(() => {
  // Re-fetch trends when month range changes (only if in trends mode)
  if (viewMode.get() === 'trends') {
    const state = getState();
    fetchAndRenderTrends(state.monthRange, state.currency);
  }
});
```

Add new functions:

```typescript
function setupViewTabListeners(): void {
  const tabs = document.querySelectorAll('[data-view-tab]');
  tabs.forEach((tab) => {
    tab.addEventListener('click', (e: Event) => {
      e.preventDefault();
      const mode = tab.getAttribute('data-view-tab') as 'monthly' | 'trends';
      if (!mode || mode === viewMode.get()) return;
      setViewMode(mode);

      if (mode === 'trends') {
        const state = getState();
        fetchAndRenderTrends(state.monthRange, state.currency);
      } else {
        const state = getState();
        fetchAndRender(state.selectedYear, state.currency);
      }
    });
  });
}

function setupMonthRangeListeners(): void {
  const buttons = document.querySelectorAll('[data-month-range]');
  buttons.forEach((btn) => {
    btn.addEventListener('click', (e: Event) => {
      e.preventDefault();
      const range = parseInt(btn.getAttribute('data-month-range') || '6', 10) as 3 | 6 | 12;
      if (range === monthRange.get()) return;
      setMonthRange(range);
    });
  });
}

function updateViewMode(mode: 'monthly' | 'trends'): void {
  const isTrends = mode === 'trends';

  // Update tab visual state
  document.querySelectorAll('[data-view-tab]').forEach((tab) => {
    const isActive = tab.getAttribute('data-view-tab') === mode;
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    tab.classList.toggle('bg-base-100', isActive);
    tab.classList.toggle('shadow', isActive);
    tab.classList.toggle('text-primary', isActive);
    tab.classList.toggle('text-base-content/50', !isActive);
    tab.classList.toggle('hover:text-base-content/70', !isActive);
  });

  // Toggle year toggle vs month range visibility
  const yearToggle = document.querySelector('[data-year-toggle-group]');
  const monthRangeGroup = document.querySelector('[data-month-range-group]');
  const monthlyHeader = document.querySelector('[data-monthly-header]');

  if (yearToggle) yearToggle.classList.toggle('hidden', isTrends);
  if (monthRangeGroup) monthRangeGroup.classList.toggle('hidden', !isTrends);
  if (monthlyHeader) monthlyHeader.classList.toggle('hidden', isTrends);

  // Update URL
  const url = new URL(window.location.href);
  if (isTrends) {
    url.searchParams.set('view', 'trends');
    url.searchParams.delete('year');
  } else {
    url.searchParams.delete('view');
    url.searchParams.set('year', String(selectedYear.get()));
  }
  window.history.replaceState({}, '', url.toString());
}

async function fetchAndRenderTrends(
  months: 3 | 6 | 12,
  currencyCode: 'IDR' | 'USD'
): Promise<void> {
  setLoading(true);

  try {
    const response = await fetchCategoryTrendsHtml(months, currencyCode);

    // Don't render if view mode switched during fetch
    if (viewMode.get() !== 'trends') return;

    renderFromHtmlResponse(response);

    // Update month range button states
    document.querySelectorAll('[data-month-range]').forEach((btn) => {
      const range = parseInt(btn.getAttribute('data-month-range') || '0', 10);
      const isActive = range === months;
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      btn.classList.toggle('bg-base-100', isActive);
      btn.classList.toggle('shadow', isActive);
      btn.classList.toggle('text-primary', isActive);
      btn.classList.toggle('text-base-content/50', !isActive);
    });
  } catch (error) {
    if (viewMode.get() === 'trends') {
      const message = error instanceof Error ? error.message : 'Failed to load category trends';
      addToast(message, 'error');
      console.error('[BudgetHistoryPage] Trends fetch error:', error);
    }
  } finally {
    if (viewMode.get() === 'trends') {
      setLoading(false);
    }
  }
}
```

**Step 3: Update `BudgetHistoryRenderer.client.ts`**

Update `renderTableHtml` to also handle `[data-trend-row]` for animation (add to the rows selector):

```typescript
const rows = tableBody.querySelectorAll('[data-history-row], [data-trend-row]');
```

Update screen reader announcement in `renderTableHtml`:

```typescript
const historyRows = tableBody.querySelectorAll('[data-history-row]');
const trendRows = tableBody.querySelectorAll('[data-trend-row]');
if (historyRows.length > 0) {
  liveRegion.textContent = `Showing ${historyRows.length} months of budget history`;
} else if (trendRows.length > 0) {
  liveRegion.textContent = `Showing trends for ${trendRows.length} budget categories`;
} else {
  liveRegion.textContent = 'No budget data available';
}
```

**Step 4: Run typecheck and quality gates**

Run: `bun run typecheck && bun run lint:fix && bun run stylelint:fix && bun run format:fix`
Expected: 0 errors.

**Step 5: Commit**

```bash
git add src/pages/budget/history.astro src/components/organisms/BudgetHistoryPage.client.ts src/components/organisms/BudgetHistoryRenderer.client.ts
git commit -m "feat(ui): add tab bar and category trends view to budget history (#265)

Adds Monthly Totals / Category Trends tab switcher with month range
selector (3/6/12). Tab switching fetches HTML partials and injects
them into the existing table body container."
```

---

## Task 7: Manual verification and build check

**Files:** None (verification only)

**Step 1: Run full build**

Run: `bun run build`
Expected: Build succeeds with 0 errors.

**Step 2: Run all tests**

Run: `bun run test`
Expected: All tests pass.

**Step 3: Run full quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

Expected: All pass.

**Step 4: Start dev server and verify manually**

Run: `bun run dev`

Manual checks:

1. Navigate to `/budget/history`
2. Verify "Monthly Totals" tab is active and shows existing view unchanged
3. Click "Category Trends" tab
4. Verify the year toggle hides and month range (3/6/12) appears with 6 selected
5. Verify the matrix shows: categories as rows, months as columns
6. Verify rows are sorted by worst average adherence (highest % first)
7. Verify color dots: green (<80%), yellow (80-99%), red (>=100%)
8. Verify clicking a cell navigates to `/budget?year=YYYY&month=M`
9. Switch month range to 3 and 12, verify data updates
10. Switch back to "Monthly Totals" tab, verify original view is restored
11. On mobile viewport (~375px): verify horizontal scroll with sticky category column

**Step 5: Final commit if any formatting changes**

```bash
git add -A
git status  # Verify only expected files changed
git commit -m "chore: formatting fixes for category trends (#265)"
```

---

## Summary

| Task | Description                                  | Files | Estimated complexity |
| ---- | -------------------------------------------- | ----- | -------------------- |
| 1    | Service method `getCategoryTrends()` + tests | 2     | Medium               |
| 2    | Store atoms: viewMode, monthRange            | 1     | Small                |
| 3    | API client `fetchCategoryTrendsHtml()`       | 1     | Small                |
| 4    | Category trends partial component            | 1     | Medium               |
| 5    | API endpoint `/api/budget/category-trends`   | 1     | Small                |
| 6    | History page: tab bar + client orchestration | 3     | Large                |
| 7    | Build check + manual verification            | 0     | Small                |

**Dependency order:** Tasks 1-5 are independent (can run in parallel). Task 6 depends on all of 1-5. Task 7 depends on 6.

**Parallel execution opportunity:** Tasks 1, 2, 3 modify different files and can run as parallel subagents. Task 4 and 5 can also run in parallel (different files). Task 6 must run after all others.
