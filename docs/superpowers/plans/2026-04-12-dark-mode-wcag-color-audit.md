# ALL-75: Dark Mode WCAG Color Audit — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all WCAG AA contrast failures in color tokens, delete unused component tokens, replace hardcoded hex with CSS variables, and sync tokens.ts with the corrected CSS values.

**Architecture:** Edit `tokens.css` as the single source of truth, then cascade changes outward: `tokens.ts` syncs to CSS, SVG/chart components reference CSS variables via `var()` or a `getChartThemeColors()` utility. Dead tokens (defined but never consumed) are deleted.

**Tech Stack:** CSS custom properties, Astro components, Chart.js, TypeScript

**Spec:** `docs/superpowers/specs/2026-04-12-dark-mode-wcag-color-audit-design.md`

---

## Task 1: WCAG Token Corrections in tokens.css

**Files:**
- Modify: `src/styles/tokens.css:37-48` (semantic colors in `:root`)
- Modify: `src/styles/tokens.css:99-106` (currency/status tokens in `:root`)

- [ ] **Step 1: Fix `--color-error` and its hover/light variants**

In `src/styles/tokens.css`, replace the error token block (lines 37-40):

```css
  /* Error: Over budget (rose - from styles.json) */
  --color-error: #e11d48; /* rose-600 — WCAG AA 5.2:1 on white */
  --color-error-hover: #be123c; /* rose-700 */
  --color-error-light: #ffe4e6; /* rose-100 */
```

- [ ] **Step 2: Fix `--color-info` and its hover variant**

Replace the info token block (lines 46-48):

```css
  /* Info: Neutral information (sky - distinct from forest accent) */
  --color-info: #0284c7; /* sky-600 — WCAG AA 4.5:1 on white */
  --color-info-hover: #0369a1; /* sky-700 */
```

- [ ] **Step 3: Fix `--color-currency-idr` and `--color-currency-usd`**

Replace currency tokens (lines 99-101):

```css
  /* Currency colors */
  --color-currency-idr: #047857; /* emerald-700 — WCAG AA 5.5:1 on white */
  --color-currency-usd: #0284c7; /* sky-600 — WCAG AA 4.5:1 on white */
```

- [ ] **Step 4: Fix `--color-status-ok` and `--color-status-danger`**

Replace status tokens (lines 103-106):

```css
  /* Status indicators */
  --color-status-ok: #15803d; /* green-700 — WCAG AA 5.5:1 on white */
  --color-status-warning: #b45309; /* Amber-700 - 80-99% - WCAG AA 5.0:1 on white */
  --color-status-danger: #e11d48; /* rose-600 — tracks --color-error */
```

- [ ] **Step 5: Update the header comment**

Replace the color semantics comment block (lines 1-14) to reflect v1.3.0 and the corrected values:

```css
/**
 * Design Tokens for Finance Manager
 * ==================================
 * Single source of truth for all design decisions
 * Modify these values to update the entire application
 *
 * Color Semantics (Allowealth v1.3.0 - Forest Green, WCAG AA):
 * - primary: slate-900 (#0f172a) - headings, primary text, secondary buttons
 * - accent: forest-700 (#15803d) - CTAs, interactive elements - WCAG AA 5.5:1 on white
 * - success: emerald-700 (#047857) - positive status, confirmations - WCAG AA 5.5:1 on white
 * - warning: amber-700 (#b45309) - budget alerts, caution states - WCAG AA 5.0:1 on white
 * - error: rose-600 (#e11d48) - over budget, destructive actions - WCAG AA 5.2:1 on white
 * - info: sky-600 (#0284c7) - informational messages - WCAG AA 4.5:1 on white
 */
```

- [ ] **Step 6: Update rose scale references**

The rose scale values (lines 82-85) are raw palette values and stay unchanged. But `--color-rose-500` is referenced as the error color in comments — update comments only if they claim `rose-500` is the error color. The `:root` rose scale is a palette, not a semantic token.

- [ ] **Step 7: Verify build**

```bash
bun run typecheck && bun run build
```

Expected: 0 errors. CSS-only changes don't affect TypeScript, but verify no build tooling breaks.

- [ ] **Step 8: Commit**

```bash
git add src/styles/tokens.css
git commit -m "fix(tokens): correct WCAG AA contrast failures in light-mode color tokens

Update 6 semantic tokens to meet WCAG AA 4.5:1 minimum on white:
- error: rose-500 → rose-600 (3.6:1 → 5.2:1)
- info: sky-500 → sky-600 (2.8:1 → 4.5:1)
- status-ok: green-500 → green-700 (2.4:1 → 5.5:1)
- status-danger: rose-500 → rose-600 (tracks error)
- currency-idr: emerald-500 → emerald-700 (2.9:1 → 5.5:1)
- currency-usd: sky-500 → sky-600 (2.8:1 → 4.5:1)"
```

---

## Task 2: Dead Token Cleanup in tokens.css

**Files:**
- Modify: `src/styles/tokens.css:273-278` (button color tokens in `:root`)
- Modify: `src/styles/tokens.css:283-286` (card split tokens in `:root`)
- Modify: `src/styles/tokens.css:293-294` (input split tokens in `:root`)
- Modify: `src/styles/tokens.css:304-307` (sidebar split tokens in `:root`)
- Modify: `src/styles/tokens.css:319-322` (table split tokens in `:root`)
- Modify: `src/styles/tokens.css:468-473` (dark mode component overrides)

- [ ] **Step 1: Delete button color tokens from `:root`**

Remove these 6 lines from the button tokens section (keep sizing tokens like `--button-sm-padding`):

```css
  --button-primary-bg: #15803d;
  --button-primary-color: #ffffff;
  --button-primary-shadow: 0 10px 15px -3px rgb(21 128 61 / 0.25);
  --button-secondary-bg: #0f172a;
  --button-secondary-color: #ffffff;
  --button-ghost-border: 1px solid #e2e8f0;
```

The button tokens section should keep only:

```css
  /* Button tokens */
  --button-sm-padding: 0.375rem 0.75rem;
  --button-sm-height: 2rem;
  --button-sm-font-size: 0.8125rem;
  --button-md-padding: 0.625rem 1.25rem;
  --button-md-height: 2.5rem;
  --button-md-font-size: 0.9375rem;
  --button-lg-padding: 0.75rem 1.5rem;
  --button-lg-height: 3rem;
  --button-lg-font-size: 0.9375rem;
```

- [ ] **Step 2: Delete card split tokens from `:root`**

Remove `--card-border-color-light`, `--card-border-color-dark`, `--card-bg-light`, `--card-bg-dark` from the card section. Keep `--card-padding`, `--card-border`, `--card-shadow`:

```css
  /* Card tokens */
  --card-padding: 1.75rem;
  --card-border: 1px solid;
  --card-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.05), 0 1px 2px 0 rgb(0 0 0 / 0.03);
```

- [ ] **Step 3: Delete input split tokens from `:root`**

Remove `--input-bg-light`, `--input-bg-dark` from the input section. Keep `--input-height`, `--input-padding`, `--input-font-size`, `--input-focus-ring`:

```css
  /* Input tokens */
  --input-height: 2.5rem;
  --input-padding: 0.5rem 2.5rem 0.5rem 0.75rem;
  --input-font-size: 0.8125rem;
  --input-focus-ring: 2px solid rgb(21 128 61 / 0.25);
```

- [ ] **Step 4: Delete sidebar split tokens from `:root`**

Remove `--sidebar-bg-light`, `--sidebar-bg-dark`, `--sidebar-border-light`, `--sidebar-border-dark`. Keep sizing/behavior tokens:

```css
  /* Sidebar tokens */
  --sidebar-width: 16rem;
  --sidebar-nav-item-padding: 0.625rem 1rem;
  --sidebar-nav-item-gap: 0.75rem;
  --sidebar-icon-size: 22px;
  --sidebar-active-gradient: linear-gradient(
    90deg,
    rgb(21 128 61 / 0.1) 0%,
    rgb(21 128 61 / 0) 100%
  );
  --sidebar-active-border: 2px solid #15803d;
```

- [ ] **Step 5: Delete table split tokens from `:root`**

Remove `--table-header-bg-light`, `--table-header-bg-dark`, `--table-row-hover-light`, `--table-row-hover-dark`. Keep sizing:

```css
  /* Table tokens */
  --table-cell-padding: 1rem 1.5rem;
  --table-icon-size: 22px;
```

- [ ] **Step 6: Delete dark mode component overrides**

Remove the entire "Component dark mode overrides" block from `[data-theme='dark']` (lines 468-473):

```css
  /* DELETE this entire block: */
  /* Component dark mode overrides — aligned to base surface hierarchy */
  --card-bg: var(--color-slate-800);
  --card-border-color: var(--color-slate-700);
  --input-bg: var(--color-slate-700);
  --sidebar-bg: var(--color-slate-900);
  --sidebar-border: var(--color-slate-700);
```

- [ ] **Step 7: Verify no consumers break**

```bash
bun run typecheck && bun run build
```

Expected: 0 errors. These tokens had zero `var()` consumers, so nothing should break.

- [ ] **Step 8: Commit**

```bash
git add src/styles/tokens.css
git commit -m "refactor(tokens): delete unused component color tokens

Remove 25 CSS custom properties that were defined but never referenced
via var() anywhere in the codebase:
- Split *-light/*-dark pairs (card, input, sidebar, table)
- Button color tokens (primary-bg, secondary-bg, ghost-border)
- Dark mode component overrides (card-bg, input-bg, sidebar-bg)

Components use DaisyUI semantic classes for theming instead."
```

---

## Task 3: Sync tokens.ts with Corrected CSS Values

**Files:**
- Modify: `src/lib/tokens.ts:74-163` (colors object)

- [ ] **Step 1: Update header comment**

Replace the header comment (lines 1-14) to reflect v1.3.0:

```typescript
/**
 * Design Tokens - JavaScript/TypeScript exports
 * ==========================================
 * Use these values in component logic for consistency
 *
 * Version: 1.3.0 - Allowealth Design System (Forest Green, WCAG AA)
 * Color semantic model:
 * - primary = slate-900 → headings, primary text, secondary buttons
 * - accent = forest-700 (#15803d) → CTAs, interactive elements, active states
 * - success = emerald-700 (#047857) → positive status, confirmations
 * - warning = amber-700 (#b45309) → budget alerts, caution states
 * - error = rose-600 (#e11d48) → over budget, destructive actions
 * - info = sky-600 (#0284c7) → informational messages (distinct from accent)
 */
```

- [ ] **Step 2: Update colors.warning and colors.warningHover**

```typescript
  warning: '#b45309',   // was '#f59e0b'
  warningHover: '#92400e', // was '#d97706'
```

- [ ] **Step 3: Update colors.error and colors.errorHover**

```typescript
  error: '#e11d48',    // was '#f43f5e'
  errorHover: '#be123c', // was '#e11d48'
```

- [ ] **Step 4: Update colors.success**

```typescript
  success: '#047857',  // was '#10b981'
```

- [ ] **Step 5: Update colors.info**

```typescript
  info: '#0284c7',     // was '#0ea5e9'
```

- [ ] **Step 6: Update colors.currency**

```typescript
  currency: {
    idr: '#047857', // emerald-700 — was '#10b981'
    usd: '#0284c7', // sky-600 — was '#0ea5e9'
  },
```

- [ ] **Step 7: Update colors.status**

```typescript
  status: {
    ok: '#15803d',      // green-700 — was '#22c55e'
    warning: '#b45309', // amber-700 — was '#f59e0b'
    danger: '#e11d48',  // rose-600 — was '#f43f5e'
  },
```

- [ ] **Step 8: Update colors.rose scale**

The `rose` scale object should still include the raw palette values. But `rose.500` is `#f43f5e` (unchanged — it's a palette value, not a semantic token). No change needed here.

- [ ] **Step 9: Verify typecheck**

```bash
bun run typecheck
```

Expected: 0 errors. Only string literal values changed, no type signatures.

- [ ] **Step 10: Commit**

```bash
git add src/lib/tokens.ts
git commit -m "fix(tokens): sync tokens.ts with WCAG-corrected CSS values

Align JS token values with tokens.css source of truth:
- warning: amber-500 → amber-700
- error: rose-500 → rose-600
- success: emerald-500 → emerald-700
- info: sky-500 → sky-600
- currency/status tokens updated to match"
```

---

## Task 4: Chart Theme Utility

**Files:**
- Create: `src/lib/utils/chart-theme.ts`

- [ ] **Step 1: Create the chart theme utility**

Create `src/lib/utils/chart-theme.ts`:

```typescript
import { isDarkTheme } from '@/lib/utils/chart-lifecycle';

/**
 * Read a CSS custom property's computed value.
 * Chart.js needs raw color strings, not var() references.
 */
export function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Chart color set derived from CSS tokens.
 * Call at chart init and on theme change — reads live DOM values.
 */
export function getChartThemeColors() {
  const dark = isDarkTheme();
  return {
    tooltipBg: dark ? 'rgba(248, 250, 252, 0.95)' : 'rgba(15, 23, 42, 0.9)',
    tooltipTitle: getCssVar('--color-primary'),
    tooltipBody: getCssVar('--color-primary'),
    tickText: getCssVar('--color-neutral-500'),
    legendText: getCssVar('--color-neutral-500'),
    gridLine: dark ? 'rgba(148, 163, 184, 0.1)' : 'rgba(148, 163, 184, 0.15)',
    accent: getCssVar('--color-accent'),
  };
}
```

- [ ] **Step 2: Verify typecheck**

```bash
bun run typecheck
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/utils/chart-theme.ts
git commit -m "feat(tokens): add chart theme color utility

Centralizes Chart.js color resolution from CSS custom properties.
Replaces duplicated dark/light ternaries across 7 chart components."
```

---

## Task 5: SVG Variable Migration — AccountHistory Components

**Files:**
- Modify: `src/components/partials/AccountHistoryPartial.astro:129-141`
- Modify: `src/components/organisms/AccountHistoryModal.astro:130-182,385`

- [ ] **Step 1: Replace hardcoded hex in AccountHistoryPartial.astro**

In `src/components/partials/AccountHistoryPartial.astro`, replace 3 instances of `#16a34a` with `var(--color-accent)`:

Line 129 — area fill:
```html
<path d={sparklineArea} fill="var(--color-accent)" fill-opacity="0.12" />
```

Line 132 — polyline stroke:
```html
<polyline
  points={sparklinePoints}
  fill="none"
  stroke="var(--color-accent)"
  stroke-width="1.5"
  stroke-linejoin="round"
  stroke-linecap="round"
/>
```

Line 141 — circle fill:
```html
return <circle cx={cx} cy={cy} r="2" fill="var(--color-accent)" />;
```

- [ ] **Step 2: Replace hardcoded hex in AccountHistoryModal.astro SVG template**

In `src/components/organisms/AccountHistoryModal.astro`, replace the gradient stops and line stroke.

Lines 131-132 — gradient stops:
```html
<stop offset="0%" stop-color="var(--color-accent)" stop-opacity="0.3"></stop>
<stop offset="100%" stop-color="var(--color-accent)" stop-opacity="0"></stop>
```

Line 179 — chart line stroke:
```html
<path
  data-chart-line
  fill="none"
  stroke="var(--color-accent)"
  stroke-width="3"
  stroke-linecap="round"
  stroke-linejoin="round"></path>
```

- [ ] **Step 3: Replace hardcoded hex in AccountHistoryModal.astro JS**

Line 385 — dot fill color. Replace:
```typescript
dot.setAttribute('fill', '#15803d');
```
With:
```typescript
dot.setAttribute('fill', getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim());
```

Also update the dot stroke color on line 386 if it uses a hardcoded white — check if `'white'` is acceptable (it adapts to theme via CSS named color) or if it should use a CSS variable. Since `white` is a fixed color used for the dot border contrast, it's acceptable as-is.

- [ ] **Step 4: Verify build**

```bash
bun run typecheck && bun run build
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/partials/AccountHistoryPartial.astro src/components/organisms/AccountHistoryModal.astro
git commit -m "fix(a11y): replace hardcoded SVG hex with CSS variables in AccountHistory

AccountHistoryPartial: sparkline fill/stroke/circle use var(--color-accent)
AccountHistoryModal: gradient stops, line stroke, and JS dot fill use
var(--color-accent) — colors now adapt to light/dark theme automatically"
```

---

## Task 6: Chart Tooltip Migration — SpendingChart, RecurringVsOneTimeChart, ResourceAllocationChart

These 3 charts have the simpler pattern: only tooltip title/body colors.

**Files:**
- Modify: `src/components/organisms/SpendingChart.astro`
- Modify: `src/components/organisms/RecurringVsOneTimeChart.astro`
- Modify: `src/components/organisms/ResourceAllocationChart.astro`

- [ ] **Step 1: Add import to SpendingChart.astro**

Find the existing import block in the `<script>` tag and add:

```typescript
import { getChartThemeColors } from '@/lib/utils/chart-theme';
```

- [ ] **Step 2: Replace tooltip ternaries in SpendingChart.astro updateThemeColors()**

In the `updateThemeColors` function (around line 257), replace the tooltip ternaries:

Before:
```typescript
chart.options.plugins.tooltip.backgroundColor = dark
  ? 'rgba(248, 250, 252, 0.95)'
  : 'rgba(15, 23, 42, 0.9)';
chart.options.plugins.tooltip.titleColor = dark ? '#0f172a' : '#fff';
chart.options.plugins.tooltip.bodyColor = dark ? '#0f172a' : '#fff';
```

After:
```typescript
const theme = getChartThemeColors();
chart.options.plugins.tooltip.backgroundColor = theme.tooltipBg;
chart.options.plugins.tooltip.titleColor = theme.tooltipTitle;
chart.options.plugins.tooltip.bodyColor = theme.tooltipBody;
```

- [ ] **Step 3: Replace tooltip ternaries in SpendingChart.astro initSpendingChart()**

In the chart init function (around line 325), replace the same pattern in the initial chart config:

Before:
```typescript
tooltip: {
  backgroundColor: dark ? 'rgba(248, 250, 252, 0.95)' : 'rgba(15, 23, 42, 0.9)',
  titleColor: dark ? '#0f172a' : '#fff',
  bodyColor: dark ? '#0f172a' : '#fff',
```

After:
```typescript
const theme = getChartThemeColors();
// ... then in the config:
tooltip: {
  backgroundColor: theme.tooltipBg,
  titleColor: theme.tooltipTitle,
  bodyColor: theme.tooltipBody,
```

Note: `theme` must be declared before the chart config object. The `dark` variable that was used for this purpose may still be needed for other non-tooltip logic — check before removing it.

- [ ] **Step 4: Apply same pattern to RecurringVsOneTimeChart.astro**

Add the import and replace the same 3-line tooltip ternary pattern in both `updateThemeColors()` (around line 163) and `initChart()` (around line 207). Same transformation as Steps 1-3.

- [ ] **Step 5: Apply same pattern to ResourceAllocationChart.astro**

Add the import and replace the same 3-line tooltip ternary pattern in `updateChartThemeColors()` (around line 220) and the chart init function. Same transformation as Steps 1-3.

- [ ] **Step 6: Verify build**

```bash
bun run typecheck && bun run build
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/organisms/SpendingChart.astro src/components/organisms/RecurringVsOneTimeChart.astro src/components/organisms/ResourceAllocationChart.astro
git commit -m "refactor(charts): migrate tooltip colors to chart theme utility

Replace hardcoded dark/light ternaries with getChartThemeColors() in
SpendingChart, RecurringVsOneTimeChart, and ResourceAllocationChart.
Tooltip colors now derive from CSS custom properties."
```

---

## Task 7: Chart Tooltip Migration — FinancialVelocityChart, IncomeSourceTrendChart, ForecastCashflowChart

These 3 charts have the complex pattern: tooltip + legend + tick + grid colors.

**Files:**
- Modify: `src/components/organisms/FinancialVelocityChart.astro`
- Modify: `src/components/organisms/IncomeSourceTrendChart.astro`
- Modify: `src/components/organisms/ForecastCashflowChart.astro`

- [ ] **Step 1: Migrate FinancialVelocityChart.astro**

Add import:
```typescript
import { getChartThemeColors } from '@/lib/utils/chart-theme';
```

In `updateChartThemeColors()` (around line 184), replace the tooltip + legend + axis blocks:

Before:
```typescript
chart.options.plugins.tooltip.titleColor = dark ? '#0f172a' : '#fff';
chart.options.plugins.tooltip.bodyColor = dark ? '#0f172a' : '#fff';
// ...
chart.options.plugins.legend.labels.color = textColor;
// ...
chart.options.scales.x.ticks.color = textColor;
chart.options.scales.y.ticks.color = textColor;
chart.options.scales.y.grid.color = dark
  ? 'rgba(148, 163, 184, 0.1)'
  : 'rgba(148, 163, 184, 0.15)';
```

After:
```typescript
const theme = getChartThemeColors();
chart.options.plugins.tooltip.backgroundColor = theme.tooltipBg;
chart.options.plugins.tooltip.titleColor = theme.tooltipTitle;
chart.options.plugins.tooltip.bodyColor = theme.tooltipBody;
// ...
chart.options.plugins.legend.labels.color = theme.legendText;
// ...
chart.options.scales.x.ticks.color = theme.tickText;
chart.options.scales.y.ticks.color = theme.tickText;
chart.options.scales.y.grid.color = theme.gridLine;
```

Apply the same replacement to the initial chart config in the init function. Replace `const textColor = dark ? '#94a3b8' : '#64748b';` with `const theme = getChartThemeColors();` and use `theme.tickText` / `theme.legendText` where `textColor` was used.

- [ ] **Step 2: Migrate IncomeSourceTrendChart.astro**

Add import:
```typescript
import { getChartThemeColors } from '@/lib/utils/chart-theme';
```

This component has a local `readThemeColor()` function (lines 156-160). Keep it — it's used for dataset colors (accent, info, warning) which are in scope to read from CSS variables. Only replace the tooltip/legend/tick/grid ternaries with `getChartThemeColors()`.

In `updateChartThemeColors()` (around line 177), replace:
```typescript
chart.options.plugins.tooltip.titleColor = dark ? '#0f172a' : '#fff';
chart.options.plugins.tooltip.bodyColor = dark ? '#0f172a' : '#fff';
```
with `theme.tooltipTitle` / `theme.tooltipBody` / `theme.tooltipBg`.

Also replace legend, tick, and grid ternaries with `theme.legendText`, `theme.tickText`, `theme.gridLine`.

Apply same to the init function (around line 230): replace `const textColor = dark ? '#94a3b8' : '#64748b';` with `const theme = getChartThemeColors();` and substitute `theme.tickText`.

- [ ] **Step 3: Migrate ForecastCashflowChart.astro**

Same pattern as Steps 1-2. Add import, replace tooltip/legend/tick/grid ternaries in both `updateChartThemeColors()` (around line 188) and the init function (around line 232). Replace `const textColor = dark ? '#94a3b8' : '#64748b';` with `const theme = getChartThemeColors();`.

- [ ] **Step 4: Verify build**

```bash
bun run typecheck && bun run build
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/organisms/FinancialVelocityChart.astro src/components/organisms/IncomeSourceTrendChart.astro src/components/organisms/ForecastCashflowChart.astro
git commit -m "refactor(charts): migrate tooltip/legend/axis colors to chart theme utility

Replace hardcoded dark/light ternaries with getChartThemeColors() in
FinancialVelocityChart, IncomeSourceTrendChart, and ForecastCashflowChart.
Covers tooltip, legend label, tick text, and grid line colors."
```

---

## Task 8: Site Token Mirror

**Files:**
- Modify: `apps/site/src/styles/tokens.css`

The site tokens are a diverged copy. Apply the same WCAG corrections and dead token cleanup, but respect the site's own structure (it has glass effect tokens, no mobile nav tokens, etc.).

- [ ] **Step 1: Apply WCAG corrections to site tokens.css**

Apply the same semantic color changes as Task 1. The site uses the older uncorrected values. Update:

```css
--color-error: #e11d48; /* rose-600 — was #f43f5e */
--color-error-hover: #be123c; /* rose-700 — was #e11d48 */
--color-info: #0284c7; /* sky-600 — was #0ea5e9 */
--color-info-hover: #0369a1; /* sky-700 — was #0284c7 */
--color-warning: #b45309; /* amber-700 — was #f59e0b */
--color-warning-hover: #92400e; /* amber-800 — was #d97706 */
--color-success: #047857; /* emerald-700 — was #10b981 */
--color-success-hover: #065f46; /* emerald-800 — was #059669 */
--color-currency-idr: #047857; /* emerald-700 */
--color-currency-usd: #0284c7; /* sky-600 */
--color-status-ok: #15803d; /* green-700 */
--color-status-warning: #b45309; /* amber-700 */
--color-status-danger: #e11d48; /* rose-600 */
```

- [ ] **Step 2: Delete dead split/button tokens from site tokens.css**

Apply the same dead token cleanup as Task 2. Delete `--card-bg-light/dark`, `--card-border-color-light/dark`, `--input-bg-light/dark`, `--sidebar-bg-light/dark`, `--sidebar-border-light/dark`, `--table-header-bg-light/dark`, `--table-row-hover-light/dark`, `--button-primary-bg/color/shadow`, `--button-secondary-bg/color`, `--button-ghost-border`.

Also delete dark mode component overrides if the site has them.

- [ ] **Step 3: Update header comment to v1.3.0**

Same header comment update as Task 1 Step 5.

- [ ] **Step 4: Verify site builds**

```bash
bun run typecheck && bun run build
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add apps/site/src/styles/tokens.css
git commit -m "fix(site): mirror WCAG token corrections and dead token cleanup

Apply same WCAG AA contrast fixes and dead token removal to
the marketing site's tokens.css copy."
```

---

## Task 9: Documentation Update

**Files:**
- Modify: `design-system/01-foundations.md`

- [ ] **Step 1: Update the Color Semantic Model table**

Replace the color semantic model table (around lines 37-44) with corrected values and contrast ratios:

```markdown
| Usage         | Color   | Hex     | Contrast (white) | Semantic                          |
| ------------- | ------- | ------- | ---------------- | --------------------------------- |
| Primary CTAs  | accent  | #15803d | 5.5:1            | forest-700 — CTAs, WCAG AA       |
| Headings/text | primary | #0f172a | 17.1:1           | slate-900 — headings, text       |
| Success       | success | #047857 | 5.5:1            | emerald-700 — positive status    |
| Warning       | warning | #b45309 | 5.0:1            | amber-700 — caution states       |
| Error         | error   | #e11d48 | 5.2:1            | rose-600 — destructive actions   |
| Info          | info    | #0284c7 | 4.5:1            | sky-600 — informational          |
```

- [ ] **Step 2: Update the Semantic Colors version header**

Change `### Semantic Colors (v1.2.0 - Forest Green + Comfortable Dark)` to `### Semantic Colors (v1.3.0 - Forest Green + Comfortable Dark, WCAG AA)`

- [ ] **Step 3: Update code examples in the Semantic Colors section**

Update the TypeScript code block (lines 17-33):

```typescript
colors.warning; // #b45309 (amber-700)
colors.error; // #e11d48 (rose-600)
colors.errorHover; // #be123c (rose-700)
colors.success; // #047857 (emerald-700)
colors.info; // #0284c7 (sky-600)
```

- [ ] **Step 4: Update Currency & Status code examples**

```typescript
colors.currency.idr; // #047857 (emerald-700)
colors.currency.usd; // #0284c7 (sky-600)

colors.status.ok; // #15803d (green-700, <80%)
colors.status.warning; // #b45309 (amber-700, 80-99%)
colors.status.danger; // #e11d48 (rose-600, ≥100%)
```

- [ ] **Step 5: Verify no broken links or formatting**

Read the updated file and check that markdown table alignment is correct and no stale values remain.

- [ ] **Step 6: Commit**

```bash
git add design-system/01-foundations.md
git commit -m "docs(design-system): update foundations with WCAG-corrected token values

Align color tables, code examples, and contrast ratios with the
corrected tokens.css values (v1.3.0)."
```

---

## Task 10: Final Verification

- [ ] **Step 1: Run full quality gates**

```bash
bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck
```

All must pass.

- [ ] **Step 2: Run build**

```bash
bun run build
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 3: Audit remaining hardcoded hex in changed files**

```bash
grep -n '#[0-9a-fA-F]\{6\}' src/components/partials/AccountHistoryPartial.astro src/components/organisms/AccountHistoryModal.astro src/components/organisms/SpendingChart.astro src/components/organisms/FinancialVelocityChart.astro src/components/organisms/IncomeSourceTrendChart.astro src/components/organisms/ForecastCashflowChart.astro src/components/organisms/RecurringVsOneTimeChart.astro src/components/organisms/ResourceAllocationChart.astro
```

Verify that remaining hex values are only out-of-scope items (category palette colors, dataset bar colors). No tooltip/tick/legend/grid hex should remain.

- [ ] **Step 4: Visual verification in browser**

Start the dev server and check:
1. Light mode: verify error text is darker rose, info text is darker blue
2. Dark mode: verify AccountHistory sparkline adapts (green accent on dark bg)
3. Both modes: hover over chart tooltips — text should be readable
4. Both modes: chart axis labels and legend text should be visible

```bash
bun run dev
```

Open the app in Chrome at the worktree's dev URL. Check accounts page (AccountHistory sparkline), budgets page (charts), and transactions page (SpendingChart).

- [ ] **Step 5: Final commit if any formatting was adjusted**

If quality gates made formatting changes:

```bash
git add -A
git commit -m "style: format after WCAG color audit changes"
```
