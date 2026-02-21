# Budget Category Trends Design

**Date:** 2026-02-21
**Issue:** [#265](https://github.com/ivankristianto/allowealth/issues/265)
**Status:** Approved

## Problem

The budget history page shows monthly totals (rows = months, columns = aggregates). To spot whether a specific category is trending toward overspend, users must navigate month-by-month and build a mental picture. The inverse view — rows as categories, columns as months — enables instant horizontal scanning of per-category trends.

## Design Decisions

| Decision       | Choice                                                | Rationale                                                   |
| -------------- | ----------------------------------------------------- | ----------------------------------------------------------- |
| View switching | Tab bar ("Monthly Totals" / "Category Trends")        | Discoverable, consistent with YearToggle pattern            |
| Cell content   | Spent amount + colored status dot                     | Compact and scannable; color tells the story                |
| Mobile layout  | Horizontal scroll with sticky category column         | Preserves the spatial comparison that is the view's purpose |
| Default sort   | Worst average adherence first                         | Surfaces problem categories without user interaction        |
| Month range    | 3 / 6 / 12 segmented selector, default 6              | User-selectable per acceptance criteria                     |
| Data layer     | Reuse cached `getMonthlyOverview()`, pivot in service | Zero schema changes, leverages existing cache               |

## Data Flow

```
Tab switch → client fetches /api/budget/category-trends?months=6&currency=IDR&_render=html
  → BudgetService.getCategoryTrends(workspaceId, currency, 6)
    → for each month: getMonthlyOverview() (cached 1hr)
    → pivot: group categories across months
    → sort by avg percentage_used descending
  → BudgetCategoryTrendsPartial.astro renders HTML fragment
  → client injects into #budget-history-table-body
```

## New Types

```typescript
interface CategoryMonthData {
  month: number;
  year: number;
  month_name: string;
  spent_amount: string;
  budget_amount: string;
  percentage_used: number;
  status: 'ok' | 'warning' | 'exceeded';
}

interface CategoryTrendRow {
  category_id: string;
  category_name: string;
  category_icon: string;
  category_color: string;
  avg_percentage_used: number;
  months: CategoryMonthData[];
}

interface CategoryTrendData {
  months: { month: number; year: number; month_name: string }[];
  categories: CategoryTrendRow[];
}
```

## UI Layout

### Desktop (≥ 3xl container)

```
┌──────────────────────────────────────────────────────────┐
│ Budget History                                           │
│ Compare your budget performance over time                │
│                                                          │
│ ┌────────────────┬─────────────────┐  ┌───┬───┬────┐    │
│ │ Monthly Totals │ Category Trends │  │ 3 │ 6 │ 12 │    │
│ └────────────────┴─────────────────┘  └───┴───┴────┘    │
│                                                          │
│ ┌────────────┬───────┬───────┬───────┬───────┬───────┐  │
│ │ Category   │ Oct   │ Nov   │ Dec   │ Jan   │ Feb   │  │
│ │            │ 2025  │ 2025  │ 2025  │ 2026  │ 2026  │  │
│ ├────────────┼───────┼───────┼───────┼───────┼───────┤  │
│ │ 🍽 Dining  │ ● 850k│ ● 920k│ ● 780k│ ● 950k│ ● 980k│ │
│ │ avg: 112%  │       │       │       │       │       │  │
│ ├────────────┼───────┼───────┼───────┼───────┼───────┤  │
│ │ 🛒 Grocery │ ● 1.2M│ ● 1.1M│ ● 1.4M│ ● 1.3M│ ● 1.2M│ │
│ │ avg: 78%   │       │       │       │       │       │  │
│ └────────────┴───────┴───────┴───────┴───────┴───────┘  │
│                                                          │
│ ● <80%  ● 80–99%  ● ≥100%                               │
└──────────────────────────────────────────────────────────┘
```

### Mobile (< 3xl container)

- Table scrolls horizontally
- Category column sticky-left (~120px) with subtle right shadow
- Month columns ~80px each
- Cells link to `/budget?year=YYYY&month=M`

## Files to Create/Modify

| File                                                        | Action | Description                                  |
| ----------------------------------------------------------- | ------ | -------------------------------------------- |
| `src/services/budget.service.ts`                            | Modify | Add `getCategoryTrends()` method             |
| `src/pages/api/budget/category-trends.ts`                   | Create | New API endpoint with `_render=html` support |
| `src/components/partials/BudgetCategoryTrendsPartial.astro` | Create | HTML partial for the trends matrix           |
| `src/components/molecules/ViewToggle.astro`                 | Create | Tab bar component                            |
| `src/components/molecules/MonthRangeSelector.astro`         | Create | 3/6/12 segmented selector                    |
| `src/pages/budget/history.astro`                            | Modify | Add tab bar, conditional rendering           |
| `src/components/organisms/BudgetHistoryPage.client.ts`      | Modify | Handle tab switching and range changes       |
| `src/lib/stores/budgetHistoryStore.ts`                      | Modify | Add view mode and month range state          |
| `src/lib/api/budgetHistoryApiClient.ts`                     | Modify | Add `fetchCategoryTrendsHtml()`              |

## Unchanged

- Existing Monthly Totals view and all its components
- `MonthlyBudgetHistory` interface
- `BudgetHistoryTablePartial.astro`
- All existing API endpoints

## Out of Scope

- Per-transaction drill-down from trend cells (link to budget month view is sufficient)
- Budget amount editing from within the trend view
- Charts or sparklines (matrix + color coding is sufficient for v1)
- Interactive column sorting (default sort by worst adherence only)
