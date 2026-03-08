---
title: Transactions
description: Record, filter, import, and export transactions. Keep your financial records accurate and complete.
draft: false
head: []
sidebar:
  label: Transactions
  order: 5
audience:
  - user
---

Transactions form the foundation of your financial data. Accurate transaction records produce accurate budgets and reports.

## Viewing Transactions

The Transactions page displays all income and expense records.

![Transactions List View](https://images.allowealth.io/transactions-list-view.png)

### Transaction List

Each row shows:

- **Date** - When the transaction occurred
- **Category** - Icon and name for classification
- **Description** - Notes about the transaction
- **Account** - Where the money moved
- **Amount** - Value with currency indicator

Transactions group by date for easier scanning. The most recent transactions appear first.

### Month Navigation

Use the month selector in the header to view transactions from different periods. Select **Today** to return to the current month.

### Type Filter

Toggle between **Expenses** and **Income** using the tabs. The page defaults to the **Expenses** view.

## Adding Transactions

![Add Transaction Modal](https://images.allowealth.io/transactions-add-modal.png)

### Add a Single Transaction

1. Click **New Transaction** in the action bar.
2. Select the **Expense** or **Income** tab.
3. Fill in the form:
   - **Amount** - The transaction value
   - **Title** - Transaction description
   - **Category** - Select from your category list
   - **Date** - When it occurred (defaults to today)
   - **Account** - Where the money came from or went to
4. Click **Save Entry**.

The transaction appears immediately in the list.

### Add from Receipt (Scan)

1. Click **Scan Receipt** in the action bar.
2. Upload or photograph your receipt.
3. Review extracted data (merchant, amount, date).
4. Confirm or edit details.
5. Click **Save**.

_Note: Receipt scanning requires camera access on mobile devices._

## Filtering Transactions

Use the filter bar to find specific transactions.

### Available Filters

- **Search** - Find by description text
- **Category** - Filter by one or more categories
- **Account** - Show transactions from specific accounts
- **Member** - Filter by the user who created the transaction

### Apply Multiple Filters

Combine filters to narrow results:

1. Enter search text.
2. Select one or more categories.
3. Choose specific accounts.
4. Results update automatically.

Click **Reset Filters** to clear all selections and return to the default view.

## Editing Transactions

### Edit a Single Transaction

1. Find the transaction in the list.
2. Click the transaction row or the actions menu to edit.
3. Modify fields as needed.
4. Click **Save**.

### Bulk Edit

Select multiple transactions to apply changes to all:

1. Click the checkbox next to each transaction (or use the "Select all" checkbox).
2. Choose an action from the bulk action bar:
   - **Change Category** - Apply a new category to all selected
   - **Change Account** - Move transactions to a different account
   - **Delete** - Remove all selected transactions
3. Confirm the action.

## Deleting Transactions

### Delete a Single Transaction

1. Click the transaction to edit.
2. Click **Delete**.
3. Confirm in the dialog.

### Bulk Delete

1. Select multiple transactions using checkboxes.
2. Click **Delete Selected** in the bulk action bar.
3. Confirm the number of transactions to delete.
4. Click **Delete All**.

_Warning: Deletion permanently removes transactions. This affects budgets and reports. Export data before bulk deletion if you need a backup._

## Importing Transactions

Import multiple transactions from a CSV file.

### Prepare Your CSV

Your file should contain these columns:

- `date` - Transaction date (YYYY-MM-DD format)
- `amount` - Transaction amount
- `description` - Transaction notes
- `category` - Category name (must exist in your workspace)
- `account` - Account name (must exist in your workspace)
- `type` - "expense" or "income"

### Import Steps

1. Click **Import CSV** in the action bar.
2. Select your CSV file.
3. Map CSV columns to Allowealth fields if needed.
4. Review the import preview.
5. Click **Import**.

Failed rows display with error messages. Fix the CSV and re-import failed rows.

## Exporting Transactions

Export transactions to CSV for backup or external analysis.

### Export Steps

1. Apply filters to select the transactions you want.
2. Click **Export CSV** in the action bar.
3. The file downloads automatically with a timestamp in the filename.

Exported files contain all transaction fields plus metadata like the creation date.

## Transferring Between Accounts

Record money moved between your own accounts:

1. In **Accounts**, click **Transfer** in the action bar.
2. Select the source account.
3. Select the destination account.
4. Enter the amount.
5. Add a description (optional).
6. Click **Transfer**.

The transfer creates two linked transactions: an expense from the source account and an income to the destination account.

## Pagination

Transaction lists paginate when you have more than 25 records. Use the pagination controls at the bottom:

- **Previous** / **Next** - Navigate pages
- **Page indicator** - Shows current page and total pages

## Troubleshooting

### Transaction Not Appearing

1. Check that the month selector matches the transaction date.
2. Clear all filters.
3. Verify the transaction saved (check for success notification).
4. Refresh the page.

### Import Fails

1. Verify CSV format (dates as YYYY-MM-DD).
2. Confirm category and account names match exactly.
3. Check for special characters in descriptions.
4. Ensure amounts are numbers without currency symbols.

### Cannot Edit Transaction

1. Verify you have permission (admins can edit all; members edit their own).
2. Check if the transaction is part of a transfer (edit from the Accounts page).
3. Confirm the account remains open.

### Duplicate Transactions

1. Use search to find duplicates by amount.
2. Select duplicates with checkboxes.
3. Use bulk delete to remove extras.
4. Consider using import matching to prevent future duplicates.

## Best Practices

- **Add transactions daily** - Prevents backlog and forgotten expenses.
- **Use consistent descriptions** - Makes searching easier.
- **Categorize immediately** - Uncategorized transactions distort reports.
- **Review weekly** - Catch errors before they compound.
- **Export monthly** - Maintain external backups.
