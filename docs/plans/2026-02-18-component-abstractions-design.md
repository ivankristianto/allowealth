# Component Abstractions Design

**Date:** 2026-02-18
**Status:** Approved
**Goal:** Reduce duplication, increase component velocity, enforce design consistency

## Context

A component analysis (COMPONENT_ANALYSIS.md) identified four groups of components sharing structural patterns. This document captures the approved design for consolidating those groups via named-slot base components.

## Scope

| Group                | Action                               | Components Affected                                                                       |
| -------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------- |
| Security Cards       | Create `SecurityCard.astro` base     | SecurityApiKeysCard, SecurityMfaCard, SecurityPasskeysCard, SecurityConnectedAccountsCard |
| Dashboard Widgets    | Create `DashboardWidget.astro` base  | AssetsWidget, CashFlowWidget, SpendingCard                                                |
| Filter Bars          | Extract `SearchInput.astro` molecule | TransactionFiltersBar, BudgetFilterControls                                               |
| Delete Confirmations | **Out of scope**                     | Already abstracted via `ConfirmationModal`                                                |

## Approach: Named Slot Composition

Each base component handles the shared shell and structural logic. Consumers fill named slots with their specific content. This is idiomatic Astro SSR — no client JS required, no prop explosion.

---

## 1. `SecurityCard.astro`

**Location:** `src/components/molecules/SecurityCard.astro`

### Props

```typescript
interface Props {
  title: string;
  subtitle: string;
  iconVariant?: 'info' | 'success' | 'warning' | 'accent' | 'error' | 'neutral';
  badge?: string; // e.g. "Under Development" — renders as badge-outline next to title
  class?: string;
}
```

### Named Slots

| Slot            | Required | Description                                                                 |
| --------------- | -------- | --------------------------------------------------------------------------- |
| `icon`          | Yes      | Lucide icon element (e.g. `<Cpu size={20} />`)                              |
| `header-action` | No       | Button or link pinned to header right; triggers `sm:justify-between` layout |
| Default         | Yes      | Card body content                                                           |

### Behavior

- When `header-action` slot is filled (`Astro.slots.has('header-action')`): header uses `flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`
- When absent: header uses `flex items-center gap-4`
- `badge` renders as `badge badge-outline badge-sm` next to the title
- `iconVariant` maps to `<IconBadge variant={iconVariant} size="sm">`

### Example Usage

```astro
<SecurityCard title="MCP Access Tokens" subtitle="Model Context Protocol (MCP)" iconVariant="info">
  <Cpu slot="icon" size={20} class="stroke-current" aria-hidden="true" />
  <Button slot="header-action" type="button" variant="primary" size="sm">
    <Plus size={16} /> Generate Token
  </Button>

  <p class="text-sm text-base-content/70">Connect AI assistants...</p>
  <div data-api-keys-list>...</div>
</SecurityCard>
```

```astro
<SecurityCard
  title="Multi-Factor Authentication"
  subtitle="2FA Protection"
  iconVariant="success"
  badge="Under Development"
>
  <ShieldCheck slot="icon" size={20} class="stroke-current" aria-hidden="true" />
  <!-- no header-action slot → compact header layout -->
  <div class="space-y-4">...</div>
</SecurityCard>
```

---

## 2. `DashboardWidget.astro`

**Location:** `src/components/organisms/DashboardWidget.astro`

### Props

```typescript
interface Props {
  loading?: boolean;
  isEmpty?: boolean; // computed by consumer (e.g. items.length === 0)
  error?: string; // optional error message
  ariaLabel?: string;
  testId?: string;
  class?: string;
}
```

### Named Slots

| Slot      | Required    | Description                                             |
| --------- | ----------- | ------------------------------------------------------- |
| `loading` | Yes\*       | Skeleton matching this widget's layout                  |
| `empty`   | Conditional | Empty state; shown when `!loading && !error && isEmpty` |
| `error`   | No          | Error state; defaults to plain error text if omitted    |
| Default   | Yes         | Normal content                                          |

\*Required if `loading` prop will ever be `true`.

### Conditional Rendering Order

```
loading → error → isEmpty → default
```

### Base Handles

- `<Card padding="lg" rounded="card-lg">` wrapper
- `<div class="@container">` for container queries
- `role="region"`, `aria-busy`, `aria-label`, `data-testid`

### Example Usage

```astro
<DashboardWidget
  loading={loading}
  isEmpty={items.length === 0}
  ariaLabel="Cash flow analysis"
  testId="dashboard-cash-flow-widget"
  class={className}
>
  <!-- loading skeleton -->
  <div slot="loading" class="space-y-5" role="status" aria-label="Loading cash flow">
    {
      [1, 2].map(() => (
        <Skeleton variant="rectangular" width="100%" height="64px" className="rounded-card" />
      ))
    }
  </div>

  <!-- empty state -->
  <p slot="empty" class="text-sm text-base-content/60">
    No entries yet. Add income or expenses to see upcoming activity.
  </p>

  <!-- normal content -->
  <div class="space-y-6">
    <StatLabel size="md" color="neutral">Cash flow analysis</StatLabel>
    <ul class="space-y-5" role="list">
      {items.map((item) => <CashFlowItem {...item} />)}
    </ul>
  </div>
</DashboardWidget>
```

---

## 3. `SearchInput.astro`

**Location:** `src/components/atoms/SearchInput.astro`

### Props

```typescript
interface Props {
  name?: string;
  id?: string;
  value?: string;
  placeholder?: string;
  label: string; // required; used as aria-label and sr-only <label>
  class?: string; // applied to wrapper div
  [key: string]: unknown; // spread to <input> for data-* and other attributes
}
```

### Renders

```html
<div class="relative {class}">
  <search
    size="{18}"
    class="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2
    text-base-content/40 stroke-current pointer-events-none z-10"
  />
  <label for="{id}" class="sr-only">{label}</label>
  <input
    type="search"
    id="{id}"
    name="{name}"
    value="{value}"
    placeholder="{placeholder}"
    class="input input-bordered w-full pl-10 sm:pl-11 ..."
    aria-label="{label}"
    {...rest}
  />
</div>
```

### Example Usage

```astro
<!-- In TransactionFiltersBar: -->
<SearchInput
  name="search"
  id="search-input"
  value={searchValue}
  placeholder="Search..."
  label="Search transactions"
  class="flex-1"
  data-filter-search
/>

<!-- In BudgetFilterControls: -->
<SearchInput
  id="budget-filter-input"
  placeholder="Filter budgets..."
  label="Filter budgets by category name"
  class="md:flex-1"
  data-testid="budget-filter-input"
/>
```

---

## Migration Plan

1. Create `SecurityCard.astro` → migrate 4 security card components
2. Create `DashboardWidget.astro` → migrate 3 dashboard widget components
3. Create `SearchInput.astro` → migrate `TransactionFiltersBar` and `BudgetFilterControls`
4. Run full quality gates: lint, stylelint, format, typecheck, build

## Quality Gates

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
bun run build
```

## What Is NOT Changing

- Client-side scripts in each component remain untouched
- Delete Confirmations (already abstracted via `ConfirmationModal`)
- Component props for data (e.g. `AssetsWidget` keeps its `assetIdr`, `assetUsd` props)
- The `ActionBar` component used by `TransactionActionsBar`
