# Reports Revamp Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Revamp the reports overview page into a one-stop financial dashboard (cash flow + wealth) and simplify the income report page (single hero card, no charts).

**Architecture:** Server-rendered Astro partials with client-side HTML fragment updates via `?_render=html`. Reuses existing `AccountPortfolioSummary` and `AllocationBar` components. No new npm dependencies.

**Tech Stack:** Astro 5, DaisyUI v5, Tailwind CSS v4, Chart.js (existing)

**Design doc:** `docs/plans/2026-03-09-reports-revamp-design.md`

---

## Task 1: Remove ReportsSectionNav from Overview Page

**Files:**
- Modify: `src/pages/reports/index.astro:15,137`

**Step 1: Remove the import and usage**

Remove line 15 (`import ReportsSectionNav`) and line 137 (`<ReportsSectionNav ... />`).

The page already has no breadcrumb — it's the top-level reports page.

**Step 2: Verify typecheck passes**

Run: `bun run typecheck`

**Step 3: Commit**

```bash
git add src/pages/reports/index.astro
git commit -m "refactor(reports): remove tab navigation from overview page"
```

---

## Task 2: Remove ReportsSectionNav from Income Page

**Files:**
- Modify: `src/pages/reports/income/index.astro:18,148`

**Step 1: Remove the import and usage**

Remove line 18 (`import ReportsSectionNav`) and line 148 (`<ReportsSectionNav ... />`).

The breadcrumb on line 150 (`<Breadcrumb items={[...]}`) already provides navigation back to Overview.

**Step 2: Verify typecheck passes**

Run: `bun run typecheck`

**Step 3: Commit**

```bash
git add src/pages/reports/income/index.astro
git commit -m "refactor(reports): remove tab navigation from income page"
```

---

## Task 3: Remove ReportsSectionNav from Expenses Page

**Files:**
- Modify: `src/pages/reports/expenses/index.astro:16,187`

**Step 1: Remove the import and usage**

Remove line 16 (`import ReportsSectionNav`) and line 187 (`<ReportsSectionNav ... />`).

The breadcrumb (line 189) already provides navigation back.

**Step 2: Verify no other files import ReportsSectionNav**

Run: `grep -r "ReportsSectionNav" src/`

Expected: No matches.

**Step 3: Verify typecheck passes**

Run: `bun run typecheck`

**Step 4: Commit**

```bash
git add src/pages/reports/expenses/index.astro
git commit -m "refactor(reports): remove tab navigation from expenses page"
```

---

## Task 4: Replace Overview Summary Cards with Compact Cash Flow Row

**Files:**
- Modify: `src/components/partials/OverviewSummaryCardsPartial.astro` (full rewrite)
- Modify: `src/pages/api/reports/index.ts:130-141` (update props passed to partial)

**Step 1: Rewrite OverviewSummaryCardsPartial**

Replace the 4-card grid with a single compact cash flow row. The component keeps the same Props interface (totalIncome, totalExpenses, netSavings, savingsRate, currency) but ignores `savingsRate`.

Design:
```
┌──────────────────────────────────────────────────────────┐
│ Income $8,500  →  Spending $6,200  =  Net +$2,300       │
└──────────────────────────────────────────────────────────┘
```

Implementation approach:
- Single card container with `bg-base-100 border border-base-300 rounded-card shadow-sm`
- Flex row with three segments: Income (success), Spending (error), Net (accent/error)
- Arrow (`→`) and equals (`=`) separators between segments
- On mobile: stack vertically with dividers
- Keep `data-summary-cards` attribute for client-side partial replacement
- Keep existing `data-testid` attributes on the values

**Step 2: The API route already passes the right props**

The API at `src/pages/api/reports/index.ts:130-141` passes `totalIncome`, `totalExpenses`, `netSavings`, `savingsRate`, `currency` — no changes needed since the component still accepts these props (just ignores savingsRate).

**Step 3: Verify typecheck passes**

Run: `bun run typecheck`

**Step 4: Verify in browser**

Start dev server, navigate to `/reports`, confirm the cash flow row renders correctly.

**Step 5: Commit**

```bash
git add src/components/partials/OverviewSummaryCardsPartial.astro
git commit -m "feat(reports): replace overview summary cards with compact cash flow row"
```

---

## Task 5: Update Overview Chart Label

**Files:**
- Modify: `src/pages/reports/index.astro:155`
- Modify: `src/pages/api/reports/index.ts:153`

**Step 1: Update the subtitle on the page**

At line 155 of `src/pages/reports/index.astro`, change:
```
subtitle={defaultRange === 'monthly' ? 'TRAILING 3 MONTHS' : 'YEARLY FLOW'}
```
to:
```
subtitle={defaultRange === 'monthly' ? 'LAST 3 MONTHS' : 'LAST 3 YEARS'}
```

**Step 2: Update the subtitle in the API route**

At line 153 of `src/pages/api/reports/index.ts`, change:
```
subtitle: range === 'monthly' ? 'TRAILING 3 MONTHS' : 'YEARLY FLOW',
```
to:
```
subtitle: range === 'monthly' ? 'LAST 3 MONTHS' : 'LAST 3 YEARS',
```

**Step 3: Also update the default in FinancialVelocityChart**

Check `src/components/organisms/FinancialVelocityChart.astro` line 40 — if the default subtitle is `'TRAILING 3 MONTHS'`, update it to `'LAST 3 MONTHS'`.

**Step 4: Verify typecheck passes**

Run: `bun run typecheck`

**Step 5: Commit**

```bash
git add src/pages/reports/index.astro src/pages/api/reports/index.ts src/components/organisms/FinancialVelocityChart.astro
git commit -m "feat(reports): rename chart label from 'trailing' to 'last N months/years'"
```

---

## Task 6: Add Wealth Section to Overview Page

This is the largest task. The overview page needs account data for the wealth section.

**Files:**
- Modify: `src/pages/reports/index.astro` (add imports, fetch accounts, render wealth section)
- Create: `src/components/partials/OverviewWealthPartial.astro` (wraps AccountPortfolioSummary)
- Modify: `src/pages/api/reports/index.ts` (add 'wealth' partial support)
- Modify: `src/components/organisms/OverviewReportsPage.client.ts` (handle wealth partial refresh)
- Modify: `src/components/organisms/ReportsRenderer.client.ts` (add renderWealthHtml + parseHtmlPartials)

### Step 1: Create OverviewWealthPartial

Create `src/components/partials/OverviewWealthPartial.astro`:

This partial wraps `AccountPortfolioSummary` with the same props pattern used on the accounts page (`src/pages/accounts/index.astro:245-259`).

Props:
```typescript
export interface Props {
  accountTotals: Array<{ currency: Currency; amount: number }>;
  debtTotals: Array<{ currency: Currency; amount: number }>;
  distribution: Array<{ type: string; percentage: number; color: string }>;
  latestUpdate?: Date | string | null;
}
```

Template: Simply renders `<AccountPortfolioSummary>` with the props passed through, wrapped in a `data-wealth-cards` div for partial targeting.

### Step 2: Add wealth data fetching to the overview page

In `src/pages/reports/index.astro`, add imports:
```typescript
import { accountService } from '@/services';
import {
  calculateAccountTotalsByCurrency,
  calculateDebtTotalsByCurrency,
  calculateAccountAllocation,
} from '@/lib/utils/account';
import OverviewWealthPartial from '@/components/partials/OverviewWealthPartial.astro';
```

After the `overviewData` fetch (around line 107), add:
```typescript
// Fetch account data for wealth section
const accounts = await accountService.findAll(user.workspaceId);
const orderedCurrencies = workspaceCurrencies;
const accountTotals = calculateAccountTotalsByCurrency(accounts, orderedCurrencies);
const debtTotals = calculateDebtTotalsByCurrency(accounts, orderedCurrencies);
const allocationCurrency = orderedCurrencies.find((c) =>
  accounts.some((a) => a.account_class !== 'debt' && a.currency === c && parseFloat(a.balance || '0') > 0)
) ?? orderedCurrencies[0];
const accountAllocation = calculateAccountAllocation(accounts, allocationCurrency);
const latestUpdate = accounts.reduce<Date | null>((latest, a) => {
  const d = new Date(a.last_updated);
  return !latest || d > latest ? d : latest;
}, null);
```

### Step 3: Add wealth section to the template

In the template section, add between the charts container and the previews container:

```astro
{/* Wealth */}
<div data-wealth-container>
  <OverviewWealthPartial
    accountTotals={accountTotals}
    debtTotals={debtTotals}
    distribution={accountAllocation}
    latestUpdate={latestUpdate}
  />
</div>
```

### Step 4: Add wealth partial to the API route

In `src/pages/api/reports/index.ts`:

1. Update `VALID_PARTIALS` (line 52) to include `'wealth'`
2. Add wealth data fetching after the overview data fetch (around line 123):
   ```typescript
   // Fetch account data for wealth partial
   const accounts = await accountService.findAll(auth.workspaceId);
   ```
3. Add wealth partial rendering block (after previews block, around line 169):
   ```typescript
   if (partial === 'all' || partial === 'wealth') {
     // calculate totals and allocation, render OverviewWealthPartial
   }
   ```
4. Add necessary imports: `accountService` from services, utility functions from `@/lib/utils/account`, and the `OverviewWealthPartial` component.

### Step 5: Add renderWealthHtml to ReportsRenderer.client.ts

In `src/components/organisms/ReportsRenderer.client.ts`:

1. Add `wealth` to the `parseHtmlPartials` return type and extraction:
   ```typescript
   const wealthMatch = html.match(/<!-- PARTIAL:wealth -->\n([\s\S]*?)(?=<!-- PARTIAL:|$)/);
   if (wealthMatch) partials.wealth = wealthMatch[1].trim();
   ```

2. Add `renderWealthHtml` function following the same pattern as `renderPreviewsHtml` — targets `[data-wealth-container]`, injects HTML, animates fade-in.

### Step 6: Update OverviewReportsPage.client.ts

In `src/components/organisms/OverviewReportsPage.client.ts`:

1. Import `renderWealthHtml` from `ReportsRenderer.client`
2. In `fetchAndRenderOverview()`:
   - Add `showLoadingState('[data-wealth-container]')` at the start
   - Add wealth rendering in the partials handling:
     ```typescript
     if (partials.wealth) {
       renderWealthHtml(partials.wealth);
     } else {
       hideLoadingState('[data-wealth-container]');
     }
     ```
   - Add `hideLoadingState('[data-wealth-container]')` in the error handler

### Step 7: Verify typecheck passes

Run: `bun run typecheck`

### Step 8: Verify in browser

Navigate to `/reports`, confirm wealth section renders with account totals, debt, net worth, and allocation bar.

### Step 9: Commit

```bash
git add src/components/partials/OverviewWealthPartial.astro \
  src/pages/reports/index.astro \
  src/pages/api/reports/index.ts \
  src/components/organisms/ReportsRenderer.client.ts \
  src/components/organisms/OverviewReportsPage.client.ts
git commit -m "feat(reports): add wealth section with account allocation to overview page"
```

---

## Task 7: Replace Income Summary Cards with Hero Card

**Files:**
- Modify: `src/components/partials/IncomeSummaryCardsPartial.astro` (full rewrite)

**Step 1: Rewrite IncomeSummaryCardsPartial**

Replace the 5 stat cards with a single hero summary card containing:
- Total Income as hero number (large, bold, success color)
- Growth badge (top-right corner, e.g., "▲ 12.0%" in success or "▼ 3.2%" in error)
- `AllocationBar` component showing Active / Passive / Other distribution
- Legend with percentages below the bar

Props remain the same: `totalIncome`, `activeIncome`, `passiveIncome`, `otherIncome`, `growthVsPreviousPeriod`, `currency`.

Calculate allocation percentages from the income amounts:
```typescript
const total = parseFloat(totalIncome) || 0;
const active = parseFloat(activeIncome) || 0;
const passive = parseFloat(passiveIncome) || 0;
const other = parseFloat(otherIncome) || 0;

const segments = [
  { label: 'Active', percentage: total > 0 ? (active / total) * 100 : 0, color: '#22c55e' },
  { label: 'Passive', percentage: total > 0 ? (passive / total) * 100 : 0, color: '#3b82f6' },
  { label: 'Other', percentage: total > 0 ? (other / total) * 100 : 0, color: '#f59e0b' },
].filter(s => s.percentage > 0);
```

Design:
```
┌─────────────────────────────────────────────────────┐
│ TOTAL INCOME                          ▲ 12.0%       │
│ SGD 8,500                                           │
│                                                     │
│ ████████████████████░░░░░░░░ ░░░                    │
│ ● Active 70.6%   ● Passive 23.5%   ● Other 5.9%   │
└─────────────────────────────────────────────────────┘
```

Use the same card styling as the overview wealth section: `bg-base-100 border border-base-300 rounded-card shadow-sm p-5 lg:p-6`.

Import `AllocationBar` from `@components/molecules/AllocationBar.astro`.

Colors: Active = success green (`#22c55e`), Passive = info blue (`#3b82f6`), Other = warning amber (`#f59e0b`). These match the existing income source type color scheme.

Keep `data-summary-cards` attribute for client-side partial replacement.

**Step 2: The API route already passes the right props — no changes needed**

The API at `src/pages/api/reports/income/index.ts:161-173` passes the same props.

**Step 3: Verify typecheck passes**

Run: `bun run typecheck`

**Step 4: Verify in browser**

Navigate to `/reports/income`, confirm hero card renders with allocation bar.

**Step 5: Commit**

```bash
git add src/components/partials/IncomeSummaryCardsPartial.astro
git commit -m "feat(reports): replace income summary cards with hero card and allocation bar"
```

---

## Task 8: Remove Income Charts Section

**Files:**
- Modify: `src/pages/reports/income/index.astro:22,107-117,163-171` (remove chart imports, data, and rendering)
- Modify: `src/pages/api/reports/income/index.ts:175-197` (remove charts partial rendering)
- Modify: `src/components/organisms/IncomeReportsPage.client.ts` (remove charts handling)

**Step 1: Remove charts from income page**

In `src/pages/reports/income/index.astro`:
1. Remove the import of `IncomeChartsPartial` (line 22)
2. Remove the `sourceMix` and `sourceGroupTrend` data transformations (lines 107-117)
3. Remove the charts container block (lines 163-171):
   ```astro
   <div data-charts-container>
     <IncomeChartsPartial ... />
   </div>
   ```

**Step 2: Remove charts partial from the API route**

In `src/pages/api/reports/income/index.ts`:
1. Remove `'charts'` from `VALID_PARTIALS` array
2. Remove the import of `IncomeChartsPartial`
3. Remove the entire `if (partial === 'all' || partial === 'charts')` block (lines 175-197)

**Step 3: Remove charts handling from client script**

In `src/components/organisms/IncomeReportsPage.client.ts`:
1. Remove `renderChartsHtml` import
2. Remove `showLoadingState('[data-charts-container]')` calls
3. Remove `hideLoadingState('[data-charts-container]')` calls
4. Remove the `if (partials.charts)` block

**Step 4: Verify typecheck passes**

Run: `bun run typecheck`

**Step 5: Commit**

```bash
git add src/pages/reports/income/index.astro \
  src/pages/api/reports/income/index.ts \
  src/components/organisms/IncomeReportsPage.client.ts
git commit -m "feat(reports): remove income source mix and trend charts"
```

---

## Task 9: Run Quality Gates and Final Verification

**Step 1: Run all quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

**Step 2: Build check**

```bash
bun run build
```

**Step 3: Run tests**

```bash
bun run test
```

**Step 4: Visual verification in browser**

1. Navigate to `/reports` — verify:
   - No tab navigation bar
   - Compact cash flow row (income → spending = net)
   - Chart labeled "Last 3 months" (or "Last 3 years" on yearly)
   - Wealth section with account totals, debt, net worth, allocation bar
   - Preview cards linking to income and expense detail pages

2. Navigate to `/reports/income` — verify:
   - Breadcrumb: "Overview > Income" (no tabs)
   - Single hero card with total, growth badge, allocation bar
   - No charts section
   - Three tables intact: Sources, Members, History

3. Navigate to `/reports/expenses` — verify:
   - Breadcrumb works (no tabs)
   - Rest of page unaffected

4. Test client-side updates:
   - Change period selector on overview — all sections refresh including wealth
   - Change period selector on income — hero card refreshes

**Step 5: Final commit if any quality gate fixes**

```bash
git add -A
git commit -m "chore: quality gate fixes for reports revamp"
```

---

## Task Summary

| Task | Description | Files Changed |
|------|-------------|---------------|
| 1 | Remove tabs from overview | 1 |
| 2 | Remove tabs from income | 1 |
| 3 | Remove tabs from expenses | 1 |
| 4 | Cash flow row (replace summary cards) | 1 |
| 5 | Chart label rename | 3 |
| 6 | Wealth section (new partial + wiring) | 5 |
| 7 | Income hero card (replace 5 stat cards) | 1 |
| 8 | Remove income charts | 3 |
| 9 | Quality gates + verification | 0 |

**Total: 9 tasks, ~16 file modifications**

## Parallelization Notes

Tasks 1-3 are independent (different files) — can run in parallel.
Tasks 4-5 touch different files — can run in parallel.
Task 6 is the largest and should run alone.
Tasks 7-8 touch different aspects of income page — can run in parallel.
Task 9 is sequential (depends on all prior tasks).
