# Reporting Income Redesign - Manual Test Plan

**Branch:** `reporting-income`  
**Date:** 2026-03-08  
**Source plans:** `docs/plans/2026-03-08-reporting-income-design.md`, `docs/plans/2026-03-08-reporting-income-implementation.md`

## Overview

This plan validates the reporting redesign that splits Reports into Overview, Expenses, and Income while making income a first-class reporting surface. It covers income source classification, Overview/Income/Expense navigation, shared filter persistence, global currency behavior, income drilldowns, filtered history, empty/error states, and cross-page total consistency.

> This is an acceptance test plan for the reporting redesign described in the source plans above. Execute it after the implementation branch includes the planned reporting changes, not against the current docs-only state.

## Prerequisites

- Reporting redesign implementation from branch `reporting-income` is checked out locally.
- Bun is installed.
- Reset the local demo database: `bun run db:reset`.
- Start the app with `bun run dev` and use the printed URL as `<APP_URL>` (usually `http://localhost:4321`).
- Log in with seeded credentials: `demo@example.com` / `demo123456789`.
- Seeded workspace members should include `Dad` (admin) and `Mom` (member).
- Seeded currencies should include `IDR` as primary and `USD` as secondary.
- Seeded income categories should include active-style categories (for example salary/side income) and passive-style categories (for example bonds/dividends/fixed deposits).
- If income history does not have enough rows to test pagination, reseed with a larger data set before section 6.5.

---

## Automated Verification

Run from repo root after implementation is complete:

```bash
bun test src/db/index.integration.test.ts src/__tests__/api/categories/index.test.ts src/__tests__/api/categories/[id].test.ts
bun test src/lib/reporting/report-state.test.ts src/services/__tests__/report-income-report.test.ts src/services/__tests__/performance-benchmark.test.ts
bun test src/__tests__/api/reports/index.test.ts src/__tests__/api/reports/expenses/index.test.ts src/__tests__/api/reports/income/index.test.ts src/__tests__/api/reports/category-drilldown.test.ts tests/integration/api/reports/openapi-contract.test.ts
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
bun run build
bun run test:e2e -- e2e/tests/reports/income-detail.spec.ts e2e/tests/stats-verification/cross-page-totals.spec.ts
```

Expected results:

- All commands exit `0`.
- Report endpoint tests cover Overview, Expenses, Income, and shared drilldowns.
- Performance benchmark stays within the thresholds defined for Overview and Income report payloads.
- E2E coverage passes for section navigation, filter persistence, and cross-page totals.

---

## Test Steps

### 1. Income Source Classification in Category Management

**Areas under test:** Category modal, category APIs, category list UI, category seed defaults

> **Critical:** Category classification is the data foundation for active/passive income reporting.

| Step | Action                                                                                                                              | Expected Result                                                                                                                          |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1  | Open `<APP_URL>/login` and sign in with `demo@example.com` / `demo123456789`.                                                       | Login succeeds and the main app shell loads.                                                                                             |
| 1.2  | Navigate to `<APP_URL>/budget/categories` and switch to the Income tab.                                                             | Income categories list loads successfully.                                                                                               |
| 1.3  | Inspect seeded income rows such as salary/side income and dividends/bonds/fixed deposits.                                           | The list shows an income source indicator or column. Salary-like rows are marked `Active`; investment-like rows are marked `Passive`.    |
| 1.4  | Click the create-category action, choose type `Income`, enter name `QA Freelance Income`, choose income source `Active`, then save. | Category is created successfully and appears in the income list with an `Active` source badge.                                           |
| 1.5  | Edit `QA Freelance Income`, change income source to `Passive`, save, then reload the page.                                          | The edited row still exists after reload and now shows `Passive`.                                                                        |
| 1.6  | Start creating a new `Expense` category.                                                                                            | The income source control is hidden or disabled for expense categories; the page does not force an income-source value for expense rows. |

---

### 2. Reports Overview Layout and Section Navigation

**Areas under test:** `/reports`, report section nav, overview partials

> **Critical:** The Reports landing page should become a lightweight Overview instead of an expense-heavy deep dive.

| Step | Action                                     | Expected Result                                                                                                                       |
| ---- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1  | Navigate to `<APP_URL>/reports`.           | Reports page loads with section nav showing `Overview`, `Expenses`, and `Income`, with `Overview` active.                             |
| 2.2  | Inspect the Overview layout.               | The page shows compact summary cards, one combined income-vs-expense trend, and small preview modules linking to Income and Expenses. |
| 2.3  | Confirm what is **not** shown on Overview. | The old heavy expense table/member-table drilldown layout is not embedded on the landing page.                                        |
| 2.4  | Click the Income preview CTA.              | Browser navigates to `<APP_URL>/reports/income` and income-specific content loads.                                                    |
| 2.5  | Click the Expenses nav item.               | Browser navigates to `<APP_URL>/reports/expenses` and the expense deep dive loads.                                                    |
| 2.6  | Use browser Back to return to Overview.    | Overview reloads correctly and remains the lightweight landing page.                                                                  |

---

### 3. Shared Report State and Global Currency Behavior

**Areas under test:** report state helpers, report selector, global currency handling

| Step | Action                                                                                                                          | Expected Result                                                                                                                        |
| ---- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 3.1  | On `<APP_URL>/reports`, switch to yearly range and choose the current seeded year. If a member filter is available, pick `Mom`. | The report refreshes successfully and the URL updates with `range`, `period`, and `user_id` when a member is selected.                 |
| 3.2  | Inspect the report-level filter bar.                                                                                            | It contains report-level controls only (range, period, and optional member). There is **no** currency selector inside the report page. |
| 3.3  | Use the global header currency control to switch from `IDR` to `USD`.                                                           | The current report refreshes in USD and the visible totals/charts change currency formatting accordingly.                              |
| 3.4  | Click `Income`, then `Expenses`, then `Overview` again using the section nav.                                                   | Range, period, selected member, and global currency context persist across section switches.                                           |
| 3.5  | Refresh the current report page.                                                                                                | The same report context remains active after reload.                                                                                   |

---

### 4. Expense Detail Regression

**Areas under test:** `/reports/expenses`, existing expense partials, shared drilldown modal

| Step | Action                                                                                                     | Expected Result                                                                                          |
| ---- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| 4.1  | Open `<APP_URL>/reports/expenses`.                                                                         | Expense report loads with expense-oriented summary cards, charts, category table, and member breakdowns. |
| 4.2  | Click an expense category row or drilldown affordance.                                                     | The shared `CategoryDrillDownModal` opens with expense transaction details and pagination controls.      |
| 4.3  | Close the drilldown and continue interacting with the page.                                                | The expense page remains stable; no forced redirect back to Overview occurs.                             |
| 4.4  | If the expense member table links to a member detail page, open one and then use the breadcrumb/back link. | The breadcrumb/back link returns to `/reports/expenses`, not the Overview page.                          |

---

### 5. Income Detail Summary and Source Analytics

**Areas under test:** `/reports/income`, income summary partials, source mix/trend charts, member table

> **Critical:** Income must feel like its own reporting destination rather than a copy of the expense page.

| Step | Action                                  | Expected Result                                                                                                         |
| ---- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 5.1  | Navigate to `<APP_URL>/reports/income`. | Income page loads with `Income` active in the report section nav.                                                       |
| 5.2  | Inspect the summary area.               | Summary cards show `Total income`, `Active income`, `Passive income`, `Other income`, and period-over-period change.    |
| 5.3  | Inspect the charts area.                | A source mix chart and an active/passive/other trend chart both render without layout issues.                           |
| 5.4  | Inspect the income source table.        | Source-category rows are grouped or labeled by source type and show visible `Active`, `Passive`, or `Other` indicators. |
| 5.5  | Inspect the member table.               | Members such as `Dad` and `Mom` show income totals and share-of-total information.                                      |
| 5.6  | Compare the summary math.               | `Active income + Passive income + Other income = Total income` for the same filter context.                             |

---

### 6. Income Drilldown, Filtered History, and Pagination

**Areas under test:** income history table, shared category drilldown flow, drilldown URL state

> **Critical:** Users must be able to go from income summary into specific historical income transactions without loading everything at once.

| Step | Action                                                                                                                      | Expected Result                                                                                                                          |
| ---- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 6.1  | On `<APP_URL>/reports/income`, click a source-category row such as `Dividends`, `Bonds`, or another seeded income category. | The shared `CategoryDrillDownModal` opens and clearly reflects the selected income category.                                             |
| 6.2  | Inspect the drilldown content.                                                                                              | The modal shows income-focused transaction content for the selected category only; it does not show expense-budget messaging by default. |
| 6.3  | Observe the page state while the drilldown/filter is active.                                                                | The income history context reflects the selected source/category filter and does not show unrelated income transactions.                 |
| 6.4  | If the URL updates with drilldown state (for example `source_type` or `category_id`), reload the page with that URL intact. | The same filtered income context is restored after reload.                                                                               |
| 6.5  | Use pagination controls in the income history flow to move to the next page.                                                | The next page loads correctly, row counts change, and the UI does not render the entire history in one oversized response.               |
| 6.6  | Clear the drilldown/filter or close the modal.                                                                              | The page returns to the broader income history view.                                                                                     |

---

### 7. Empty States and Invalid Filter Handling

**Areas under test:** page-local empty/error states, member-filter validation

> **Critical:** Error handling must be local and safe; invalid member filters must not silently load data.

| Step | Action                                                                                      | Expected Result                                                                                                                      |
| ---- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 7.1  | On `<APP_URL>/reports/income`, choose a month or year with no income transactions.          | The Income page shows an income-specific empty state instead of a blank page or redirect.                                            |
| 7.2  | Switch from that empty Income state back to Overview.                                       | Overview still renders its own local state; the app does not break because Income had no data.                                       |
| 7.3  | Manually edit the Income URL to include `user_id=not-in-workspace` and load the page.       | The request is rejected with a visible 400-style error state/message; the page does not silently fall back to another member's data. |
| 7.4  | Repeat the invalid `user_id` check on `<APP_URL>/reports` and `<APP_URL>/reports/expenses`. | Both routes reject the invalid member filter the same way.                                                                           |
| 7.5  | Return to a valid report URL without the bad `user_id`.                                     | The report loads normally again with no stale invalid-filter state left behind.                                                      |

---

### 8. Cross-Page Totals and Consistency

**Areas under test:** Overview vs Income totals, Overview vs Expenses totals, consistent filter context

| Step | Action                                                                                                                        | Expected Result                                                                                                       |
| ---- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 8.1  | Pick a report context that has data (same range, period, member selection, and global currency) and note the Overview totals. | Total income and total expenses are visible on Overview.                                                              |
| 8.2  | Open `<APP_URL>/reports/income` with the same context.                                                                        | Income total matches the Overview income total for the same filters and currency.                                     |
| 8.3  | Open `<APP_URL>/reports/expenses` with the same context.                                                                      | Expense total matches the Overview expense total for the same filters and currency.                                   |
| 8.4  | Compare the member income rows to the income summary.                                                                         | The member totals reconcile to the overall income total for the current context, except for percentage rounding only. |

---

## Summary Checklist

| #   | Area                    | Key Assertion                                                                                | Status   |
| --- | ----------------------- | -------------------------------------------------------------------------------------------- | -------- |
| 1   | Category classification | Income categories can be created/edited with active/passive/other source types               | **PASS** |
| 2   | Overview IA             | `/reports` is a lightweight overview, not the old expense-heavy deep dive                    | **PASS** |
| 3   | Shared state            | Range/period/member persist across sections and currency stays in the global header          | **PASS** |
| 4   | Expense regression      | `/reports/expenses` keeps the existing heavy expense workflow and drilldowns                 | **PASS** |
| 5   | Income analytics        | `/reports/income` shows summary, charts, source table, and member breakdowns                 | **PASS** |
| 6   | Drilldown + history     | Income drilldowns reuse the shared modal and history pagination works                        | **PASS** |
| 7   | Empty/error handling    | Empty states are page-local and invalid `user_id` filters return a visible 400-style failure | **PASS** |
| 8   | Totals consistency      | Overview, Income, and Expenses stay numerically consistent for the same filters              | **PASS** |

**Critical paths:** Sections 1, 2, 5, 6, and 7 are highest priority.

> **Note on Member Filtering:** During execution, it was observed that the `user_id` parameter (member filter) is respected on the `Member Spending` deep-dive page but does not currently filter the main `Overview`, `Expenses`, or `Income` section pages. Navigating between these sections currently resets the user context to "All Members". This aligns with the "optional" member filter description in the design but may be a candidate for future state-persistence improvement.

## Automated Test Coverage

| Suite                   | What to Run                                                                                                                                                                                                                                                    | File/Config                                                                                                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema + category APIs  | `bun test src/db/index.integration.test.ts src/__tests__/api/categories/index.test.ts src/__tests__/api/categories/[id].test.ts`                                                                                                                               | `src/db/index.integration.test.ts`, `src/__tests__/api/categories/*.test.ts`                                                                            |
| Report state + services | `bun test src/lib/reporting/report-state.test.ts src/services/__tests__/report-income-report.test.ts src/services/__tests__/performance-benchmark.test.ts`                                                                                                     | `src/lib/reporting/report-state.test.ts`, `src/services/__tests__/report-income-report.test.ts`, `src/services/__tests__/performance-benchmark.test.ts` |
| Report endpoints        | `bun test src/__tests__/api/reports/index.test.ts src/__tests__/api/reports/expenses/index.test.ts src/__tests__/api/reports/income/index.test.ts src/__tests__/api/reports/category-drilldown.test.ts tests/integration/api/reports/openapi-contract.test.ts` | `src/__tests__/api/reports/*.test.ts`, `tests/integration/api/reports/openapi-contract.test.ts`                                                         |
| Browser regression      | `bun run test:e2e -- e2e/tests/reports/income-detail.spec.ts e2e/tests/stats-verification/cross-page-totals.spec.ts`                                                                                                                                           | `e2e/tests/reports/income-detail.spec.ts`, `e2e/tests/stats-verification/cross-page-totals.spec.ts`                                                     |
| Full quality gates      | `bun run lint:fix`, `bun run stylelint:fix`, `bun run format:fix`, `bun run typecheck`, `bun run build`                                                                                                                                                        | Root repo scripts in `package.json`                                                                                                                     |
