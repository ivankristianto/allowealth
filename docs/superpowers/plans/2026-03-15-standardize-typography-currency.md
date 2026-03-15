# Standardize Typography & Currency Formatting — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Switch all numeric rendering from SF Mono to Inter with tabular figures, and fix five components that bypass the centralized currency formatter.

**Architecture:** Global `font-variant-numeric: tabular-nums` on `html` replaces per-component monospace font and scattered utility classes. Five formatting bypass spots are routed through the existing `formatCurrency()` utility.

**Tech Stack:** Tailwind CSS v4, DaisyUI v5, Astro 5.x, TypeScript

**Spec:** `docs/superpowers/specs/2026-03-15-standardize-typography-currency-design.md`

---

## Chunk 1: Typography Changes

### Task 1: Add global `tabular-nums` and update atom components

**Files:**

- Modify: `src/styles/globals.css:112-116`
- Modify: `src/components/atoms/Currency.astro:57-58`
- Modify: `src/components/atoms/Percentage.astro:67-68`

- [ ] **Step 1: Add `font-variant-numeric: tabular-nums` to the `html` rule in `globals.css`**

In `src/styles/globals.css`, update the `html` block (line 112) from:

```css
html {
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

to:

```css
html {
  font-family: var(--font-sans);
  font-variant-numeric: tabular-nums;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

- [ ] **Step 2: Update `Currency.astro` — remove `font-mono`**

In `src/components/atoms/Currency.astro`, change line 58 from:

```typescript
  'font-mono font-medium',
```

to:

```typescript
  'font-medium',
```

- [ ] **Step 3: Update `Percentage.astro` — remove `font-mono`**

In `src/components/atoms/Percentage.astro`, change line 68 from:

```typescript
  'font-mono font-medium',
```

to:

```typescript
  'font-medium',
```

- [ ] **Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add src/styles/globals.css src/components/atoms/Currency.astro src/components/atoms/Percentage.astro
git commit -m "feat: switch numeric rendering to Inter with global tabular-nums (ALL-50)

Add font-variant-numeric: tabular-nums to html rule. Remove font-mono
from Currency.astro and Percentage.astro — Inter's tabular figures
provide equal-width digits without a monospace font."
```

### Task 2: Remove redundant `tabular-nums` classes from 20 files

**Files (all modify):**

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

- [ ] **Step 1: Remove `tabular-nums` from all 20 files**

For each file, find all occurrences of `tabular-nums` in class strings and remove them. The class is now global via `html { font-variant-numeric: tabular-nums }`.

Examples of what to look for and change:

```
# Pattern: " tabular-nums" (space before) — remove including the space
class="text-right tabular-nums"  →  class="text-right"

# Pattern: "tabular-nums " (space after) — remove including the space
class="tabular-nums text-sm"  →  class="text-sm"

# Pattern: sole class — remove the entire class attribute if it was the only class,
# or just the word if other classes remain
```

Be careful not to remove other classes. Only remove the `tabular-nums` token and any adjacent whitespace that would become doubled.

- [ ] **Step 2: Verify no `tabular-nums` remains in the codebase**

Run: `grep -r "tabular-nums" src/ --include="*.astro" --include="*.ts" --include="*.tsx"`
Expected: No output (zero matches)

- [ ] **Step 3: Run quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

Expected: All pass with 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/pages/accounts/\[id\].astro src/pages/accounts/bulk-add-accounts.client.ts \
  src/components/partials/TransactionSummaryPartial.astro \
  src/components/partials/IncomeMemberTablePartial.astro \
  src/components/partials/IncomeSourceTablePartial.astro \
  src/components/partials/IncomeSummaryCardsPartial.astro \
  src/components/partials/MemberSpendingTablePartial.astro \
  src/components/partials/OverviewPreviewCardsPartial.astro \
  src/components/partials/OverviewSummaryCardsPartial.astro \
  src/components/partials/RecurringStatsPartial.astro \
  src/components/partials/IncomeHistoryTablePartial.astro \
  src/components/organisms/TransactionDrawer.astro \
  src/components/organisms/TransactionDrawer.client.ts \
  src/components/organisms/TransactionSummaryCards.astro \
  src/components/organisms/RecurringPendingList.astro \
  src/components/organisms/RecurringTemplateList.astro \
  src/components/organisms/ForecastTable.astro \
  src/components/organisms/ForecastSummary.astro \
  src/components/organisms/AccountPortfolioSummary.astro \
  src/components/molecules/TransactionDateGroups.astro
git commit -m "refactor: remove 20 redundant tabular-nums classes (ALL-50)

Global html rule now handles tabular figures. Remove per-component
tabular-nums utility classes that are no longer needed."
```

---

## Chunk 2: Currency Formatting Fixes

### Task 3: Fix BudgetImportModal — format CSV preview amounts

**Files:**

- Modify: `src/components/organisms/BudgetImportModal.astro:142-143,282`

- [ ] **Step 1: Add `formatCurrency` import to the client script**

In `src/components/organisms/BudgetImportModal.astro`, update the imports at line 142-143 from:

```typescript
import { addToast } from '@/lib/stores/toastStore';
import { getCsrfHeaders } from '@/lib/csrf-client';
```

to:

```typescript
import { addToast } from '@/lib/stores/toastStore';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { formatCurrency } from '@/lib/formatting/currency-client';
```

- [ ] **Step 2: Format the preview amount and remove `font-mono`**

At line 282, change:

```typescript
`<tr><td>${escapeHtml(row.budget_name)}</td><td class="text-right font-mono">${escapeHtml(row.budget_amount)}</td></tr>`;
```

to:

```typescript
`<tr><td>${escapeHtml(row.budget_name)}</td><td class="text-right">${formatCurrency(parseFloat(row.budget_amount) || 0, container.querySelector<HTMLInputElement>('[data-import-currency]')?.value || 'IDR')}</td></tr>`;
```

Note: `currencyInput` is defined at line 367 inside a different function scope (the submit handler), so we read the currency inline from the DOM here.

- [ ] **Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/components/organisms/BudgetImportModal.astro
git commit -m "fix: format currency amounts in budget CSV preview (ALL-50)

Budget import preview was showing raw integers. Route through
formatCurrency() and remove font-mono from the table cell."
```

### Task 4: Fix TransactionHistoryPartial — format audit log amounts

**Files:**

- Modify: `src/components/partials/TransactionHistoryPartial.astro:9,94-95`

- [ ] **Step 1: Add `formatCurrency` import**

In `src/components/partials/TransactionHistoryPartial.astro`, add after line 9:

```typescript
import { formatCurrency } from '@/lib/formatting/currency';
```

- [ ] **Step 2: Replace raw amount concatenation**

At line 94-95, change:

```typescript
                      entry.newValue.amount && entry.newValue.currency
                        ? `${entry.newValue.currency} ${entry.newValue.amount}`
```

to:

```typescript
                      entry.newValue.amount && entry.newValue.currency
                        ? formatCurrency(entry.newValue.amount, entry.newValue.currency)
```

- [ ] **Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/components/partials/TransactionHistoryPartial.astro
git commit -m "fix: format currency in transaction audit log (ALL-50)

Audit log was showing 'IDR 50000000' by concatenating currency code and
raw amount. Route through formatCurrency() for proper formatting."
```

### Task 5: Fix TransactionCard — format aria-label amounts

**Files:**

- Modify: `src/components/molecules/TransactionCard.astro:15,191`

- [ ] **Step 1: Add `formatCurrency` import**

In `src/components/molecules/TransactionCard.astro`, add after line 15 (after `import Currency from '../atoms/Currency.astro';`):

```typescript
import { formatCurrency } from '@/lib/formatting/currency';
```

- [ ] **Step 2: Format the aria-label amount**

At line 191, change:

```typescript
      aria-label={`${transaction?.type === 'income' ? 'Income' : 'Expense'}: ${primaryText}, ${amount} ${transaction?.currency}`}
```

to:

```typescript
      aria-label={`${transaction?.type === 'income' ? 'Income' : 'Expense'}: ${primaryText}, ${formatCurrency(amount, transaction?.currency)}`}
```

- [ ] **Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add src/components/molecules/TransactionCard.astro
git commit -m "fix: format currency in transaction card aria-label (ALL-50)

Screen readers were announcing raw integers like '2940175 IDR'. Route
through formatCurrency() so they announce 'Rp2.940.175,00'."
```

### Task 6: Fix RecurringPage and RecurringBillsWidget — format modal original amounts

**Files:**

- Modify: `src/components/organisms/RecurringPage.client.ts:1-8,415`
- Modify: `src/components/organisms/RecurringBillsWidget.client.ts:1-7,99`

- [ ] **Step 1: Add `formatCurrency` import to RecurringPage.client.ts**

In `src/components/organisms/RecurringPage.client.ts`, add after line 9 (after the `currency` imports):

```typescript
import { formatCurrency } from '@/lib/formatting/currency-client';
```

- [ ] **Step 2: Fix the original amount display in RecurringPage.client.ts**

At line 415, change:

```typescript
originalAmount.textContent = `Original: ${formatAmountForDisplay(occurrence.templateAmount, confirmCurrency)} ${occurrence.currency}`;
```

to:

```typescript
originalAmount.textContent = `Original: ${formatCurrency(parseFloat(occurrence.templateAmount) || 0, confirmCurrency)}`;
```

- [ ] **Step 3: Add `formatCurrency` import to RecurringBillsWidget.client.ts**

In `src/components/organisms/RecurringBillsWidget.client.ts`, add after line 8 (after the `currency` imports):

```typescript
import { formatCurrency } from '@/lib/formatting/currency-client';
```

- [ ] **Step 4: Fix the original amount display in RecurringBillsWidget.client.ts**

At line 99, change:

```typescript
originalAmount.textContent = `Original: ${formatAmountForDisplay(occurrence.templateAmount, confirmCurrency)} ${occurrence.currency}`;
```

to:

```typescript
originalAmount.textContent = `Original: ${formatCurrency(parseFloat(occurrence.templateAmount) || 0, confirmCurrency)}`;
```

- [ ] **Step 5: Check if `formatAmountForDisplay` can be removed from imports**

In both files, check if `formatAmountForDisplay` is still used elsewhere after the fix. If only used on the line we changed, remove it from the import statement. If still used on other lines (e.g., line 409 for the input field value), keep it.

For `RecurringPage.client.ts` — `formatAmountForDisplay` is still used at line 409 for the input field value. Keep in imports.

For `RecurringBillsWidget.client.ts` — `formatAmountForDisplay` is still used at line 94 for the input field value. Keep in imports.

- [ ] **Step 6: Run quality gates**

```bash
bun run lint:fix
bun run format:fix
bun run typecheck
```

Expected: All pass with 0 errors

- [ ] **Step 7: Commit**

```bash
git add src/components/organisms/RecurringPage.client.ts src/components/organisms/RecurringBillsWidget.client.ts
git commit -m "fix: format currency in recurring bill confirmation modals (ALL-50)

Original amount was showing '5.000.000 IDR' by using formatAmountForDisplay
(number-only) then appending the currency code. Use formatCurrency() to
produce 'Rp5.000.000,00' with proper symbol placement."
```

### Task 7: Final quality gates and verification

- [ ] **Step 1: Run full quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

Expected: All pass with 0 errors

- [ ] **Step 2: Verify no raw `tabular-nums` classes remain**

Run: `grep -r "tabular-nums" src/ --include="*.astro" --include="*.ts"`
Expected: No output

- [ ] **Step 3: Verify no `font-mono` on currency/percentage components**

Run: `grep -n "font-mono" src/components/atoms/Currency.astro src/components/atoms/Percentage.astro`
Expected: No output

- [ ] **Step 4: Build verification**

Run: `bun run build`
Expected: Build succeeds with no errors
