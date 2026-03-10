# Reporting Income Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Turn `/reports` into a lightweight Overview page and add dedicated `/reports/expenses` and `/reports/income` deep dives without regressing report performance.

**Architecture:** Keep the existing Astro interactive-page pattern: SSR first paint plus HTML partial refreshes for filter changes. Split the backend by page responsibility, classify income via category metadata (`income_source_type`), and reuse decimal-safe Drizzle aggregations instead of inventing a separate income table.

**Tech Stack:** Astro 5 (SSR + `astro:transitions`), Drizzle ORM (SQLite + PostgreSQL), Zod, Chart.js, DaisyUI/Tailwind, `bun:test`, Playwright

**Design Doc:** `docs/plans/2026-03-08-reporting-income-design.md`

---

## Read First

1. `docs/plans/2026-03-08-reporting-income-design.md`
2. `docs/architecture/002-interactive-pages.md`
3. `src/pages/reports/index.astro`
4. `src/pages/api/reports/index.ts`
5. `src/services/report.service.ts`
6. `src/components/organisms/ReportsPage.client.ts`

## Guardrails

- Preserve decimal-string math in the service layer.
- Reuse existing transaction/category/account schemas; do not add an `incomes` table.
- Keep `/reports` fast by not fetching expense-detail and income-detail payloads together.
- Preserve the current protected-route and multi-currency behavior.
- Keep currency selection in the existing global header; do not add a report-local currency control.
- Separate page clients are acceptable because Overview, Expenses, and Income are separate routes, but shared URL/fetch/render plumbing should still be extracted instead of duplicated.
- Reuse existing infrastructure where it fits: `createRenderHelper(...)`, `getTrendAggregateByMonth(...)`, `CategoryDrillDownModal.astro`, `CategoryDrillDownPartial.astro`, and `PaginationPartial.astro`.
- Use TDD for every task below.
- Add the required git trailer to every commit:

```text
Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

---

## Task 1: Category schema foundation for income source classification

**Files:**
- Modify: `src/db/schema/sqlite/categories.ts`
- Modify: `src/db/schema/postgresql/categories.ts`
- Modify: `src/db/index.integration.test.ts`
- Create: `drizzle/sqlite/0003_<generated>.sql`
- Create: `drizzle/sqlite/meta/0003_snapshot.json`
- Modify: `drizzle/sqlite/meta/_journal.json`
- Create: `drizzle/postgresql/0003_<generated>.sql`
- Create: `drizzle/postgresql/meta/0003_snapshot.json`
- Modify: `drizzle/postgresql/meta/_journal.json`

**Step 1: Write the failing database integration test**

Add to `src/db/index.integration.test.ts`:

```typescript
it('persists income_source_type on budget categories', async () => {
  const testDb = getDb();

  await testDb.insert(categories).values({
    id: 'test-income-category-source',
    workspace_id: TEST_WORKSPACE_ID,
    created_by_user_id: 'test-user-runtime-agnostic',
    name: 'Salary',
    type: 'income',
    income_source_type: 'active',
    icon: 'banknote',
    color: 'bg-success',
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  });

  const saved = await testDb.query.categories.findFirst({
    where: eq(categories.id, 'test-income-category-source'),
  });

  expect(saved?.income_source_type).toBe('active');
});
```

**Step 2: Run the test to verify it fails**

```bash
bun test src/db/index.integration.test.ts
```

Expected: FAIL because `income_source_type` does not exist yet.

**Step 3: Add the schema column in both dialects**

Add this field to both category schema files:

```typescript
income_source_type: text('income_source_type', {
  enum: ['active', 'passive', 'other'],
})
  .default('other')
  .notNull(),
```

Use `default('other')` so existing rows and expense categories stay valid after migration.

**Step 4: Generate and apply migrations locally**

```bash
bun run db:generate
DATABASE_URL=postgresql://placeholder bun run db:generate
bun run db:push
```

Expected: new `0003_*` migration files appear under both `drizzle/sqlite` and `drizzle/postgresql`.

**Step 5: Run the test again**

```bash
bun test src/db/index.integration.test.ts
```

Expected: PASS.

**Step 6: Commit**

```bash
git add src/db/schema/sqlite/categories.ts src/db/schema/postgresql/categories.ts src/db/index.integration.test.ts drizzle/sqlite drizzle/postgresql
git commit -m $'feat(schema): add income source classification to categories\n\nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>'
```

---

## Task 2: Thread `income_source_type` through category validation, APIs, UI, and seeds

**Files:**
- Modify: `src/lib/validation/categories.ts`
- Modify: `src/services/category.service.ts`
- Modify: `src/pages/api/categories/index.ts`
- Modify: `src/pages/api/categories/[id].ts`
- Modify: `src/components/organisms/CategoryModal.astro`
- Modify: `src/pages/budget/categories/categories-client.ts`
- Modify: `src/pages/budget/categories/index.astro`
- Modify: `src/db/seed/data/categories.ts`
- Modify: `src/db/seed/domains/categories.ts`
- Create: `src/__tests__/api/categories/index.test.ts`
- Create: `src/__tests__/api/categories/[id].test.ts`

**Step 1: Write the failing API tests**

Create `src/__tests__/api/categories/index.test.ts` with:

```typescript
it('creates income categories with income_source_type', async () => {
  const response = await POST(
    createApiContext('POST', {
      name: 'Salary',
      type: 'income',
      income_source_type: 'active',
      description: 'Main salary',
      icon: 'banknote',
      color: 'bg-success',
    })
  );

  const payload = await response.json();

  expect(response.status).toBe(201);
  expect(categoryService.create).toHaveBeenCalledWith(
    expect.objectContaining({ income_source_type: 'active' }),
    undefined
  );
  expect(payload.data.income_source_type).toBe('active');
});
```

Create `src/__tests__/api/categories/[id].test.ts` with:

```typescript
it('updates income_source_type on existing income categories', async () => {
  const response = await PUT(
    createApiContext('PUT', {
      income_source_type: 'passive',
    })
  );

  expect(response.status).toBe(200);
  expect(categoryService.update).toHaveBeenCalledWith(
    'cat-1',
    'ws-1',
    expect.objectContaining({ income_source_type: 'passive' }),
    undefined
  );
});
```

**Step 2: Run the tests to verify they fail**

```bash
bun test src/__tests__/api/categories/index.test.ts src/__tests__/api/categories/[id].test.ts
```

Expected: FAIL because validation and route handlers ignore the new field.

**Step 3: Add validation and persistence**

In `src/lib/validation/categories.ts`, add:

```typescript
const incomeSourceTypeEnum = z.enum(['active', 'passive', 'other']);
```

Thread it through create/update schemas and normalize expense categories to `'other'`.

In `src/services/category.service.ts`, persist:

```typescript
income_source_type:
  validated.type === 'income' ? validated.income_source_type ?? 'other' : 'other',
```

**Step 4: Expose the field in the category modal and categories page**

Add an income-only select to `src/components/organisms/CategoryModal.astro`:

```astro
<FormField label="Income Source" htmlFor="category-income-source">
  <select
    name="income_source_type"
    id="category-income-source"
    class="select select-bordered w-full h-10 text-xs bg-base-200"
  >
    <option value="active">Active income</option>
    <option value="passive">Passive income</option>
    <option value="other">Other income</option>
  </select>
</FormField>
```

Update `categories-client.ts` so:

- create/edit form payloads send `income_source_type`
- expense mode forces `'other'`
- edit modal preloads the saved value
- the control hides or disables when `type !== 'income'`

Update `src/pages/budget/categories/index.astro` so the income tab shows a visible source badge/column.

**Step 5: Seed realistic defaults**

In `src/db/seed/data/categories.ts`, classify seeded income categories:

```typescript
'Dad Salary': { ..., incomeSourceType: 'active' },
'Mom Salary': { ..., incomeSourceType: 'active' },
'Other Side Income': { ..., incomeSourceType: 'active' },
Bonds: { ..., incomeSourceType: 'passive' },
'Fixed Deposits': { ..., incomeSourceType: 'passive' },
Dividends: { ..., incomeSourceType: 'passive' },
```

Then write `income_source_type` during seed inserts in `src/db/seed/domains/categories.ts`.

**Step 6: Run the focused tests**

```bash
bun test src/__tests__/api/categories/index.test.ts src/__tests__/api/categories/[id].test.ts
```

Expected: PASS.

**Step 7: Run typecheck**

```bash
bun run typecheck
```

Expected: PASS.

**Step 8: Commit**

```bash
git add src/lib/validation/categories.ts src/services/category.service.ts src/pages/api/categories/index.ts src/pages/api/categories/[id].ts src/components/organisms/CategoryModal.astro src/pages/budget/categories/categories-client.ts src/pages/budget/categories/index.astro src/db/seed/data/categories.ts src/db/seed/domains/categories.ts src/__tests__/api/categories/index.test.ts src/__tests__/api/categories/[id].test.ts
git commit -m $'feat(categories): support income source classification in category flows\n\nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>'
```

---

## Task 3: Build shared report state helpers and the section navigation

**Files:**
- Create: `src/lib/reporting/report-state.ts`
- Create: `src/lib/reporting/report-state.test.ts`
- Create: `src/components/molecules/ReportsSectionNav.astro`
- Modify: `src/components/molecules/ReportSelector.astro`
- Modify: `src/components/partials/ReportSelectorPartial.astro`
- Modify: `src/components/organisms/ReportsPage.client.ts`
- Modify: `src/components/organisms/ReportsRenderer.client.ts`

**Step 1: Write the failing state-helper test**

Create `src/lib/reporting/report-state.test.ts`:

```typescript
import { describe, expect, it } from 'bun:test';
import { buildReportUrl, normalizeReportState } from './report-state';

describe('report-state helpers', () => {
  it('preserves filters when switching report sections', () => {
    expect(
      buildReportUrl('/reports/income', {
        range: 'yearly',
        period: '2026',
        currency: 'USD',
        userId: 'usr_1',
      })
    ).toBe('/reports/income?range=yearly&period=2026&currency=USD&user_id=usr_1');
  });

  it('normalizes mismatched periods for yearly range', () => {
    expect(
      normalizeReportState({
        range: 'yearly',
        period: '2026-02',
      }).period
    ).toBe('2026');
  });
});
```

**Step 2: Run the test to verify it fails**

```bash
bun test src/lib/reporting/report-state.test.ts
```

Expected: FAIL because the helper module does not exist yet.

**Step 3: Implement the helper and wire it into the client**

In `src/lib/reporting/report-state.ts`, add:

```typescript
export interface ReportState {
  range: 'monthly' | 'yearly';
  period: string;
  currency?: Currency;
  userId?: string;
}

export function buildReportUrl(basePath: string, state: ReportState): string {
  const params = new URLSearchParams({
    range: state.range,
    period: state.period,
  });

  if (state.currency) params.set('currency', state.currency);
  if (state.userId) params.set('user_id', state.userId);

  return `${basePath}?${params.toString()}`;
}
```

Then:

- update `ReportsPage.client.ts` to use `buildReportUrl()` instead of manually replacing only `range` and `period`
- keep `currency` and `user_id` when present
- keep `ReportSelector.astro` focused on report-level controls only (range, period, and optional member if supported); currency stays in the global header
- add a reusable `ReportsSectionNav.astro` that links to `Overview`, `Expenses`, and `Income`

**Step 4: Teach the renderer about any new partial containers**

If Overview introduces a new `previews` container later, add `previews` parsing and rendering support now in `src/components/organisms/ReportsRenderer.client.ts` so the infrastructure is ready before the page refactor.

**Step 5: Run the focused test**

```bash
bun test src/lib/reporting/report-state.test.ts
```

Expected: PASS.

**Step 6: Commit**

```bash
git add src/lib/reporting/report-state.ts src/lib/reporting/report-state.test.ts src/components/molecules/ReportsSectionNav.astro src/components/molecules/ReportSelector.astro src/components/partials/ReportSelectorPartial.astro src/components/organisms/ReportsPage.client.ts src/components/organisms/ReportsRenderer.client.ts
git commit -m $'feat(reports): add shared report state helpers and section navigation\n\nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>'
```

---

## Task 4: Add page-specific report service contracts and income aggregations

**Files:**
- Modify: `src/services/report.service.ts`
- Create: `src/services/__tests__/report-income-report.test.ts`
- Modify: `src/services/__tests__/performance-benchmark.test.ts`

**Step 1: Write the failing service test**

Create `src/services/__tests__/report-income-report.test.ts`:

```typescript
it('groups income by source type and falls back to other', async () => {
  const report = await reportService.getIncomeReport(WORKSPACE_ID, '2026-02', 'monthly', 'IDR');

  expect(report.summary.activeIncome).toBe('10000000');
  expect(report.summary.passiveIncome).toBe('2500000');
  expect(report.summary.otherIncome).toBe('500000');
  expect(report.history.total).toBeGreaterThan(0);
});
```

Seed one income category with `income_source_type = 'active'`, one with `passive`, and one defaulting to `other`.

**Step 2: Run the test to verify it fails**

```bash
bun test src/services/__tests__/report-income-report.test.ts
```

Expected: FAIL because `getIncomeReport()` does not exist yet.

**Step 3: Add the new service contracts**

In `src/services/report.service.ts`, introduce page-specific return types and methods:

```typescript
export interface OverviewReportData { /* summary + trend + preview cards */ }
export interface ExpenseReportData extends ReportData {
  recurringBreakdown: RecurringBreakdown | null;
  memberSummary: MemberSummaryRow[];
}
export interface IncomeHistoryData {
  transactions: CategoryTransactionsData['transactions'];
  total: number;
  page: number;
  pageSize: number;
  appliedFilters: {
    userId?: string;
    sourceType?: 'active' | 'passive' | 'other';
    categoryId?: string;
  };
}
export interface IncomeReportFilters {
  userId?: string;
  sourceType?: 'active' | 'passive' | 'other';
  categoryId?: string;
  page?: number;
  pageSize?: number;
}
export interface IncomeReportData {
  summary: {
    totalIncome: string;
    activeIncome: string;
    passiveIncome: string;
    otherIncome: string;
    growthVsPreviousPeriod: string;
  };
  sourceMix: CategoryExpense[];
  sourceGroupTrend: Array<{ name: string; active: string; passive: string; other: string }>;
  members: Array<{ userId: string; userName: string; totalIncome: string; transactionCount: number }>;
  history: IncomeHistoryData;
}
```

Add public methods:

- `getOverviewReport(workspaceId, period, range, currency, userId?)`
- `getExpenseReport(workspaceId, period, range, currency, userId?)`
- `getIncomeReport(workspaceId, period, range, currency, filters?: IncomeReportFilters)`

Add private helpers:

- `getIncomeBySourceGroup(...)`
- `getIncomeByCategory(...)`
- `getIncomeSourceTrendData(...)`
- `getIncomeHistory(...)`
- `getMemberIncomeSummary(...)`

Make the `other` bucket explicit when a category is missing or defaulted.
Reuse `getTrendAggregateByMonth(...)` for the monthly source-group rollups instead of building a second month-aggregation path.
Clamp `filters.pageSize` with `PAGINATION.DEFAULT_PAGE_SIZE` / `PAGINATION.MAX_PAGE_SIZE`, and allow `getIncomeHistory(...)` to honor optional `userId`, `sourceType`, and `categoryId` filters when the page state or drill-down sets them.

**Step 4: Extend the benchmark**

In `src/services/__tests__/performance-benchmark.test.ts`, add thresholds and benchmark calls for:

```typescript
'ReportService.getOverviewReport': { maxQueries: null, maxMs: 350 },
'ReportService.getIncomeReport': { maxQueries: null, maxMs: 500 },
```

**Step 5: Run the focused tests**

```bash
bun test src/services/__tests__/report-income-report.test.ts
bun test src/services/__tests__/performance-benchmark.test.ts
```

Expected: both PASS, with the performance benchmark staying under threshold.

**Step 6: Commit**

```bash
git add src/services/report.service.ts src/services/__tests__/report-income-report.test.ts src/services/__tests__/performance-benchmark.test.ts
git commit -m $'feat(reporting): add overview and income report service contracts\n\nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>'
```

---

## Task 5: Refactor `/reports` into a lightweight Overview page

**Files:**
- Create: `src/components/partials/OverviewSummaryCardsPartial.astro`
- Create: `src/components/partials/OverviewChartsPartial.astro`
- Create: `src/components/partials/OverviewPreviewCardsPartial.astro`
- Create: `src/components/organisms/OverviewReportsPage.client.ts`
- Modify: `src/pages/reports/index.astro`
- Modify: `src/pages/api/reports/index.ts`
- Create: `src/__tests__/api/reports/index.test.ts`

**Step 1: Write the failing API contract test**

Create `src/__tests__/api/reports/index.test.ts`:

```typescript
it('returns lightweight overview partials', async () => {
  const response = await GET(
    createApiContext('http://localhost/api/reports?range=monthly&period=2026-02&_render=html&_partial=all')
  );

  const html = await response.text();

  expect(response.status).toBe(200);
  expect(html).toContain('<!-- PARTIAL:summary -->');
  expect(html).toContain('<!-- PARTIAL:charts -->');
  expect(html).toContain('<!-- PARTIAL:previews -->');
  expect(html).not.toContain('<!-- PARTIAL:table -->');
  expect(html).not.toContain('<!-- PARTIAL:members -->');
});

it('rejects invalid member filters for overview reports', async () => {
  const response = await GET(
    createApiContext('http://localhost/api/reports?range=monthly&period=2026-02&user_id=not-in-workspace')
  );

  expect(response.status).toBe(400);
});
```

**Step 2: Run the test to verify it fails**

```bash
bun test src/__tests__/api/reports/index.test.ts
```

Expected: FAIL because `/api/reports` still returns the expense-heavy payload.

**Step 3: Implement the overview partials and route**

Build a compact page:

- `OverviewSummaryCardsPartial.astro` for total income, total expenses, net savings, savings rate
- `OverviewChartsPartial.astro` for the combined income-vs-expense trend
- `OverviewPreviewCardsPartial.astro` for a compact income preview and expense preview with links to `/reports/income` and `/reports/expenses`

Update `src/pages/reports/index.astro` so it:

- uses `ReportsSectionNav.astro` with `Overview` active
- fetches only `getOverviewReport(...)`
- renders summary, chart, and preview containers
- shows Overview-local empty/error states instead of redirecting away on fetch failures
- initializes `OverviewReportsPage.client.ts`

Update `src/pages/api/reports/index.ts` so it:

- reuses `createRenderHelper(...)`
- validates optional `user_id` against the existing workspace-member lookup and rejects invalid or cross-workspace IDs with `400`
- calls `reportService.getOverviewReport(...)`
- supports `_partial=summary|charts|previews|selector|all`
- drops the heavy category-table and member-table work from the Overview endpoint
- returns Overview-local HTML error content for partial requests instead of falling back to expense-era redirect behavior

**Step 4: Run the focused test**

```bash
bun test src/__tests__/api/reports/index.test.ts
```

Expected: PASS.

**Step 5: Run typecheck**

```bash
bun run typecheck
```

Expected: PASS.

**Step 6: Commit**

```bash
git add src/components/partials/OverviewSummaryCardsPartial.astro src/components/partials/OverviewChartsPartial.astro src/components/partials/OverviewPreviewCardsPartial.astro src/components/organisms/OverviewReportsPage.client.ts src/pages/reports/index.astro src/pages/api/reports/index.ts src/__tests__/api/reports/index.test.ts
git commit -m $'feat(reports): make the top-level reports page an overview\n\nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>'
```

---

## Task 6: Move the current heavy expense report into `/reports/expenses`

**Files:**
- Create: `src/pages/reports/expenses/index.astro`
- Create: `src/pages/api/reports/expenses/index.ts`
- Create: `src/__tests__/api/reports/expenses/index.test.ts`
- Modify: `src/pages/reports/members/index.astro`

**Step 1: Write the failing expense-endpoint test**

Create `src/__tests__/api/reports/expenses/index.test.ts`:

```typescript
it('returns expense-detail partials', async () => {
  const response = await GET(
    createApiContext('http://localhost/api/reports/expenses?range=monthly&period=2026-02&_render=html&_partial=all')
  );

  const html = await response.text();

  expect(response.status).toBe(200);
  expect(html).toContain('<!-- PARTIAL:summary -->');
  expect(html).toContain('<!-- PARTIAL:charts -->');
  expect(html).toContain('<!-- PARTIAL:table -->');
  expect(html).toContain('<!-- PARTIAL:members -->');
});

it('rejects invalid member filters for expense reports', async () => {
  const response = await GET(
    createApiContext(
      'http://localhost/api/reports/expenses?range=monthly&period=2026-02&user_id=not-in-workspace'
    )
  );

  expect(response.status).toBe(400);
});
```

**Step 2: Run the test to verify it fails**

```bash
bun test src/__tests__/api/reports/expenses/index.test.ts
```

Expected: FAIL because the endpoint does not exist yet.

**Step 3: Create the expense detail page**

Move the current `/reports` deep-dive experience almost as-is into `src/pages/reports/expenses/index.astro`:

- reuse `ReportSummaryCardsPartial.astro`
- reuse `ReportChartsPartial.astro`
- reuse `CategoryTablePartial.astro`
- reuse `MemberSpendingTablePartial.astro`
- reuse `CategoryDrillDownModal.astro`
- reuse `ReportsPage.client.ts`

Set `ReportsSectionNav.astro` to `Expenses` active and point the client fetches at `/api/reports/expenses`.

**Step 4: Create the matching endpoint**

In `src/pages/api/reports/expenses/index.ts`, move the old report-detail logic from `/api/reports/index.ts` and switch it to `reportService.getExpenseReport(...)`.
Reuse `createRenderHelper(...)` so partial rendering stays aligned with the existing report endpoints.
Apply the same optional `user_id` validation rule as Overview and Income, returning `400` for invalid or cross-workspace values.

Update `src/pages/reports/members/index.astro` breadcrumbs so they return to `/reports/expenses`, not the Overview page.

**Step 5: Run the focused test**

```bash
bun test src/__tests__/api/reports/expenses/index.test.ts
```

Expected: PASS.

**Step 6: Commit**

```bash
git add src/pages/reports/expenses/index.astro src/pages/api/reports/expenses/index.ts src/__tests__/api/reports/expenses/index.test.ts src/pages/reports/members/index.astro
git commit -m $'feat(reports): split expense detail into its own page\n\nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>'
```

---

## Task 7: Build the new `/reports/income` deep dive

**Files:**
- Modify: `src/components/organisms/ResourceAllocationChart.astro`
- Create: `src/components/organisms/IncomeSourceTrendChart.astro`
- Create: `src/components/partials/IncomeSummaryCardsPartial.astro`
- Create: `src/components/partials/IncomeChartsPartial.astro`
- Create: `src/components/partials/IncomeSourceTablePartial.astro`
- Create: `src/components/partials/IncomeHistoryTablePartial.astro`
- Create: `src/components/partials/IncomeMemberTablePartial.astro`
- Modify: `src/components/organisms/CategoryDrillDownModal.astro`
- Modify: `src/components/partials/CategoryDrillDownPartial.astro`
- Create: `src/components/organisms/IncomeReportsPage.client.ts`
- Create: `src/pages/reports/income/index.astro`
- Create: `src/pages/api/reports/income/index.ts`
- Create: `src/__tests__/api/reports/income/index.test.ts`
- Modify: `src/pages/api/reports/category-drilldown.ts`
- Create: `src/__tests__/api/reports/category-drilldown.test.ts`

**Step 1: Write the failing income-endpoint test**

Create `src/__tests__/api/reports/income/index.test.ts`:

```typescript
it('returns income detail data with source groups and history', async () => {
  const response = await GET(
    createApiContext('http://localhost/api/reports/income?range=monthly&period=2026-02&page=1&pageSize=25')
  );

  const payload = await response.json();

  expect(response.status).toBe(200);
  expect(payload.data.summary.activeIncome).toBeDefined();
  expect(payload.data.summary.passiveIncome).toBeDefined();
  expect(payload.data.summary.otherIncome).toBeDefined();
  expect(Array.isArray(payload.data.sourceMix)).toBe(true);
  expect(Array.isArray(payload.data.history.transactions)).toBe(true);
});

it('rejects invalid member filters for income reports', async () => {
  const response = await GET(
    createApiContext(
      'http://localhost/api/reports/income?range=monthly&period=2026-02&user_id=not-in-workspace'
    )
  );

  expect(response.status).toBe(400);
});
```

Create `src/__tests__/api/reports/category-drilldown.test.ts` with a case that proves income source rows still open through the shared drill-down endpoint and render the adapted modal content for income categories.

**Step 2: Run the test to verify it fails**

```bash
bun test src/__tests__/api/reports/income/index.test.ts
bun test src/__tests__/api/reports/category-drilldown.test.ts
```

Expected: FAIL because the route does not exist yet.

**Step 3: Build the income-specific components**

Create:

- `IncomeSummaryCardsPartial.astro` for total, active, passive, other, growth vs previous period
- `IncomeChartsPartial.astro` for:
  - source mix donut (reuse `ResourceAllocationChart.astro` after adding configurable title/empty copy)
  - active/passive/other trend chart (`IncomeSourceTrendChart.astro`)
- `IncomeSourceTablePartial.astro` for source-category totals with source-group badges
- `IncomeHistoryTablePartial.astro` for paginated historical income transactions
- `IncomeMemberTablePartial.astro` for member income totals and share of total income

Use `PaginationPartial.astro` for the history footer instead of inventing new pagination markup.
Reuse `CategoryDrillDownModal.astro` and adapt `CategoryDrillDownPartial.astro` so income source rows can open the existing drill-down flow with income-focused copy and paginated transaction history instead of introducing a second modal system.

**Step 4: Build the page and endpoint**

In `src/pages/reports/income/index.astro`:

- render `ReportsSectionNav.astro` with `Income` active
- use the shared report selector
- SSR the first income payload from `reportService.getIncomeReport(...)`
- render containers for summary, charts, source table, member table, and history table
- reflect optional drill-down filters (such as `source_type` and `category_id`) in URL state without expanding the always-visible top-level filter bar
- show Income-local empty/error states when there is no data or a fetch fails
- initialize `IncomeReportsPage.client.ts`

In `src/pages/api/reports/income/index.ts`:

- reuse `createRenderHelper(...)`
- validate `range`, `period`, `currency`, `page`, and `pageSize`, defaulting/clamping `pageSize` with `PAGINATION.DEFAULT_PAGE_SIZE` and `PAGINATION.MAX_PAGE_SIZE`
- validate optional `user_id` against `workspaceService.getMembers(...)` or the equivalent existing workspace-member lookup and reject invalid or cross-workspace IDs with `400`
- support optional `source_type` and `category_id` query params so income history honors drill-down state when present
- call `reportService.getIncomeReport(...)`
- support HTML partials for summary, charts, sources, members, history, and selector
- keep income drill-down requests on the existing `/api/reports/category-drilldown` endpoint, extended for income categories rather than forked into a new endpoint

**Step 5: Run the focused test**

```bash
bun test src/__tests__/api/reports/income/index.test.ts
bun test src/__tests__/api/reports/category-drilldown.test.ts
```

Expected: PASS.

**Step 6: Run the service test again**

```bash
bun test src/services/__tests__/report-income-report.test.ts
```

Expected: PASS with the real page contract now consuming the service shape.

**Step 7: Commit**

```bash
git add src/components/organisms/ResourceAllocationChart.astro src/components/organisms/IncomeSourceTrendChart.astro src/components/organisms/CategoryDrillDownModal.astro src/components/partials/IncomeSummaryCardsPartial.astro src/components/partials/IncomeChartsPartial.astro src/components/partials/IncomeSourceTablePartial.astro src/components/partials/IncomeHistoryTablePartial.astro src/components/partials/IncomeMemberTablePartial.astro src/components/partials/CategoryDrillDownPartial.astro src/components/organisms/IncomeReportsPage.client.ts src/pages/reports/income/index.astro src/pages/api/reports/income/index.ts src/__tests__/api/reports/income/index.test.ts src/pages/api/reports/category-drilldown.ts src/__tests__/api/reports/category-drilldown.test.ts
git commit -m $'feat(reports): add dedicated income reporting page\n\nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>'
```

---

## Task 8: Update OpenAPI, Playwright coverage, and run the full verification suite

**Files:**
- Modify: `openapi/paths/reports.yml`
- Modify: `openapi/schemas/ReportData.yml`
- Modify: `openapi/schemas/ReportResponse.yml`
- Create: `openapi/schemas/OverviewReportData.yml`
- Create: `openapi/schemas/OverviewReportResponse.yml`
- Create: `openapi/schemas/IncomeReportData.yml`
- Create: `openapi/schemas/IncomeReportResponse.yml`
- Modify: `e2e/pages/ReportsPage.ts`
- Modify: `e2e/tests/test.fixture.ts`
- Modify: `e2e/tests/stats-verification/cross-page-totals.spec.ts`
- Create: `e2e/tests/reports/income-detail.spec.ts`
- Create: `tests/integration/api/reports/openapi-contract.test.ts`

**Step 1: Write the failing OpenAPI and E2E tests**

Create `tests/integration/api/reports/openapi-contract.test.ts`:

```typescript
it('documents the overview, expense, and income report endpoints', () => {
  const reportsPath = readFileSync(join(process.cwd(), 'openapi/paths/reports.yml'), 'utf8');

  expect(reportsPath).toContain('/api/reports:');
  expect(reportsPath).toContain('/api/reports/expenses:');
  expect(reportsPath).toContain('/api/reports/income:');
});
```

Create `e2e/tests/reports/income-detail.spec.ts`:

```typescript
test('overview keeps filter context when opening income detail', async ({ reportsPage }) => {
  await reportsPage.goto();
  await reportsPage.selectYearlyRange();
  await reportsPage.openIncomeSection();

  await expect(reportsPage.page).toHaveURL(/\/reports\/income\?range=yearly/);
  await reportsPage.expectIncomeSummaryVisible();
});
```

**Step 2: Run the tests to verify they fail**

```bash
bun test tests/integration/api/reports/openapi-contract.test.ts
bun run test:e2e -- e2e/tests/reports/income-detail.spec.ts
```

Expected: FAIL because docs and routes are incomplete.

**Step 3: Update docs and page objects**

- document the new endpoints and response shapes in `openapi/paths/reports.yml`
- keep `ReportData.yml` / `ReportResponse.yml` for the expense-detail payload if that is the closest legacy contract
- add dedicated overview and income schemas
- extend `e2e/pages/ReportsPage.ts` with helpers like:
  - `openOverviewSection()`
  - `openExpenseSection()`
  - `openIncomeSection()`
  - `openIncomeSourceDrilldown()`
  - `expectIncomeSummaryVisible()`
  - `expectIncomeEmptyState()`
- adjust `cross-page-totals.spec.ts` so it asserts the new Overview layout instead of the old expense table
- extend `income-detail.spec.ts` so it covers drill-down-driven history filtering and the Income empty state

**Step 4: Run the focused tests**

```bash
bun test tests/integration/api/reports/openapi-contract.test.ts
bun run test:e2e -- e2e/tests/reports/income-detail.spec.ts e2e/tests/stats-verification/cross-page-totals.spec.ts
```

Expected: PASS.

**Step 5: Run the full verification suite**

```bash
bun test src/db/index.integration.test.ts src/__tests__/api/categories/index.test.ts src/__tests__/api/categories/[id].test.ts src/lib/reporting/report-state.test.ts src/services/__tests__/report-income-report.test.ts src/__tests__/api/reports/index.test.ts src/__tests__/api/reports/expenses/index.test.ts src/__tests__/api/reports/income/index.test.ts src/__tests__/api/reports/category-drilldown.test.ts tests/integration/api/reports/openapi-contract.test.ts
bun test src/services/__tests__/performance-benchmark.test.ts
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
bun run build
bun run test:e2e -- e2e/tests/reports/income-detail.spec.ts e2e/tests/stats-verification/cross-page-totals.spec.ts
```

Expected: all commands PASS.

**Step 6: Commit**

```bash
git add openapi/paths/reports.yml openapi/schemas/ReportData.yml openapi/schemas/ReportResponse.yml openapi/schemas/OverviewReportData.yml openapi/schemas/OverviewReportResponse.yml openapi/schemas/IncomeReportData.yml openapi/schemas/IncomeReportResponse.yml e2e/pages/ReportsPage.ts e2e/tests/test.fixture.ts e2e/tests/stats-verification/cross-page-totals.spec.ts e2e/tests/reports/income-detail.spec.ts tests/integration/api/reports/openapi-contract.test.ts
git commit -m $'test(reports): cover overview expense and income reporting flows\n\nCo-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>'
```

---

## Expected End State

- `/reports` is a fast Overview page.
- `/reports/expenses` contains the current heavy expense analysis.
- `/reports/income` contains dedicated income analysis by active/passive/other source plus historical income transactions.
- Income source classification lives on categories, not a new transaction model.
- URL-based report context survives section switches.
- Benchmarks, API tests, OpenAPI docs, and Playwright coverage all reflect the new split.
