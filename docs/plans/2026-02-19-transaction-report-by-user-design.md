# Transaction Report by User — Design

**Date:** 2026-02-19
**Issue:** [#185 — Family member tagging on transactions](https://github.com/ivankristianto/allowealth/issues/185)
**Status:** Approved

## Summary

Add user-based filtering and reporting to answer "who spent what?" without introducing a separate tagging system. Every transaction already records `created_by_user_id` — we wire up filtering and build a dedicated member spending report page.

## Scope

1. **Transactions list page** — add member filter to TransactionFiltersBar
2. **New `/reports/members` page** — overview of all members' spending + drill-down to per-user detail
3. **Spending limits** — deferred to a separate task

## Approach

Extend existing `ReportService` and `TransactionService` rather than creating new services. Reuse existing report partials for the drill-down view. Server-rendered HTML throughout (ADR 002).

## Data Layer

### TransactionFilters

Add `created_by_user_id?: string` to the existing `TransactionFilters` interface in `transaction.service.ts`. The service's `findAll()` and `count()` methods add a `WHERE created_by_user_id = ?` clause when this filter is present.

### ReportService

Extend `getMonthlyReport()` and `getYearlyReport()` to accept an optional `userId?: string` parameter. When provided, all aggregation queries add `AND created_by_user_id = ?`. Backward-compatible — existing callers are unaffected.

New method: `getMemberSummary(workspaceId, period, range, currency)` returns:

```typescript
interface MemberSummaryRow {
  userId: string;
  userName: string;
  totalIncome: string; // Decimal string
  totalExpenses: string; // Decimal string
  netSavings: string; // Decimal string
  transactionCount: number;
}
```

Aggregates transaction data grouped by `created_by_user_id` for all workspace members in the given period.

### API Endpoints

| Endpoint                           | Method   | Description                             |
| ---------------------------------- | -------- | --------------------------------------- |
| `GET /api/transactions`            | Modified | Accept `?user_id=` query param          |
| `GET /api/reports/members`         | New      | Returns member summary array for period |
| `GET /api/reports/members/:userId` | New      | Returns `ReportData` scoped to one user |

## Transactions Page — User Filter

Add a member dropdown to the existing `TransactionFiltersBar`, following the same pattern as the category dropdown:

```
[Expense ◉] [Income ○]   [All Categories ▾] [All Members ▾]  [🔍 Search...]  [↺]
```

- Populated from `workspace.getMembers()` (called in page frontmatter)
- Default: "All Members" (no filter applied)
- Selecting a member adds `?user_id=xxx` to the URL
- Composes with existing filters (type + category + member + search)
- Reset button clears user filter along with other filters

URL example: `/transactions?type=expense&user_id=abc123&month=2026-02`

### TransactionFiltersBar Props

Add to existing Props interface:

```typescript
userId?: string;
members?: Array<{ id: string; name: string }>;
showMemberFilter?: boolean;
```

## /reports/members Page — Overview

Shows all workspace members' spending at a glance:

```
┌─────────────────────────────────────────────────────────────┐
│  Member Spending Report                                     │
│  [Monthly ▾] [Feb 2026 ▾] [IDR ▾]                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────┬──────────┬──────────┬──────────┬───────────┐  │
│  │ Member  │ Income   │ Expenses │ Net      │ Txn Count │  │
│  ├─────────┼──────────┼──────────┼──────────┼───────────┤  │
│  │ Dad  →  │ Rp10.0M  │ Rp 3.5M  │ +Rp6.5M │ 24        │  │
│  │ Mom  →  │ Rp 5.0M  │ Rp 4.2M  │ +Rp0.8M │ 31        │  │
│  │ Kid  →  │ Rp   0   │ Rp 1.5M  │ -Rp1.5M │ 8         │  │
│  └─────────┴──────────┴──────────┴──────────┴───────────┘  │
│                                                             │
│  Total    │ Rp15.0M  │ Rp 9.2M  │ +Rp5.8M │ 63          │ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- Reuses `ReportSelector` for range/period/currency selection
- Same period navigation pattern as existing `/reports`
- Click a member row → drill-down view
- DaisyUI table, consistent with CategoryTable styling
- Server-rendered via `ReportService.getMemberSummary()`

## /reports/members Page — Drill-Down

Navigate to `/reports/members?user_id=xxx&range=monthly&period=2026-02`:

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Members    Dad's Spending Report                 │
│  [Monthly ▾] [Feb 2026 ▾] [IDR ▾]                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │  Income     │  │  Expenses  │  │  Net       │           │
│  │  Rp10.0M   │  │  Rp 3.5M   │  │  +Rp6.5M   │           │
│  └────────────┘  └────────────┘  └────────────┘           │
│                                                             │
│  [Donut Chart: Expense by Category]   [Category Table]     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

- Reuses existing report partials: `ReportSummaryCardsPartial`, `ReportChartsPartial`, `CategoryTablePartial`
- Calls `ReportService.getMonthlyReport(workspaceId, period, currency, userId)`
- Category drill-down modal works the same
- "Back to Members" link returns to overview

## Navigation & Discovery

- No new sidebar nav item — `/reports/members` naturally activates the "Reports" nav item via prefix matching
- Add a "Member Spending" link on the existing `/reports` page as a secondary entry point
- Mobile navigation: same behavior, no changes needed

## Out of Scope

- Spending limits per member (separate task)
- Member management/invitation (already exists in settings)
- Tagging system (unnecessary — `created_by_user_id` provides this)
