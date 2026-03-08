---
title: Forecast
description: Project future wealth based on current savings, contribution rates, and return assumptions.
draft: false
head: []
sidebar:
  label: Forecast
  order: 9
audience:
  - user
---

Forecast helps you compare your planned savings path with what has actually happened in your workspace. It is designed for reality checks: you can save planning assumptions, compare them with real balances, and see how recent net savings trends would carry forward.

## How Forecast Works

Forecast combines four pieces of information:

- **Saved assumptions** - Your workspace-level Monthly Top-Up and Expected APY
- **Actual balances** - Historical balances from primary-currency, non-debt accounts
- **Actual net savings** - Monthly income minus expenses from your reports
- **Current trajectory** - A forward path based on your latest actual balance and recent average net savings

The result is a focused comparison between plan, reality, and current momentum instead of a single long-range projection.

## Saved Forecast Assumptions

At the top of the page, Forecast Assumptions lets you edit:

- **Monthly Top-Up** - How much you expect to add each month
- **Expected APY** - The annual return rate used for the planned balance path

These values are **saved to workspace settings**. They are reused the next time the forecast page loads, so everyone in the workspace sees the same baseline assumptions.

### Important

- Changes save automatically after you stop typing
- Invalid values show inline errors
- Updating the assumptions does **not** recalculate the charts instantly; reload the forecast page to see the new saved assumptions applied

## Wealth Trajectory Chart

The main chart compares three balance lines:

- **Planned Balance** - Your saved top-up and APY applied across the forecast timeline
- **Actual Balance** - Historical balances recorded from your accounts
- **Current Trajectory** - A dashed line extending forward from the latest actual balance using recent average net savings

Instead of showing an oversized long-range chart, the default viewport focuses on the period around your latest real balance: recent history plus the next part of the forecast window.

## Monthly Gains Comparison

The second chart compares monthly gains:

- **Forecast Interest** - Interest produced by the planned balance path
- **Actual Net Savings** - Real monthly savings after subtracting expenses from income

Use this chart to see whether your actual cash flow is supporting the plan you expect to follow.

## Yearly Ledger Breakdown

The ledger now defaults to **year rows** instead of a long flat monthly list.

Each year row shows:

- **Planned Ending Balance**
- **Actual Ending Balance**
- **Forecast Interest**
- **Actual Net Savings**

Expand a year row to reveal the monthly rows inside it. This makes it easier to scan yearly totals first, then drill into the specific months that explain the difference.

## How To Use Forecast Effectively

### 1. Save realistic assumptions

Start with a Monthly Top-Up you can actually sustain and an Expected APY that reflects a conservative long-term average.

### 2. Compare plan vs reality

If Actual Balance keeps trailing Planned Balance, check the monthly gains chart to see whether real net savings are lower than expected.

### 3. Watch current momentum

Current Trajectory shows what happens if recent savings behavior continues. This is often the fastest way to spot whether you are improving, stalling, or falling behind.

### 4. Expand the years that matter

Use the yearly ledger to open only the years you want to investigate instead of scanning every month at once.

## Important Limitations

Forecast is still an estimate. Results can differ because:

- market returns are not constant
- monthly savings can change
- account histories may be incomplete
- taxes, fees, and inflation are not modeled

Forecast is a planning tool, not financial advice.

## Troubleshooting

### I changed the assumptions but the charts did not move

The new values are saved immediately, but the page uses the saved assumptions from the last load. Refresh the forecast page to pull the latest saved settings into the charts.

### My actual balances look lower than expected

Check whether:

- the account is in your workspace's primary currency
- the account is classified as debt
- recent monthly net savings were lower or negative

Debt accounts are excluded from the wealth forecast so the comparison focuses on asset growth.

### The current trajectory looks different from the planned path

That is expected. Planned Balance uses your saved assumptions, while Current Trajectory follows your recent real net savings trend from the latest actual balance.

## Related Features

- **Settings** - Manage the workspace settings that store forecast assumptions
- **Reports** - Review the income and expense history behind Actual Net Savings
- **Accounts** - Confirm the balances and history feeding the Actual Balance line
