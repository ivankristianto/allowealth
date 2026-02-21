# Budget Category Trends - Manual Test Plan

**PR:** #265
**Branch:** `budget-history-category-trends`
**Date:** 2026-02-21

## Overview

This feature adds a "Category Trends" tab to the budget history page (`/budget/history`) that pivots the data axis: rows become categories, columns become months. Users can scan horizontally to spot spending trends per category across 3, 6, or 12 months. The existing "Monthly Totals" view remains unchanged.

## Prerequisites

- Local dev server running at `http://localhost:4321`
- Test credentials: `demo@example.com` / `demo123456789`
- Budget data seeded for at least 3 months with multiple categories (run `bun run aw seed` if needed)
- At least one category should be near or over budget in recent months to verify color coding

---

## Test Steps

### 1. Monthly Totals View (Regression)

**Services under test:** BudgetService (`getBudgetHistory`)

> **Critical:** Existing functionality must remain unchanged after adding the new tab.

| Step | Action                                                              | Expected Result                                                                                                     |
| ---- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 1.1  | Navigate to `http://localhost:4321/budget/history`                  | Page loads with "Budget History" heading and "Monthly Totals" tab visually active (highlighted with primary color)  |
| 1.2  | Verify the tab bar is visible between the header and the table card | Two tabs visible: "Monthly Totals" (active) and "Category Trends" (inactive/muted)                                  |
| 1.3  | Verify the existing table is displayed                              | Table shows monthly rows with columns: Month, Budget, Spent, Balance, Status, Change, Actions — identical to before |
| 1.4  | If multiple years exist, click a different year in the YearToggle   | Table updates to show months for the selected year; year toggle button states update correctly                      |
| 1.5  | Click the eye icon on any month row                                 | Navigates to `/budget?year=YYYY&month=M` for that month's detail view                                               |
| 1.6  | Navigate back to `/budget/history`                                  | Page loads back with "Monthly Totals" tab active, year toggle visible, month range selector hidden                  |

---

### 2. Tab Switching

**Services under test:** BudgetHistoryPage.client (`setupViewTabListeners`, `updateViewMode`)

> **Critical:** Tab switching is the primary interaction for this feature.

| Step | Action                                                | Expected Result                                                                                                                                     |
| ---- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1  | Click "Category Trends" tab                           | Tab becomes active (highlighted). "Monthly Totals" tab becomes muted. Table content area shows loading spinner briefly, then category trends matrix |
| 2.2  | Verify the year toggle hides                          | YearToggle pill group is no longer visible                                                                                                          |
| 2.3  | Verify the month range selector appears               | A segmented control with "3mo", "6mo", "12mo" buttons appears, with "6mo" active (default)                                                          |
| 2.4  | Verify the desktop table header row (7 columns) hides | The "Month / Budget / Spent / Balance / Status / Change / Actions" header row is hidden                                                             |
| 2.5  | Check URL bar                                         | URL contains `?view=trends` and does NOT contain `year=` parameter                                                                                  |
| 2.6  | Click "Monthly Totals" tab                            | Tab becomes active. Year toggle reappears. Month range selector hides. Table reverts to monthly rows                                                |
| 2.7  | Check URL bar                                         | URL contains `year=YYYY` and does NOT contain `view=trends`                                                                                         |
| 2.8  | Rapidly toggle between tabs 3-4 times                 | No visual glitches, no stale data from cancelled requests, no error toasts                                                                          |

---

### 3. Category Trends Matrix Layout

**Services under test:** BudgetService (`getCategoryTrends`), BudgetCategoryTrendsPartial

| Step | Action                                                             | Expected Result                                                                                                          |
| ---- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| 3.1  | Click "Category Trends" tab and wait for data to load              | Matrix displays with: header row showing abbreviated month names (e.g., "Sep", "Oct") and years; category rows below     |
| 3.2  | Verify the first column header says "Category"                     | Header row starts with "CATEGORY" in uppercase muted text                                                                |
| 3.3  | Verify month columns show abbreviated name + year                  | Each month column shows e.g., "Oct" on first line, "2025" on second line in lighter text                                 |
| 3.4  | Verify month columns are chronological (oldest left, newest right) | Months progress left to right from oldest to most recent                                                                 |
| 3.5  | Count month columns — should be 6 by default                       | Exactly 6 month columns displayed (the default month range)                                                              |
| 3.6  | Verify each category row shows: colored dot + name + avg %         | Left column has: small colored circle, category name in bold, "avg: NN%" in muted text below                             |
| 3.7  | Verify rows are sorted by worst average adherence                  | The category with the highest average percentage used appears first (top of table). Categories with lower % appear below |

---

### 4. Cell Content and Status Colors

**Services under test:** BudgetCategoryTrendsPartial

> **Critical:** Color coding is the primary visual signal for this feature.

| Step | Action                                                               | Expected Result                                                                          |
| ---- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 4.1  | Find a cell where the category is under 80% of budget for that month | Cell shows compact currency amount (e.g., "850k" or "1.2M") with a GREEN dot to its left |
| 4.2  | Find a cell where the category is between 80-99% of budget           | Cell shows compact currency amount with a YELLOW dot                                     |
| 4.3  | Find a cell where the category is at or over 100% of budget          | Cell shows compact currency amount with a RED dot                                        |
| 4.4  | Hover over a cell with data                                          | Tooltip appears showing: "CategoryName — MonthName Year: NN% of budget"                  |
| 4.5  | Find a cell with no budget data (category not present in that month) | Cell shows an em-dash "—" in muted text                                                  |

---

### 5. Cell Navigation

**Services under test:** BudgetCategoryTrendsPartial (links)

| Step | Action                                          | Expected Result                                                                           |
| ---- | ----------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 5.1  | Click any data cell (amount with color dot)     | Navigates to `/budget?year=YYYY&month=M` — the budget detail page for that specific month |
| 5.2  | Verify the correct month loads in budget detail | The budget detail page shows the month matching the column header of the clicked cell     |
| 5.3  | Navigate back to `/budget/history`              | Page loads. If URL still has `view=trends`, the trends tab should be active               |

---

### 6. Month Range Selector

**Services under test:** BudgetHistoryPage.client (`setupMonthRangeListeners`), BudgetService (`getCategoryTrends`)

| Step | Action                                                        | Expected Result                                                                                              |
| ---- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 6.1  | While in Category Trends view, click "3mo"                    | Loading spinner appears briefly. Matrix reloads with exactly 3 month columns. "3mo" button becomes active    |
| 6.2  | Verify "6mo" button is no longer active                       | "6mo" button is muted/inactive                                                                               |
| 6.3  | Click "12mo"                                                  | Matrix reloads with exactly 12 month columns. Table may scroll horizontally on smaller screens               |
| 6.4  | Click "6mo" to return to default                              | Matrix reloads with exactly 6 month columns. "6mo" button active                                             |
| 6.5  | Click "3mo", then immediately click "12mo" before it finishes | Only the 12-month result renders (no stale 3-month data). No error toast. Final state shows 12 month columns |

---

### 7. Loading and Error States

**Services under test:** BudgetHistoryRenderer.client (`showLoadingState`, `hideLoadingState`)

| Step | Action                                                            | Expected Result                                                                                                           |
| ---- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 7.1  | Click "Category Trends" tab and observe the transition            | Table body area shows reduced opacity (loading state) briefly, then renders the matrix. Footer spinner appears then hides |
| 7.2  | Open browser DevTools Network tab and set throttling to "Slow 3G" | Network panel shows throttled speed indicator                                                                             |
| 7.3  | Click a different month range (e.g., "12mo")                      | Loading spinner visible for extended time. Table body has reduced opacity. Content eventually renders correctly           |
| 7.4  | Remove throttling and switch back to "Monthly Totals"             | Monthly view loads normally. Loading state clears properly                                                                |

---

### 8. Mobile Responsive Layout

**Services under test:** BudgetCategoryTrendsPartial (CSS)

| Step | Action                                                              | Expected Result                                                                                                             |
| ---- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 8.1  | Resize browser to ~375px width (or use Chrome DevTools mobile view) | Tab bar stacks vertically or remains side-by-side depending on breakpoint. Both tabs are accessible                         |
| 8.2  | Click "Category Trends" tab on mobile                               | Matrix renders. Category column is sticky on the left side                                                                  |
| 8.3  | Scroll the matrix horizontally                                      | Category names stay visible (stuck to left edge). Month columns scroll behind/to the right. Sticky column has no visual gap |
| 8.4  | Verify month cells are tappable on mobile                           | Tapping a cell navigates to the budget detail page for that month                                                           |
| 8.5  | Verify month range selector is accessible on mobile                 | 3mo/6mo/12mo buttons are visible and tappable. Switching range updates the matrix                                           |

---

### 9. Empty State

**Services under test:** BudgetCategoryTrendsPartial (EmptyState)

| Step | Action                                                                               | Expected Result                                                                          |
| ---- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| 9.1  | If possible, create a new user with no budget data and navigate to `/budget/history` | Monthly Totals shows "No budget history available" empty state                           |
| 9.2  | Click "Category Trends" tab                                                          | Shows empty state: "No category data available" with a message about needing budget data |

---

### 10. Accessibility

**Services under test:** All UI components

| Step | Action                                            | Expected Result                                                                                                    |
| ---- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 10.1 | Tab through the page using keyboard only          | Tab bar buttons are focusable. Tab key moves through: Monthly Totals tab, Category Trends tab, month range buttons |
| 10.2 | Press Enter/Space on "Category Trends" tab button | Tab activates and content switches (same as click)                                                                 |
| 10.3 | Check `aria-selected` on tab buttons              | Active tab has `aria-selected="true"`, inactive has `aria-selected="false"`                                        |
| 10.4 | Check `aria-pressed` on month range buttons       | Active range button has `aria-pressed="true"`, others have `aria-pressed="false"`                                  |
| 10.5 | Verify screen reader live region updates          | After switching to trends: live region announces "Showing trends for N budget categories"                          |
| 10.6 | Verify status dots have aria-labels               | Each colored status dot in a cell has an `aria-label` of "Over budget", "Near limit", or "On track"                |

---

## Summary Checklist

| #   | Area            | Key Assertion                                                               | Result  |
| --- | --------------- | --------------------------------------------------------------------------- | ------- |
| 1   | Regression      | Monthly Totals view is identical to before (no visual or functional change) | PASS    |
| 2   | Tab Switching   | Clicking tabs toggles between Monthly Totals and Category Trends correctly  | PASS    |
| 3   | Matrix Layout   | Categories as rows, months as columns, sorted by worst adherence            | PASS    |
| 4   | Status Colors   | Green (<80%), Yellow (80-99%), Red (>=100%) dots appear correctly           | PASS    |
| 5   | Cell Navigation | Clicking a cell navigates to `/budget?year=YYYY&month=M`                    | PASS    |
| 6   | Month Range     | 3/6/12 month selector changes the number of columns and re-fetches data     | PASS    |
| 7   | Loading States  | Loading spinner and opacity show during data fetch                          | PARTIAL |
| 8   | Mobile          | Horizontal scroll with sticky category column works on narrow viewports     | PASS    |
| 9   | Empty State     | Empty state message shown when no budget data exists                        | PARTIAL |
| 10  | Accessibility   | ARIA attributes, keyboard navigation, screen reader announcements work      | PASS    |

**Critical paths:** Steps 1 (regression), 2 (tab switching), 4 (status colors), and 6 (month range) are highest priority.

## Automated Test Coverage

| Suite                           | Tests  | File                                                  |
| ------------------------------- | ------ | ----------------------------------------------------- |
| BudgetService.getCategoryTrends | 3      | `src/services/budget.service.test.ts`                 |
| BudgetService (existing)        | ~15    | `src/services/budget.service.test.ts`                 |
| Budget history cache            | varies | `src/services/__tests__/budget-history-cache.test.ts` |

Full suite: Run `bun run test` — all tests must pass, 0 failures.
