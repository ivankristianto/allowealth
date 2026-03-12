---
title: Budgets
description: Set spending limits by category, track progress, and receive alerts when budgets exceed thresholds.
draft: false
head: []
sidebar:
  label: Budgets
  order: 6
audience:
  - user
---

Budgets help you control spending by setting limits for each category. Monitor progress throughout the month and adjust limits as needed.

## Understanding the Budget Page

The Budget page displays categories, spending limits, and current progress.

### Card View

![Budgets Card View](https://images.allowealth.io/budgets-card-view.png)

Each card represents one category and displays:

- **Category name** with icon
- **Budget amount** - Monthly limit
- **Spent amount** - Current spending
- **Remaining** - Budget left (or overage in red)
- **Progress bar** - Visual indicator of spending versus budget

Cards change color based on status:

- **Green** - Spending within budget
- **Yellow** - Approaching limit (over 75% used)
- **Red** - Budget exceeded

### Table View

![Budgets Table View](https://images.allowealth.io/budgets-table-view.png)

Switch to table view for a compact list that shows:

- Category name
- Budget amount
- Spent amount
- Remaining/Overage
- Percentage used

Click the view toggle button to switch between card and table layouts.

## Setting Budgets

![Create New Budget Modal](https://images.allowealth.io/budgets-set-budgets.png)

### Set Budgets for a Month

1. Click **Set new budget** in the action bar.
2. Select a category from the dropdown.
3. Enter a monthly limit in the input field.
4. Click **Create Budget**.

### Copy Budgets to Next Month

1. Navigate to the month you want to copy from.
2. Click **Copy to Next Month** in the action bar.
3. Confirm the action.

_Note: Copying only works if the target month has no existing budgets._

### Initialize New Categories

When you add new expense categories:

1. A banner appears showing uninitialized categories.
2. Click **Initialize Budgets**.
3. Enter budget amounts for the new categories.
4. Click **Save**.

## Editing Budgets

### Edit a Single Category

1. Find the category card or row.
2. Click the budget amount.
3. Enter the new limit.
4. Press Enter or click outside the field to save.

### Adjust Multiple Budgets

Use the **Set new budget** modal to adjust categories:

1. Click **Set new budget**.
2. Modify the budget amount.
3. Click **Create Budget**.

## Filtering and Searching

### Search Categories

Type in the search box to filter categories by name.

### Filter by Status

Use the **Show Overbudget Only** toggle to display only categories that exceed their limits.

### Combine Filters

Search and status filters work together. For example, search "food" with the over-budget filter active to find food categories exceeding limits.

## Month Navigation

Use the month selector in the header to view or edit budgets for different months.

- Select past months to review historical performance.
- Select future months to plan ahead.
- Use the **Today** button to return to the current month.

## Budget Alerts

Allowealth generates alerts based on your spending patterns.

### Warning Alerts

Categories at 75-99% of budget trigger warnings. The advice banner suggests how much remains before you exceed the limit.

### Exceeded Alerts

Categories over 100% of budget show an exceeded status. The advice banner displays the overage amount.

### Critical Alerts

Categories at 150% or higher trigger critical alerts that require immediate attention.

## Importing and Exporting

### Export Budgets

1. Navigate to the month you want to export.
2. Click **Export budgets to CSV** in the action bar.
3. The CSV file downloads automatically.

Exported files include category names, budget amounts, and spent amounts.

### Import Budgets

1. Click **Import budgets from CSV** in the action bar.
2. Select a CSV file with columns: `category_name`, `budget_amount`.
3. Map the columns if needed.
4. Review the preview.
5. Click **Import**.

Importing updates existing budgets or creates new ones. It does not delete existing budgets.

## Managing Categories

### Add a Category

1. Click **Categories** in the action bar.
2. Click **Add Category**.
3. Enter the name.
4. Select the type (expense or income).
5. Choose an icon and a color.
6. Click **Save**.

### Edit a Category

1. Click **Categories** in the action bar.
2. Find the category in the list.
3. Click **Edit**.
4. Modify the name, icon, or color.
5. Click **Save**.

### Archive a Category

1. Click **Categories** in the action bar.
2. Find the category.
3. Click **Archive**.
4. Confirm your choice.

Archived categories no longer appear in budget views but remain in your historical data.

## Best Practices

### Start Simple

Begin with 5-10 major categories. Add more as your tracking improves.

### Review Weekly

Check your budget status each week to catch overspending early.

### Adjust Realistically

If you consistently exceed a budget, increase the limit instead of ignoring the alert.

### Plan Ahead

Set next month's budgets before the month starts. Use historical data to inform your decisions.

## Troubleshooting

### No Budgets Showing

If the page shows no categories:

1. Check that you have created expense categories.
2. Click **Initialize Budgets** to add categories.
3. Verify you are viewing the correct month.

### Cannot Copy Budgets

Copying fails when:

- The target month already has budgets.
- No budgets exist in the source month.

Clear the target month budgets first, or manually set the budgets.

### Spent Amount Looks Wrong

If spent amounts do not match your records:

1. Check Transactions for uncategorized items.
2. Verify transactions use the correct category.
3. Confirm transaction dates fall in the budget month.
4. Look for duplicate transactions.

### Budget Advice Banner Missing

The banner only appears when:

- You have exceeded categories.
- You have warning-level categories (75%+ spent).

No banner means all categories remain within normal ranges.

## Related Features

- **Category drill-down** - Click "View transactions" on any budget card to see transactions in that category.
- **Reports** - View budget performance trends over time.
- **Transactions** - Add or edit transactions affecting budgets.
