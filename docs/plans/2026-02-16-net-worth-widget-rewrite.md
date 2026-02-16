# NetWorthWidget Rewrite Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite NetWorthWidget to show separate Total Assets and Total Debt per currency, replacing incorrect combined totals and fake growth percentage.

**Architecture:** Modify `DashboardService.getAssetsOptimized()` to separate asset/debt sums by `account_class` (data already fetched, just needs filtering). Rewrite `NetWorthWidget.astro` with new props. Update `dashboard.astro` to pass separated data.

**Tech Stack:** Astro 5, Tailwind CSS v4 + DaisyUI v5, Lucide icons, Bun test runner

---

### Task 1: Add `TotalDebt` to DashboardService

**Files:**

- Modify: `src/services/dashboard.service.ts:41-46` (TotalAssets interface)
- Modify: `src/services/dashboard.service.ts:115-116` (DashboardData interface)
- Modify: `src/services/dashboard.service.ts:255-337` (getAssetsOptimized method)

**Step 1: Add `TotalDebt` interface and update `DashboardData`**

After the existing `TotalAssets` interface (~line 46), add:

```typescript
/**
 * Total debt by currency
 */
export interface TotalDebt {
  idr: string;
  usd: string;
}
```

In the `DashboardData` interface, add after `totalAssets`:

```typescript
totalDebt: TotalDebt;
```

In `getDashboardData()` result construction (~line 226), add:

```typescript
totalDebt: assetsData.totalDebt,
```

**Step 2: Update `getAssetsOptimized()` to separate assets from debt**

In the return type of `getAssetsOptimized()`, add `totalDebt: TotalDebt`.

Replace the currency total calculation block (~lines 276-279) with:

```typescript
// Separate assets from debt by account_class
const assetAccounts = workspaceAssets.filter((a) => a.account_class !== 'debt');
const debtAccounts = workspaceAssets.filter((a) => a.account_class === 'debt');

// Calculate asset totals (excluding debt)
const idrAssetBalances = assetAccounts.filter((a) => a.currency === 'IDR').map((a) => a.balance);
const usdAssetBalances = assetAccounts.filter((a) => a.currency === 'USD').map((a) => a.balance);
const idrTotal = decimalSum(idrAssetBalances);
const usdTotal = decimalSum(usdAssetBalances);

// Calculate debt totals (absolute values)
const idrDebtBalances = debtAccounts.filter((a) => a.currency === 'IDR').map((a) => a.balance);
const usdDebtBalances = debtAccounts.filter((a) => a.currency === 'USD').map((a) => a.balance);
const idrDebt = decimalSum(idrDebtBalances.map((b) => b.replace(/^-/, '')));
const usdDebt = decimalSum(usdDebtBalances.map((b) => b.replace(/^-/, '')));
```

Update the return to include `totalDebt`:

```typescript
return {
  totalAssets: {
    idr: idrTotal,
    usd: usdTotal,
    converted: convertedTotal,
    convertedCurrency: primaryCurrency,
  },
  totalDebt: {
    idr: idrDebt,
    usd: usdDebt,
  },
  assetReminders: reminders,
};
```

Update the error fallback to include `totalDebt`:

```typescript
return {
  totalAssets: { idr: '0', usd: '0', converted: '0', convertedCurrency: primaryCurrency },
  totalDebt: { idr: '0', usd: '0' },
  assetReminders: [],
};
```

**Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS (no errors related to TotalDebt)

**Step 4: Commit**

```bash
git add src/services/dashboard.service.ts
git commit -m "feat(dashboard): separate asset and debt totals by account_class"
```

---

### Task 2: Rewrite NetWorthWidget tests (TDD)

**Files:**

- Modify: `src/components/organisms/NetWorthWidget.test.ts`

**Step 1: Replace all tests with new prop-based tests**

Replace entire file with:

```typescript
/**
 * NetWorthWidget Component Tests
 * ===============================
 * Unit tests for NetWorthWidget utility logic
 */

import { describe, it, expect } from 'bun:test';
import { formatCurrency } from '@/lib/formatting';

describe('NetWorthWidget - empty state detection', () => {
  const isEmpty = (props: {
    assetIdr: number;
    assetUsd: number;
    debtIdr: number;
    debtUsd: number;
  }): boolean => {
    return !props.assetIdr && !props.assetUsd && !props.debtIdr && !props.debtUsd;
  };

  it('should detect empty state when all values are 0', () => {
    expect(isEmpty({ assetIdr: 0, assetUsd: 0, debtIdr: 0, debtUsd: 0 })).toBe(true);
  });

  it('should not be empty when assetIdr has value', () => {
    expect(isEmpty({ assetIdr: 1000000, assetUsd: 0, debtIdr: 0, debtUsd: 0 })).toBe(false);
  });

  it('should not be empty when assetUsd has value', () => {
    expect(isEmpty({ assetIdr: 0, assetUsd: 500, debtIdr: 0, debtUsd: 0 })).toBe(false);
  });

  it('should not be empty when only debt exists', () => {
    expect(isEmpty({ assetIdr: 0, assetUsd: 0, debtIdr: 5000000, debtUsd: 0 })).toBe(false);
  });

  it('should not be empty with small positive values', () => {
    expect(isEmpty({ assetIdr: 0.01, assetUsd: 0, debtIdr: 0, debtUsd: 0 })).toBe(false);
  });
});

describe('NetWorthWidget - hasDebt detection', () => {
  const hasDebt = (debtIdr: number, debtUsd: number): boolean => {
    return debtIdr > 0 || debtUsd > 0;
  };

  it('should return false when no debt', () => {
    expect(hasDebt(0, 0)).toBe(false);
  });

  it('should return true when IDR debt exists', () => {
    expect(hasDebt(5000000, 0)).toBe(true);
  });

  it('should return true when USD debt exists', () => {
    expect(hasDebt(0, 1000)).toBe(true);
  });

  it('should return true when both currencies have debt', () => {
    expect(hasDebt(5000000, 1000)).toBe(true);
  });
});

describe('NetWorthWidget - currency formatting', () => {
  it('should format IDR amounts correctly', () => {
    expect(formatCurrency(1956063000, 'IDR')).toBe('Rp1.956.063.000,00');
    expect(formatCurrency(50000, 'IDR')).toBe('Rp50.000,00');
  });

  it('should format USD amounts correctly', () => {
    expect(formatCurrency(130404.2, 'USD')).toBe('$130,404.20');
    expect(formatCurrency(1000, 'USD')).toBe('$1,000.00');
  });

  it('should format zero correctly', () => {
    expect(formatCurrency(0, 'IDR')).toBe('Rp0,00');
    expect(formatCurrency(0, 'USD')).toBe('$0.00');
  });
});
```

**Step 2: Run tests to verify they pass**

Run: `bun test src/components/organisms/NetWorthWidget.test.ts`
Expected: PASS (all tests use pure functions)

**Step 3: Commit**

```bash
git add src/components/organisms/NetWorthWidget.test.ts
git commit -m "test: rewrite NetWorthWidget tests for new asset/debt props"
```

---

### Task 3: Rewrite NetWorthWidget component

**Files:**

- Modify: `src/components/organisms/NetWorthWidget.astro`

**Step 1: Replace entire component**

Replace the file with:

```astro
---
/**
 * NetWorthWidget Component
 *
 * Displays total assets and total debt per currency (IDR, USD).
 * Shows only currencies with balance > 0. Debt section only shown if debt exists.
 *
 * @param {number} assetIdr - Total assets in IDR (excluding debt)
 * @param {number} assetUsd - Total assets in USD (excluding debt)
 * @param {number} debtIdr - Total debt in IDR
 * @param {number} debtUsd - Total debt in USD
 * @param {boolean} loading - Show loading skeleton state
 * @param {string} className - Additional CSS classes
 */

import { Wallet, CreditCard } from '@lucide/astro';
import { formatCurrency } from '@/lib/formatting';
import EmptyState from '@/components/atoms/EmptyState.astro';
import Card from '@/components/atoms/Card.astro';
import Skeleton from '@/components/atoms/Skeleton.astro';

export interface Props {
  assetIdr: number;
  assetUsd: number;
  debtIdr?: number;
  debtUsd?: number;
  loading?: boolean;
  className?: string;
}

const {
  assetIdr,
  assetUsd,
  debtIdr = 0,
  debtUsd = 0,
  loading = false,
  className = '',
} = Astro.props;

const isEmpty = !assetIdr && !assetUsd && !debtIdr && !debtUsd;
const hasDebt = debtIdr > 0 || debtUsd > 0;

const badge =
  'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider shrink-0';

const cardClasses = [
  'relative overflow-hidden',
  loading && 'pointer-events-none opacity-70',
  className,
]
  .filter(Boolean)
  .join(' ');
---

<Card
  padding="lg"
  rounded="card-lg"
  className={cardClasses}
  role="region"
  aria-label={loading ? 'Loading asset summary...' : 'Asset summary'}
  aria-busy={loading ? 'true' : undefined}
  data-testid="dashboard-net-worth"
>
  {
    loading ? (
      <div class="space-y-4" aria-hidden="true">
        <div class="flex items-center gap-2 mb-3">
          <Skeleton variant="circular" width="16px" height="16px" />
          <Skeleton variant="text" width="100px" />
        </div>
        <div class="space-y-2">
          <Skeleton variant="text" width="80%" height="20px" />
          <Skeleton variant="text" width="70%" height="20px" />
        </div>
        <div class="h-px bg-base-200" />
        <div class="flex items-center gap-2 mb-3">
          <Skeleton variant="circular" width="16px" height="16px" />
          <Skeleton variant="text" width="80px" />
        </div>
        <div class="space-y-2">
          <Skeleton variant="text" width="60%" height="20px" />
        </div>
      </div>
    ) : isEmpty ? (
      <EmptyState
        title="No assets yet"
        message="Add your first asset to start tracking your finances."
        iconName="wallet"
        actionLabel="Add Asset"
        actionHref="/assets"
        variant="centered"
        className="py-4"
      />
    ) : (
      <div class="space-y-5">
        {/* Total Assets Section */}
        <div>
          <div class="flex items-center gap-2 mb-3">
            <Wallet size={16} class="stroke-current text-success" aria-hidden="true" />
            <span class="text-xs font-semibold uppercase tracking-widest text-base-content/50">
              Total Assets
            </span>
          </div>
          <div class="space-y-1.5">
            {assetIdr > 0 && (
              <div class="flex items-center gap-2">
                <span class={`${badge} bg-success/10 text-success`}>IDR</span>
                <p class="text-lg font-bold text-success tracking-tight leading-none truncate">
                  {formatCurrency(assetIdr, 'IDR')}
                </p>
              </div>
            )}
            {assetUsd > 0 && (
              <div class="flex items-center gap-2">
                <span class={`${badge} bg-info/10 text-info`}>USD</span>
                <p class="text-lg font-bold text-info tracking-tight leading-none truncate">
                  {formatCurrency(assetUsd, 'USD')}
                </p>
              </div>
            )}
            {assetIdr <= 0 && assetUsd <= 0 && (
              <p class="text-sm text-base-content/40">No assets</p>
            )}
          </div>
        </div>

        {/* Divider + Total Debt Section (only if debt exists) */}
        {hasDebt && (
          <>
            <div class="border-t border-base-200" aria-hidden="true" />
            <div>
              <div class="flex items-center gap-2 mb-3">
                <CreditCard size={16} class="stroke-current text-error" aria-hidden="true" />
                <span class="text-xs font-semibold uppercase tracking-widest text-base-content/50">
                  Total Debt
                </span>
              </div>
              <div class="space-y-1.5">
                {debtIdr > 0 && (
                  <div class="flex items-center gap-2">
                    <span class={`${badge} bg-success/10 text-success`}>IDR</span>
                    <p class="text-lg font-bold text-error tracking-tight leading-none truncate">
                      {formatCurrency(debtIdr, 'IDR')}
                    </p>
                  </div>
                )}
                {debtUsd > 0 && (
                  <div class="flex items-center gap-2">
                    <span class={`${badge} bg-info/10 text-info`}>USD</span>
                    <p class="text-lg font-bold text-error tracking-tight leading-none truncate">
                      {formatCurrency(debtUsd, 'USD')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    )
  }
</Card>
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: FAIL — `dashboard.astro` still passes old props. That's fixed in Task 4.

**Step 3: Commit**

```bash
git add src/components/organisms/NetWorthWidget.astro
git commit -m "feat: rewrite NetWorthWidget with asset/debt separation"
```

---

### Task 4: Update dashboard page

**Files:**

- Modify: `src/pages/dashboard.astro:196-203`

**Step 1: Update NetWorthWidget props in dashboard.astro**

Replace the `<NetWorthWidget ... />` block (~lines 196-203) with:

```astro
<NetWorthWidget
  assetIdr={safeParseFloat(dashboardData?.totalAssets.idr)}
  assetUsd={safeParseFloat(dashboardData?.totalAssets.usd)}
  debtIdr={safeParseFloat(dashboardData?.totalDebt?.idr)}
  debtUsd={safeParseFloat(dashboardData?.totalDebt?.usd)}
  loading={!dashboardData}
/>
```

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

**Step 3: Run all tests**

Run: `bun test`
Expected: PASS

**Step 4: Commit**

```bash
git add src/pages/dashboard.astro
git commit -m "feat(dashboard): pass separated asset/debt data to NetWorthWidget"
```

---

### Task 5: Update stories

**Files:**

- Modify: `src/components/organisms/NetWorthWidget.stories.ts`

**Step 1: Replace stories file**

Replace entire file with stories matching new props:

```typescript
import type { Meta, StoryObj } from '@storybook/html';
import { formatCurrency } from '@/lib/formatting/currency-client';

const meta: Meta = {
  title: 'Organisms/NetWorthWidget',
  tags: ['autodocs'],
  argTypes: {
    assetIdr: { control: 'number', description: 'Total assets in IDR' },
    assetUsd: { control: 'number', description: 'Total assets in USD' },
    debtIdr: { control: 'number', description: 'Total debt in IDR' },
    debtUsd: { control: 'number', description: 'Total debt in USD' },
    loading: { control: 'boolean', description: 'Show loading state' },
  },
};

export default meta;

const badge =
  'inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold uppercase tracking-wider shrink-0';

const createNetWorthWidget = (args: {
  assetIdr?: number;
  assetUsd?: number;
  debtIdr?: number;
  debtUsd?: number;
  loading?: boolean;
}): HTMLElement => {
  const { assetIdr = 0, assetUsd = 0, debtIdr = 0, debtUsd = 0, loading = false } = args;

  const container = document.createElement('div');
  container.className = 'block max-w-sm';

  const hasDebt = debtIdr > 0 || debtUsd > 0;
  const isEmpty = !assetIdr && !assetUsd && !debtIdr && !debtUsd;

  if (loading) {
    container.innerHTML = `
      <div class="bg-base-100 rounded-2xl border border-base-300 shadow-premium p-8">
        <div class="space-y-4">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-4 h-4 rounded-full bg-base-300/50 animate-pulse"></div>
            <div class="h-3 w-24 bg-base-300/50 rounded animate-pulse"></div>
          </div>
          <div class="space-y-2">
            <div class="h-5 w-3/4 bg-base-300/50 rounded animate-pulse"></div>
            <div class="h-5 w-2/3 bg-base-300/50 rounded animate-pulse"></div>
          </div>
          <div class="h-px bg-base-200"></div>
          <div class="flex items-center gap-2 mb-3">
            <div class="w-4 h-4 rounded-full bg-base-300/50 animate-pulse"></div>
            <div class="h-3 w-20 bg-base-300/50 rounded animate-pulse"></div>
          </div>
          <div class="h-5 w-1/2 bg-base-300/50 rounded animate-pulse"></div>
        </div>
      </div>`;
    return container;
  }

  if (isEmpty) {
    container.innerHTML = `
      <div class="bg-base-100 rounded-2xl border border-base-300 shadow-premium p-8 text-center">
        <p class="font-semibold text-base-content/60">No assets yet</p>
        <p class="text-sm text-base-content/40 mt-1">Add your first asset to start tracking your finances.</p>
      </div>`;
    return container;
  }

  let assetsHtml = '';
  if (assetIdr > 0) {
    assetsHtml += `<div class="flex items-center gap-2">
      <span class="${badge} bg-success/10 text-success">IDR</span>
      <p class="text-lg font-bold text-success tracking-tight leading-none truncate">${formatCurrency(assetIdr, 'IDR')}</p>
    </div>`;
  }
  if (assetUsd > 0) {
    assetsHtml += `<div class="flex items-center gap-2">
      <span class="${badge} bg-info/10 text-info">USD</span>
      <p class="text-lg font-bold text-info tracking-tight leading-none truncate">${formatCurrency(assetUsd, 'USD')}</p>
    </div>`;
  }
  if (!assetIdr && !assetUsd) {
    assetsHtml = '<p class="text-sm text-base-content/40">No assets</p>';
  }

  let debtHtml = '';
  if (hasDebt) {
    let debtRows = '';
    if (debtIdr > 0) {
      debtRows += `<div class="flex items-center gap-2">
        <span class="${badge} bg-success/10 text-success">IDR</span>
        <p class="text-lg font-bold text-error tracking-tight leading-none truncate">${formatCurrency(debtIdr, 'IDR')}</p>
      </div>`;
    }
    if (debtUsd > 0) {
      debtRows += `<div class="flex items-center gap-2">
        <span class="${badge} bg-info/10 text-info">USD</span>
        <p class="text-lg font-bold text-error tracking-tight leading-none truncate">${formatCurrency(debtUsd, 'USD')}</p>
      </div>`;
    }
    debtHtml = `
      <div class="border-t border-base-200" aria-hidden="true"></div>
      <div>
        <div class="flex items-center gap-2 mb-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-error"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
          <span class="text-xs font-semibold uppercase tracking-widest text-base-content/50">Total Debt</span>
        </div>
        <div class="space-y-1.5">${debtRows}</div>
      </div>`;
  }

  container.innerHTML = `
    <div class="bg-base-100 rounded-2xl border border-base-300 shadow-premium p-8">
      <div class="space-y-5">
        <div>
          <div class="flex items-center gap-2 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-success"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>
            <span class="text-xs font-semibold uppercase tracking-widest text-base-content/50">Total Assets</span>
          </div>
          <div class="space-y-1.5">${assetsHtml}</div>
        </div>
        ${debtHtml}
      </div>
    </div>`;

  return container;
};

export const Default: StoryObj = {
  args: {
    assetIdr: 1956063000,
    assetUsd: 130404.2,
    debtIdr: 15000000,
    debtUsd: 2500,
    loading: false,
  },
  render: (args) => createNetWorthWidget(args),
};

export const AssetsOnly: StoryObj = {
  args: {
    assetIdr: 1956063000,
    assetUsd: 130404.2,
    debtIdr: 0,
    debtUsd: 0,
    loading: false,
  },
  render: (args) => createNetWorthWidget(args),
};

export const WithDebt: StoryObj = {
  args: {
    assetIdr: 500000000,
    assetUsd: 10000,
    debtIdr: 25000000,
    debtUsd: 5000,
    loading: false,
  },
  render: (args) => createNetWorthWidget(args),
};

export const IDROnly: StoryObj = {
  args: {
    assetIdr: 150000000,
    assetUsd: 0,
    debtIdr: 0,
    debtUsd: 0,
    loading: false,
  },
  render: (args) => createNetWorthWidget(args),
};

export const Loading: StoryObj = {
  args: { loading: true },
  render: (args) => createNetWorthWidget(args),
};

export const Empty: StoryObj = {
  args: {
    assetIdr: 0,
    assetUsd: 0,
    debtIdr: 0,
    debtUsd: 0,
    loading: false,
  },
  render: (args) => createNetWorthWidget(args),
};
```

**Step 2: Commit**

```bash
git add src/components/organisms/NetWorthWidget.stories.ts
git commit -m "feat: update NetWorthWidget stories for asset/debt separation"
```

---

### Task 6: Quality gates + visual validation

**Step 1: Run full quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

Expected: All PASS

**Step 2: Run all tests**

Run: `bun test`
Expected: All PASS

**Step 3: Build**

Run: `bun run build`
Expected: PASS

**Step 4: Visual validation in Chrome**

Navigate to `http://assets-redesign.expenses.local:4322/dashboard` and verify:

- Total Assets section shows IDR and USD amounts with correct badges
- Total Debt section shows below divider (if debt exists)
- Empty state shows when no assets
- Loading skeleton shows correctly

**Step 5: Commit any fixes from quality gates**

If lint/format made changes, commit them.
