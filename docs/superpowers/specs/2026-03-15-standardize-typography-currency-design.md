# Standardize Typography & Currency Formatting

**Ticket:** ALL-50 (partial — typography and currency formatting only)
**Branch:** `standardize-typography`
**Date:** 2026-03-15

## Problem

Currency values use SF Mono (`font-mono`) while all other text uses Inter. This creates visual vibration — inconsistent character widths across summary cards, transaction lists, and tables. Five components bypass the centralized currency formatter, producing raw integers or missing symbols.

## Solution

Two changes, applied together:

1. **Switch all numeric rendering to Inter with tabular figures.** Apply `font-variant-numeric: tabular-nums` globally on `html`. Remove SF Mono from `Currency.astro`. Remove 20 now-redundant `tabular-nums` utility classes scattered across components.

2. **Route all currency display through `formatCurrency()`.** Fix five components that bypass the centralized formatter.

## Design

### 1. Global Tabular Figures

Add `font-variant-numeric: tabular-nums` to the `html` rule in `globals.css`. Inter supports tabular figures natively — every digit renders at equal width, ensuring vertical alignment in tables, cards, and lists without a monospace font.

**`Currency.astro` change:** Replace `font-mono font-medium` with `font-medium`. The global `tabular-nums` rule handles digit alignment; no per-component class needed.

**`Percentage.astro` change:** Same treatment — replace `font-mono font-medium` with `font-medium` in `src/components/atoms/Percentage.astro`. This component displays percentages with the same monospace pattern and must match.

**Redundant class cleanup:** Remove `tabular-nums` from these 20 files (the global rule makes them unnecessary):

- `src/pages/accounts/[id].astro`
- `src/pages/accounts/bulk-add-accounts.client.ts`
- `src/components/partials/TransactionSummaryPartial.astro`
- `src/components/partials/IncomeMemberTablePartial.astro`
- `src/components/partials/IncomeSourceTablePartial.astro`
- `src/components/partials/IncomeSummaryCardsPartial.astro`
- `src/components/partials/MemberSpendingTablePartial.astro`
- `src/components/partials/OverviewPreviewCardsPartial.astro`
- `src/components/partials/OverviewSummaryCardsPartial.astro`
- `src/components/partials/RecurringStatsPartial.astro`
- `src/components/partials/IncomeHistoryTablePartial.astro`
- `src/components/organisms/TransactionDrawer.astro`
- `src/components/organisms/TransactionDrawer.client.ts`
- `src/components/organisms/TransactionSummaryCards.astro`
- `src/components/organisms/RecurringPendingList.astro`
- `src/components/organisms/RecurringTemplateList.astro`
- `src/components/organisms/ForecastTable.astro`
- `src/components/organisms/ForecastSummary.astro`
- `src/components/organisms/AccountPortfolioSummary.astro`
- `src/components/molecules/TransactionDateGroups.astro`

### 2. Currency Formatting Fixes

The centralized formatter (`src/lib/formatting/currency-core.ts`) produces the correct format: `-Rp30.429.572,00`. Five components bypass it.

#### Fix 1: src/components/organisms/BudgetImportModal.astro (line ~282)

**Before:** CSV preview renders raw `budget_amount` with `class="text-right font-mono"` — displays `50000000` in SF Mono.
**After:** Pass through `formatCurrency(parseFloat(row.budget_amount), currency)` and remove `font-mono` from the `<td>` class. Currency value is read from the `[data-import-currency]` hidden input in client scope (not the Astro prop).

#### Fix 2: src/components/partials/TransactionHistoryPartial.astro (line ~95)

**Before:** Audit log concatenates currency code and raw amount — displays `IDR 50000000`.
**After:** Use `formatCurrency(entry.newValue.amount, entry.newValue.currency)`.

#### Fix 3: src/components/molecules/TransactionCard.astro (line ~191)

**Before:** `aria-label` includes raw amount and currency code — screen readers announce `2940175 IDR`.
**After:** Use `formatCurrency(amount, transaction?.currency)` so screen readers announce `Rp2.940.175,00`.

#### Fix 4: src/components/organisms/RecurringPage.client.ts (line ~415)

**Before:** Uses `formatAmountForDisplay()` (number-only, no symbol) then appends raw currency code — displays `Original: 5.000.000 IDR`.
**After:** Import `formatCurrency` from `currency-client.ts` to produce `Original: Rp5.000.000,00`.

#### Fix 5: src/components/organisms/RecurringBillsWidget.client.ts (line ~99)

Same pattern as Fix 4. Replace `formatAmountForDisplay()` + currency code with `formatCurrency()`.

## Out of Scope

These items from ALL-50 are deferred to a follow-up ticket:

- Synthesized "Total Net Worth" in base currency (requires exchange rate infrastructure)
- Widget deduplication across Dashboard, Accounts, and Reports pages
- Account action consolidation into kebab menus
- Refactoring `formatAmountForDisplay()` itself (it serves input fields correctly; we only fix its misuse in display text)
- Chart tooltip/label formatting (already correct via `formatCurrencyAbbreviated()`)

## Verification

- Visual check across all pages: dashboard, transactions, accounts, budget, reports, recurring, forecast
- Confirm digit alignment in tables and summary cards (light and dark themes)
- Confirm screen reader announces formatted currency on TransactionCard
- Run quality gates: `bun run lint:fix`, `bun run stylelint:fix`, `bun run format:fix`, `bun run typecheck`

## Success Criteria

From ALL-50:

- [x] All currency values across the app use `tabular-nums`
- [x] All currency strings follow the centralized formatting rule
- [x] Raw integers in display contexts are replaced with formatted strings
