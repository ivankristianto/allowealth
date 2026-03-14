# Accounts Transaction Reconciliation Design

**Date:** 2026-03-15
**Ticket:** ALL-49
**Branch:** `accounts-transactions-reconciliation`
**Status:** Approved

---

## Summary

Add a transaction reconciliation card to the accounts page that shows income, expenses, and net transaction flow for the selected period. Compare net flow against account balance changes to help users identify forgotten expenses, missing income entries, or data entry errors.

---

## Motivation

Users currently see account balances but have no visibility into whether those balances match their recorded transactions. By showing transaction flow alongside balance changes with a visual variance indicator, users can quickly identify discrepancies that need investigation.

---

## Approach

**Option A — All logic in `index.astro` frontmatter** (selected)

Fetch all data in the page frontmatter (SSR), compute variance with a pure helper function, and pass pre-computed props to a new `AccountReconciliationCard.astro` component.

Rejected alternatives:
- **Option B** (new service method): Crosses service boundaries (`transactionService` calling `accountService`). Over-engineered for this feature.
- **Option C** (client-side fetch): Extra complexity, loading flash, new API endpoint required. Not warranted given existing SSR pattern.

---

## Data Model

New type added to `src/lib/types/account.ts`:

```typescript
export interface ReconciliationCurrencyRow {
  currency: Currency;
  income: number;
  expenses: number;
  netFlow: number;        // income - expenses
  balanceChange: number;  // endBalance - startBalance (asset accounts only, excludes debt)
  variance: number;       // balanceChange - netFlow
  isBalanced: boolean;    // Math.abs(variance) < 0.01
}
```

**Why exclude debt accounts from `balanceChange`:** A credit card payment records an `expense` against a bank account and reduces the credit card debt balance. Including debt in the balance delta would partially cancel the asset decrease, making the variance appear as if income is missing. Excluding debt keeps the math consistent: `income − expenses` maps cleanly to asset balance changes only.

**Why exclude transfers:** `getMonthSummary` already ignores transfer-type transactions (counts only `income` and `expense` rows). Transfers net to zero across the portfolio and do not affect reconciliation.

---

## Service Layer & Data Fetching

Three new calls added to `index.astro` frontmatter, all run in parallel via `Promise.all`:

| Call | Purpose |
|------|---------|
| `accountService.getSnapshotForMonth(workspaceId, selectedYear, selectedMonth - 1, filters)` | Previous month-end snapshot = starting balance |
| `transactionService.getMonthSummary({ workspace_id, currency, start_date, end_date })` × N currencies | Income/expenses per currency for the period |

**Ending balance** reuses the `accounts` array already in scope (live balance for current month, end-of-month snapshot for historical months). No extra call.

**Year boundary handling:** When `selectedMonth = 1`, `selectedMonth - 1 = 0`, and `new Date(year, 0, 0)` = Dec 31 of the prior year. The existing `getSnapshotForMonth` implementation handles this correctly.

### Performance & Caching

`getSnapshotForMonth` calls `findAll` + history queries internally. For historical months the page now calls it twice (start and end). To avoid the cost on repeat visits, cache `getSnapshotForMonth` results inside `accountService` using the existing CacheManager:

```typescript
const cacheKey = `accounts:snapshot:${workspaceId}:${year}:${month}`;
// TTL: 3600s, tag: `accounts:${workspaceId}` (invalidated on any balance update)
```

Past month-end snapshots are immutable, making them ideal cache candidates. The cache tag ensures invalidation when accounts change. `getMonthSummary` is a single aggregation query (~2ms per benchmark) and does not need caching.

---

## `calculateReconciliation()` Helper

Pure function added to `src/lib/utils/account.ts`. No DB dependency — fully unit-testable.

```typescript
export function calculateReconciliation(params: {
  currencies: Currency[];
  startSnapshots: Array<{ currency: Currency; balance: string; account_class: AccountClass }>;
  endAccounts: Array<{ currency: Currency; balance: string; account_class: AccountClass }>;
  transactionSummaries: Array<{ currency: Currency; income: number; expenses: number }>;
}): ReconciliationCurrencyRow[]
```

Logic per currency:
1. Sum asset-class (`account_class !== 'debt'`) balances from `startSnapshots` → `startBalance`
2. Sum asset-class balances from `endAccounts` → `endBalance`
3. Look up income/expenses from `transactionSummaries`
4. Compute `netFlow = income − expenses`, `balanceChange = endBalance − startBalance`, `variance = balanceChange − netFlow`
5. `isBalanced = Math.abs(variance) < 0.01`

Unit test coverage: balanced case, discrepancy case, zero-transaction period, debt accounts excluded from balance change.

---

## `AccountReconciliationCard.astro` Component

**Location:** `src/components/organisms/AccountReconciliationCard.astro`

**Props:**
```typescript
interface Props {
  reconciliation: ReconciliationCurrencyRow[];
  periodLabel: string;  // e.g. "March 2026"
}
```

**Empty state:** If all rows have zero income, zero expenses, and zero balance change — render nothing. No all-zeros card shown.

**Layout per currency row:**

```
┌─────────────────────────────────────────────────────────┐
│  ↕ Transaction Flow                        March 2026   │
├─────────────────────────────────────────────────────────┤
│  IDR                                                     │
│  Income                              Rp 5,000,000       │
│  Expenses                          − Rp 2,000,000       │
│  Net Flow                            Rp 3,000,000       │
│  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ │
│  Balance Change                      Rp 3,000,000       │
│  Variance                Rp 0  ✓ BALANCED               │
│                                                          │
│  USD                                                     │
│  Income                                     $1,000.00   │
│  Expenses                                 −   $800.00   │
│  Net Flow                                   $200.00     │
│  ┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈ │
│  Balance Change                               $350.00   │
│  Variance          +$150.00  ⚠ GAP  [?]                 │
└─────────────────────────────────────────────────────────┘
```

**Visual treatment:**
- `isBalanced = true` → green badge `BALANCED` + `CheckCircle` icon (`text-success`)
- `isBalanced = false` → amber badge `GAP` + `AlertTriangle` icon + `Info` tooltip (`text-warning`)
- Expenses row prefixed with `−` in `text-error`
- Variance amount in `text-success` (balanced) or `text-warning` (gap)
- Tooltip text: *"Balance changed more or less than recorded transactions. May indicate unrecorded income, missing expenses, or manual balance adjustments."*

**Lucide icons used:** `ArrowUpDown` (card header), `CheckCircle` (balanced), `AlertTriangle` (gap), `Info` (tooltip)

---

## Placement in `index.astro`

```astro
<AccountPortfolioSummary ... />       <!-- snapshot: Accounts, Debt, Net Worth, Allocation -->
<AccountReconciliationCard            <!-- new: period flow + variance -->
  reconciliation={reconciliation}
  periodLabel={currentMonthDisplay}
/>
<AccountActions ... />                <!-- existing: action buttons -->
```

The reconciliation card only renders when `accounts.length > 0` (inside the existing non-empty branch).

---

## Acceptance Criteria Mapping

| Criterion | Implementation |
|-----------|---------------|
| Portfolio summary shows income, expenses, net flow | `AccountReconciliationCard` renders these per currency |
| Net flow compared against balance change | `variance = balanceChange − netFlow` in `calculateReconciliation()` |
| Variance shown with color indicator | Green badge (balanced), amber badge + tooltip (gap) |
| Tooltip explains variance | Info icon with descriptive tooltip text |
| Works for current and historical month views | `accounts` already handles both; `getSnapshotForMonth` covers both via period params |
| Respects existing filters (currency, owner) | Filters passed to both `getMonthSummary` and `getSnapshotForMonth` |

---

## Out of Scope

- Modifying or creating transactions
- Currency conversion for multi-currency comparisons
- Detailed breakdown of variance causes
- Transaction editing from accounts page
