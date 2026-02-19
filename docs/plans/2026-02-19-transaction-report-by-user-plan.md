# Transaction Report by User — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add user-based transaction filtering and a `/reports/members` page showing per-member spending overview with drill-down.

**Architecture:** Extend existing `TransactionService` and `ReportService` with an optional `userId` filter. Reuse existing report partials for per-user drill-down. Add member dropdown to TransactionFiltersBar. New API endpoints for member summary data. Server-rendered throughout (ADR 002).

**Tech Stack:** Astro 5, Drizzle ORM, DaisyUI v5, Lucide icons, bun:test

**Design doc:** `docs/plans/2026-02-19-transaction-report-by-user-design.md`

---

### Task 1: TransactionService — Add `created_by_user_id` Filter

**Files:**

- Modify: `src/services/transaction.service.ts:57-71` (TransactionFilters interface)
- Modify: `src/services/transaction.service.ts:294-340` (fetchTransactionsFromDb conditions)
- Modify: `src/services/transaction.service.ts:624-665` (count conditions)
- Test: `src/services/transaction.service.test.ts`

**Step 1: Write the failing test**

Add a test to `src/services/transaction.service.test.ts` in the `findAll` describe block:

```typescript
it('should filter transactions by created_by_user_id', async () => {
  const filters = {
    workspace_id: 'workspace-1',
    created_by_user_id: 'user-1',
  };

  const transactionWithRelations = createMockTransactionWithRelations(
    { id: 'txn-1', created_by_user_id: 'user-1' },
    mockCategory,
    mockAccount
  );
  (mockDb.query.transactions.findMany as any).mockResolvedValue([transactionWithRelations]);

  const result = await transactionService.findAll(filters);

  expect(result).toHaveLength(1);
  expect(mockDb.query.transactions.findMany).toHaveBeenCalled();
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/services/transaction.service.test.ts --filter "created_by_user_id"`
Expected: FAIL — `created_by_user_id` is not a known property of `TransactionFilters`

**Step 3: Add `created_by_user_id` to TransactionFilters interface**

In `src/services/transaction.service.ts`, add to the `TransactionFilters` interface (after the `account_id` field around line 63):

```typescript
created_by_user_id?: string;
```

**Step 4: Add WHERE clause in `fetchTransactionsFromDb`**

In `src/services/transaction.service.ts`, in the `fetchTransactionsFromDb` method, after the account_id filter block (around line 317), add:

```typescript
if (filters.created_by_user_id) {
  conditions.push(eq(this.schema.transactions.created_by_user_id, filters.created_by_user_id));
}
```

**Step 5: Add same WHERE clause in `count` method**

In `src/services/transaction.service.ts`, in the `count` method conditions block (mirror the same location in count), add the same condition:

```typescript
if (filters.created_by_user_id) {
  conditions.push(eq(this.schema.transactions.created_by_user_id, filters.created_by_user_id));
}
```

**Step 6: Run tests to verify pass**

Run: `bun test src/services/transaction.service.test.ts`
Expected: ALL PASS

**Step 7: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

**Step 8: Commit**

```bash
git add src/services/transaction.service.ts src/services/transaction.service.test.ts
git commit -m "feat(transactions): add created_by_user_id filter to TransactionService

Wire up optional user filter in findAll and count methods.
Part of #185."
```

---

### Task 2: Transaction API — Accept `user_id` Query Param

**Files:**

- Modify: `src/pages/api/transactions/index.ts:42-95` (query param parsing)

**Step 1: Add `user_id` query param parsing**

In `src/pages/api/transactions/index.ts`, after the `search` param parsing (around line 95), add:

```typescript
const userId = url.searchParams.get('user_id');
if (userId && typeof userId === 'string' && userId.trim() !== '') {
  filters.created_by_user_id = userId;
}
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/pages/api/transactions/index.ts
git commit -m "feat(api): accept user_id query param in GET /api/transactions

Passes created_by_user_id filter to TransactionService.
Part of #185."
```

---

### Task 3: ReportService — Thread `userId` Through Aggregation Helpers

**Files:**

- Modify: `src/services/report.service.ts` (multiple private methods + public methods)
- Test: `src/services/report.service.test.ts`

This task threads an optional `userId` parameter through all private aggregation methods so that reports can be scoped to a single user. The approach: add `userId?: string` as the last parameter to each private helper, and when present, add `eq(this.schema.transactions.created_by_user_id, userId)` to the WHERE clause.

**Step 1: Write a failing test**

Add to `src/services/report.service.test.ts`:

```typescript
describe('getMonthlyReport with userId filter', () => {
  test('should accept optional userId parameter', async () => {
    const report = await reportService.getMonthlyReport(
      'workspace-1',
      '2024-02',
      'IDR',
      'user-123'
    );
    // Should return report data (even if empty with mocks)
    expect(report).toBeDefined();
    expect(report.totalIncome).toBeDefined();
    expect(report.totalExpenses).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/services/report.service.test.ts --filter "userId"`
Expected: FAIL — extra argument not accepted

**Step 3: Add `userId` parameter to public methods**

Modify `getMonthlyReport` signature (line 155):

```typescript
async getMonthlyReport(
  workspaceId: string,
  period: string,
  currency: 'IDR' | 'USD' = 'IDR',
  userId?: string
): Promise<ReportData> {
```

Thread `userId` to all `Promise.all` calls inside (line 184-189):

```typescript
const [
  totalIncome,
  totalExpenses,
  budgetHealthData,
  expenseByCategory,
  categoryIntelligence,
  trendData,
] = await Promise.all([
  this.getTotalIncome(workspaceId, startDate, endDate, currency, userId),
  this.getTotalExpenses(workspaceId, startDate, endDate, currency, userId),
  this.getBudgetHealth(workspaceId, year, month, currency, userId),
  this.getExpenseByCategory(workspaceId, startDate, endDate, currency, userId),
  this.getCategoryIntelligence(workspaceId, year, month, currency, userId),
  this.getTrendData(workspaceId, year, month, currency, 3, userId),
]);
```

Do the same for `getYearlyReport` (line 226) — add `userId?: string` as last param and thread to all helper calls.

**Step 4: Add `userId` to each private helper**

For each of these private methods, add `userId?: string` as the last parameter and add a conditional WHERE clause:

- `getTotalIncome` (line 405) — add after currency param:

  ```typescript
  private async getTotalIncome(
    workspaceId: string, startDate: Date, endDate: Date,
    currency: 'IDR' | 'USD', userId?: string
  ): Promise<string> {
  ```

  In the `and(...)` block, after the deleted_at check, add:

  ```typescript
  ...(userId ? [eq(this.schema.transactions.created_by_user_id, userId)] : [])
  ```

- `getTotalExpenses` (line 435) — same pattern
- `getExpenseByCategory` (line 561) — same pattern
- `getCategoryIntelligence` (line 604) — same pattern, but this method has TWO queries: the budget query (no user filter needed — budgets are workspace-wide) and the spending query (needs user filter)
- `getTrendData` — same pattern (add userId to signature, thread to inner calls or add to WHERE)
- `getBudgetHealth` (line 465) — add userId, thread to its `getTotalExpenses` call
- `getYearlyBudgetHealth` (line 514) — add userId, thread to its `getTotalExpenses` call

**Important pattern for spreading into `and()`:**

```typescript
.where(
  and(
    eq(this.schema.transactions.workspace_id, workspaceId),
    eq(this.schema.transactions.type, 'expense'),
    eq(this.schema.transactions.currency, currency),
    gte(this.schema.transactions.transaction_date, startDate),
    lte(this.schema.transactions.transaction_date, endDate),
    sql`${this.schema.transactions.deleted_at} IS NULL`,
    ...(userId ? [eq(this.schema.transactions.created_by_user_id, userId)] : [])
  )
)
```

**Step 5: Run tests**

Run: `bun test src/services/report.service.test.ts`
Expected: ALL PASS

**Step 6: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

**Step 7: Commit**

```bash
git add src/services/report.service.ts src/services/report.service.test.ts
git commit -m "feat(reports): thread optional userId filter through ReportService

All aggregation helpers now accept userId to scope reports to a single
workspace member. Backward-compatible — existing callers unaffected.
Part of #185."
```

---

### Task 4: ReportService — Add `getMemberSummary()` Method

**Files:**

- Modify: `src/services/report.service.ts` (new public method + new interface)
- Test: `src/services/report.service.test.ts`

**Step 1: Write the failing test**

Add to `src/services/report.service.test.ts`:

```typescript
describe('getMemberSummary', () => {
  test('should return member summary array', async () => {
    const result = await reportService.getMemberSummary('workspace-1', '2024-02', 'monthly', 'IDR');
    expect(Array.isArray(result)).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/services/report.service.test.ts --filter "getMemberSummary"`
Expected: FAIL — method does not exist

**Step 3: Add the MemberSummaryRow interface and method**

Add interface near top of `src/services/report.service.ts` (after `CategoryTransactionsData` around line 106):

```typescript
/**
 * Per-member spending summary row
 */
export interface MemberSummaryRow {
  userId: string;
  userName: string;
  totalIncome: string;
  totalExpenses: string;
  netSavings: string;
  transactionCount: number;
}
```

Add public method after `getCategoryTransactions` (around line 395):

```typescript
/**
 * Get per-member spending summary for a period
 *
 * Returns income, expenses, net savings, and transaction count for each
 * workspace member who has transactions in the given period.
 *
 * @param workspaceId - Workspace ID
 * @param period - Period string ('YYYY-MM' for monthly, 'YYYY' for yearly)
 * @param range - 'monthly' or 'yearly'
 * @param currency - Currency to aggregate
 * @returns Array of per-member summaries, sorted by total expenses descending
 */
async getMemberSummary(
  workspaceId: string,
  period: string,
  range: 'monthly' | 'yearly',
  currency: 'IDR' | 'USD' = 'IDR'
): Promise<MemberSummaryRow[]> {
  try {
    this.validateWorkspaceId(workspaceId);
    this.validateCurrency(currency);

    // Parse period to date range
    let startDate: Date;
    let endDate: Date;

    if (range === 'monthly') {
      const { year, month } = validatePeriod(period, 'monthly');
      if (!month) throw new Error(`Invalid monthly period: ${period}`);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 0, 23, 59, 59);
    } else {
      const { year } = validatePeriod(period, 'yearly');
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59);
    }

    // Aggregate income by user
    const incomeByUser = await (this.db as any)
      .select({
        user_id: this.schema.transactions.created_by_user_id,
        total: sql<string>`COALESCE(SUM(CAST(${this.schema.transactions.amount} AS NUMERIC)), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(this.schema.transactions)
      .where(
        and(
          eq(this.schema.transactions.workspace_id, workspaceId),
          eq(this.schema.transactions.type, 'income'),
          eq(this.schema.transactions.currency, currency),
          gte(this.schema.transactions.transaction_date, startDate),
          lte(this.schema.transactions.transaction_date, endDate),
          sql`${this.schema.transactions.deleted_at} IS NULL`
        )
      )
      .groupBy(this.schema.transactions.created_by_user_id);

    // Aggregate expenses by user
    const expensesByUser = await (this.db as any)
      .select({
        user_id: this.schema.transactions.created_by_user_id,
        total: sql<string>`COALESCE(SUM(CAST(${this.schema.transactions.amount} AS NUMERIC)), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(this.schema.transactions)
      .where(
        and(
          eq(this.schema.transactions.workspace_id, workspaceId),
          eq(this.schema.transactions.type, 'expense'),
          eq(this.schema.transactions.currency, currency),
          gte(this.schema.transactions.transaction_date, startDate),
          lte(this.schema.transactions.transaction_date, endDate),
          sql`${this.schema.transactions.deleted_at} IS NULL`
        )
      )
      .groupBy(this.schema.transactions.created_by_user_id);

    // Get all workspace members for name lookup
    const members = await this.db.query.users.findMany({
      where: and(
        eq(this.schema.users.workspace_id, workspaceId),
        sql`${this.schema.users.deleted_at} IS NULL`
      ),
    });

    const memberMap = new Map(members.map((m: any) => [m.id, m.name || m.email]));

    // Build income and expense maps
    const incomeMap = new Map<string, { total: string; count: number }>();
    for (const row of incomeByUser) {
      incomeMap.set(row.user_id, {
        total: row.total?.toString() || '0',
        count: Number(row.count) || 0,
      });
    }

    const expenseMap = new Map<string, { total: string; count: number }>();
    for (const row of expensesByUser) {
      expenseMap.set(row.user_id, {
        total: row.total?.toString() || '0',
        count: Number(row.count) || 0,
      });
    }

    // Merge all user IDs that have transactions
    const allUserIds = new Set([...incomeMap.keys(), ...expenseMap.keys()]);

    const results: MemberSummaryRow[] = [];
    for (const userId of allUserIds) {
      const income = incomeMap.get(userId)?.total || '0';
      const expenses = expenseMap.get(userId)?.total || '0';
      const incomeCount = incomeMap.get(userId)?.count || 0;
      const expenseCount = expenseMap.get(userId)?.count || 0;

      results.push({
        userId,
        userName: memberMap.get(userId) || 'Unknown',
        totalIncome: income,
        totalExpenses: expenses,
        netSavings: decimalSubtract(income, expenses),
        transactionCount: incomeCount + expenseCount,
      });
    }

    // Sort by total expenses descending
    results.sort((a, b) => {
      const aExp = parseFloat(a.totalExpenses) || 0;
      const bExp = parseFloat(b.totalExpenses) || 0;
      return bExp - aExp;
    });

    return results;
  } catch (error) {
    log.error('error getting member summary:', error);
    return [];
  }
}
```

**Note:** This method uses `this.schema.users` — verify the import exists. The schema already exports users via `getActiveSchema()`.

**Step 4: Run tests**

Run: `bun test src/services/report.service.test.ts`
Expected: ALL PASS

**Step 5: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

**Step 6: Commit**

```bash
git add src/services/report.service.ts src/services/report.service.test.ts
git commit -m "feat(reports): add getMemberSummary method to ReportService

Aggregates income, expenses, net savings, and transaction count
per workspace member for a given period. Powers the member overview page.
Part of #185."
```

---

### Task 5: Member Summary API Endpoint

**Files:**

- Create: `src/pages/api/reports/members/index.ts`

**Step 1: Create the endpoint**

Create `src/pages/api/reports/members/index.ts`:

```typescript
import type { APIRoute } from 'astro';
import { reportService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { validatePeriod } from '@/lib/utils/period-validation';

/**
 * GET /api/reports/members
 * Get per-member spending summary for a period
 *
 * Query params:
 *   - range: 'monthly' | 'yearly' (required)
 *   - period: string (required) - 'YYYY-MM' for monthly, 'YYYY' for yearly
 *   - currency: 'IDR' | 'USD' (optional, defaults to 'IDR')
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { url } = context;

    const range = url.searchParams.get('range') as 'monthly' | 'yearly' | null;
    const period = url.searchParams.get('period');
    const currency = (url.searchParams.get('currency') as 'IDR' | 'USD' | null) || 'IDR';

    if (!range || (range !== 'monthly' && range !== 'yearly')) {
      return errorResponse("Invalid range. Must be 'monthly' or 'yearly'.", 400, 'INVALID_RANGE');
    }

    if (!period || typeof period !== 'string' || period.trim() === '') {
      return errorResponse('Period parameter is required.', 400, 'MISSING_PERIOD');
    }

    try {
      validatePeriod(period, range);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Invalid period format.';
      return errorResponse(msg, 400, 'INVALID_PERIOD');
    }

    if (currency !== 'IDR' && currency !== 'USD') {
      return errorResponse("Invalid currency. Must be 'IDR' or 'USD'.", 400, 'INVALID_CURRENCY');
    }

    const summary = await reportService.getMemberSummary(auth.workspaceId, period, range, currency);

    return successResponse(summary);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }
    logError('Error fetching member summary', error);
    return errorResponse('Failed to fetch member summary', 500, 'INTERNAL_ERROR');
  }
};
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/pages/api/reports/members/index.ts
git commit -m "feat(api): add GET /api/reports/members endpoint

Returns per-member spending summary for a given period.
Part of #185."
```

---

### Task 6: Per-User Report API Endpoint

**Files:**

- Modify: `src/pages/api/reports/index.ts` (accept optional `user_id` param)

The simplest approach: extend the existing `/api/reports` endpoint to accept `?user_id=` and pass it to `getMonthlyReport`/`getYearlyReport`. This avoids duplicating all the report rendering logic.

**Step 1: Add user_id param parsing**

In `src/pages/api/reports/index.ts`, after currency validation (around line 101), add:

```typescript
// Optional: filter by specific user
const userId = url.searchParams.get('user_id') || undefined;
```

Then modify the service calls (around line 105-110):

```typescript
if (range === 'monthly') {
  reportData = await reportService.getMonthlyReport(auth.workspaceId, period, currency, userId);
} else {
  const year = parseInt(period, 10);
  reportData = await reportService.getYearlyReport(auth.workspaceId, year, currency, userId);
}
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/pages/api/reports/index.ts
git commit -m "feat(api): accept user_id param in GET /api/reports

Scopes report data to a single user when user_id is provided.
Used by the member spending drill-down view.
Part of #185."
```

---

### Task 7: TransactionFiltersBar — Add Member Dropdown

**Files:**

- Modify: `src/components/organisms/TransactionFiltersBar.astro`

**Step 1: Add member props to interface**

In `TransactionFiltersBar.astro`, add to the `Props` interface (after `showCategoryFilter`, around line 25):

```typescript
userId?: string;
members?: Array<{ id: string; name: string }>;
showMemberFilter?: boolean;
```

Destructure in the props block (around line 37):

```typescript
const {
  typeFilter = 'expense',
  searchValue = '',
  categoryIds = [],
  categories = [],
  showCategoryFilter = true,
  userId = '',
  members = [],
  showMemberFilter = false,
  baseUrl = '/transactions',
  currentMonth = '',
  selectedMonth = '',
} = Astro.props;
```

**Step 2: Update `hasActiveFilters`**

Add userId check (around line 42):

```typescript
const hasActiveFilters =
  typeFilter !== 'expense' ||
  searchValue !== '' ||
  categoryIds.length > 0 ||
  userId !== '' ||
  (selectedMonth !== '' && selectedMonth !== currentMonth);
```

**Step 3: Update `buildFilterUrl` to include user_id**

In the `buildFilterUrl` function, add handling for `user_id` param. Follow the same pattern as the existing category_ids handling.

**Step 4: Add member dropdown HTML**

Add the member dropdown between the category dropdown and search input, following the exact same DaisyUI dropdown pattern used for categories. Use the `Users` icon from `@lucide/astro`:

```html
{showMemberFilter && members.length > 0 && (
  <div class="dropdown">
    <label tabindex="0" class="btn btn-sm btn-ghost gap-1" data-member-trigger>
      <Users class="w-4 h-4" />
      <span data-member-label>
        {userId ? members.find(m => m.id === userId)?.name || 'All Members' : 'All Members'}
      </span>
      <ChevronDown class="w-3 h-3" />
    </label>
    <ul tabindex="0" class="dropdown-content z-[1] menu p-2 shadow-lg bg-base-100 rounded-box w-52" data-member-dropdown>
      <li>
        <a
          href={buildFilterUrl({ user_id: '' })}
          class={`${!userId ? 'active' : ''}`}
          data-member-option
          data-member-id=""
        >
          All Members
        </a>
      </li>
      {members.map((member) => (
        <li>
          <a
            href={buildFilterUrl({ user_id: member.id })}
            class={`${userId === member.id ? 'active' : ''}`}
            data-member-option
            data-member-id={member.id}
          >
            {member.name}
          </a>
        </li>
      ))}
    </ul>
  </div>
)}
```

**Note:** The member dropdown uses simple link navigation (no multi-select needed — only one member at a time). This is simpler than the category dropdown which supports multi-select. Each option is an `<a>` with the full URL including the member filter.

**Step 5: Update the client script**

The member dropdown uses `<a>` links with full URLs, so no client-side JS changes are needed for selection. But update the `filterChange` event dispatching if relevant, and ensure the `buildFilterUrl` function preserves/sets the `user_id` param.

**Step 6: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

**Step 7: Run quality gates**

Run: `bun run lint:fix && bun run stylelint:fix && bun run format:fix`
Expected: All pass

**Step 8: Commit**

```bash
git add src/components/organisms/TransactionFiltersBar.astro
git commit -m "feat(ui): add member dropdown to TransactionFiltersBar

Adds optional member filter dropdown using simple link navigation.
Follows existing category dropdown styling patterns.
Part of #185."
```

---

### Task 8: Transactions Page — Wire Up Member Filter

**Files:**

- Modify: `src/pages/transactions/index.astro`

**Step 1: Parse `user_id` from URL**

In `src/pages/transactions/index.astro`, in the query param parsing section (around line 55), add:

```typescript
const userId = searchParams.user_id || '';
```

**Step 2: Add to filters object**

In the filters object passed to `transactionService.findAll()` (around line 80), add:

```typescript
created_by_user_id: userId || undefined,
```

Also add the same to `countFilters` if it's a separate object.

**Step 3: Fetch workspace members**

Near where categories are fetched (look for the `categoryService` or similar call), add:

```typescript
import { workspaceService } from '@/services';
// ...
const members = await workspaceService.getMembers(user.workspaceId);
const memberOptions = members.map((m) => ({ id: m.id, name: m.name || m.email }));
```

**Step 4: Pass to TransactionFiltersBar**

In the `<TransactionFiltersBar>` component usage (around line 276), add the new props:

```typescript
<TransactionFiltersBar
  typeFilter={typeFilter}
  searchValue={searchValue}
  categoryIds={categoryIds}
  categories={categories}
  showCategoryFilter={true}
  userId={userId}
  members={memberOptions}
  showMemberFilter={true}
  selectedMonth={effectiveMonth}
  currentMonth={currentMonthKey}
  baseUrl={baseUrl}
/>
```

**Step 5: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

**Step 6: Run quality gates**

Run: `bun run lint:fix && bun run format:fix && bun run typecheck`
Expected: All pass

**Step 7: Manual test in browser**

- Navigate to `/transactions`
- Verify the "All Members" dropdown appears
- Select a member — URL should update with `?user_id=xxx`
- Transaction list should filter to that user's transactions
- Reset button should clear the member filter

**Step 8: Commit**

```bash
git add src/pages/transactions/index.astro
git commit -m "feat(transactions): wire up member filter on transactions page

Parses user_id from URL, fetches workspace members, passes both
to TransactionFiltersBar for user-based filtering.
Part of #185."
```

---

### Task 9: `/reports/members` Page — Overview

**Files:**

- Create: `src/pages/reports/members/index.astro`

**Reference files:**

- `src/pages/reports/index.astro` — for report page structure and ReportSelector usage
- `src/components/molecules/ReportSelector.astro` — for range/period/currency selector
- `src/components/partials/ReportSummaryCardsPartial.astro` — for stat card styling reference

**Step 1: Create the page**

Create `src/pages/reports/members/index.astro`. This page has two modes:

1. **Overview** (no `user_id` param) — shows the member summary table
2. **Drill-down** (`user_id` param present) — shows one member's full report (Task 10)

For this task, implement the overview mode only:

```html
---
import ProtectedLayout from '@/layouts/ProtectedLayout.astro';
import ReportSelector from '@/components/molecules/ReportSelector.astro';
import { reportService } from '@/services';
import { formatMonthYear } from '@/lib/utils/date';
import { formatCurrency } from '@/lib/formatting';
import { safeParseDecimal } from '@/lib/utils/decimal';
import { ChevronRight, Users, ArrowLeft } from '@lucide/astro';
import type { Currency } from '@/lib/enums';

const currentPath = '/reports/members';

const user = Astro.locals.user;
if (!user?.id) {
  return Astro.redirect('/login');
}

const url = Astro.url;
const urlRange = url.searchParams.get('range');
const urlPeriod = url.searchParams.get('period');
const urlCurrency = url.searchParams.get('currency');

const range: 'monthly' | 'yearly' =
  urlRange === 'yearly' ? 'yearly' : 'monthly';

// Generate periods (same as /reports page)
const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth() + 1;

const monthlyPeriods = Array.from({ length: 12 }, (_, i) => {
  const date = new Date(currentYear, currentMonth - 1 - i, 1);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return {
    key: `${year}-${month.toString().padStart(2, '0')}`,
    label: formatMonthYear(date),
  };
});

const yearlyPeriods = Array.from({ length: 4 }, (_, i) => ({
  key: (currentYear - i).toString(),
  label: (currentYear - i).toString(),
}));

// Determine default period
let defaultPeriod: string;
if (urlPeriod) {
  const isMonthly = /^\d{4}-\d{2}$/.test(urlPeriod);
  const isYearly = /^\d{4}$/.test(urlPeriod);
  if (range === 'monthly' && isMonthly) defaultPeriod = urlPeriod;
  else if (range === 'yearly' && isYearly) defaultPeriod = urlPeriod;
  else defaultPeriod = range === 'monthly' ? monthlyPeriods[0].key : yearlyPeriods[0].key;
} else {
  defaultPeriod = range === 'monthly' ? monthlyPeriods[0].key : yearlyPeriods[0].key;
}

const currency: Currency = (urlCurrency === 'USD' ? 'USD' : 'IDR');

// Fetch member summary data
const memberSummary = await reportService.getMemberSummary(
  user.workspaceId,
  defaultPeriod,
  range,
  currency
);

// Calculate totals
const totals = memberSummary.reduce(
  (acc, row) => ({
    income: acc.income + (safeParseDecimal(row.totalIncome) || 0),
    expenses: acc.expenses + (safeParseDecimal(row.totalExpenses) || 0),
    count: acc.count + row.transactionCount,
  }),
  { income: 0, expenses: 0, count: 0 }
);
---
```

For the HTML template:

```html
<ProtectedLayout title="Member Spending" currentPath="{currentPath}">
  <div class="max-w-5xl mx-auto px-4 py-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <a href="/reports" class="btn btn-ghost btn-sm">
          <ArrowLeft class="w-4 h-4" />
        </a>
        <div>
          <h1 class="text-2xl font-bold">Member Spending</h1>
          <p class="text-base-content/60 text-sm">Per-member spending overview</p>
        </div>
      </div>
    </div>

    <!-- Period selector -->
    <ReportSelector
      selectedRange="{range}"
      selectedPeriod="{defaultPeriod}"
      monthlyPeriods="{monthlyPeriods}"
      yearlyPeriods="{yearlyPeriods}"
    />

    <!-- Member summary table -->
    <div class="card bg-base-100 shadow-sm">
      <div class="card-body p-0">
        <div class="overflow-x-auto">
          <table class="table">
            <thead>
              <tr>
                <th>Member</th>
                <th class="text-right">Income</th>
                <th class="text-right">Expenses</th>
                <th class="text-right">Net</th>
                <th class="text-right">Transactions</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {memberSummary.length === 0 ? (
              <tr>
                <td colspan="6" class="text-center py-8 text-base-content/50">
                  <Users class="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No transactions found for this period</p>
                </td>
              </tr>
              ) : ( memberSummary.map((row) => { const net = safeParseDecimal(row.netSavings) || 0;
              const drillUrl =
              `/reports/members?user_id=${row.userId}&range=${range}&period=${defaultPeriod}&currency=${currency}`;
              return (
              <tr class="hover cursor-pointer" onclick="{`window.location" ="${drillUrl}" `}>
                <td class="font-medium">{row.userName}</td>
                <td class="text-right text-success">
                  {formatCurrency(safeParseDecimal(row.totalIncome) || 0, currency)}
                </td>
                <td class="text-right text-error">
                  {formatCurrency(safeParseDecimal(row.totalExpenses) || 0, currency)}
                </td>
                <td class="{`text-right" font-medium ${net>
                  = 0 ? 'text-success' : 'text-error'}`}> {formatCurrency(net, currency)}
                </td>
                <td class="text-right">{row.transactionCount}</td>
                <td class="text-right">
                  <ChevronRight class="w-4 h-4 text-base-content/40" />
                </td>
              </tr>
              ); }) )}
            </tbody>
            {memberSummary.length > 0 && (
            <tfoot>
              <tr class="font-bold">
                <td>Total</td>
                <td class="text-right text-success">{formatCurrency(totals.income, currency)}</td>
                <td class="text-right text-error">{formatCurrency(totals.expenses, currency)}</td>
                <td class="{`text-right" ${(totals.income - totals.expenses)>
                  = 0 ? 'text-success' : 'text-error'}`}> {formatCurrency(totals.income -
                  totals.expenses, currency)}
                </td>
                <td class="text-right">{totals.count}</td>
                <td></td>
              </tr>
            </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  </div>
</ProtectedLayout>
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

**Step 3: Run quality gates**

Run: `bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck`
Expected: All pass

**Step 4: Manual test in browser**

- Navigate to `/reports/members`
- Verify the table shows workspace members with their totals
- Verify period selector works
- Verify clicking a row navigates with `?user_id=`

**Step 5: Commit**

```bash
git add src/pages/reports/members/index.astro
git commit -m "feat(reports): add /reports/members overview page

Shows per-member spending summary table with income, expenses, net,
and transaction count. Supports monthly/yearly range and currency.
Part of #185."
```

---

### Task 10: `/reports/members` Page — Drill-Down View

**Files:**

- Modify: `src/pages/reports/members/index.astro` (add drill-down mode when `user_id` is present)

**Reference files:**

- `src/pages/reports/index.astro:110-190` — how it calls ReportService and passes to partials
- `src/components/partials/ReportSummaryCardsPartial.astro` — props interface
- `src/components/partials/ReportChartsPartial.astro` — props interface
- `src/components/partials/CategoryTablePartial.astro` — props interface

**Step 1: Add drill-down logic to the page**

In `src/pages/reports/members/index.astro`, in the frontmatter, add:

```typescript
const urlUserId = url.searchParams.get('user_id') || '';

// If user_id is present, fetch that user's full report data
let userReportData: ReportData | null = null;
let selectedMemberName = '';

if (urlUserId) {
  // Look up member name
  const { workspaceService } = await import('@/services');
  const members = await workspaceService.getMembers(user.workspaceId);
  const member = members.find((m) => m.id === urlUserId);
  selectedMemberName = member?.name || member?.email || 'Unknown';

  // Fetch their report data
  if (range === 'monthly') {
    userReportData = await reportService.getMonthlyReport(
      user.workspaceId,
      defaultPeriod,
      currency,
      urlUserId
    );
  } else {
    const year = parseInt(defaultPeriod, 10);
    userReportData = await reportService.getYearlyReport(
      user.workspaceId,
      year,
      currency,
      urlUserId
    );
  }
}
```

Import the report partials:

```typescript
import ReportSummaryCardsPartial from '@/components/partials/ReportSummaryCardsPartial.astro';
import ReportChartsPartial from '@/components/partials/ReportChartsPartial.astro';
import CategoryTablePartial from '@/components/partials/CategoryTablePartial.astro';
import CategoryDrillDownModal from '@/components/organisms/CategoryDrillDownModal.astro';
import type { ReportData } from '@/services/report.service';
```

**Step 2: Add drill-down HTML template**

In the HTML, conditionally render the drill-down view when `urlUserId` is present:

```html
{urlUserId && userReportData ? (
  <!-- Drill-down view -->
  <div class="max-w-5xl mx-auto px-4 py-6 space-y-6">
    <div class="flex items-center gap-3">
      <a href={`/reports/members?range=${range}&period=${defaultPeriod}&currency=${currency}`} class="btn btn-ghost btn-sm">
        <ArrowLeft class="w-4 h-4" />
      </a>
      <div>
        <h1 class="text-2xl font-bold">{selectedMemberName}'s Spending</h1>
        <p class="text-base-content/60 text-sm">Detailed spending report</p>
      </div>
    </div>

    <ReportSelector
      selectedRange={range}
      selectedPeriod={defaultPeriod}
      monthlyPeriods={monthlyPeriods}
      yearlyPeriods={yearlyPeriods}
    />

    <!-- Reuse existing report partials -->
    <ReportSummaryCardsPartial
      totalIncome={userReportData.totalIncome}
      totalExpenses={userReportData.totalExpenses}
      netSavings={userReportData.netSavings}
      budgetHealth={userReportData.budgetHealth}
      expenseCategories={userReportData.expenseCategories}
      currency={currency}
    />

    <ReportChartsPartial
      expenseByCategory={userReportData.expenseByCategory.map(c => ({
        name: c.name,
        value: safeParseDecimal(c.value),
      }))}
      trendData={userReportData.trendData.map(t => ({
        name: t.name,
        income: safeParseDecimal(t.income),
        expenses: safeParseDecimal(t.expenses),
      }))}
      resourceAllocationSubtitle={range === 'monthly' ? 'EXPENSE MIX' : 'YEARLY EXPENSE MIX'}
      financialVelocitySubtitle={range === 'monthly' ? 'TRAILING 3 MONTHS' : 'YEARLY FLOW'}
    />

    <CategoryTablePartial
      categories={userReportData.categoryIntelligence.map(c => ({
        id: c.id,
        name: c.name,
        spent: safeParseDecimal(c.spent),
        budgetLimit: c.budgetLimit ? safeParseDecimal(c.budgetLimit) : null,
        icon: c.icon,
        color: c.color,
      }))}
      subtitle="SORTED BY FUNCTIONAL VOLUME"
      range={range}
    />

    <CategoryDrillDownModal />
  </div>
) : (
  <!-- Overview table (existing code from Task 9) -->
  ...
)}
```

**Note:** The ReportSelector's period changes need to preserve the `user_id` param. Check how ReportSelector builds URLs and ensure `user_id` is carried through. This may require passing `user_id` as a prop to `ReportSelector` or updating its URL building. Check `src/components/molecules/ReportSelector.astro` and `src/components/organisms/ReportsPage.client.ts` for the URL building logic.

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

**Step 4: Run quality gates**

Run: `bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck`
Expected: All pass

**Step 5: Manual test in browser**

- From `/reports/members`, click a member row
- Verify drill-down shows summary cards, charts, and category table for that user
- Verify "Back to Members" link works
- Verify period selector changes update data for the selected member
- Verify category drill-down modal works

**Step 6: Commit**

```bash
git add src/pages/reports/members/index.astro
git commit -m "feat(reports): add member spending drill-down view

When user_id is present, shows full report with summary cards, charts,
and category table scoped to that member. Reuses existing report partials.
Part of #185."
```

---

### Task 11: Reports Page — Add "Member Spending" Link

**Files:**

- Modify: `src/pages/reports/index.astro`

**Step 1: Add navigation link**

In `src/pages/reports/index.astro`, add a link to the member spending report. Place it in the header area near the page title. Look for how the title/header section is structured and add:

```html
<a href="/reports/members" class="btn btn-sm btn-ghost gap-2">
  <Users class="w-4 h-4" />
  Member Spending
</a>
```

Import the `Users` icon from `@lucide/astro` at the top of the file.

**Step 2: Run quality gates**

Run: `bun run lint:fix && bun run format:fix && bun run typecheck`
Expected: All pass

**Step 3: Commit**

```bash
git add src/pages/reports/index.astro
git commit -m "feat(reports): add Member Spending link on reports page

Provides discovery entry point for the /reports/members page.
Part of #185."
```

---

### Task 12: Final Integration Test & Cleanup

**Files:**

- All modified files

**Step 1: Run full test suite**

Run: `bun run test`
Expected: ALL PASS

**Step 2: Run full quality gates**

Run: `bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck`
Expected: 0 errors

**Step 3: Run build**

Run: `bun run build`
Expected: Build succeeds

**Step 4: Manual E2E verification in browser**

1. Navigate to `/transactions` — verify member dropdown appears and filtering works
2. Navigate to `/reports` — verify "Member Spending" link exists
3. Click link → `/reports/members` — verify overview table
4. Click a member → drill-down view with charts and category table
5. Change period — verify data updates
6. Navigate back — verify overview updates
7. On `/transactions`, combine member filter with type/category filters

**Step 5: Final commit (if any cleanup needed)**

```bash
git add -A
git commit -m "chore: final cleanup for transaction report by user feature

Part of #185."
```
