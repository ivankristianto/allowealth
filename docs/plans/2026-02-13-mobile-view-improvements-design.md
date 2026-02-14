# Mobile UI/UX Improvements Design

**Date:** 2026-02-13
**Baseline device:** iPhone 12 Pro
**Scope:** Mobile view (extended to tablet where applicable)

## 1. MobileNavigation

**File:** `src/components/layouts/MobileNavigation.astro`

- Rename "Activity" to "Transactions", swap `Receipt` icon to `ArrowLeftRight`
- FAB: `rounded-2xl` → `rounded-full`
- Reduce nav height ~12%: `h-14` → `h-12`, `pt-3` → `pt-2`
- Stronger border/shadow: `border-base-300/50` → `border-base-300`, shadow opacity `0.05` → `0.12`
- Sentence case labels: remove `uppercase` class

## 2. SpendingCard

**File:** `src/components/organisms/SpendingCard.astro`

- Remove percentage pill (`getStatusBadgeClasses` badge) — duplicates ProgressBar
- "MONTHLY EXPENSES" → "Expenses"
- Remove BudgetAlertBanner conditional rendering — ProgressBar color is sufficient
- Income/Net Savings: `grid-cols-2` → `grid-cols-1` on mobile (below `@xs`), `@xs:grid-cols-2` on wider
- Clean up unused imports (`BudgetAlertBanner`, `getStatusBadgeClasses`)

## 3. SpendingChart

**File:** `src/components/organisms/SpendingChart.astro`

- Header: Replace "Spending analysis" + "BY MAJOR CATEGORIES" with "Most spending categories"
- "Other" legend item: add `Info` icon with DaisyUI tooltip showing combined category names
- Pass `otherCategoryNames` from dashboard service to component via data attribute
- Update `aria-label` to match new heading

## 4. RecentTransactionsList

**File:** `src/components/molecules/RecentTransactionsList.astro`

- "Recent activity" → "Recent transactions"
- Move heading inside Card (pattern from CategoryIntelligenceTable: header with `border-b`)

## 5. Date-Grouped Transaction Lists

**Affects all 4 transaction list components (desktop + mobile):**

- `src/components/molecules/RecentTransactionsList.astro`
- `src/components/organisms/TransactionList.astro`
- `src/components/partials/TransactionListPartial.astro`
- `src/components/partials/CategoryTransactionListPartial.astro`

### Utility

New file: `src/lib/utils/transaction-grouping.ts`

```typescript
interface DateGroup {
  label: string; // "Today", "Yesterday", "10 February 2026"
  dateKey: string; // "2026-02-13" for keying
  transactions: TransactionOutput[];
}

function groupTransactionsByDate(transactions: TransactionOutput[]): DateGroup[];
```

- Groups by `transaction_date`, ordered by date descending
- Labels: "Today", "Yesterday", or `d MMMM yyyy` format

### Date divider style

Simple text divider, not sticky:

```text
text-xs font-semibold text-base-content/50 uppercase tracking-wide py-2 px-4
```

### Components

Each component wraps its transaction list in grouped sections with date dividers.
TransactionCard retains its own date display (used in other contexts).

## Decisions

- **Percentage pill:** Removed entirely (ProgressBar + percentage text below bar is sufficient)
- **Date headers:** Simple text dividers, not sticky
- **"Other" info:** Tooltip on hover/tap with info icon
- **Menu text casing:** Sentence case (not ALL CAPS)
