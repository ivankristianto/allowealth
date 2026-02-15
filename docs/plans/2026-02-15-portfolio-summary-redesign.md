# Portfolio Summary Redesign Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign `AssetPortfolioSummary.astro` for clarity, currency separation, and a more visually impactful asset allocation visualization.

**Design Direction:** "Precision Ledger" — Clean, generous whitespace, large mono-spaced currency values, distinct IDR/USD currency lanes with labeled badges, and a donut chart replacing the thin allocation bar.

---

## Problems with Current Design

1. **Overlapping columns** — The 3-column grid (Assets/Debt/Net Worth) breaks on medium screens because Indonesian Rupiah values are very long (e.g., `Rp300.800.000,00`)
2. **No currency separation** — IDR and USD values are stacked with only color difference; no labels, no visual dividers
3. **Flat allocation section** — Thin bar + cramped legend items; hard to parse at a glance
4. **Icon boxes compete for space** — 56px icon squares push text narrower on each column

## Design Direction

**Aesthetic:** Clean financial dashboard. Generous white space. Clear visual hierarchy. Currency badges for IDR/USD. Donut chart for allocation.

**Key Principles:**

- Net worth is the hero metric (largest, most prominent)
- Each currency gets its own clearly labeled row
- Asset allocation uses a donut chart with integrated legend
- Mobile-first: stack everything vertically, no cramped grids

---

## Task 1: Restructure the Summary Layout

**File:** `src/components/organisms/AssetPortfolioSummary.astro`

### New Layout Structure (top to bottom):

#### Section A — Net Worth Hero

- Full-width top section with subtle `bg-base-200/50` background
- Large heading "Net Worth" with `TrendingUp` icon inline
- Two currency rows, each with a pill badge:
  - `[IDR]` badge (emerald tint) + large mono value
  - `[USD]` badge (sky tint) + large mono value
- Values use `text-2xl lg:text-3xl font-bold font-mono tracking-tight`
- Color: `text-accent` when positive, `text-error` when negative

#### Section B — Assets & Debt Side-by-Side

- Two-column grid on desktop (`md:grid-cols-2`), stacked on mobile
- **Left card: Total Assets**
  - Subtle left border in `border-success` (2px)
  - `Wallet` icon + "Total Assets" label
  - IDR row with `[IDR]` badge + value in `text-success`
  - USD row with `[USD]` badge + value in `text-info`
- **Right card: Total Debt** (only if `hasDebt`)
  - Subtle left border in `border-error` (2px)
  - `CreditCard` icon + "Total Debt" label
  - Same currency row pattern but in `text-error`

#### Section C — Asset Allocation (Donut Chart)

- Separator line (`border-t border-base-200`)
- "Asset Allocation" heading
- Two-column layout on desktop:
  - **Left:** Donut chart (180x180) using Chart.js via `@/lib/chart-setup`
  - **Right:** Vertical legend with color dots, type names, and percentage values
- Mobile: Chart centered above, legend below
- Keep the `AllocationBar` below the chart as a compact secondary visualization

#### Section D — Latest Update

- Small timestamp at the bottom, same as current

### Currency Badge Component (inline)

Instead of a separate component, use a styled `<span>`:

```html
<span
  class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-success/10 text-success"
>
  IDR
</span>
```

For USD:

```html
<span
  class="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider bg-info/10 text-info"
>
  USD
</span>
```

### Implementation Details:

- Remove the `md:grid-cols-3` layout — it doesn't work with long IDR values
- Remove the 56px icon boxes — they waste horizontal space
- Add small inline icons (16-20px) next to section labels instead
- Currency values use `font-mono` for alignment
- Only show a currency row if that currency has a non-zero value

**Verify:** `bun run build` passes

---

## Task 2: Add Donut Chart to Allocation Section

**File:** `src/components/organisms/AssetPortfolioSummary.astro`

### Chart Integration:

1. Serialize `displayDistribution` as `data-chart-data` attribute (same pattern as `ResourceAllocationChart.astro`)
2. Add a `<canvas>` element inside a 180x180 container
3. Add `<script>` block using `Chart` from `@/lib/chart-setup` and `createChartLifecycle` from `@/lib/utils/chart-lifecycle`

### Chart Configuration:

```typescript
{
  type: 'doughnut',
  data: {
    labels: distribution.map(d => d.type),
    datasets: [{
      data: distribution.map(d => d.percentage),
      backgroundColor: distribution.map(d => d.color),
      borderWidth: 0,
      spacing: 3,
      hoverOffset: 4,
    }]
  },
  options: {
    responsive: true,
    maintainAspectRatio: true,
    cutout: '65%',
    plugins: {
      legend: { display: false },
      tooltip: {
        // Same theme-aware tooltip as ResourceAllocationChart
        callbacks: {
          label: (ctx) => `${ctx.label}: ${data[ctx.dataIndex].percentage}%`
        }
      }
    }
  }
}
```

### Legend Layout:

- Desktop: Legend to the right of the chart in a vertical list
- Mobile: Legend below the chart in a 2-column grid
- Each legend item: color dot (w-2.5 h-2.5) + type name + percentage (right-aligned)
- Better spacing than current cramped inline legend

### Keep AllocationBar:

- Below the donut + legend as a compact supplementary visualization
- Height `sm` (same as current)

**Verify:** `bun run build` passes, chart renders correctly

---

## Task 3: Update Loading Skeleton

**File:** `src/components/organisms/AssetPortfolioSummary.astro`

Update the skeleton to match the new layout structure:

1. **Net Worth section skeleton:** Large rectangular skeleton for heading + two currency rows
2. **Assets/Debt section skeleton:** Two side-by-side cards with skeleton text
3. **Allocation section skeleton:** Circular skeleton (donut) + rectangular skeletons (legend)

**Verify:** `bun run build` passes

---

## Task 4: Update Storybook Stories

**File:** `src/components/organisms/AssetPortfolioSummary.stories.ts`

Update stories to demonstrate:

1. Default state (both currencies, with debt)
2. Single currency (IDR only)
3. No debt scenario
4. Loading state
5. Negative net worth (debt > assets)

**Verify:** `bun run storybook` works

---

## Task 5: Quality Gates

Run all quality gates:

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
bun run build
```

Fix any issues. Commit with:

```
feat: redesign portfolio summary with currency separation and donut chart
```
