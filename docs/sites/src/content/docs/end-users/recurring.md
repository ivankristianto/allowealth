---
title: Recurring Transactions
description: Manage repeating transactions like subscriptions, bills, and salary. Track upcoming payments and automate your financial record-keeping.
draft: false
head: []
sidebar:
  label: Recurring
  order: 9
audience:
  - user
---

Recurring transactions handle predictable money movement. Set up subscriptions, bills, and income once. Allowealth reminds you when they are due.

## Understanding Recurring

Recurring has two concepts:

- **Templates** - The master schedule (for example, "Netflix subscription, $15 monthly")
- **Occurrences** - Individual pending or confirmed instances (for example, "Netflix payment due March 15")

## Pending Occurrences

The top section shows upcoming transactions requiring action.

### What You See

Each pending item displays:

- **Name** - Template name
- **Amount** - Transaction value
- **Due Date** - When it should occur
- **Account** - Where money moves
- **Actions** - Confirm or Skip

### Confirm an Occurrence

When a bill arrives or payment processes:

1. Find the pending occurrence
2. Review the details
3. Click **Confirm** (checkmark icon)
4. The transaction records to your ledger
5. The occurrence disappears from pending

### Skip an Occurrence

When a scheduled transaction does not happen:

1. Find the pending occurrence
2. Click **Skip** (X icon)
3. Optionally add a reason
4. The occurrence removes from pending
5. The template continues generating future occurrences

**Example:** Skip a gym membership charge for a month you paused service.

## Recurring Templates

The bottom section shows all active and paused recurring schedules.

### Template List View

Displays templates in a table:

- **Name** - Template description
- **Amount** - Fixed or variable amount
- **Frequency** - How often it repeats
- **Next Due** - Upcoming occurrence date
- **Status** - Active or Paused

### Calendar View

Switch to calendar view to see occurrences visually:

1. Click the **Calendar** button in the view toggle
2. Navigate months with the arrow buttons
3. See occurrences on their due dates
4. Click any date to view details

Toggle back to list view with the **List** button.

## Creating Templates

### Add a New Recurring Transaction

1. Click **New Recurring** in the action bar
2. Fill in the form:
   - **Name** - Descriptive label (for example, "Rent Payment")
   - **Type** - Expense or Income
   - **Amount** - Fixed amount or range
   - **Category** - For reporting
   - **Account** - Where money moves
   - **Frequency** - How often it repeats. Choose a preset:
     - Weekly
     - Biweekly
     - Monthly (default)
     - Quarterly
     - Semi-annual
     - Annual
     - Or set a custom interval
   - **Start Date** - When the schedule begins
   - **End Date** - Optional expiration
3. Click **Save**

### Convert a Regular Transaction

Turn an existing transaction into a recurring template:

1. Navigate to **Transactions**
2. Find the transaction to repeat
3. Click the transaction menu (three dots)
4. Select **Make Recurring**
5. Adjust frequency and dates
6. Click **Save**

## Managing Templates

### Edit a Template

1. Find the template in the list
2. Click **Edit** (pencil icon)
3. Modify fields as needed
4. Click **Save**

Changes apply to future occurrences. Confirmed past transactions remain unchanged.

### Pause a Template

1. Find the active template
2. Click **Pause** (pause icon)
3. The template stops generating occurrences

Paused templates remain in the list with "Paused" status. Resume anytime.

### Resume a Template

1. Find the paused template
2. Click **Resume** (play icon)
3. Occurrences resume generating

### Delete a Template

1. Find the template
2. Click **Delete** (trash icon)
3. Confirm the deletion

Deleting a template:

- Removes it from the template list
- Cancels all pending occurrences
- Keeps already confirmed transactions

## Frequency Options

Choose how often the transaction repeats:

| Frequency   | Description                | Example              |
| ----------- | -------------------------- | -------------------- |
| Weekly      | Every 7 days               | Weekly allowance     |
| Biweekly    | Every 14 days              | Biweekly payroll     |
| Monthly     | Same date monthly          | Rent, subscriptions  |
| Quarterly   | Every 3 months             | Insurance premiums   |
| Semi-annual | Every 6 months             | Bond coupon payments |
| Annual      | Same date annually         | Membership renewals  |
| Custom      | Any interval you configure | Every 2 weeks, etc.  |

### Monthly Scheduling

Monthly templates generate occurrences on the same day each month:

- Started on the 15th → repeats on the 15th
- Started on the 31st → adjusts to month-end for shorter months

## Forecast

View projected recurring cash flow for the next 12 months:

1. Click **Forecast** on the recurring page header
2. The table shows each template with monthly columns
3. Filter by account, type, or status
4. Review income and expense totals by currency

See [Recurring Forecast](/end-users/recurring-forecast) for details.

## Variable Amounts

Some recurring transactions vary (utility bills, credit card payments):

1. Create the template with an estimated amount
2. When confirming each occurrence, adjust the actual amount
3. Save the confirmed transaction with the correct value

## Month Navigation

Use the month selector to view pending occurrences for different months:

- Select past months to see confirmed occurrences
- Select future months to plan ahead
- Use **Today** to return to the current month

## Statistics

The stats bar shows:

- **Total Active** - Number of recurring templates
- **Monthly Total** - Sum of monthly recurring amounts
- **Pending Count** - Occurrences awaiting confirmation

## Best Practices

### Set Up Immediately

Create recurring templates soon after onboarding:

- Rent or mortgage
- Utilities (electricity, water, internet)
- Subscriptions (streaming, software)
- Salary or regular income
- Loan payments

### Review Weekly

Check pending occurrences weekly:

1. Confirm bills you paid
2. Skip items that did not occur
3. Adjust variable amounts before confirming

### Use Clear Names

Name templates so you recognize them immediately:

- "Rent - Apartment 4B" not "Housing"
- "Netflix - Family Plan" not "Subscription"
- "Electric - ConEd" not "Utilities"

### Match Real Timing

Set frequencies to match actual billing:

- Most subscriptions bill monthly
- Some insurance bills quarterly
- Annual memberships renew yearly

## Troubleshooting

### Occurrence Not Generated

If a template should have created an occurrence but did not:

1. Check the template status is "Active"
2. Verify the current date is past the start date
3. Confirm the template has not reached its end date
4. Check you are viewing the correct month

### Cannot Confirm Occurrence

Confirmation requires:

- Valid account (not closed)
- Valid category
- Correct permissions (admins or template owner)

### Duplicate Occurrences

If the same bill appears twice:

1. Skip the duplicate
2. Check if two similar templates exist
3. Delete the duplicate template

### Wrong Amount Recorded

For variable bills:

1. Confirm the occurrence
2. Edit the resulting transaction in **Transactions**
3. Adjust to the correct amount
4. Save changes

## Related Features

- **Transactions** - View confirmed recurring transactions
- **Budget** - See how recurring expenses affect category budgets
- **Dashboard** - Upcoming bills appear in the Cash Flow widget
