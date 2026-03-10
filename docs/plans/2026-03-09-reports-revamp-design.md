# Reports Overview & Income Page Revamp

**Date:** 2026-03-09
**Status:** Approved

## Problem

The reports overview page shows only income-vs-expense data. It lacks wealth and account allocation — the information users check most. The income report page overwhelms with five summary widgets and two charts that duplicate each other. Navigation tabs on the overview page conflict with breadcrumbs on subpages.

## Decisions

### Reports Overview (`/reports`)

**1. Remove tab navigation.** The `ReportsSectionNav` tabs (Overview, Expenses, Income) disappear from the overview page. Users reach subpages through the preview card CTAs ("View breakdown"). Subpages use breadcrumbs to navigate back. This eliminates the tab-plus-breadcrumb redundancy.

**2. Replace summary cards with a compact cash flow row.** The four stat cards (Income, Spending, Net Savings, Savings Rate) become a single inline row:

```
Income $8,500 → Spending $6,200 = Net +$2,300
```

Savings Rate is removed — it duplicates Net Savings.

**3. Rename chart label.** "Trailing 3 months" becomes "Last 3 months" (or "Last 3 years" for yearly range). Plain language.

**4. Add a Wealth section.** Reuse the `AccountPortfolioSummary` component from the accounts page. Shows:
- Total Accounts, Total Debt, Net Worth (multi-currency: primary + secondary)
- Account Allocation bar with legend (liquid, non-liquid, debt breakdown)

**5. Keep preview cards.** The Income and Spending preview cards remain as drill-down CTAs to their respective subpages.

#### Overview page layout (top to bottom)

1. Page header with title, subtitle, and period selector
2. Cash flow row (income → spending = net)
3. Income vs Spending chart ("Last 3 months")
4. Wealth section (totals + allocation bar)
5. Preview cards (Income and Spending side by side)

### Income Report (`/reports/income`)

**1. Replace five stat cards with a single hero summary card.** One card contains:
- Total Income as the hero number
- Growth percentage as a badge (e.g., "▲ 12%")
- `AllocationBar` component showing Active / Passive / Other distribution
- Legend with percentages

**2. Remove both charts.** The Income Source Mix (donut) and Income Source Trend (stacked bar) are deleted. They duplicate the information now shown in the hero card's allocation bar.

**3. Keep all three tables.** Income Sources, Member Breakdown, and Income History remain unchanged. Each serves a distinct purpose (by category, by member, by transaction).

**4. Use breadcrumb navigation.** "Reports > Income" breadcrumb in the header. No tab bar.

#### Income page layout (top to bottom)

1. Page header with breadcrumb, title, subtitle, and period selector
2. Hero summary card (total + allocation bar + growth badge)
3. Income Sources table
4. Member Breakdown table
5. Income History table (paginated)

## Components Affected

| Component | Action |
|---|---|
| `ReportsSectionNav` | Remove from overview; remove from income (already uses breadcrumb) |
| `OverviewSummaryCardsPartial` | Replace with compact cash flow row |
| `OverviewChartsPartial` | Update chart title to "Last N months/years" |
| `OverviewPreviewCardsPartial` | Keep as-is |
| `AccountPortfolioSummary` | Reuse on overview page (new wealth section) |
| `IncomeSummaryCardsPartial` | Replace with single hero card using `AllocationBar` |
| `IncomeChartsPartial` | Delete (source mix donut + source trend) |
| `IncomeSourceTablePartial` | Keep as-is |
| `IncomeMemberTablePartial` | Keep as-is |
| `IncomeHistoryTablePartial` | Keep as-is |

## Data Requirements

The overview page needs account/wealth data in addition to cash flow data. The report service must call account aggregation (totals, debt, distribution) alongside existing income/expense aggregation. This data is already available through the accounts service — no new queries needed.
