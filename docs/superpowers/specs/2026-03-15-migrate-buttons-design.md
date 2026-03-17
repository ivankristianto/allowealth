# Technical Debt: Migrate Native `<button>` to Custom `<Button>` Component

**Ticket:** ALL-52
**Date:** 2026-03-15
**Status:** Design Approved

## Problem

The application has ~326 native `<button>` elements across 123 files but only ~29 usages of the custom `<Button>` component. Less than 7% of buttons use the design system's encapsulated component, leading to inconsistent styling (varying border-radii, sizes, hover states) and duplicated DaisyUI classes.

## Goal

Migrate all eligible native `<button>` elements to the custom `<Button>` component in a single PR to enforce global UI consistency and centralize button styling, loading states, and disabled states.

## Scope

### In Scope (~190 buttons across ~120 files)

- **Standard action buttons** (~60): Form submits, save/cancel/delete, CTAs using `btn btn-accent`, `btn btn-primary`, etc.
- **Icon-only buttons** (~130): Toolbar and table action buttons using `btn-ghost btn-sm btn-square`, `btn-circle btn-ghost`, etc.

### Out of Scope (stay native)

- **Modal backdrop buttons** (~8): `<form method="dialog"><button>` elements used by DaisyUI modal pattern
- **Tab/toggle buttons** (~11): `role="tab"`, `TabToggle.astro`, `CurrencySwitcher.astro` — these are semantically different controls with their own component abstractions
- **Menu item buttons** (~30): `role="menuitem"` inside dropdown menus — these are menu controls, not action buttons

## Design

### 1. Button Component Extension

Extend `Button.astro` with two additions:

#### New `shape` prop

```typescript
shape?: 'default' | 'square' | 'circle';
```

- `shape="square"` adds `btn-square` (equal width/height, no padding)
- `shape="circle"` adds `btn-circle` (equal width/height, fully rounded)
- `shape="default"` or omitted preserves current behavior

The shape class is appended alongside existing size classes: `<Button shape="square" size="sm" variant="ghost">` produces `btn btn-ghost btn-sm btn-square ...`.

#### New `xs` size

Add `xs` to the `size` prop options:

```typescript
size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
```

Maps to DaisyUI's `btn-xs` class. Required because the audit found frequent use of `btn-xs` for compact icon-only buttons.

### 2. Migration Mapping

| Native Pattern | Button Props |
|---|---|
| `btn btn-accent rounded-2xl` | `variant="primary"` |
| `btn btn-primary` | `variant="primary"` |
| `btn btn-outline` | `variant="outline"` |
| `btn btn-ghost` | `variant="ghost"` |
| `btn btn-error` | `variant="danger"` |
| `btn btn-warning` | `variant="warning"` |
| `btn btn-success` | `variant="success"` |
| `btn btn-secondary` | `variant="secondary"` |
| `btn btn-ghost btn-sm btn-square` | `variant="ghost" size="sm" shape="square"` |
| `btn btn-circle btn-ghost btn-sm` | `variant="ghost" size="sm" shape="circle"` |
| `btn btn-ghost btn-xs btn-square` | `variant="ghost" size="xs" shape="square"` |

**Classes removed during migration** (handled by `<Button>` internally):
- `btn`, `btn-accent`, `btn-primary`, `btn-ghost`, `btn-outline`, `btn-error`, `btn-secondary`, `btn-warning`, `btn-success`
- `btn-sm`, `btn-md`, `btn-lg`, `btn-xl`, `btn-xs`
- `btn-square`, `btn-circle`
- `rounded-2xl`, `rounded-xl` (component uses `rounded-2xl` by default)
- `focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent` (component handles focus styles)
- `inline-flex items-center justify-center gap-2 font-medium transition-all duration-200` (component base classes)

**Classes kept as `className`** (file-specific overrides):
- Custom spacing: `min-h-[44px]`, `min-w-[44px]`
- One-off sizing: `h-14`, `flex-[2]`
- Font overrides: `font-bold`
- Layout: `w-full`

**Attributes preserved via `...rest` spread:**
- All `data-*` attributes (event delegation)
- All `aria-*` attributes (accessibility)
- `type`, `disabled`, `id`

### 3. Execution Strategy

Single PR with systematic file sweep:

1. **Extend `Button.astro`** — add `shape` prop and `xs` size
2. **Migrate all ~120 files** — each file follows the same steps:
   - Add `import Button from '@/components/atoms/Button.astro'`
   - Replace each eligible `<button>` with `<Button>` using the mapping table
   - Remove DaisyUI classes handled by the component
   - Keep file-specific classes as `className`
   - Preserve all `data-*`, `aria-*`, `type`, `disabled` attributes
   - Skip excluded buttons (modal backdrop, tab, menuitem)

### 4. Quality Verification

- `bun run typecheck` — no type errors
- `bun run lint:fix` — ESLint passes
- `bun run stylelint:fix` — Stylelint passes
- `bun run format:fix` — Prettier passes
- `bun run build` — no SSR breakage
- Visual spot-check of high-traffic pages (dashboard, transactions, accounts, budget)

### 5. Risk Mitigation

- **No attribute loss**: `...rest` spread on `Button.astro` passes through all attributes
- **Identical DOM output**: The component renders a native `<button>` internally
- **No client-side JS changes**: `data-*` attributes for event delegation pass through unchanged
- **Rollback**: Single PR can be reverted cleanly if issues are found

### 6. Implementation Notes

- **`primary` is canonical**: Both `primary` and `accent` variants produce `btn-accent shadow-accent-glow`. Use `variant="primary"` for all migrated accent/primary buttons.
- **Ghost variant border**: The `<Button variant="ghost">` adds `border border-base-300`, which bare `btn-ghost` does not. Spot-check ghost buttons visually after migration.
- **Bare `btn` without variant**: Any native buttons using just `class="btn"` with no variant class need case-by-case handling — the component defaults to `variant="primary"` which adds accent styling. These should likely use `variant="ghost"` or `variant="secondary"` depending on context.
