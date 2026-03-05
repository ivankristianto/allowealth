---
title: Accounts
description: Manage your financial accounts, track balances, transfer funds, and monitor net worth across liquid, non-liquid, and debt accounts.
draft: false
head: []
sidebar:
  label: Accounts
  order: 7
audience:
  - user
---

Accounts represent where your money and liabilities live. Organize them by type to understand your complete financial position.

## Account Types

Allowealth organizes accounts into three classes:

### Liquid Accounts

Cash and cash-equivalent accounts you can access immediately:

- **Cash** - Physical currency
- **Bank Account** - Checking and savings accounts
- **E-Wallet** - Digital wallets and payment apps

### Non-Liquid Accounts

Investment accounts that may take time to convert to cash:

- **Mutual Fund** - Pooled investment funds
- **Bond** - Fixed-income securities
- **Stock** - Individual stock holdings
- **Crypto** - Cryptocurrency holdings
- **Other** - Miscellaneous investments

### Debt Accounts

Credit and loan accounts representing money you owe:

- **Credit Card** - Revolving credit accounts
- **Loan** - Fixed-term debt (mortgage, car loan, personal loan)

## Viewing Accounts

The Accounts page displays all accounts grouped by class. Each group shows:

- **Account name** - The display name you assigned
- **Type** - Account classification
- **Balance** - Current amount
- **Currency** - Account denomination
- **Last updated** - When the balance was last modified

### Portfolio Summary

The summary card at the top displays:

- **Total Assets** - Sum of liquid and non-liquid accounts by currency
- **Total Debt** - Sum of debt accounts by currency
- **Net Worth** - Assets minus debt
- **Allocation** - Visual breakdown by account class

### Month Navigation

Use the month selector to view historical account snapshots. Past months show read-only data. Current month allows editing.

Click **Today** to return to the current month view.

## Adding Accounts

### Add a Single Account

1. Click **Add Account** in the action bar
2. Fill in the form:
   - **Name** - Descriptive label (for example, "Chase Checking")
   - **Type** - Select from account types
   - **Category** - Optional grouping
   - **Currency** - Account denomination
   - **Balance** - Current amount
3. Click **Save**

### Add Multiple Accounts (Bulk)

1. Click **Bulk Add** in the action bar
2. Enter each account on a separate row:
   - Name
   - Type (dropdown)
   - Currency
   - Balance
3. Click **Add Row** for additional accounts
4. Click **Create Accounts** when finished

## Managing Account Balances

### Update Balance

1. Find the account in the list
2. Click the balance amount or the **Update** button
3. Enter the new balance
4. Add a note explaining the change (optional)
5. Click **Save**

### View Balance History

1. Click the account name or **History** button
2. View a list of all balance changes
3. See dates, amounts, and notes for each update

## Transferring Funds

Record money moved between your own accounts:

1. Click **Transfer** in the action bar
2. Select the **Source** account
3. Select the **Destination** account
4. Enter the **Amount**
5. Add a **Description** (optional)
6. Select the **Date**
7. Click **Transfer**

The transfer creates two linked transactions:

- An expense from the source account
- Income to the destination account

Transfers between accounts with different currencies use the exchange rate you specify.

## Account Categories

Organize accounts with custom categories.

### Create a Category

1. Click **Categories** in the action bar
2. Click **Add Category**
3. Enter a name
4. Choose a color
5. Click **Save**

### Assign Accounts to Categories

1. Edit an account
2. Select a category from the dropdown
3. Save changes

Categories help group related accounts (for example, "Retirement" for multiple investment accounts).

## Closing Accounts

Archive accounts you no longer use:

1. Find the account in the list
2. Click **Close Account**
3. Confirm the closure

Closed accounts:

- Remain visible in historical month views
- No longer accept new transactions
- Continue contributing to net worth calculations for past months

View closed accounts by clicking **View Closed** in the action bar.

## Filtering Accounts

### Search by Name

Type in the search box to filter accounts by name.

### Filter by Type

Use the type dropdown to show only specific account types.

### Filter by Category

Select a category to show only accounts in that group.

### Personal View

Click **My Accounts** to show only accounts you created. Click **All Accounts** to return to the full view.

## Best Practices

### Set Up Accounts in Order

1. Add daily spending accounts first (checking, cash)
2. Add savings and investment accounts
3. Add debt accounts last for accurate net worth

### Update Balances Regularly

- Update liquid accounts weekly
- Update investment accounts monthly
- Update debt accounts when statements arrive

### Use Clear Names

Name accounts so all workspace members understand them:

- "Chase Checking - Joint" not "Checking"
- "Vanguard 401k" not "Retirement"

### Close, Do Not Delete

Close inactive accounts rather than deleting them. This preserves historical accuracy in reports.

## Troubleshooting

### Account Balance Looks Wrong

1. Check the month selector shows the correct period
2. Verify you updated the balance recently
3. Check for missing transactions in that account
4. Confirm the account uses the correct currency

### Cannot Transfer Between Accounts

Transfers require:

- Two different accounts
- Valid balances in the source account
- Current month view (not historical)

### Account Disappeared

1. Check you are not in "My Accounts" view
2. Verify the account is not closed (click **View Closed**)
3. Clear all filters
4. Confirm you have permission to view the account

### Currency Shows Incorrectly

Account currencies lock after creation. If you selected the wrong currency:

1. Close the incorrect account
2. Create a new account with the correct currency
3. Add a note explaining the change

## Related Features

- **Dashboard** - View account totals in the summary widget
- **Transactions** - See all transactions for an account
- **Reports** - Analyze account performance over time
