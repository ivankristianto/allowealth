# ALL-75: Dark Mode WCAG Color Audit

**Date:** 2026-04-12
**Status:** Draft
**Ticket:** [ALL-75](https://linear.app/allowealth/issue/ALL-75)
**GitHub Issue:** [#382](https://github.com/ivankristianto/allowealth/issues/382)

## Goal

Make all color tokens WCAG AA compliant in both themes, eliminate hardcoded hex from components, and establish `tokens.css` as the single source of truth.

## Scope

**In scope:**
- Fix 4 light-mode tokens that fail WCAG AA contrast (error, info, status-ok, currency-idr)
- Delete all unused component tokens (split `*-light`/`*-dark` pairs, button tokens)
- Replace hardcoded SVG hex in AccountHistory components with CSS variables
- Create a chart theme utility for Chart.js color needs
- Migrate chart tooltip/axis colors from inline ternaries to the utility (7 chart components)
- Sync `tokens.ts` with corrected `tokens.css` values
- Update `design-system/01-foundations.md` to match actual token values

**Out of scope:**
- Category palette hex in chart data series (data visualization, not theme tokens)
- Google OAuth button brand colors (`GoogleButton.astro`)
- Database-stored category colors (user-defined data)
- Test fixture hex values
- `OTHERS_COLOR` constants in `BudgetSummary.astro` / `AccountPortfolioSummary.astro` (data viz gray)
- `apps/site/` 404 page animation colors (marketing site, separate concern)
- MFA QR code black/white (`MfaSetupModal.astro`) — intrinsic to QR rendering

## Design

### 1. WCAG Token Corrections

Replace 4 light-mode tokens that fail WCAG AA (4.5:1 minimum for normal text on white):

| Token | Current | Ratio | Replacement | Ratio |
|-------|---------|-------|-------------|-------|
| `--color-error` | `#f43f5e` (rose-500) | 3.6:1 | `#e11d48` (rose-600) | 5.2:1 |
| `--color-info` | `#0ea5e9` (sky-500) | 2.8:1 | `#0284c7` (sky-600) | 4.5:1 |
| `--color-status-ok` | `#22c55e` (green-500) | 2.4:1 | `#15803d` (green-700) | 5.5:1 |
| `--color-currency-idr` | `#10b981` (emerald-500) | 2.9:1 | `#047857` (emerald-700) | 5.5:1 |
| `--color-currency-usd` | `#0ea5e9` (sky-500) | 2.8:1 | `#0284c7` (sky-600) | 4.5:1 |
| `--color-status-danger` | `#f43f5e` (rose-500) | 3.6:1 | `#e11d48` (rose-600) | 5.2:1 |

Derived hover changes (hover must differ from base to remain visually distinct):
- `--color-error-hover`: `#e11d48` (rose-600) → `#be123c` (rose-700) — base moved to rose-600, so hover shifts one step darker
- `--color-info-hover`: `#0284c7` (sky-600) → `#0369a1` (sky-700) — same reason
- `--color-error-light`: stays `#ffe4e6` (rose-100, background tint — no contrast concern)

Tokens already passing (no change): `--color-accent` (#15803d, 5.5:1), `--color-warning` (#b45309, 5.0:1), `--color-success` (#047857, 5.5:1), `--color-primary` (#0f172a, 17.1:1).

Dark mode tokens already pass on `#111827` base — no changes needed.

### 2. Dead Token Cleanup

Delete all component tokens with zero `var()` consumers. Grep confirmed no file references these via `var(--token-name)`.

**Delete from `:root`:**

Split pairs:
- `--card-bg-light`, `--card-bg-dark`
- `--card-border-color-light`, `--card-border-color-dark`
- `--input-bg-light`, `--input-bg-dark`
- `--sidebar-bg-light`, `--sidebar-bg-dark`
- `--sidebar-border-light`, `--sidebar-border-dark`
- `--table-header-bg-light`, `--table-header-bg-dark`
- `--table-row-hover-light`, `--table-row-hover-dark`

Button tokens:
- `--button-primary-bg`, `--button-primary-color`, `--button-primary-shadow`
- `--button-secondary-bg`, `--button-secondary-color`
- `--button-ghost-border`

**Delete from `[data-theme='dark']`:**
- `--card-bg`, `--card-border-color`, `--input-bg`, `--sidebar-bg`, `--sidebar-border` — defined in the dark block but no component references them via `var()`. Delete.

**Net result:** The "COMPONENT TOKENS" section in `:root` keeps only sizing/spacing tokens (padding, heights, font sizes, widths). All color-related component tokens — both `:root` and `[data-theme='dark']` — are removed.

### 3. SVG Variable Migration

Replace hardcoded hex in inline SVG attributes with `var(--color-accent)`.

**AccountHistoryPartial.astro** (lines 129-141):
- `fill="#16a34a"` → `fill="var(--color-accent)"`
- `stroke="#16a34a"` → `stroke="var(--color-accent)"`
- `fill="#16a34a"` (circle) → `fill="var(--color-accent)"`

**AccountHistoryModal.astro** (lines 130-182):
- `stop-color="#15803d"` (2 gradient stops) → `stop-color="var(--color-accent)"`
- `stroke="#15803d"` (chart line) → `stroke="var(--color-accent)"`
- Line 385 JS: `dot.setAttribute('fill', '#15803d')` → read computed CSS variable value

### 4. Chart Theme Utility

**New file:** `src/lib/utils/chart-theme.ts`

```typescript
/**
 * Read a CSS custom property's computed value.
 * Chart.js needs raw color strings, not var() references.
 */
export function getCssVar(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}

/**
 * Chart color set derived from CSS tokens.
 * Call at chart init and on theme change — reads live DOM values.
 */
export function getChartThemeColors() {
  return {
    tooltipTitle: getCssVar('--color-primary'),
    tooltipBody: getCssVar('--color-primary'),
    tickText: getCssVar('--color-neutral-500'),
    legendText: getCssVar('--color-neutral-500'),
    gridLine: getCssVar('--color-neutral-200'),
    accent: getCssVar('--color-accent'),
  };
}
```

This replaces duplicated `dark ? '#hex' : '#hex'` ternaries across 7 chart components.

### 5. Chart Tooltip/Axis Color Migration

Replace inline dark/light ternaries with `getChartThemeColors()` calls in these components:

| Component | Patterns replaced |
|-----------|-------------------|
| `SpendingChart.astro` | tooltip title/body colors |
| `FinancialVelocityChart.astro` | tooltip title/body colors |
| `IncomeSourceTrendChart.astro` | tooltip, legend, tick, textColor |
| `ForecastCashflowChart.astro` | tooltip, legend, tick, textColor |
| `RecurringVsOneTimeChart.astro` | tooltip title/body colors |
| `ResourceAllocationChart.astro` | tooltip title/body colors |
| `AccountHistoryModal.astro` | dot fill color (JS) |

Each component already detects theme changes (observing `data-theme`). The migration replaces hardcoded hex with `getChartThemeColors()` called inside the existing theme-change handler.

**Not migrated** (out of scope): category data-series palette colors (e.g., SpendingChart's `['#ef4444', '#3b82f6', ...]`). These are data visualization colors, not theme tokens.

### 6. `tokens.ts` Sync

Align JS token values with the corrected CSS values:

| Property | Current | Corrected |
|----------|---------|-----------|
| `colors.warning` | `#f59e0b` | `#b45309` |
| `colors.warningHover` | `#d97706` | `#92400e` |
| `colors.error` | `#f43f5e` | `#e11d48` |
| `colors.errorHover` | `#e11d48` | `#be123c` |
| `colors.success` | `#10b981` | `#047857` |
| `colors.info` | `#0ea5e9` | `#0284c7` |
| `colors.currency.idr` | `#10b981` | `#047857` |
| `colors.currency.usd` | `#0ea5e9` | `#0284c7` |
| `colors.status.ok` | `#22c55e` | `#15803d` |
| `colors.status.warning` | `#f59e0b` | `#b45309` |
| `colors.status.danger` | `#f43f5e` | `#e11d48` |

Update header comment to reflect version 1.3.0 and corrected color semantic model.

### 7. Documentation Update

Update `design-system/01-foundations.md`:

- Color Semantic Model table: correct all hex values and add contrast ratios
- Currency & Status code examples: update hex values in code blocks
- Add verified contrast ratio table for both light and dark mode
- Remove any contrast claims that contradict actual token values
- Update version reference to 1.3.0

### 8. Site Token Mirror

`apps/site/src/styles/tokens.css` contains a copy of the main token file. Apply the same WCAG corrections and dead token cleanup there. The site tokens don't need chart utility or component migrations — those don't exist in the site app.

## Files Changed

| File | Change type |
|------|-------------|
| `src/styles/tokens.css` | Edit: WCAG fixes + delete dead tokens |
| `src/lib/tokens.ts` | Edit: sync values |
| `src/lib/utils/chart-theme.ts` | New: chart color utility |
| `src/components/partials/AccountHistoryPartial.astro` | Edit: SVG hex → var() |
| `src/components/organisms/AccountHistoryModal.astro` | Edit: SVG hex → var(), JS hex → getCssVar() |
| `src/components/organisms/SpendingChart.astro` | Edit: tooltip colors → utility |
| `src/components/organisms/FinancialVelocityChart.astro` | Edit: tooltip colors → utility |
| `src/components/organisms/IncomeSourceTrendChart.astro` | Edit: tooltip/legend/tick → utility |
| `src/components/organisms/ForecastCashflowChart.astro` | Edit: tooltip/legend/tick → utility |
| `src/components/organisms/RecurringVsOneTimeChart.astro` | Edit: tooltip colors → utility |
| `src/components/organisms/ResourceAllocationChart.astro` | Edit: tooltip colors → utility |
| `design-system/01-foundations.md` | Edit: correct values + contrast table |
| `apps/site/src/styles/tokens.css` | Edit: mirror WCAG fixes + dead token cleanup |

## Acceptance Criteria Mapping

| Criterion | Addressed by |
|-----------|-------------|
| All text tokens meet WCAG AA in both modes | Section 1 (light fixes) + dark mode verified passing |
| Split `*-light`/`*-dark` pairs replaced with theme-aware variables | Section 2 (deleted — unused, DaisyUI classes handle theming) |
| AccountHistory SVG colors use CSS variables | Section 3 |
| `01-foundations.md` contrast table matches actual tokens | Section 7 |
| No new hardcoded hex outside `tokens.css` | New `chart-theme.ts` reads from CSS vars, no hex |
| `tokens.ts` stays in sync with CSS | Section 6 |

## Verification

After implementation:
1. Run `bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck` — all must pass
2. Run `bun run build` — no new errors
3. Grep `#[0-9a-fA-F]{6}` in changed `.astro` files — only out-of-scope hex should remain
4. Visual check: open app in both light and dark mode, verify AccountHistory sparkline/chart colors adapt to theme
5. Visual check: verify chart tooltips are readable in both themes
