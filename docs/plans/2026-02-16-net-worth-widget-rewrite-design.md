# NetWorthWidget Rewrite Design

**Date:** 2026-02-16
**Status:** Approved

## Problem

The current `NetWorthWidget` is wrong:

1. Doesn't distinguish assets from debt — `DashboardService.getAssetsOptimized()` sums ALL assets (including debt) into `totalAssets.idr`/`totalAssets.usd`
2. Shows fake growth percentage (hardcoded to 0)
3. Shows "local assets" / "global assets" breakdown that duplicates the totals
4. Uses heavy components (StatCard, IconBadge, Badge) for a simple summary

## Solution

Rewrite to show two honest sections:

1. **Total Assets** — per-currency rows (IDR, USD), only currencies with balance > 0
2. **Total Debt** — per-currency rows (IDR, USD), only shown if debt exists

## Changes

### 1. DashboardService (`src/services/dashboard.service.ts`)

Update `getAssetsOptimized()` to separate sums by `account_class`:

- Assets = `account_class` is `liquid` or `non_liquid`
- Debt = `account_class` is `debt`

Add `TotalDebt` interface. Update `DashboardData` to include `totalDebt`.

### 2. Dashboard page (`src/pages/dashboard.astro`)

Pass separated asset/debt data to the new widget props.

### 3. NetWorthWidget (`src/components/organisms/NetWorthWidget.astro`)

New props:

```typescript
interface Props {
  assetIdr: number;
  assetUsd: number;
  debtIdr?: number;
  debtUsd?: number;
  loading?: boolean;
  className?: string;
}
```

Visual: Card with two sections (Total Assets, Total Debt), currency badges (IDR=green, USD=blue), divider between sections. Empty state if no assets.

### 4. Tests + Stories

Rewrite tests and stories to match new props and behavior.
