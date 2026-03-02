# Database Performance Hardening - Manual Test Plan

**Branch:** `db-performance-improvement`
**Date:** 2026-03-01
**Plan:** `docs/plans/2026-03-01-db-performance-hardening.md`

## Overview

This plan optimizes read paths (reports, transactions, recurring, history) by replacing N+1 loops and unbounded fetches with set-based SQL aggregates, hardens write paths (bulk ops, cache invalidation), and adds composite indexes. Tests verify that all user-facing pages display correct data after optimizations, with no regressions in totals, counts, or pagination behavior.

## Prerequisites

- Local dev server running at `http://localhost:4321`
- Logged in as test user with seeded data (multiple months of transactions, recurring templates, multiple accounts)
- At least 2-3 months of transaction data across multiple categories
- At least 3-5 recurring templates (mix of active, paused, completed)
- Multiple accounts with history entries

---

## Test Steps

### 1. Reports Page - Trend Charts

**Services under test:** ReportService (`getYearlyReport`, `getTrendData`)

> **Critical:** Trend aggregation rewritten from per-month loop to single grouped SQL query.

| Step | Action                                                                                         | Expected Result                                                                |
| ---- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1.1  | Navigate to `/reports`                                                                         | Reports page loads without errors, trend chart renders                         |
| 1.2  | Select current year from the year dropdown                                                     | Trend chart updates showing 12 months of data, amounts match previous behavior |
| 1.3  | Toggle between expense/income views if available                                               | Chart data updates correctly, no blank months or missing data                  |
| 1.4  | Compare a specific month's bar/point value against `/transactions` page filtered to that month | Trend chart amount matches the transaction list summary for that month         |

### 2. Reports Page - Recurring vs One-Time Breakdown

**Services under test:** ReportService (recurring breakdown aggregation)

> **Critical:** Recurring breakdown moved from in-memory materialization to set-based SQL.

| Step | Action                                                               | Expected Result                                                     |
| ---- | -------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 2.1  | Navigate to `/reports` and view the expense breakdown section        | Recurring and one-time totals display correctly                     |
| 2.2  | Verify recurring total + one-time total equals overall expense total | Totals add up correctly (no missing or double-counted transactions) |
| 2.3  | Check recurring-by-category breakdown if visible                     | Category amounts sum to the recurring total                         |

### 3. Reports Page - Category Drilldown

**Services under test:** ReportService (`getCategoryDrilldown`), API route `/api/reports/category-drilldown`

> **Critical:** Drilldown now returns pagination contract (`total`, `limit`, `offset`, `hasMore`).

| Step | Action                                                                     | Expected Result                                                                     |
| ---- | -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 3.1  | On `/reports`, click a category to open drilldown                          | Drilldown panel/modal opens showing transactions for that category                  |
| 3.2  | Verify transactions listed belong to the selected category                 | All shown transactions have the correct category                                    |
| 3.3  | If more than 100 transactions exist, scroll or paginate                    | Additional transactions load correctly, no duplicates                               |
| 3.4  | Open browser DevTools Network tab, trigger drilldown, inspect API response | Response JSON includes `transactions`, `total`, `limit`, `offset`, `hasMore` fields |

### 4. Transactions Page - Month Summary

**Services under test:** TransactionService (`getMonthSummary`), API route `/api/transactions`

> **Critical:** Summary path changed from `findAll(limit=10000)` to SQL conditional aggregate.

| Step | Action                                                                        | Expected Result                                                                    |
| ---- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 4.1  | Navigate to `/transactions`                                                   | Transaction list loads, month summary stats display (total expense, income, count) |
| 4.2  | Note the expense total, income total, and transaction count for current month | Values are present and non-zero (with seeded data)                                 |
| 4.3  | Switch to a different month using the date selector                           | Summary updates to reflect that month's data                                       |
| 4.4  | Manually count a few transactions and verify expense total direction          | Expenses shown as positive spend values (not negative), income positive            |
| 4.5  | Switch to a month with no transactions                                        | Summary shows zero values gracefully, no errors                                    |

### 5. Recurring Templates - List and Detail

**Services under test:** RecurringTemplateService (`findAll`, `findById`)

| Step | Action                                                               | Expected Result                                                         |
| ---- | -------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 5.1  | Navigate to `/recurring`                                             | Recurring templates list loads with all templates visible               |
| 5.2  | Verify each template shows occurrence metadata (next due, status)    | Occurrence info displays without delay or missing data                  |
| 5.3  | Click on a specific recurring template to view details               | Detail view loads showing template info and recent occurrences          |
| 5.4  | Verify occurrence list is bounded (not showing thousands of entries) | Occurrences list is reasonable length (latest/recent, not full history) |

### 6. Recurring Stats

**Services under test:** RecurringOccurrenceService (aggregate stats), API route `/api/recurring/stats`

> **Critical:** Both JSON and HTML paths must use optimized aggregate-backed data.

| Step | Action                                                                       | Expected Result                                                 |
| ---- | ---------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 6.1  | Navigate to `/recurring` and check stats summary (upcoming count, total due) | Stats display correct counts matching visible template statuses |
| 6.2  | In DevTools Network, inspect `/api/recurring/stats` response                 | Response loads quickly, contains expected stat fields           |
| 6.3  | Mark a pending occurrence as paid, then reload stats                         | Stats update to reflect one fewer pending item                  |

### 7. Transaction History

**Services under test:** TransactionService (history), API route `/api/transactions/[id]/history`

| Step | Action                                                           | Expected Result                                         |
| ---- | ---------------------------------------------------------------- | ------------------------------------------------------- |
| 7.1  | Navigate to `/transactions`, click a transaction to view details | Transaction detail view loads                           |
| 7.2  | Edit the transaction (change amount or category), save           | Edit saves successfully                                 |
| 7.3  | View transaction history/changelog if available                  | History shows the edit with correct before/after values |

### 8. Account History

**Services under test:** AccountService (history), API route `/api/accounts/[id]/history`

| Step | Action                                                                     | Expected Result                                                        |
| ---- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 8.1  | Navigate to `/accounts/history`                                            | Account history page loads with entries                                |
| 8.2  | Click on a specific account to view its history at `/accounts/history/:id` | History entries display with dates and balance snapshots               |
| 8.3  | Verify history is bounded (not loading unbounded entries)                  | Page loads quickly, shows reasonable number of entries (not thousands) |

### 9. Bulk Transaction Operations

**Services under test:** TransactionService (`updateInternal`/`deleteInternal` with `skipInvalidate`)

> **Critical:** Bulk operations now defer cache invalidation to one final call.

| Step | Action                                                                   | Expected Result                                                |
| ---- | ------------------------------------------------------------------------ | -------------------------------------------------------------- |
| 9.1  | Navigate to `/transactions`, select multiple transactions via checkboxes | Selection UI works correctly                                   |
| 9.2  | Perform a bulk category change on 3+ transactions                        | All selected transactions update to new category               |
| 9.3  | Reload the page                                                          | Changes persist after reload (cache was properly invalidated)  |
| 9.4  | Select multiple transactions and bulk delete                             | Transactions removed from list                                 |
| 9.5  | Navigate to `/reports`, verify totals reflect the deletions              | Report totals update correctly (deleted transactions excluded) |

### 10. API Key Management

**Services under test:** ApiKeyService (`validateCached`, `revoke`)

| Step | Action                                               | Expected Result                         |
| ---- | ---------------------------------------------------- | --------------------------------------- |
| 10.1 | Navigate to API key settings page (user settings)    | Existing API keys listed                |
| 10.2 | Create a new API key                                 | Key created, shown in list              |
| 10.3 | Revoke the API key                                   | Key marked as revoked, no longer usable |
| 10.4 | Attempt to use the revoked key via API (if testable) | Request rejected with auth error        |

### 11. Cross-Page Data Consistency After Index Changes

**Services under test:** All services (verifying indexes don't break query results)

| Step | Action                                                          | Expected Result                                           |
| ---- | --------------------------------------------------------------- | --------------------------------------------------------- |
| 11.1 | Navigate to `/accounts`, note total balance across all accounts | Balance displayed correctly                               |
| 11.2 | Navigate to `/transactions`, check current month expense total  | Expense total matches what individual transactions sum to |
| 11.3 | Navigate to `/reports`, check yearly total                      | Yearly total consistent with monthly transaction data     |
| 11.4 | Navigate to `/recurring`, verify template count and stats       | All templates present, stats match visible data           |
| 11.5 | Navigate to `/accounts/history`, verify entries load            | History entries present, no empty or broken pages         |

---

## Summary Checklist

| #   | Area                   | Key Assertion                                                        | Pass |
| --- | ---------------------- | -------------------------------------------------------------------- | ---- |
| 1   | Report Trends          | Trend chart shows correct monthly amounts matching transaction data  | [ ]  |
| 2   | Recurring Breakdown    | Recurring + one-time totals equal overall expense total              | [ ]  |
| 3   | Category Drilldown     | Drilldown shows correct transactions with pagination contract in API | [ ]  |
| 4   | Transaction Summary    | Month summary totals match (expenses positive, income positive)      | [ ]  |
| 5   | Recurring List/Detail  | Templates load with bounded occurrence data                          | [ ]  |
| 6   | Recurring Stats        | Stats reflect correct pending/upcoming counts                        | [ ]  |
| 7   | Transaction History    | Edit history displays correct before/after values                    | [ ]  |
| 8   | Account History        | History loads bounded entries quickly                                | [ ]  |
| 9   | Bulk Operations        | Bulk edit/delete persists after reload, reports update               | [ ]  |
| 10  | API Key Cache          | Revoked keys rejected, cache invalidated correctly                   | [ ]  |
| 11  | Cross-Page Consistency | Totals consistent across accounts, transactions, and reports pages   | [ ]  |

**Critical paths:** Steps 1, 2, 3, 4, 6, and 9 are highest priority (core query rewrites and cache changes).

## Automated Test Coverage

| Suite                           | Tests | File                                                                     |
| ------------------------------- | ----- | ------------------------------------------------------------------------ |
| Report trend query optimization | TBD   | `src/services/__tests__/report-trend-query-optimization.test.ts`         |
| Transaction summary aggregation | TBD   | `src/services/__tests__/transaction-summary-aggregation.test.ts`         |
| Recurring stats aggregation     | TBD   | `src/services/__tests__/recurring-stats-aggregation.test.ts`             |
| Transaction summary sign parity | TBD   | `src/services/__tests__/transaction-summary-sign-parity.test.ts`         |
| Category drilldown contract     | TBD   | `src/services/__tests__/category-drilldown-contract.test.ts`             |
| Recurring template fan-out      | TBD   | `src/services/__tests__/recurring-template-fanout-optimization.test.ts`  |
| History endpoints bounds        | TBD   | `src/services/__tests__/history-endpoints-bounds.test.ts`                |
| Transaction filter builder      | TBD   | `src/services/__tests__/transaction-filter-builder.test.ts`              |
| Transaction bulk invalidation   | TBD   | `src/services/__tests__/transaction-bulk-invalidation.test.ts`           |
| API key cache                   | TBD   | `src/services/api-key.service.cache.test.ts`                             |
| Report recurring breakdown      | TBD   | `src/services/__tests__/report-recurring-breakdown-optimization.test.ts` |

Full suite: **TBD tests** (all test files created as part of the implementation plan).
