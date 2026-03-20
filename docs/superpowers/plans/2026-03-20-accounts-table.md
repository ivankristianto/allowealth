# Accounts Table Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an inline-grouped table view to the accounts page for faster scanning, with allocation percentages per currency basket, clickable column sorting, and responsive mobile cards.

**Architecture:** New `AccountTable.astro` component renders a single `<table>` with colored group header `<tr>` rows (Liquid → Debt → Non-Liquid) and account data rows beneath each group. A view toggle (card/table) follows the budget page pattern. Client-side scripts handle sorting within groups and view persistence. A new `calculateClassAllocation()` utility computes per-currency-basket allocation percentages.

**Tech Stack:** Astro 5.x components, Tailwind CSS v4 + DaisyUI v5, vanilla TypeScript client scripts, bun:test

**Spec:** `docs/superpowers/specs/2026-03-20-accounts-table-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/lib/utils/account.ts` | Modify | Add `calculateClassAllocation()` function |
| `src/lib/utils/__tests__/account-class-allocation.test.ts` | Create | Unit tests for allocation calculation |
| `src/components/molecules/AccountTableRow.astro` | Create | Single account row in table format |
| `src/components/organisms/AccountTable.astro` | Create | Full table with group headers + rows |
| `src/components/molecules/AccountFilterControls.astro` | Create | Filter bar wrapper with view toggle buttons |
| `src/components/organisms/accounts-table.client.ts` | Create | View toggle + column sorting scripts |
| `src/pages/accounts/index.astro` | Modify | Wire table view, filter controls, view toggle |

---

### Task 1: Allocation Percentage Utility

Add `calculateClassAllocation()` to compute per-currency-basket allocation percentages for each account class.

**Files:**
- Create: `src/lib/utils/__tests__/account-class-allocation.test.ts`
- Modify: `src/lib/utils/account.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/utils/__tests__/account-class-allocation.test.ts`:

```typescript
import { describe, it, expect } from 'bun:test';
import { calculateClassAllocation } from '../account';
import type { AccountOutput } from '@/lib/types/account';

function makeAccount(overrides: Partial<AccountOutput>): AccountOutput {
  return {
    id: 'acc-1',
    name: 'Test',
    type: 'bank_account',
    account_class: 'liquid',
    currency: 'IDR' as any,
    balance: '0',
    status: 'active',
    workspace_id: 'ws-1',
    created_by_user_id: 'u-1',
    last_updated: new Date().toISOString(),
    created_at: new Date().toISOString(),
    ...overrides,
  } as AccountOutput;
}

describe('calculateClassAllocation', () => {
  it('returns percentages for single currency', () => {
    const accounts = [
      makeAccount({ id: '1', account_class: 'liquid', balance: '30000', currency: 'IDR' as any }),
      makeAccount({ id: '2', account_class: 'non_liquid', balance: '60000', currency: 'IDR' as any }),
      makeAccount({ id: '3', account_class: 'debt', balance: '-10000', currency: 'IDR' as any }),
    ];

    const result = calculateClassAllocation(accounts, 'IDR' as any);

    // Non-debt total = 30000 + 60000 = 90000
    // Liquid: 30000 / 90000 = 33%
    // Non-liquid: 60000 / 90000 = 67%
    // Debt: abs(-10000) / 90000 = 11%
    expect(result.liquid.percentage).toBe(33);
    expect(result.non_liquid.percentage).toBe(67);
    expect(result.debt.percentage).toBe(11);
  });

  it('only counts accounts matching the selected currency', () => {
    const accounts = [
      makeAccount({ id: '1', account_class: 'liquid', balance: '50000', currency: 'IDR' as any }),
      makeAccount({ id: '2', account_class: 'liquid', balance: '1000', currency: 'USD' as any }),
      makeAccount({ id: '3', account_class: 'non_liquid', balance: '50000', currency: 'IDR' as any }),
    ];

    const result = calculateClassAllocation(accounts, 'IDR' as any);

    // Only IDR counted: liquid 50000, non_liquid 50000, total 100000
    expect(result.liquid.percentage).toBe(50);
    expect(result.non_liquid.percentage).toBe(50);
    expect(result.debt.percentage).toBe(0);
  });

  it('returns target status for each class', () => {
    const accounts = [
      makeAccount({ id: '1', account_class: 'liquid', balance: '35000', currency: 'IDR' as any }),
      makeAccount({ id: '2', account_class: 'non_liquid', balance: '60000', currency: 'IDR' as any }),
      makeAccount({ id: '3', account_class: 'debt', balance: '-5000', currency: 'IDR' as any }),
    ];

    const result = calculateClassAllocation(accounts, 'IDR' as any);

    // Liquid 37% >= 30% target -> on_target
    expect(result.liquid.onTarget).toBe(true);
    // Debt ~5% <= 10% target -> on_target
    expect(result.debt.onTarget).toBe(true);
  });

  it('flags liquid below 30% as off target', () => {
    const accounts = [
      makeAccount({ id: '1', account_class: 'liquid', balance: '10000', currency: 'IDR' as any }),
      makeAccount({ id: '2', account_class: 'non_liquid', balance: '90000', currency: 'IDR' as any }),
    ];

    const result = calculateClassAllocation(accounts, 'IDR' as any);

    // Liquid 10% < 30% -> off target
    expect(result.liquid.onTarget).toBe(false);
  });

  it('flags debt above 10% as off target', () => {
    const accounts = [
      makeAccount({ id: '1', account_class: 'liquid', balance: '40000', currency: 'IDR' as any }),
      makeAccount({ id: '2', account_class: 'non_liquid', balance: '40000', currency: 'IDR' as any }),
      makeAccount({ id: '3', account_class: 'debt', balance: '-20000', currency: 'IDR' as any }),
    ];

    const result = calculateClassAllocation(accounts, 'IDR' as any);

    // Debt: abs(-20000) / 80000 = 25% > 10% -> off target
    expect(result.debt.onTarget).toBe(false);
  });

  it('handles empty accounts', () => {
    const result = calculateClassAllocation([], 'IDR' as any);

    expect(result.liquid.percentage).toBe(0);
    expect(result.non_liquid.percentage).toBe(0);
    expect(result.debt.percentage).toBe(0);
  });

  it('handles zero-balance accounts', () => {
    const accounts = [
      makeAccount({ id: '1', account_class: 'liquid', balance: '0', currency: 'IDR' as any }),
    ];

    const result = calculateClassAllocation(accounts, 'IDR' as any);

    expect(result.liquid.percentage).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `bun test src/lib/utils/__tests__/account-class-allocation.test.ts`
Expected: FAIL — `calculateClassAllocation` is not exported from `../account`

- [ ] **Step 3: Implement calculateClassAllocation**

Add to `src/lib/utils/account.ts` (after the existing `calculateGroupTotalsByCurrency` function, around line 321):

```typescript
/**
 * Per-class allocation result for a single currency basket.
 */
export interface ClassAllocationResult {
  percentage: number;
  onTarget: boolean;
}

/**
 * Allocation percentages per account class for a single currency.
 *
 * - Liquid and non-liquid: percentage of non-debt total
 * - Debt: abs(debt) / non-debt total
 * - Targets: liquid >= 30%, debt <= 10%, non-liquid has no target (always true)
 */
export function calculateClassAllocation(
  accounts: AccountOutput[],
  currency: Currency
): Record<AccountClass, ClassAllocationResult> {
  let liquidTotal = 0;
  let nonLiquidTotal = 0;
  let debtTotal = 0;

  for (const account of accounts) {
    if (account.currency !== currency) continue;
    const balance = parseFloat(account.balance || '0');
    if (isNaN(balance)) continue;

    if (account.account_class === 'debt') {
      debtTotal += Math.abs(balance);
    } else if (account.account_class === 'non_liquid') {
      if (balance > 0) nonLiquidTotal += balance;
    } else {
      if (balance > 0) liquidTotal += balance;
    }
  }

  const nonDebtTotal = liquidTotal + nonLiquidTotal;

  const liquidPct = nonDebtTotal > 0 ? Math.round((liquidTotal / nonDebtTotal) * 100) : 0;
  const nonLiquidPct = nonDebtTotal > 0 ? Math.round((nonLiquidTotal / nonDebtTotal) * 100) : 0;
  const debtPct = nonDebtTotal > 0 ? Math.round((debtTotal / nonDebtTotal) * 100) : 0;

  return {
    liquid: { percentage: liquidPct, onTarget: liquidPct >= 30 },
    non_liquid: { percentage: nonLiquidPct, onTarget: true },
    debt: { percentage: debtPct, onTarget: debtPct <= 10 },
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `bun test src/lib/utils/__tests__/account-class-allocation.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Run quality gates**

Run: `bun run lint:fix && bun run format:fix && bun run typecheck`

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils/account.ts src/lib/utils/__tests__/account-class-allocation.test.ts
git commit -m "feat(accounts): add calculateClassAllocation utility (ALL-57)

Per-currency-basket allocation percentages for each account class
(liquid/non-liquid/debt) with on-target indicators. Liquid target
>= 30%, debt target <= 10%."
```

---

### Task 2: AccountTableRow Component

Individual account row rendered as a `<tr>` inside the table. Mirrors `AccountItemRow` data but in table column format.

**Files:**
- Create: `src/components/molecules/AccountTableRow.astro`

**Reference:** `src/components/molecules/AccountItemRow.astro` (same props interface)

- [ ] **Step 1: Create AccountTableRow component**

Create `src/components/molecules/AccountTableRow.astro`:

```astro
---
/**
 * AccountTableRow Component
 *
 * Single account rendered as a table row (<tr>) inside AccountTable.
 * Shows: name, type, category, owner, balance, last updated, actions.
 *
 * Mirrors AccountItemRow data but in columnar format.
 * Non-matching currency rows get reduced opacity via data attribute.
 */

import { TrendingUp, Pencil, Ellipsis, PowerOff, Eye } from '@lucide/astro';
import Button from '@/components/atoms/Button.astro';
import { formatCurrency } from '@/lib/formatting';
import { ACCOUNT_TYPE_LABELS, type AccountType } from '@/lib/types/account';

export interface Props {
  id: string;
  name: string;
  type: AccountType;
  accountClass?: string;
  ownerUserId?: string;
  ownerName?: string;
  categoryId?: string | null;
  categoryName?: string | null;
  currency: Currency;
  balance: number;
  initialBalance?: number;
  lastUpdated: Date;
  isHistoricalView?: boolean;
  isDimmed?: boolean;
}

import type { Currency } from '@/lib/constants/currency';

const {
  id,
  name,
  type,
  accountClass,
  ownerUserId = '',
  ownerName,
  categoryId = null,
  categoryName = null,
  currency,
  balance,
  lastUpdated,
  isHistoricalView = false,
  isDimmed = false,
} = Astro.props;

const typeLabel = ACCOUNT_TYPE_LABELS[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const isDebt = accountClass === 'debt';
const formattedBalance = formatCurrency(balance, currency);
const formattedDate = lastUpdated.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
---

<tr
  class:list={[
    'border-b border-base-300 hover:bg-base-200/30 transition-colors',
    isDimmed && 'opacity-50',
  ]}
  data-account-table-row={id}
  data-account-name={name.toLowerCase()}
  data-sort-balance={Math.abs(balance)}
  data-sort-name={name.toLowerCase()}
  data-sort-type={typeLabel.toLowerCase()}
  data-sort-category={(categoryName || '').toLowerCase()}
  data-sort-owner={(ownerName || '').toLowerCase()}
  data-sort-updated={lastUpdated.getTime()}
>
  <!-- Account Name -->
  <td class="px-4 md:px-6 py-3 md:py-4 pl-6 md:pl-8 font-medium text-base-content">
    <a
      href={`/accounts/${id}`}
      class="hover:text-primary transition-colors"
    >
      {name}
    </a>
  </td>

  <!-- Type -->
  <td class="px-4 md:px-6 py-3 md:py-4 text-base-content/60 text-sm">
    {typeLabel}
  </td>

  <!-- Category -->
  <td class="px-4 md:px-6 py-3 md:py-4 text-base-content/60 text-sm">
    {categoryName || '—'}
  </td>

  <!-- Owner -->
  <td class="px-4 md:px-6 py-3 md:py-4 text-base-content/60 text-sm">
    {ownerName || '—'}
  </td>

  <!-- Balance -->
  <td class:list={[
    'px-4 md:px-6 py-3 md:py-4 text-right font-medium tabular-nums',
    isDebt ? 'text-error' : 'text-base-content',
  ]}>
    {formattedBalance}
  </td>

  <!-- Updated -->
  <td class="px-4 md:px-6 py-3 md:py-4 text-base-content/60 text-sm">
    {formattedDate}
  </td>

  <!-- Actions -->
  <td class="px-4 md:px-6 py-3 md:py-4 text-center">
    {!isHistoricalView && (
      <div class="inline-flex items-center gap-1">
        <Button
          variant="ghost"
          size="xs"
          className="btn-square"
          data-update-value-account={id}
          data-account-name={name}
          data-account-balance={balance}
          data-account-currency={currency}
          aria-label={`Update ${name} balance`}
        >
          <TrendingUp size={14} aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="xs"
          className="btn-square"
          data-edit-account={id}
          data-account-name={name}
          data-account-type={type}
          data-account-category-id={categoryId || ''}
          data-account-category-name={categoryName || ''}
          data-account-owner-id={ownerUserId}
          data-account-currency={currency}
          data-account-balance={balance}
          aria-label={`Edit ${name}`}
        >
          <Pencil size={14} aria-hidden="true" />
        </Button>
        <div class="dropdown dropdown-end">
          <Button
            variant="ghost"
            size="xs"
            className="btn-square"
            tabindex={0}
            aria-label={`More actions for ${name}`}
          >
            <Ellipsis size={14} aria-hidden="true" />
          </Button>
          <ul class="dropdown-content menu bg-base-200 rounded-box z-10 w-48 p-2 shadow-lg border border-base-300">
            <li>
              <button data-history-account={id} data-account-name={name}>
                <Eye size={14} aria-hidden="true" />
                View Timeline
              </button>
            </li>
            <li>
              <a href={`/accounts/${id}`}>
                <Eye size={14} aria-hidden="true" />
                Details
              </a>
            </li>
            <li>
              <button
                class="text-error"
                data-close-account={id}
                data-account-name={name}
              >
                <PowerOff size={14} aria-hidden="true" />
                Deactivate
              </button>
            </li>
          </ul>
        </div>
      </div>
    )}
  </td>
</tr>
```

- [ ] **Step 2: Run quality gates**

Run: `bun run lint:fix && bun run format:fix && bun run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/components/molecules/AccountTableRow.astro
git commit -m "feat(accounts): add AccountTableRow component (ALL-57)

Table row for individual accounts with name, type, category, owner,
balance, updated date, and action buttons. Supports dimmed state for
non-matching currency rows."
```

---

### Task 3: AccountTable Component

Full table with inline group header rows and account rows. Uses `calculateClassAllocation()` for percentage badges.

**Files:**
- Create: `src/components/organisms/AccountTable.astro`

**Reference:** `src/components/organisms/BudgetTable.astro` for table structure and styling patterns.

- [ ] **Step 1: Create AccountTable component**

Create `src/components/organisms/AccountTable.astro`:

```astro
---
/**
 * AccountTable Component
 *
 * Table view for accounts grouped by class with inline header rows.
 * Group order: Liquid → Debt → Non-Liquid.
 *
 * Each group header shows: class name, subtitle, account count,
 * currency subtotals, and allocation percentage badge.
 *
 * Columns are sortable via client-side DOM reorder (accounts-table.client.ts).
 */

import AccountTableRow from '@/components/molecules/AccountTableRow.astro';
import { formatCurrency } from '@/lib/formatting';
import {
  groupAccountsByClass,
  calculateGroupTotalsByCurrency,
  calculateClassAllocation,
} from '@/lib/utils/account';
import { ACCOUNT_CLASS_LABELS, type AccountClass, type AccountOutput } from '@/lib/types/account';
import type { Currency } from '@/lib/constants/currency';
import { Wallet } from '@lucide/astro';

const ACCOUNT_CLASS_SUBTITLES: Record<AccountClass, string> = {
  liquid: 'Cash & equivalents',
  non_liquid: 'Investments & holdings',
  debt: 'Liabilities & loans',
};

/** Group order per spec: Liquid → Debt → Non-Liquid */
const CLASS_ORDER: AccountClass[] = ['liquid', 'debt', 'non_liquid'];

/**
 * Color config per group — Tailwind arbitrary values for gradient backgrounds.
 * These colors match the existing AccountGroupCard scheme.
 */
const GROUP_COLORS: Record<AccountClass, {
  bgGradient: string;
  text: string;
  badgeBg: string;
  badgeText: string;
}> = {
  liquid: {
    bgGradient: 'bg-gradient-to-r from-[#1e3a2f] to-[#1a2e28]',
    text: 'text-[#b7e4c7]',
    badgeBg: 'bg-[#2d6a4f]',
    badgeText: 'text-[#b7e4c7]',
  },
  debt: {
    bgGradient: 'bg-gradient-to-r from-[#2d1a22] to-[#251520]',
    text: 'text-[#f4a5b5]',
    badgeBg: 'bg-[#6b2737]',
    badgeText: 'text-[#f4a5b5]',
  },
  non_liquid: {
    bgGradient: 'bg-gradient-to-r from-[#1a2d40] to-[#162538]',
    text: 'text-[#a9d6e5]',
    badgeBg: 'bg-[#1b4965]',
    badgeText: 'text-[#a9d6e5]',
  },
};

/** Extended account with resolved display names for rendering. */
export interface AccountWithDisplay extends AccountOutput {
  owner_name?: string;
  category_name?: string | null;
}

export interface Props {
  accounts: AccountWithDisplay[];
  primaryCurrency: Currency;
  currencyOrder: Currency[];
  isHistoricalView?: boolean;
}

const {
  accounts,
  primaryCurrency,
  currencyOrder,
  isHistoricalView = false,
} = Astro.props;

const accountsByClass = groupAccountsByClass(accounts);
const allocation = calculateClassAllocation(accounts, primaryCurrency);

const groups = CLASS_ORDER
  .filter((cls) => accountsByClass[cls].length > 0)
  .map((cls) => ({
    classKey: cls,
    label: ACCOUNT_CLASS_LABELS[cls],
    subtitle: ACCOUNT_CLASS_SUBTITLES[cls],
    accounts: accountsByClass[cls],
    totals: calculateGroupTotalsByCurrency(accountsByClass[cls], currencyOrder),
    allocation: allocation[cls],
    colors: GROUP_COLORS[cls],
  }));
---

{groups.length === 0 ? (
  <div class="flex flex-col items-center justify-center py-16 text-center">
    <div class="w-16 h-16 rounded-2xl bg-base-200 flex items-center justify-center mb-4">
      <Wallet size={32} class="stroke-base-content/40" aria-hidden="true" />
    </div>
    <h2 class="text-lg font-bold text-base-content mb-2">No accounts found</h2>
    <p class="text-sm text-neutral max-w-sm">
      Add your first account to start tracking your portfolio.
    </p>
  </div>
) : (
  <div class="bg-base-100 rounded-card border border-base-300 shadow-sm" data-account-table>
    <div class="overflow-hidden">
      <!-- Desktop table (hidden on mobile) -->
      <div class="hidden md:block">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-base-200/50 border-b border-base-300">
                <th class="px-4 md:px-6 py-4 pl-6 md:pl-8 text-xs font-bold text-base-content/40 uppercase tracking-widest cursor-pointer" data-sort-key="name">
                  Account <span class="text-base-content/20" data-sort-indicator="name">↕</span>
                </th>
                <th class="px-4 md:px-6 py-4 text-xs font-bold text-base-content/40 uppercase tracking-widest cursor-pointer" data-sort-key="type">
                  Type <span class="text-base-content/20" data-sort-indicator="type">↕</span>
                </th>
                <th class="px-4 md:px-6 py-4 text-xs font-bold text-base-content/40 uppercase tracking-widest cursor-pointer" data-sort-key="category">
                  Category <span class="text-base-content/20" data-sort-indicator="category">↕</span>
                </th>
                <th class="px-4 md:px-6 py-4 text-xs font-bold text-base-content/40 uppercase tracking-widest cursor-pointer" data-sort-key="owner">
                  Owner <span class="text-base-content/20" data-sort-indicator="owner">↕</span>
                </th>
                <th class="px-4 md:px-6 py-4 text-xs font-bold text-base-content/40 uppercase tracking-widest text-right cursor-pointer" data-sort-key="balance">
                  Balance <span class="text-base-content/20" data-sort-indicator="balance">↕</span>
                </th>
                <th class="px-4 md:px-6 py-4 text-xs font-bold text-base-content/40 uppercase tracking-widest cursor-pointer" data-sort-key="updated">
                  Updated <span class="text-base-content/20" data-sort-indicator="updated">↕</span>
                </th>
                <th class="px-4 md:px-6 py-4 text-xs font-bold text-base-content/40 uppercase tracking-widest text-center">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <>
                  {/* Group header row */}
                  <tr class={`${group.colors.bgGradient}`} data-group-header={group.classKey}>
                    <td colspan="7" class="px-4 md:px-6 py-3">
                      <div class="flex justify-between items-center flex-wrap gap-2">
                        <div class="flex items-center gap-2.5">
                          <span class={`font-bold text-sm ${group.colors.text}`}>
                            {group.label}
                          </span>
                          <span class={`${group.colors.text} opacity-60 text-xs`}>
                            {group.subtitle}
                          </span>
                          <span class={`${group.colors.badgeBg} ${group.colors.badgeText} px-2 py-0.5 rounded-full text-xs`}>
                            {group.accounts.length} {group.accounts.length === 1 ? 'account' : 'accounts'}
                          </span>
                        </div>
                        <div class="flex items-center gap-4 text-xs">
                          {group.totals.map((total, idx) => (
                            <span class={idx === 0 ? group.colors.text : `${group.colors.text} opacity-60`}>
                              {idx > 0 && '+ '}{formatCurrency(total.amount, total.currency)}
                            </span>
                          ))}
                          {group.allocation.percentage > 0 && (
                            <span class={`${group.colors.badgeBg} ${group.colors.badgeText} px-2.5 py-0.5 rounded-full font-semibold text-xs`}>
                              {group.allocation.percentage}% of {primaryCurrency}
                              {group.allocation.onTarget && ' ✓'}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                  {/* Account rows */}
                  {group.accounts.map((account) => (
                    <AccountTableRow
                      id={account.id}
                      name={account.name}
                      type={account.type}
                      accountClass={account.account_class}
                      ownerUserId={account.created_by_user_id}
                      ownerName={account.owner_name}
                      categoryId={account.category_id}
                      categoryName={account.category_name}
                      currency={account.currency}
                      balance={parseFloat(account.balance || '0')}
                      lastUpdated={new Date(account.last_updated || account.created_at)}
                      isHistoricalView={isHistoricalView}
                      isDimmed={account.currency !== primaryCurrency}
                    />
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Mobile stacked cards (hidden on desktop) -->
      <div class="md:hidden">
        {groups.map((group) => (
          <>
            {/* Mobile group header */}
            <div class={`${group.colors.bgGradient} px-3 py-2.5 border-b border-base-300`}>
              <div class="flex justify-between items-center">
                <span class={`font-bold text-sm ${group.colors.text}`}>
                  {group.label}
                </span>
                {group.allocation.percentage > 0 && (
                  <span class={`${group.colors.badgeBg} ${group.colors.badgeText} px-2 py-0.5 rounded-full text-xs font-semibold`}>
                    {group.allocation.percentage}% of {primaryCurrency}
                    {group.allocation.onTarget && ' ✓'}
                  </span>
                )}
              </div>
              <div class={`text-xs ${group.colors.text} opacity-60 mt-0.5`}>
                {group.accounts.length} {group.accounts.length === 1 ? 'account' : 'accounts'}
                {group.totals.map((total, idx) => (
                  <span>
                    {idx === 0 ? ' · ' : ' + '}
                    {formatCurrency(total.amount, total.currency)}
                  </span>
                ))}
              </div>
            </div>
            {/* Mobile account cards */}
            {group.accounts.map((account) => {
              const balance = parseFloat(account.balance || '0');
              const isDebt = account.account_class === 'debt';
              const isDimmed = account.currency !== primaryCurrency;
              const typeLabel = account.type.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
              const formattedDate = new Date(account.last_updated || account.created_at)
                .toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

              return (
                <div
                  class:list={[
                    'px-3 py-3 border-b border-base-300',
                    isDimmed && 'opacity-50',
                  ]}
                  data-account-table-row={account.id}
                  data-account-name={account.name.toLowerCase()}
                >
                  <div class="flex justify-between items-start">
                    <div>
                      <a href={`/accounts/${account.id}`} class="font-semibold text-sm text-base-content hover:text-primary transition-colors">
                        {account.name}
                      </a>
                      <div class="text-xs text-base-content/50 mt-0.5">
                        {typeLabel}
                        {account.category_name && ` · ${account.category_name}`}
                        {account.owner_name && ` · ${account.owner_name}`}
                      </div>
                    </div>
                    <div class="dropdown dropdown-end">
                      <button tabindex="0" class="btn btn-ghost btn-xs btn-square" aria-label={`Actions for ${account.name}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                      </button>
                      <ul class="dropdown-content menu bg-base-200 rounded-box z-10 w-48 p-2 shadow-lg border border-base-300">
                        <li><button data-update-value-account={account.id} data-account-name={account.name} data-account-balance={balance} data-account-currency={account.currency}>Update Balance</button></li>
                        <li><button data-edit-account={account.id} data-account-name={account.name} data-account-type={account.type} data-account-category-id={account.category_id || ''} data-account-category-name={account.category_name || ''} data-account-owner-id={account.created_by_user_id} data-account-currency={account.currency} data-account-balance={balance}>Edit</button></li>
                        <li><button data-history-account={account.id} data-account-name={account.name}>View Timeline</button></li>
                        <li><a href={`/accounts/${account.id}`}>Details</a></li>
                        <li><button class="text-error" data-close-account={account.id} data-account-name={account.name}>Deactivate</button></li>
                      </ul>
                    </div>
                  </div>
                  <div class="flex justify-between items-center mt-2">
                    <span class:list={[
                      'font-semibold text-sm tabular-nums',
                      isDebt ? 'text-error' : 'text-base-content',
                    ]}>
                      {formatCurrency(balance, account.currency)}
                    </span>
                    <span class="text-xs text-base-content/50">{formattedDate}</span>
                  </div>
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 2: Run quality gates**

Run: `bun run lint:fix && bun run format:fix && bun run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/components/organisms/AccountTable.astro
git commit -m "feat(accounts): add AccountTable component with group headers (ALL-57)

Inline-grouped table with colored separator rows (Liquid → Debt →
Non-Liquid). Shows allocation percentages per currency basket, currency
subtotals, and account count badges. Includes responsive mobile card
layout."
```

---

### Task 4: AccountFilterControls Component

Filter bar wrapper that adds view toggle buttons alongside existing filter functionality.

**Files:**
- Create: `src/components/molecules/AccountFilterControls.astro`

**Reference:** `src/components/molecules/BudgetFilterControls.astro` (lines 60-83 for toggle markup)

- [ ] **Step 1: Create AccountFilterControls component**

Create `src/components/molecules/AccountFilterControls.astro`:

```astro
---
/**
 * AccountFilterControls Component
 *
 * Wraps ActionFilterBar and adds Card/Table view toggle buttons.
 * Follows BudgetFilterControls pattern for toggle behavior.
 *
 * The toggle persists preference to localStorage (key: accounts-view-mode).
 * Client script in accounts-table.client.ts handles the toggle logic.
 */

import ActionFilterBar from '@/components/organisms/ActionFilterBar.astro';
import { LayoutGrid, List } from '@lucide/astro';

export interface Props {
  searchValue?: string;
  members?: Array<{ id: string; name: string }>;
  userId?: string;
  currentUserId?: string;
  currentSearchParams?: string;
  baseUrl?: string;
  defaultView?: 'card' | 'table';
}

const {
  searchValue,
  members,
  userId,
  currentUserId,
  currentSearchParams,
  baseUrl = '/accounts',
  defaultView = 'card',
} = Astro.props;
---

<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <div class="flex-1">
    <ActionFilterBar
      searchValue={searchValue}
      members={members}
      userId={userId}
      currentUserId={currentUserId}
      currentSearchParams={currentSearchParams}
      baseUrl={baseUrl}
    />
  </div>

  <!-- View toggle -->
  <div class="flex items-center gap-1 shrink-0" data-view-toggle>
    <button
      class:list={[
        'btn btn-sm btn-ghost btn-square',
        defaultView === 'card' && 'btn-active',
      ]}
      data-view-mode="card"
      aria-pressed={defaultView === 'card' ? 'true' : 'false'}
      aria-label="Card view"
      title="Card view"
    >
      <LayoutGrid size={16} aria-hidden="true" />
    </button>
    <button
      class:list={[
        'btn btn-sm btn-ghost btn-square',
        defaultView === 'table' && 'btn-active',
      ]}
      data-view-mode="table"
      aria-pressed={defaultView === 'table' ? 'true' : 'false'}
      aria-label="Table view"
      title="Table view"
    >
      <List size={16} aria-hidden="true" />
    </button>
  </div>
</div>
```

- [ ] **Step 2: Run quality gates**

Run: `bun run lint:fix && bun run format:fix && bun run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/components/molecules/AccountFilterControls.astro
git commit -m "feat(accounts): add AccountFilterControls with view toggle (ALL-57)

Wraps ActionFilterBar and adds Card/Table toggle buttons following
the BudgetFilterControls pattern. Persists preference via localStorage."
```

---

### Task 5: Client-Side Scripts (View Toggle + Column Sorting)

Client script for toggling between card/table views and sorting table columns within groups.

**Files:**
- Create: `src/components/organisms/accounts-table.client.ts`

**Reference:** `src/components/organisms/AccountSearch.client.ts` for lifecycle pattern (AbortController, astro:page-load, cleanup)

- [ ] **Step 1: Create client script**

Create `src/components/organisms/accounts-table.client.ts`:

```typescript
/**
 * Accounts Table Client Script
 *
 * 1. View toggle: switches between card and table views, persists to localStorage.
 * 2. Column sorting: click column headers to sort rows within each group.
 *
 * Uses AbortController pattern for cleanup on Astro page transitions.
 */

const STORAGE_KEY = 'accounts-view-mode';
let controller: AbortController | null = null;

// ─── View Toggle ───────────────────────────────────────────────

function getStoredView(): 'card' | 'table' {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'card' || stored === 'table') return stored;
  } catch {
    // localStorage unavailable
  }
  return 'card';
}

function applyView(mode: 'card' | 'table'): void {
  const cardView = document.querySelector<HTMLElement>('[data-view="card"]');
  const tableView = document.querySelector<HTMLElement>('[data-view="table"]');
  if (!cardView || !tableView) return;

  cardView.classList.toggle('hidden', mode !== 'card');
  tableView.classList.toggle('hidden', mode !== 'table');

  // Update toggle button states
  const buttons = document.querySelectorAll<HTMLButtonElement>('[data-view-toggle] [data-view-mode]');
  buttons.forEach((btn) => {
    const btnMode = btn.getAttribute('data-view-mode');
    const isActive = btnMode === mode;
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    btn.classList.toggle('btn-active', isActive);
  });

  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // localStorage unavailable
  }
}

function initViewToggle(signal: AbortSignal): void {
  // Restore stored preference
  applyView(getStoredView());

  // Listen for toggle clicks
  const toggleContainer = document.querySelector('[data-view-toggle]');
  if (!toggleContainer) return;

  toggleContainer.addEventListener(
    'click',
    (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-view-mode]');
      if (!btn) return;
      const mode = btn.getAttribute('data-view-mode') as 'card' | 'table';
      if (mode) applyView(mode);
    },
    { signal }
  );
}

// ─── Column Sorting ────────────────────────────────────────────

type SortDirection = 'asc' | 'desc';

interface SortState {
  column: string;
  direction: SortDirection;
}

let currentSort: SortState = { column: 'balance', direction: 'desc' };

function sortRowsInGroup(groupHeader: HTMLElement, column: string, direction: SortDirection): void {
  const tbody = groupHeader.closest('tbody');
  if (!tbody) return;

  // Collect rows belonging to this group (all <tr> after header until next group header or end)
  const rows: HTMLElement[] = [];
  let sibling = groupHeader.nextElementSibling;
  while (sibling && !sibling.hasAttribute('data-group-header')) {
    if (sibling instanceof HTMLElement && sibling.hasAttribute('data-account-table-row')) {
      rows.push(sibling);
    }
    sibling = sibling.nextElementSibling;
  }

  if (rows.length <= 1) return;

  // Sort rows
  const sortAttr = `data-sort-${column}`;
  const isNumeric = column === 'balance' || column === 'updated';

  rows.sort((a, b) => {
    const aVal = a.getAttribute(sortAttr) || '';
    const bVal = b.getAttribute(sortAttr) || '';

    let comparison: number;
    if (isNumeric) {
      comparison = parseFloat(aVal) - parseFloat(bVal);
    } else {
      comparison = aVal.localeCompare(bVal);
    }

    return direction === 'asc' ? comparison : -comparison;
  });

  // Re-insert rows in sorted order (after the group header)
  let insertAfter: Element = groupHeader;
  for (const row of rows) {
    insertAfter.after(row);
    insertAfter = row;
  }
}

function applySortToAllGroups(column: string, direction: SortDirection): void {
  const groupHeaders = document.querySelectorAll<HTMLElement>('[data-group-header]');
  groupHeaders.forEach((header) => sortRowsInGroup(header, column, direction));

  // Update sort indicators
  const indicators = document.querySelectorAll<HTMLElement>('[data-sort-indicator]');
  indicators.forEach((indicator) => {
    const key = indicator.getAttribute('data-sort-indicator');
    if (key === column) {
      indicator.textContent = direction === 'asc' ? '↑' : '↓';
      indicator.classList.remove('text-base-content/20');
      indicator.classList.add('text-base-content/60');
    } else {
      indicator.textContent = '↕';
      indicator.classList.remove('text-base-content/60');
      indicator.classList.add('text-base-content/20');
    }
  });
}

function initColumnSorting(signal: AbortSignal): void {
  const headers = document.querySelectorAll<HTMLElement>('[data-sort-key]');
  if (headers.length === 0) return;

  headers.forEach((header) => {
    header.addEventListener(
      'click',
      () => {
        const column = header.getAttribute('data-sort-key');
        if (!column) return;

        // Toggle direction if same column, otherwise default to asc (desc for balance)
        let direction: SortDirection;
        if (currentSort.column === column) {
          direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
          direction = column === 'balance' ? 'desc' : 'asc';
        }

        currentSort = { column, direction };
        applySortToAllGroups(column, direction);
      },
      { signal }
    );
  });

  // Apply default sort (balance desc)
  applySortToAllGroups('balance', 'desc');
}

// ─── Lifecycle ─────────────────────────────────────────────────

function init(): void {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;

  initViewToggle(signal);
  initColumnSorting(signal);
}

function cleanup(): void {
  controller?.abort();
  controller = null;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

document.addEventListener('astro:page-load', init);
document.addEventListener('astro:before-swap', cleanup, { once: true });
```

- [ ] **Step 2: Run quality gates**

Run: `bun run lint:fix && bun run format:fix && bun run typecheck`

- [ ] **Step 3: Commit**

```bash
git add src/components/organisms/accounts-table.client.ts
git commit -m "feat(accounts): add view toggle and column sorting client script (ALL-57)

View toggle persists card/table preference to localStorage.
Column sorting reorders rows within each group via DOM manipulation.
Uses AbortController pattern for Astro page transition cleanup."
```

---

### Task 6: Wire Into Accounts Page

Integrate all new components into `src/pages/accounts/index.astro`.

**Files:**
- Modify: `src/pages/accounts/index.astro`

**Key changes:**
1. Replace `ActionFilterBar` with `AccountFilterControls`
2. Add `data-view="card"` wrapper around existing card view
3. Add `data-view="table"` wrapper with `AccountTable` component
4. Import the client script
5. Change group order to Liquid → Debt → Non-Liquid
6. Pass `primaryCurrency` to `AccountTable`

- [ ] **Step 1: Read the current accounts page**

Read `src/pages/accounts/index.astro` fully to identify exact line numbers for modifications.

- [ ] **Step 2: Update imports**

At the top of the frontmatter, add new imports:

```typescript
import AccountTable from '@/components/organisms/AccountTable.astro';
import AccountFilterControls from '@/components/molecules/AccountFilterControls.astro';
```

- [ ] **Step 3: Replace ActionFilterBar with AccountFilterControls**

Find the `<ActionFilterBar>` usage (around line 454-461) and replace with:

```astro
<AccountFilterControls
  searchValue={searchParams.search || ''}
  members={workspaceMembers.map((member) => ({ id: member.id, name: member.name }))}
  userId={ownerUserId || ''}
  currentUserId={user.id}
  currentSearchParams={url.search}
  baseUrl="/accounts"
/>
```

- [ ] **Step 4: Wrap existing card view and add table view**

Find the existing account groups rendering section (around lines 462-530). Wrap it in `<div data-view="card">` and add the table view after:

First, in the frontmatter (after `memberNamesById` is defined), create the enriched accounts array:

```typescript
// Enrich accounts with resolved display names for table view
const accountsWithDisplay = accounts.map((account) => ({
  ...account,
  owner_name: memberNamesById.get(account.created_by_user_id),
}));
```

Then in the template:

```astro
<!-- Card view (existing) -->
<div data-view="card">
  {/* ... existing AccountGroupCard rendering stays as-is ... */}
</div>

<!-- Table view (new) -->
<div data-view="table" class="hidden">
  <AccountTable
    accounts={accountsWithDisplay}
    primaryCurrency={orderedWorkspaceCurrencies[0] || 'IDR'}
    currencyOrder={orderedWorkspaceCurrencies}
    isHistoricalView={!isViewingCurrentMonth}
  />
</div>
```

- [ ] **Step 5: Import the client script**

Add the script import at the bottom of the page (near other script imports):

```astro
<script src="@/components/organisms/accounts-table.client.ts"></script>
```

- [ ] **Step 6: Update card view group order to Liquid → Debt → Non-Liquid**

Find the `CLASS_ORDER` constant in the page frontmatter (around line 357):

```typescript
// Change from:
const CLASS_ORDER: AccountClass[] = ['liquid', 'non_liquid', 'debt'];
// To:
const CLASS_ORDER: AccountClass[] = ['liquid', 'debt', 'non_liquid'];
```

- [ ] **Step 7: Run quality gates**

Run: `bun run lint:fix && bun run format:fix && bun run typecheck`

- [ ] **Step 8: Run build to verify no errors**

Run: `bun run build`

- [ ] **Step 9: Commit**

```bash
git add src/pages/accounts/index.astro
git commit -m "feat(accounts): wire table view into accounts page (ALL-57)

Replace ActionFilterBar with AccountFilterControls (adds view toggle).
Add AccountTable alongside existing card view with data-view switching.
Update group order to Liquid → Debt → Non-Liquid."
```

---

### Task 7: Integration Testing and Polish

Verify end-to-end behavior: view toggle, sorting, mobile layout, allocation percentages.

**Files:**
- Create: `src/__tests__/accounts-table-view.test.ts`

- [ ] **Step 1: Write integration tests**

Create `src/__tests__/accounts-table-view.test.ts`:

```typescript
import { describe, it, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Static analysis tests for the accounts table feature.
 * Verifies component structure, data attributes, and integration points.
 */

const COMPONENTS_DIR = resolve(import.meta.dir, '../components');
const PAGES_DIR = resolve(import.meta.dir, '../pages');

describe('Accounts Table View - Component Structure', () => {
  it('AccountTable.astro has correct group order (liquid → debt → non_liquid)', () => {
    const content = readFileSync(resolve(COMPONENTS_DIR, 'organisms/AccountTable.astro'), 'utf-8');
    const orderMatch = content.match(/CLASS_ORDER.*=.*\[(.*?)\]/s);
    expect(orderMatch).toBeTruthy();
    const order = orderMatch![1];
    const liquidIdx = order.indexOf('liquid');
    const debtIdx = order.indexOf('debt');
    const nonLiquidIdx = order.indexOf('non_liquid');
    expect(liquidIdx).toBeLessThan(debtIdx);
    expect(debtIdx).toBeLessThan(nonLiquidIdx);
  });

  it('AccountTable.astro has data-group-header attributes for sorting', () => {
    const content = readFileSync(resolve(COMPONENTS_DIR, 'organisms/AccountTable.astro'), 'utf-8');
    expect(content).toContain('data-group-header');
    expect(content).toContain('data-account-table-row');
  });

  it('AccountTableRow.astro has data-sort attributes on all sortable columns', () => {
    const content = readFileSync(resolve(COMPONENTS_DIR, 'molecules/AccountTableRow.astro'), 'utf-8');
    expect(content).toContain('data-sort-balance');
    expect(content).toContain('data-sort-name');
    expect(content).toContain('data-sort-type');
    expect(content).toContain('data-sort-category');
    expect(content).toContain('data-sort-owner');
    expect(content).toContain('data-sort-updated');
  });

  it('AccountFilterControls.astro has view toggle with correct data attributes', () => {
    const content = readFileSync(resolve(COMPONENTS_DIR, 'molecules/AccountFilterControls.astro'), 'utf-8');
    expect(content).toContain('data-view-toggle');
    expect(content).toContain('data-view-mode="card"');
    expect(content).toContain('data-view-mode="table"');
    expect(content).toContain('aria-pressed');
  });

  it('accounts page has both data-view containers', () => {
    const content = readFileSync(resolve(PAGES_DIR, 'accounts/index.astro'), 'utf-8');
    expect(content).toContain('data-view="card"');
    expect(content).toContain('data-view="table"');
  });

  it('accounts page imports accounts-table.client.ts', () => {
    const content = readFileSync(resolve(PAGES_DIR, 'accounts/index.astro'), 'utf-8');
    expect(content).toContain('accounts-table.client.ts');
  });

  it('accounts page uses AccountFilterControls instead of ActionFilterBar directly', () => {
    const content = readFileSync(resolve(PAGES_DIR, 'accounts/index.astro'), 'utf-8');
    expect(content).toContain('AccountFilterControls');
  });

  it('client script handles localStorage key accounts-view-mode', () => {
    const content = readFileSync(resolve(COMPONENTS_DIR, 'organisms/accounts-table.client.ts'), 'utf-8');
    expect(content).toContain('accounts-view-mode');
    expect(content).toContain('localStorage');
  });

  it('client script has astro lifecycle handlers', () => {
    const content = readFileSync(resolve(COMPONENTS_DIR, 'organisms/accounts-table.client.ts'), 'utf-8');
    expect(content).toContain('astro:page-load');
    expect(content).toContain('astro:before-swap');
    expect(content).toContain('AbortController');
  });
});
```

- [ ] **Step 2: Run tests**

Run: `bun test src/__tests__/accounts-table-view.test.ts`
Expected: All tests PASS

- [ ] **Step 3: Run full quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
bun run build
```

- [ ] **Step 4: Run existing account tests to check for regressions**

Run: `bun test src/__tests__/accounts- src/services/__tests__/account-`
Expected: All existing tests still pass

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/accounts-table-view.test.ts
git commit -m "test(accounts): add integration tests for table view feature (ALL-57)

Verify component structure, data attributes, view toggle wiring,
client script lifecycle, and group ordering."
```

---

## Verification Checklist

After all tasks complete, verify in the browser:

- [ ] Card view still works as before (default)
- [ ] Table view shows all accounts grouped by Liquid → Debt → Non-Liquid
- [ ] Group headers show correct subtotals per currency
- [ ] Allocation percentages display correctly with ✓ for on-target
- [ ] Non-matching currency rows appear dimmed
- [ ] Click column headers to sort within groups
- [ ] View toggle persists across page reloads (localStorage)
- [ ] Mobile shows stacked card layout with group headers
- [ ] All existing modals (edit, delete, history, transfer, update balance) still work
- [ ] No full-number compaction anywhere (always full values)
