# Design System Refresh Design

**Goal:** Update the design-system documentation to reflect the current atomic design refactor, component usage, tokens, and patterns.

## Scope

- Refresh all existing design-system files (`START.md`, `01–08`) for accuracy.
- Add a full component inventory for atoms/molecules/organisms.
- Replace stale examples (custom Icon, raw Chart.js, `animate-pulse`) with current patterns.
- Align token usage with `src/lib/tokens.ts` and `src/styles/tokens.css`.

## Non-Goals

- No changes to application code or components in this phase.
- No new design tokens or theme changes.

## Current Source of Truth

- Tokens: `src/lib/tokens.ts` (logic) + `src/styles/tokens.css` (CSS vars)
- Components: `src/components/{atoms,molecules,organisms}`
- Icons: `@lucide/astro`
- Animations: `motion`
- Charts: `@/lib/chart-setup`
- Loading: `Skeleton` atom

## Update Plan by File

### `design-system/START.md`

- Emphasize tokens, DaisyUI, Lucide, Skeleton, Motion as core rules.
- Add pointer to component inventory in `02-components.md`.
- Update examples to match current patterns (no custom Icon, no raw Chart.js, no `animate-pulse`).

### `design-system/01-foundations.md`

- Align tokens, spacing, and font sizes with `src/lib/tokens.ts` and `src/styles/tokens.css`.
- Add budget status mapping notes (`BudgetStatus` vs `BudgetStatusClassName`).
- Reference `tokenClasses` utilities where used for spacing and typography.

### `design-system/02-components.md`

- Add full component inventory grouped by atoms, molecules, organisms.
- Update canonical examples for key components:
  - `Skeleton`, `StatCard`, `ConfirmationModal`, `FormField`, `TransactionCard`, `PeriodNavigator`.
- Clarify modal usage with native `<dialog>` and `ConfirmationModal`.

### `design-system/03-forms.md`

- Align form examples with `FormField`, `Label`, `Input`, and `ErrorMessage`.
- Reinforce label requirement (no placeholder-only labels).

### `design-system/04-accessibility.md`

- Update disabled button guidance: native `disabled` attribute required.
- Keep ARIA boolean attribute pattern and touch target guidance.

### `design-system/05-responsive.md`

- Refresh layout examples to match current layout patterns and spacing.

### `design-system/06-data-visualization.md`

- Update chart setup to `@/lib/chart-setup`.
- Replace loading examples with `Skeleton`.
- Keep currency and budget status conventions accurate.

### `design-system/07-patterns.md`

- Update list, filters, and modal examples to current components.
- Replace loading examples with `Skeleton`.

### `design-system/08-animations.md`

- Keep Motion as standard; add guidance for enter/exit animation patterns.
- Reference existing modal/toast motion patterns.

## Component Inventory (Source)

- Atoms: `src/components/atoms/*`
- Molecules: `src/components/molecules/*`
- Organisms: `src/components/organisms/*`

## Verification

- Manual review of each design-system doc for consistency.
- Spot-check examples against actual component APIs.
