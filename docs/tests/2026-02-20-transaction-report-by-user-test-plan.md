# Transaction Report by User — Manual Test Plan

**Branch:** `transaction-report-by-uer`
**Date:** 2026-02-20
**Issue:** [#185 — Family member tagging on transactions](https://github.com/ivankristianto/allowealth/issues/185)

## Overview

This feature adds user-based transaction filtering and a `/reports/members` page showing per-member spending with drill-down. Tests cover the member dropdown on the transactions page, the new member summary overview, the per-member drill-down report, navigation links, and filter composition across the full stack.

## Prerequisites

- Dev server running: `bun run dev` → `http://transaction-report-by-uer.expenses.local:4322`
- Database seeded: `bun run db:reset` (creates schema + seed data)
- **Admin login:** `demo@example.com` / `demo123456789`
- **Member login:** `member@example.com` / `demo123456789`
- Seed data creates a "Demo Family" workspace with both users and 3 months of transactions (current + 2 previous)
- Admin user (Dad): ~570+ transactions (income, expenses, transfers)
- Member user (Mom): ~48 transactions (income from Mom Salary/Side Business, expenses across groceries, dining, kids, personal care, etc.)
- Both users have transactions in all 3 seeded months, enabling the member filter dropdown and member spending report

---

## Test Steps

### 1. Transactions Page — Member Dropdown Visibility

**Services under test:** TransactionService (`findAll`), WorkspaceService (`getMembers`)

| Step | Action                                                     | Expected Result                                                                                                                                                           |
| ---- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1  | Log in as `demo@example.com`, navigate to `/transactions`  | Transactions page loads with the filter bar visible                                                                                                                       |
| 1.2  | Observe the filter bar (Row 2: type toggle area)           | A "Members" dropdown button appears with a Users icon and label "All Members", positioned after the category dropdown                                                     |
| 1.3  | Verify the dropdown shows only when multiple members exist | The dropdown is visible because the workspace has 2 members (Demo User + Demo Member). If the workspace had only 1 member with transactions, the dropdown would be hidden |

---

### 2. Transactions Page — Member Filter Selection

**Services under test:** TransactionService (`findAll`, `count`)

> **Critical:** Core filtering feature — must correctly scope transactions to selected member.

| Step | Action                                                       | Expected Result                                                                                                                                                                             |
| ---- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1  | On `/transactions`, click the "All Members" dropdown         | A dropdown menu opens listing "All Members" (active/highlighted) and workspace member names (e.g., "Demo User", "Demo Member")                                                              |
| 2.2  | Click on "Demo User" in the dropdown                         | Page reloads. URL updates to include `?user_id=<demo-user-id>`. The dropdown label changes from "All Members" to "Demo User". Transaction list shows only transactions created by Demo User |
| 2.3  | Note the transaction count displayed                         | Count should reflect only Demo User's transactions (not the full workspace total)                                                                                                           |
| 2.4  | Click the "All Members" dropdown again, select "Demo Member" | Page reloads with `?user_id=<member-id>`. Since the member user created no transactions in seed data, the transaction list should be empty or show a "no transactions" message              |
| 2.5  | Click the "All Members" dropdown, select "All Members"       | Page reloads. `user_id` param is removed from URL. Dropdown label returns to "All Members". All workspace transactions are shown again                                                      |

---

### 3. Transactions Page — Member Filter Composition

**Services under test:** TransactionService (`findAll`)

> **Critical:** Filters must compose correctly — member + type + category + search + month.

| Step | Action                                                                                               | Expected Result                                                                                                                 |
| ---- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 3.1  | On `/transactions`, select a member from the dropdown (e.g., "Demo User")                            | Transaction list filtered to that member                                                                                        |
| 3.2  | Switch type filter from "Expenses" to "Income"                                                       | Transaction list shows only income transactions for that member. URL has both `user_id=xxx` and `type=income`                   |
| 3.3  | Open the category dropdown and select a specific category (e.g., a category with known transactions) | Transaction list filters further to that member + income + category. URL has `user_id`, `type`, and `category_ids` params       |
| 3.4  | Type a search term in the search input that matches a transaction description                        | Transaction list filters to member + type + category + search. All 4 filters compose correctly                                  |
| 3.5  | Change the month selector to a previous month                                                        | Transactions update to show the filtered results for that month. All filter params including `user_id` are preserved in the URL |

---

### 4. Transactions Page — Member Filter Reset

**Services under test:** TransactionFiltersBar (client-side)

| Step | Action                                                          | Expected Result                                                                                                                                                                                      |
| ---- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1  | On `/transactions`, select a member and change type to "Income" | Both filters are active. The "Reset" button should be visible                                                                                                                                        |
| 4.2  | Click the "Reset" button                                        | Page reloads to `/transactions` with default filters (Expenses, All Categories, All Members, current month). The `user_id` param is removed from URL. Member dropdown label returns to "All Members" |

---

### 5. Reports Page — Member Spending Link

**Services under test:** Navigation discovery

| Step | Action                                                                               | Expected Result                                                                                    |
| ---- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| 5.1  | Navigate to `/reports`                                                               | Reports page loads with the standard financial report                                              |
| 5.2  | Look for a "Member Spending" link/button in the header area near the period selector | A ghost-style button with a Users icon and text "Member Spending" is visible                       |
| 5.3  | Click the "Member Spending" link                                                     | Browser navigates to `/reports/members`. The sidebar "Reports" nav item remains active/highlighted |

---

### 6. Member Spending Overview — Table Display

**Services under test:** ReportService (`getMemberSummary`)

> **Critical:** New page — must render member summary data correctly.

| Step | Action                                      | Expected Result                                                                                                                                                                                               |
| ---- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6.1  | Navigate to `/reports/members`              | Page loads with title "Member Spending", subtitle "Per-member spending overview", and a back arrow linking to `/reports`                                                                                      |
| 6.2  | Verify the period selector                  | A ReportSelector is shown with Monthly/Yearly toggle and period dropdown. Default: Monthly, current month                                                                                                     |
| 6.3  | Verify the member summary table headers     | Table has columns: Member, Income, Expenses, Net, Transactions, and a chevron column                                                                                                                          |
| 6.4  | Verify table rows                           | Each workspace member with transactions appears as a row. "Demo User" row should show non-zero income, expenses, net savings, and transaction count. Values are formatted as currency (e.g., "Rp 15,000,000") |
| 6.5  | Verify the Net column coloring              | Positive net values show in green (text-success). Negative net values show in red (text-error)                                                                                                                |
| 6.6  | Verify the Total footer row                 | A bold "Total" row at the bottom sums all members' income, expenses, net, and transaction counts. Total income + expenses should equal the sum of individual rows                                             |
| 6.7  | Verify each row has a clickable chevron (→) | Each row has a ChevronRight icon on the right side, and the member name is a clickable link                                                                                                                   |

---

### 7. Member Spending Overview — Period Navigation

**Services under test:** ReportService (`getMemberSummary`)

| Step | Action                                               | Expected Result                                                                                                                                                                                   |
| ---- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7.1  | On `/reports/members`, note the current month's data | Table shows member data for the current month                                                                                                                                                     |
| 7.2  | Use the period dropdown to select the previous month | Page reloads with `?period=YYYY-MM` for the previous month. Table updates with that month's data. Totals change accordingly                                                                       |
| 7.3  | Switch the range toggle from "Monthly" to "Yearly"   | Page reloads with `?range=yearly&period=YYYY`. Table shows full-year aggregated data for each member. Income, expenses, and transaction counts should be significantly larger than a single month |
| 7.4  | Switch back to "Monthly"                             | Page reloads with monthly view. Period reverts to a monthly format                                                                                                                                |

---

### 8. Member Spending Overview — Empty State

**Services under test:** ReportService (`getMemberSummary`)

| Step | Action                                                                                                                              | Expected Result                                                                                                                |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| 8.1  | On `/reports/members`, use the period dropdown to select a month far in the past (e.g., 12 months ago if seed only covers 3 months) | Table shows an empty state with a Users icon and message "No transactions found for this period". No Total footer row is shown |

---

### 9. Member Spending — Drill-Down View

**Services under test:** ReportService (`getMonthlyReport` with userId)

> **Critical:** Drill-down must show member-scoped report data using existing report partials.

| Step | Action                                                                                 | Expected Result                                                                                                                                                                   |
| ---- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 9.1  | On `/reports/members` (overview), click on "Demo User" member name or the chevron icon | Page navigates to `/reports/members?user_id=<id>&range=monthly&period=YYYY-MM&currency=IDR`. URL contains the `user_id` parameter                                                 |
| 9.2  | Verify drill-down header                                                               | Title shows "[Member Name]'s Spending" (e.g., "Demo User's Spending"). Subtitle shows "Detailed spending report". A back arrow button is visible on the left                      |
| 9.3  | Verify summary cards                                                                   | Three summary cards display: Income, Expenses, and Net Savings — scoped to this member only. Values should be less than or equal to the workspace totals on the main reports page |
| 9.4  | Verify expense by category donut chart                                                 | A donut chart shows the expense breakdown by category for this member                                                                                                             |
| 9.5  | Verify trend chart                                                                     | A trend chart shows trailing 3 months of income vs expenses for this member                                                                                                       |
| 9.6  | Verify category intelligence table                                                     | A table lists categories with spent amounts, budget limits, icons, and colors — all scoped to this member's transactions                                                          |
| 9.7  | Click the back arrow (←)                                                               | Navigates back to `/reports/members?range=monthly&period=YYYY-MM&currency=IDR` (overview). The `user_id` param is removed                                                         |

---

### 10. Member Drill-Down — Period Navigation Preserves User

**Services under test:** ReportService (`getMonthlyReport`, `getYearlyReport`)

| Step | Action                                                                 | Expected Result                                                                                                           |
| ---- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| 10.1 | On drill-down view for a member, change the period to a previous month | Page reloads. URL still contains `user_id` for the same member. Report data updates to the selected month for that member |
| 10.2 | Switch range from Monthly to Yearly                                    | Page reloads with `range=yearly`. URL still contains `user_id`. Report shows yearly aggregated data for the member        |
| 10.3 | Click the back arrow                                                   | Returns to the member overview. The overview table reflects the same range/period you just selected                       |

---

### 11. Member Drill-Down — Category Drill-Down Modal

**Services under test:** ReportService (category drill-down)

| Step | Action                                                   | Expected Result                                                                                   |
| ---- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 11.1 | On a member's drill-down view, locate the category table | Category table shows categories with spending amounts for this member                             |
| 11.2 | Click on a category row that has transactions            | A drill-down modal opens showing individual transactions for that category, scoped to this member |
| 11.3 | Close the modal                                          | Modal closes, returning to the member's drill-down report view                                    |

---

### 12. API Endpoint — GET /api/transactions with user_id

**Services under test:** Transaction API, TransactionService

| Step | Action                                                                                          | Expected Result                                                                                 |
| ---- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 12.1 | In a new browser tab, navigate to `/api/transactions?user_id=<valid-user-id>` (while logged in) | JSON response returns only transactions where `created_by_user_id` matches the provided user_id |
| 12.2 | Navigate to `/api/transactions` (no user_id)                                                    | JSON response returns all workspace transactions (no user filtering)                            |
| 12.3 | Navigate to `/api/transactions?user_id=nonexistent-id`                                          | JSON response returns an empty transactions array (no error, just no matches)                   |

---

### 13. API Endpoint — GET /api/reports/members

**Services under test:** Member Summary API, ReportService (`getMemberSummary`)

| Step | Action                                                                       | Expected Result                                                                                                                                              |
| ---- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 13.1 | Navigate to `/api/reports/members?range=monthly&period=2026-02&currency=IDR` | JSON response returns an array of member summary objects with fields: `userId`, `userName`, `totalIncome`, `totalExpenses`, `netSavings`, `transactionCount` |
| 13.2 | Navigate to `/api/reports/members?range=yearly&period=2026&currency=IDR`     | JSON response returns yearly aggregated member summaries                                                                                                     |
| 13.3 | Navigate to `/api/reports/members` (missing required params)                 | JSON error response with 400 status and error code `INVALID_RANGE`                                                                                           |
| 13.4 | Navigate to `/api/reports/members?range=monthly` (missing period)            | JSON error response with 400 status and error code `MISSING_PERIOD`                                                                                          |

---

### 14. API Endpoint — GET /api/reports with user_id

**Services under test:** Reports API, ReportService (`getMonthlyReport`)

| Step | Action                                                                                       | Expected Result                                                                                           |
| ---- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 14.1 | Navigate to `/api/reports?range=monthly&period=2026-02&currency=IDR&user_id=<valid-user-id>` | JSON response returns a full ReportData object scoped to that user (income, expenses, category breakdown) |
| 14.2 | Navigate to `/api/reports?range=monthly&period=2026-02&currency=IDR` (no user_id)            | JSON response returns the full workspace report (same as existing behavior)                               |

---

### 15. Navigation & Sidebar

**Services under test:** Layout, routing

| Step | Action                                                                                                      | Expected Result                                                                      |
| ---- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 15.1 | Navigate to `/reports/members`                                                                              | The sidebar "Reports" nav item is highlighted/active (prefix matching on `/reports`) |
| 15.2 | Navigate to `/reports/members?user_id=xxx` (drill-down)                                                     | The sidebar "Reports" nav item remains highlighted                                   |
| 15.3 | Use browser back/forward buttons between `/reports`, `/reports/members`, and `/reports/members?user_id=xxx` | Navigation works correctly, pages render without errors                              |

---

### 16. Cross-Browser & Mobile

**Services under test:** Responsive layout, DaisyUI components

| Step | Action                                                                      | Expected Result                                                                                      |
| ---- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 16.1 | On `/transactions` with a mobile viewport (< 640px), observe the filter bar | Member dropdown renders properly, doesn't overflow or overlap other filter elements                  |
| 16.2 | On mobile, tap the member dropdown                                          | Dropdown menu opens and is usable (items are tappable, menu doesn't go off-screen)                   |
| 16.3 | On `/reports/members` with mobile viewport                                  | Member summary table is horizontally scrollable if needed. All columns are readable                  |
| 16.4 | On member drill-down (mobile)                                               | Summary cards stack vertically. Charts resize to viewport width. Category table scrolls horizontally |

---

### 17. Authentication Guard

**Services under test:** Auth middleware

| Step | Action                                                                            | Expected Result                     |
| ---- | --------------------------------------------------------------------------------- | ----------------------------------- |
| 17.1 | Log out, then navigate directly to `/reports/members`                             | Redirected to `/login`              |
| 17.2 | While logged out, navigate to `/api/reports/members?range=monthly&period=2026-02` | JSON response with 401 Unauthorized |

---

## Summary Checklist

| #   | Area                         | Key Assertion                                                     | Pass                                                                                            |
| --- | ---------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1   | Transactions filter bar      | Member dropdown appears with workspace members                    | [x] PASS                                                                                        |
| 2   | Transactions filtering       | Selecting a member scopes transactions to that user               | [x] PASS                                                                                        |
| 3   | Filter composition           | Member + type + category + search + month all compose correctly   | [x] PASS                                                                                        |
| 4   | Filter reset                 | Reset button clears member filter and all other filters           | [x] PASS                                                                                        |
| 5   | Reports page link            | "Member Spending" link navigates to `/reports/members`            | [x] PASS                                                                                        |
| 6   | Member overview table        | Shows correct income, expenses, net, count per member with totals | [x] PASS                                                                                        |
| 7   | Period navigation (overview) | Monthly/yearly toggle and period selector update table data       | [FAIL] FAIL — Monthly/Yearly toggle buttons do not navigate on click; buttons dispatch no event |
| 8   | Empty state                  | No-data month shows empty state with icon and message             | [ ]                                                                                             |
| 9   | Drill-down view              | Member's report shows summary cards, charts, category table       | [ ]                                                                                             |
| 10  | Drill-down period nav        | Changing period preserves user_id in URL and updates data         | [ ]                                                                                             |
| 11  | Category modal               | Category drill-down modal works within member drill-down          | [ ]                                                                                             |
| 12  | API: transactions user_id    | `/api/transactions?user_id=` returns filtered transactions        | [ ]                                                                                             |
| 13  | API: reports/members         | `/api/reports/members` returns member summary array               | [ ]                                                                                             |
| 14  | API: reports user_id         | `/api/reports?user_id=` returns user-scoped report                | [ ]                                                                                             |
| 15  | Sidebar navigation           | "Reports" stays active across all member report pages             | [ ]                                                                                             |
| 16  | Mobile responsiveness        | All new UI elements work on mobile viewports                      | [ ]                                                                                             |
| 17  | Auth guard                   | Unauthenticated access redirects to login or returns 401          | [ ]                                                                                             |

**Critical paths:** Steps 2, 3, 6, and 9 are highest priority — they test the core user-facing functionality.

## Automated Test Coverage

| Suite                                          | Tests | File                                             |
| ---------------------------------------------- | ----- | ------------------------------------------------ |
| TransactionService (created_by_user_id filter) | 1     | `src/services/transaction.service.test.ts`       |
| ReportService (userId filter)                  | 1     | `src/services/report.service.test.ts`            |
| ReportService (getMemberSummary)               | 1     | `src/services/report.service.test.ts`            |
| TransactionFiltersStore (user_id)              | 1     | `src/lib/stores/transactionFiltersStore.test.ts` |

Full suite: `bun run test` — **72 tests, 0 failures**.
