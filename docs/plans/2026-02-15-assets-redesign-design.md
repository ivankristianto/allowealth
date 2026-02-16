# Assets Redesign: Account Classification & Balance Decoupling

## Problem

The current assets feature treats all 10 account types uniformly and auto-mutates balances on every transaction. This creates issues:

- No distinction between liquid accounts (usable for daily spending), non-liquid investments, and debt
- Users can select any account type when adding expenses/income, even investment accounts
- Transaction creation modifies asset balances, but users want balances to reflect their actual bank/app values (manual entry)
- Debt accounts reduce total assets, but they should be displayed separately
- No way to view transactions filtered by a specific account with monthly summaries

## Design

### 1. Account Classification

Add `account_class` enum column to assets table with three values:

| account_class | Asset types                                       | Purpose                       |
| ------------- | ------------------------------------------------- | ----------------------------- |
| `liquid`      | `cash`, `bank_account`, `e_wallet`                | Daily spending accounts       |
| `non_liquid`  | `mutual_fund`, `bond`, `crypto`, `stock`, `other` | Investment/long-term accounts |
| `debt`        | `credit_card`, `loan`                             | Liability accounts            |

- User picks the granular `type` when creating an account
- Service auto-derives `account_class` from `type` — no separate user input
- `account_class` is stored in DB for efficient filtering/querying

### 2. Transaction Rules

#### Account selection by transaction type

| Transaction type | Source account         | Destination account |
| ---------------- | ---------------------- | ------------------- |
| Expense          | `liquid` + `debt` only | n/a                 |
| Income           | `liquid` + `debt` only | n/a                 |
| Transfer         | All types              | All types           |

Transfers allow all types because users transfer between any accounts (e.g., bank to mutual fund).

#### Balance decoupling

Current flow (remove):

```
create transaction → update asset balance → create history entry
```

New flow:

```
create transaction → done (no balance side effects)
```

- Transactions are informational records only — they don't mutate account balances
- Balance updates happen only via explicit "Update Balance" action (manual entry)
- This applies to create, edit, and delete of transactions
- Transfer service method becomes a simple transaction record with `type: transfer`, no balance arithmetic
- Compensating transactions for balance rollback are no longer needed

#### Debt accounts

- Balance can be negative (e.g., credit card debt of -5M)
- Negative debt balance does NOT subtract from total assets
- Transactions on debt accounts are informational (e.g., "spent 200K on credit card this month")

### 3. Calculated Balance (Reference)

For any account, provide a computed value:

```
calculated_balance = initial_balance + SUM(income) - SUM(expenses)
```

- Display-only — never written to DB
- Shown alongside manual balance so users can compare
- Helps identify missed transactions ("Bank says 10M, calculated says 9.5M")

### 4. Portfolio Summary Restructure

```
┌─────────────────────────────────────┐
│ Total Assets          Rp 50,000,000 │  ← liquid + non_liquid only
│ Total Debt            Rp  5,000,000 │  ← absolute value of debt
│ Net Worth             Rp 45,000,000 │  ← assets - debt
└─────────────────────────────────────┘
```

Assets grouped by `account_class` below the summary:

- Liquid Accounts (expandable)
- Non-Liquid Accounts (expandable)
- Debt (expandable)

### 5. Account Detail Page

New page at `/assets/[id]` showing transactions for a specific account.

Layout:

- Header: account name, class label, type label, edit button
- Balance section: current (manual) balance + calculated balance
- Month navigator (reuse `PeriodicSelector`)
- Monthly summary: total income, total expenses, transfers in, transfers out
- Transaction list filtered by selected month

### 6. Removals & Simplifications

#### Remove

- Auto balance update on transaction create/edit/delete
- Balance mutation in transfer flow
- Compensating transactions for balance rollback

#### Keep as-is

- `updateBalance` endpoint (manual balance entry)
- Asset history table (records manual balance snapshots)
- Asset categories
- Asset close/reopen
- Currency locking

#### Simplify

- `transfer` service method — just creates a transaction record, no balance math
- Transaction create/edit/delete — no balance side effects

#### New additions

- `account_class` column + auto-derivation logic
- `getCalculatedBalance(assetId)` computed query
- `getTransactionsByAsset(assetId, month, year)` query with monthly totals
- Account detail page (`/assets/[id]`)
- Portfolio summary restructure (Assets / Debt / Net Worth)
- Transaction form filtering by `account_class`

## Schema Changes

### Assets table

Add column:

```sql
account_class TEXT NOT NULL CHECK(account_class IN ('liquid', 'non_liquid', 'debt'))
```

No other schema changes. Transactions table already has `asset_id` FK.

## Migration

No backward compatibility needed — DB will be reset (development phase).
