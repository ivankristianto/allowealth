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

import { Steps, Tabs, TabItem } from '@astrojs/starlight/components';

Accounts are the foundation of your financial tracking in Allowealth. They represent where your money lives and what you owe. By organizing accounts into classes, you can see a complete picture of your financial health.

## Overview of Accounts

![Accounts Overview](https://images.allowealth.io/accounts-overview.png)

Allowealth groups accounts into three main categories:

- **Liquid Accounts**: Cash, bank accounts, and e-wallets that you can access immediately.
- **Non-Liquid Accounts**: Investments like mutual funds, bonds, stocks, and cryptocurrency.
- **Debt Accounts**: Credit cards and loans that represent your liabilities.

### Portfolio Summary

The summary cards at the top of the page provide an instant view of your financial position:

- **Total Accounts**: The sum of all your liquid and non-liquid assets.
- **Total Debt**: The total of all your liabilities.
- **Net Worth**: Your total assets minus your total debt.
- **Account Allocation**: A visual breakdown of how your wealth is distributed across different account types.

### Time Navigation

Use the month selector at the top to view historical snapshots. Past months show read-only data, while the current month allows full editing and balance updates. Click **Today** to return to the current period.

## Add New Accounts

You can register accounts individually or add several at once using the bulk tool.

<Tabs>
  <TabItem label="Single Account">
    ![Add New Account](https://images.allowealth.io/accounts-add-new.png)

    <Steps>
    1. Click **Add new account** in the action bar.
    2. Enter a descriptive **Account Name** (e.g., "Chase Checking").
    3. Select an **Account Category** to group similar accounts.
    4. Choose the **Currency** for this account.
    5. Enter the current **Initial Balance**.
    6. Click **Register Account**.
    </Steps>

  </TabItem>
  <TabItem label="Bulk Add">
    ![Bulk Add Accounts](https://images.allowealth.io/accounts-bulk-add.png)

    <Steps>
    1. Click **Bulk add accounts** in the action bar.
    2. For each account, enter the name, type, currency, and balance.
    3. Use **Add Row** to include more accounts.
    4. Click **Create Accounts** when you are ready.
    </Steps>

  </TabItem>
</Tabs>

## Manage Account Balances

Keep your financial data accurate by recording balance changes as they happen.

### Update a Balance

![Update Balance](https://images.allowealth.io/accounts-update-balance.png)

<Steps>
1. Locate the account in the list and click the **Update** icon (pencil).
2. Select the **Date** the new balance was recorded.
3. Enter the **New Balance**.
4. Add an optional **Note** to document the reason for the change.
5. Click **Update Value**.
</Steps>

### View Balance History

![Account History](https://images.allowealth.io/accounts-history.png)

To see how an account balance has changed over time, click **Timeline** from the account's "More actions" menu. This displays a chronological list of all recorded balance updates and transfers.

### Edit Account Details

![Edit Account](https://images.allowealth.io/accounts-edit.png)

You can modify an account's name, category, or owner at any time:

<Steps>
1. Click the **More actions** (ellipsis) icon on the account.
2. Select **Edit Details**.
3. Update the information in the modal.
4. Click **Save Changes**.
</Steps>

### View Full Details

![Account Details](https://images.allowealth.io/accounts-details.png)

Click the **Details** link or the account name to open the dedicated account page. This view provides a deep dive into the account's performance, current status, and full transaction history.

## Transfer Between Accounts

Record money moving between your own accounts without affecting your income or expense reports.

![Transfer Between Accounts](https://images.allowealth.io/accounts-transfer.png)

<Steps>
1. Click **Transfer between accounts** in the action bar.
2. Select the source account in the **From** field.
3. Select the destination account in the **To** field.
4. Enter the **Amount** to move.
5. Add an optional **Note**.
6. Click **Transfer**.
</Steps>

_Note: Both accounts must use the same currency to perform a direct transfer._

## Organize with Categories

Categories help you group accounts for better reporting and organization.

![Manage Categories](https://images.allowealth.io/accounts-categories.png)

<Steps>
1. Click **Categories** in the action bar.
2. Click **Add Category** to create a new group.
3. Assign a name and a color for easy identification.
4. When adding or editing an account, select the category from the dropdown menu.
</Steps>

## Close and Archive Accounts

If you no longer use an account, you should deactivate it rather than delete it. This preserves your historical financial data.

<Steps>
1. Click the **More actions** (ellipsis) icon on the account.
2. Select **Deactivate**.
3. Confirm that you want to close the account.
</Steps>

Deactivated accounts are moved to the **Closed Accounts** view and no longer appear in your active lists.

![Closed Accounts](https://images.allowealth.io/accounts-closed.png)

## Best Practices

- **Update Regularly**: Record liquid account balances weekly and investment balances monthly.
- **Use Clear Names**: Name accounts uniquely (e.g., "Ally Savings - Emergency Fund") to avoid confusion.
- **Preserve History**: Always close inactive accounts instead of deleting them to maintain accurate net worth reports.
- **Filter Your View**: Use the search bar or the owner filter to quickly find specific accounts in a large portfolio.
