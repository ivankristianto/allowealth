# Recurring Forecast UX Redesign - Manual Test Plan

**Branch:** `recurring-ui-ux`
**Date:** 2026-03-08
**Design:** `docs/plans/2026-03-08-recurring-forecast-ux-design.md`

## Overview

Full redesign of `/recurring/forecast`: fixes a scroll-sync data integrity bug between data rows and totals, adds a cashflow chart, adds a date range picker, replaces the back button with breadcrumb navigation, and aligns the page with the design system.

## Prerequisites

- Local dev server running at `http://localhost:4321` (or appropriate worktree port — check with `lsof -i -P | grep LISTEN | grep 432`)
- Logged in as `demo@example.com` / `demo123456789`
- Seed data populated (`bun run aw seed`) — need at least 3-4 recurring templates across income and expense types, in multiple accounts, with at least one paused template
- At least one template in a non-liquid account type (e.g., mutual fund, bond) to verify label formatting

---

## Test Steps

### 1. Breadcrumb Navigation

**Component under test:** `Breadcrumb` atom, page header

| Step | Action                                                     | Expected Result                                                                      |
| ---- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 1.1  | Navigate to `/recurring/forecast`                          | Page loads. Breadcrumb shows "Recurring > Forecast". No back button with arrow icon. |
| 1.2  | Click "Recurring" in the breadcrumb                        | Navigates to `/recurring`.                                                           |
| 1.3  | "Forecast" text in breadcrumb is bold/semibold, not a link | Current page indicator, `aria-current="page"` present.                               |

---

### 2. Scroll Synchronization (Critical Fix)

> **Critical:** This fixes a data integrity risk where users could misread totals that belonged to different months than the data rows.

**Component under test:** Unified `<table>` with `<tbody>` + `<tfoot>` in single `overflow-x-auto` container

| Step | Action                                                 | Expected Result                                                                                                                                        |
| ---- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2.1  | Navigate to `/recurring/forecast` with default filters | Table shows template rows and totals section below in the same card. Only one horizontal scrollbar visible.                                            |
| 2.2  | Scroll the table horizontally to the right             | Both data rows AND totals (Income/Expense/Net) scroll together. Month columns in totals align with month columns in data rows at all scroll positions. |
| 2.3  | Scroll to the rightmost month column                   | Totals row shows the same month as the last visible data column. No desync.                                                                            |
| 2.4  | On mobile viewport (< 640px), scroll horizontally      | Same behavior: single scroll, totals stay aligned with data.                                                                                           |

---

### 3. Sticky Headers

> **Critical:** Important for mobile where vertical scrolling is common.

**Component under test:** `<thead>` with `sticky top-0`, template column with `sticky left-0`

| Step | Action                                                   | Expected Result                                                                                                                   |
| ---- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 3.1  | With many rows (10+), scroll vertically within the table | Month header row (Mar '26, Apr '26, etc.) stays pinned at the top of the scroll container.                                        |
| 3.2  | Scroll horizontally                                      | "Template" column stays pinned on the left. Template names remain visible regardless of horizontal scroll position.               |
| 3.3  | Scroll both vertically and horizontally                  | Top-left corner cell ("Template") stays visible — pinned both top and left. No visual overlap or z-index glitch with other cells. |

---

### 4. Account Type Labels

**Component under test:** `MultiSelectDropdown` with `getAccountTypeLabel()` formatting

| Step | Action                                      | Expected Result                                                                                                                                                           |
| ---- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1  | Click the "All Accounts" dropdown           | Dropdown opens. Group headers show human-readable labels: "Credit Card" (not "CREDIT_CARD"), "Mutual Fund" (not "MUTUAL_FUND"), "Bank Account" (not "BANK_ACCOUNT"), etc. |
| 4.2  | Search for "credit" in the account dropdown | Accounts under "Credit Card" group appear.                                                                                                                                |

---

### 5. Type Filter (Immediate Apply)

**Component under test:** `<select>` with `data-auto-submit`, client script

| Step | Action                             | Expected Result                                                                                                                                          |
| ---- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5.1  | Page loads with default filters    | Type dropdown shows "All". No "Filter" button anywhere on the page.                                                                                      |
| 5.2  | Change Type dropdown to "Income"   | Page reloads immediately. URL contains `?type=income`. Only income templates visible. Chart shows income only. Totals show income amounts (expense = 0). |
| 5.3  | Change Type dropdown to "Expense"  | Page reloads immediately. URL contains `?type=expense`. Only expense templates visible. Chart shows expense only.                                        |
| 5.4  | Change Type dropdown back to "All" | Page reloads. URL has no `type` param. Both income and expense templates visible.                                                                        |

---

### 6. Account Filter (Immediate Apply)

**Component under test:** `MultiSelectDropdown` with `filterChange` event, client script

| Step | Action                                            | Expected Result                                                                                                                           |
| ---- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 6.1  | Click "All Accounts" dropdown, select one account | Page reloads immediately. URL contains `?accounts=<id>`. Only templates for that account visible. Chart updates to reflect filtered data. |
| 6.2  | Select a second account                           | Page reloads. URL contains both account IDs comma-separated. Templates from both accounts visible.                                        |
| 6.3  | Click "Clear all" in the dropdown                 | Page reloads. URL has no `accounts` param. All templates visible.                                                                         |

---

### 7. Range Picker

**Component under test:** Segmented button group with `<a>` links

| Step | Action                                                           | Expected Result                                                                                                                      |
| ---- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| 7.1  | Page loads with default                                          | Range picker shows four options: 3M, 6M, 12M, 24M. "12M" is visually active (highlighted with bg-base-100 shadow).                   |
| 7.2  | Click "3M"                                                       | Page reloads. URL contains `?monthCount=3`. Table shows 3 month columns. Chart shows 3 bars. "3M" button is now active.              |
| 7.3  | Click "6M"                                                       | Page reloads. URL contains `?monthCount=6`. Table shows 6 month columns. Chart shows 6 bars.                                         |
| 7.4  | Click "24M"                                                      | Page reloads. URL contains `?monthCount=24`. Table shows 24 month columns. Chart shows 24 bars. Table requires horizontal scrolling. |
| 7.5  | Click "12M"                                                      | Page reloads. URL has NO `monthCount` param (12 is default, clean URL). 12 month columns visible.                                    |
| 7.6  | Combine range with type filter: set Type=Income, then click "6M" | Page reloads with both `?type=income&monthCount=6`. Both filters preserved.                                                          |

---

### 8. Cashflow Chart

**Component under test:** `ForecastCashflowChart.astro`, Chart.js mixed bar+line

| Step | Action                                                 | Expected Result                                                                                                                                         |
| ---- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8.1  | Navigate to `/recurring/forecast` with default filters | Chart card appears between filters and table. Title: "Cashflow Forecast".                                                                               |
| 8.2  | Inspect the chart visually                             | Stacked bars per month: green (Income) + pink/red (Expenses). A blue line overlaid showing Net cashflow. Legend at bottom: "Income", "Expenses", "Net". |
| 8.3  | Hover over a bar                                       | Tooltip shows month label, Income amount, Expenses amount, and Net amount — all formatted with currency symbol (e.g., "Rp5.000.000").                   |
| 8.4  | Filter to "Income" only                                | Chart shows only income bars (green). Expense bars disappear. Net line equals income line.                                                              |
| 8.5  | Switch range to "3M"                                   | Chart shows 3 bars instead of 12.                                                                                                                       |
| 8.6  | If no templates match filters (empty state)            | Chart card does not render. Only the empty state message appears below filters.                                                                         |

---

### 9. Paused Items Display

**Component under test:** Row styling with `opacity-50` + badge

| Step | Action                                                                         | Expected Result                                                                                                            |
| ---- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| 9.1  | Navigate to `/recurring/forecast` (ensure at least one paused template exists) | Paused templates appear in the table, visually dimmed (lower opacity). A "Paused" badge appears next to the template name. |
| 9.2  | No "Status" dropdown exists on the page                                        | Confirmed: only "All Accounts", "Type", and "Range" controls visible. No status filter.                                    |
| 9.3  | Check totals row values                                                        | Paused template amounts are NOT included in Income/Expense/Net totals. Active templates only contribute to totals.         |
| 9.4  | Verify chart data                                                              | Chart reflects only active template amounts (same as totals). Paused templates do not affect chart bars or net line.       |

---

### 10. Table Design System Compliance

**Component under test:** Table card, cell styling, fade edge

| Step | Action                                                       | Expected Result                                                                                                                              |
| ---- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 10.1 | Inspect table card                                           | Card has rounded corners (`rounded-3xl`), border, and shadow matching other cards in the app.                                                |
| 10.2 | Check row styling                                            | Alternating rows have subtle background tint (zebra striping). Rows highlight on hover.                                                      |
| 10.3 | Check cell padding                                           | Cells have comfortable padding — not cramped. Numbers are right-aligned with `tabular-nums` (digits align vertically across rows).           |
| 10.4 | Scroll horizontally so rightmost column is partially visible | A fade gradient appears at the right edge instead of hard-clipping numbers mid-character. No truncated values like "-Rp8.8C".                |
| 10.5 | Check income/expense coloring                                | Income amounts show in green (success color). Expense amounts show in red (error color) with negative sign. Net row uses default text color. |

---

### 11. Filter Combination and URL State

**Component under test:** URL param handling, `buildForecastFilters`

| Step | Action                                            | Expected Result                                                                                                            |
| ---- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 11.1 | Set Type=Expense, select 2 accounts, set Range=6M | URL: `/recurring/forecast?type=expense&accounts=id1,id2&monthCount=6`. Table, chart, and totals reflect all three filters. |
| 11.2 | Copy the URL and open in a new tab                | Same filtered view renders. Filters are pre-selected to match URL params.                                                  |
| 11.3 | Change one filter (e.g., Type back to All)        | Other filters (accounts, range) remain. URL updates correctly.                                                             |

---

### 12. Responsive / Mobile View

**Component under test:** Page layout, filter stacking

| Step | Action                                   | Expected Result                                                                                                        |
| ---- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 12.1 | Resize browser to mobile width (< 640px) | Filters wrap/stack vertically. Chart is full-width. Table card is full-width with horizontal scroll.                   |
| 12.2 | Scroll the table horizontally on mobile  | Template name column stays sticky-left. Month headers stay sticky-top. Single scrollbar for the entire table + totals. |
| 12.3 | Interact with account dropdown on mobile | Dropdown opens, searchable, checkboxes work. Auto-submits on selection.                                                |
| 12.4 | Tap range picker buttons on mobile       | Each button has minimum 32px height for touch targets. Navigation works on tap.                                        |

---

### 13. Dark Mode

**Component under test:** Theme-aware chart colors, DaisyUI semantic classes

| Step | Action                                                          | Expected Result                                                                                                            |
| ---- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 13.1 | Switch to dark mode (via app theme toggle or system preference) | Table background, text, and borders adapt to dark theme. Sticky columns match dark background (no white strips).           |
| 13.2 | Chart updates colors                                            | Tooltip background inverts (light tooltip on dark bg). Axis labels and legend text use light color. Grid lines are subtle. |
| 13.3 | Right-edge fade gradient                                        | Gradient fades from dark card background (not white).                                                                      |

---

## Summary Checklist

| #   | Area           | Key Assertion                                                            | Pass |
| --- | -------------- | ------------------------------------------------------------------------ | ---- |
| 1   | Breadcrumb     | "Recurring > Forecast" renders, "Recurring" links to `/recurring`        | [ ]  |
| 2   | Scroll sync    | Totals and data rows share one scrollbar, months always align            | [ ]  |
| 3   | Sticky headers | Month headers pin on vertical scroll, template column pins on horizontal | [ ]  |
| 4   | Account labels | Group headers show "Credit Card" not "CREDIT_CARD"                       | [ ]  |
| 5   | Type filter    | Immediate apply on change, no Filter button                              | [ ]  |
| 6   | Account filter | Immediate apply on selection change                                      | [ ]  |
| 7   | Range picker   | 3M/6M/12M/24M buttons work, 12M is default with clean URL                | [ ]  |
| 8   | Chart          | Stacked bars (income + expense) with net line, tooltips with currency    | [ ]  |
| 9   | Paused items   | Dimmed rows with badge, excluded from totals and chart                   | [ ]  |
| 10  | Table styling  | Zebra striping, hover, padding, right-edge fade, tabular-nums            | [ ]  |
| 11  | URL state      | All filters round-trip via URL params                                    | [ ]  |
| 12  | Mobile         | Filters stack, sticky columns/headers work, touch targets adequate       | [ ]  |
| 13  | Dark mode      | Chart, table, and fade gradient adapt to dark theme                      | [ ]  |

**Critical paths:** Steps 2 (scroll sync) and 3 (sticky headers) are highest priority.

## Automated Test Coverage

| Suite                 | Tests | File                                               |
| --------------------- | ----- | -------------------------------------------------- |
| Forecast filter utils | 5     | `src/lib/utils/recurring-forecast-filters.test.ts` |
| Forecast service      | ~10   | `src/services/recurring-forecast.service.test.ts`  |
| Forecast API          | ~5    | `src/__tests__/api/forecast.test.ts`               |

Full suite: Run `bun test` to verify all passing before manual QA.
