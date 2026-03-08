---
title: Recurring Forecast
description: View a 12-month projection of recurring income and expenses. Plan cash flow with filtered, per-currency totals.
draft: false
head: []
sidebar:
  label: Recurring Forecast
  order: 10
audience:
  - user
---

The recurring forecast shows projected cash flow from your recurring templates over the next 12 months. Use it to plan ahead, spot gaps, and verify your income covers your expenses.

## Accessing Forecast

1. Navigate to **Recurring** in the sidebar
2. Click the **Forecast** button in the page header
3. The forecast table loads with all active templates

## Reading the Table

The forecast displays a grid:

- **Rows** — One row per recurring template
- **Columns** — One column per month for the next 12 months
- **Cells** — The projected amount for that template in that month, or empty if no occurrence falls in that month

Templates are grouped by type (income and expense) for easy scanning.

### Color Coding

- **Green** amounts indicate income
- **Red** amounts indicate expenses
- **Empty cells** mean no occurrence is scheduled that month

## Filtering

Narrow the forecast to focus on what matters.

### By Account

Filter to see recurring transactions for a specific account:

1. Open the **Account** filter
2. Select one or more accounts
3. The table updates to show only matching templates

### By Type

Show only income or only expenses:

1. Open the **Type** filter
2. Select **Income** or **Expense**
3. Review the filtered projection

### By Status

Focus on active templates or include paused ones:

1. Open the **Status** filter
2. Select **Active**, **Paused**, or both
3. Paused templates show projected amounts if they were resumed

## Understanding Totals

The bottom of the forecast table shows summary rows:

- **Total Income** — Sum of all income templates per month
- **Total Expense** — Sum of all expense templates per month
- **Net Cash Flow** — Income minus expenses per month

Totals are grouped by currency when you have templates in multiple currencies.

## Limitations

- **Projections, not guarantees** — Forecast uses the template amount. Variable bills (utilities, credit cards) will differ from actual amounts.
- **Paused templates excluded** — Paused templates do not appear in totals unless you filter to include them.
- **12-month window** — The forecast covers the next 12 months from the current date. It does not extend further.
- **No historical data** — The forecast looks forward only. Use the Transactions page for past records.

## Related Features

- [Recurring Transactions](/end-users/recurring) — Manage templates and confirm occurrences
- [Transactions](/end-users/transactions) — View confirmed recurring transactions
- [Budget](/end-users/budget) — See how recurring expenses affect category budgets
- [Dashboard](/end-users/dashboard) — Upcoming bills appear in the Cash Flow widget
