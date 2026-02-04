# Atomic Design Refactor Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate ~1,500 lines of duplicated UI code by enforcing atomic design principles — ensuring organisms compose molecules/atoms instead of rebuilding them inline, and reclassifying misplaced components.

**Scope:** Astro components only (`src/components/`). No service, API, or database changes.

**Principles:**

- Atoms = single-purpose UI elements (Button, Badge, Input, ProgressBar)
- Molecules = compositions of atoms (FormField, TransactionCard, MetricsCard)
- Organisms = compositions of molecules + atoms forming distinct page sections (TransactionList, BudgetCardGrid)
- Partials = server-rendered HTML fragments for the interactive pages architecture (`?_render=html`)

**Quality gates:** `bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck`

---

## Audit Summary

| Problem                                                         | Instances                    | Est. Lines Saved |
| --------------------------------------------------------------- | ---------------------------- | ---------------- |
| 5 near-identical delete/confirm modals                          | 5 organisms → 1 molecule     | ~400             |
| StatCard atom exists but 11 places build stat cards inline      | 6+ components                | ~300             |
| Label + Input + error repeated in every form                    | 49+ instances across 7 forms | ~200             |
| ProgressBar atom exists but 6 places build progress bars inline | 6 components                 | ~80              |
| Badge atom exists but 10 places build badges inline             | 10 components                | ~100             |
| EmptyState atom exists but 6 places build empty states inline   | 6 components                 | ~60              |
| Skeleton atom exists but 3 components use raw `animate-pulse`   | 3 components                 | ~40              |
| 8 organisms are really molecules (no organism composition)      | 8 components                 | 0 (move)         |
| 6 chart organisms duplicate lifecycle boilerplate               | 6 components                 | ~200             |
| MonthNavigator / YearNavigator nearly identical                 | 2 molecules                  | ~100             |
| **Total**                                                       |                              | **~1,500**       |

---

## Task 1: Consolidate Delete/Confirmation Modals

**Priority:** Critical — 5 files → 1 reusable molecule

**Problem:** Five organisms implement the same pattern: error-colored icon + title + description + detail slot + Cancel/Delete buttons + API call + toast feedback. They differ only in the API endpoint, data population, and detail section content.

| Current File                      | Lines | API Endpoint                        | Unique Detail              |
| --------------------------------- | ----- | ----------------------------------- | -------------------------- |
| `DeleteConfirmationModal.astro`   | 130   | External handler                    | Generic slot               |
| `AssetDeleteConfirmModal.astro`   | 268   | `DELETE /api/assets/{id}`           | Asset name/type/balance    |
| `CategoryDeleteDialog.astro`      | 203   | `DELETE /api/categories/{id}`       | Category icon + name       |
| `AssetCategoryDeleteDialog.astro` | 163   | `DELETE /api/asset-categories/{id}` | Category name + meta       |
| `PaymentMethodConfirmModal.astro` | 200   | `PUT /api/payment-methods/{id}`     | Activate/Deactivate toggle |

**Files:**

- Create: `src/components/molecules/ConfirmationModal.astro`
- Create: `src/components/molecules/ConfirmationModal.client.ts`
- Modify: `src/components/organisms/AssetDeleteConfirmModal.astro` (rewrite to compose ConfirmationModal)
- Modify: `src/components/organisms/CategoryDeleteDialog.astro` (rewrite to compose ConfirmationModal)
- Modify: `src/components/organisms/AssetCategoryDeleteDialog.astro` (rewrite to compose ConfirmationModal)
- Modify: `src/components/organisms/PaymentMethodConfirmModal.astro` (rewrite to compose ConfirmationModal)
- Delete: `src/components/organisms/DeleteConfirmationModal.astro` (replaced by new molecule)
- Modify: All files importing `DeleteConfirmationModal` (update import paths)

**Step 1: Create `ConfirmationModal` molecule**

```typescript
// src/components/molecules/ConfirmationModal.astro
export interface Props {
  id: string;
  title: string;
  description?: string;
  icon?: astro.ComponentType; // Lucide icon component (default: Trash2)
  iconVariant?: 'error' | 'warning' | 'success' | 'info'; // Controls bg/text color
  confirmLabel?: string; // Default: "Delete"
  confirmVariant?: 'error' | 'warning' | 'success'; // Button color
  cancelLabel?: string; // Default: "Cancel"
}
```

The molecule wraps the existing `Modal` molecule and provides:

- Icon in colored circle (using `iconVariant` for `bg-{variant}/10 text-{variant}`)
- Title + description text
- `<slot name="details" />` for entity-specific content (asset info, category info, etc.)
- Error message area (`data-confirm-error`, hidden by default)
- Cancel + Confirm buttons with loading state support
- `data-confirm-action` attribute on confirm button for client-side binding

**Step 2: Create `ConfirmationModal.client.ts`**

Shared client-side logic:

- Loading state toggle (disable button, swap text to `data-loading-text`)
- Error display/hide
- `resetModal()` utility
- Does NOT include API calls — each consumer binds its own handler via `data-confirm-action`

**Step 3: Rewrite each delete modal as a thin wrapper**

Each organism becomes a composition:

```astro
---
import ConfirmationModal from '@/components/molecules/ConfirmationModal.astro';
import { Trash2 } from '@lucide/astro';
---

<ConfirmationModal
  id={id}
  title="Delete Asset"
  icon={Trash2}
  iconVariant="error"
  confirmLabel="Delete"
  confirmVariant="error"
>
  <Fragment slot="details">
    <!-- Asset-specific detail markup -->
  </Fragment>
</ConfirmationModal>
```

Each organism retains its own `<script>` for the specific API call, custom event listener, and data population — but the UI boilerplate is eliminated.

**Step 4: Update all imports of `DeleteConfirmationModal`**

Search for all files importing the old generic modal and update to the new molecule path.

**Verification:**

```bash
grep -r "DeleteConfirmationModal" src/ --include="*.astro" --include="*.ts"
bun run typecheck
```

**Commit:** `refactor: consolidate 5 delete/confirm modals into ConfirmationModal molecule`

---

## Task 2: Create `FormField` Molecule

**Priority:** High — eliminates boilerplate across 7+ forms, 49+ instances

**Problem:** Every form manually wraps inputs in `<div class="form-control">` + `<Label>` + input + `<ErrorMessage>`. This pattern is identical everywhere but written from scratch each time.

**Affected forms:**

- `molecules/TransactionEntryForm.astro` (~4 field groups)
- `molecules/AssetForm.astro` (~4 field groups)
- `molecules/LoginForm.astro` (~2 field groups)
- `molecules/RegistrationForm.astro` (~4 field groups)
- `molecules/PasswordChangeForm.astro` (~3 field groups)
- `molecules/ForgotPasswordForm.astro` (~1 field group)
- `molecules/TransactionFilters.astro` (~3 field groups)
- `organisms/SetNewBudgetModal.astro` (budget form fields)
- `organisms/CategoryModal.astro` (category form fields)
- `organisms/AssetCategoryModal.astro` (category form fields)
- `organisms/PaymentMethodFormModal.astro` (payment method fields)

**Files:**

- Create: `src/components/molecules/FormField.astro`
- Modify: Each form listed above (replace manual Label + Input + ErrorMessage wrappers)

**Step 1: Create `FormField` molecule**

```typescript
// src/components/molecules/FormField.astro
export interface Props {
  label: string;
  htmlFor: string;
  required?: boolean;
  helpText?: string;
  error?: boolean;
  errorMessage?: string;
  errorId?: string; // For data-attribute-based error display
  className?: string;
}
```

Composes:

- `atoms/Label` (with `required` prop)
- `<slot />` (the actual input element — Input, CurrencyInput, DatePicker, Select, etc.)
- `atoms/ErrorMessage` (conditionally rendered or hidden with `errorId` for dynamic display)

```astro
<div class:list={['form-control', className]}>
  <Label htmlFor={htmlFor} required={required}>{label}</Label>
  <slot />
  {helpText && <p class="text-xs text-base-content/50 mt-1">{helpText}</p>}
  {errorMessage && <ErrorMessage message={errorMessage} />}
  {errorId && <ErrorMessage id={errorId} className="hidden" message="" />}
</div>
```

**Step 2: Migrate forms one at a time**

Start with the simplest form (`ForgotPasswordForm`) to validate the pattern, then proceed to more complex forms. Each form migration is a sub-commit.

**Before:**

```astro
<div class="form-control">
  <Label htmlFor="email" required>Email Address</Label>
  <Input
    type="email"
    id="email"
    name="email"
    placeholder="you@example.com"
    error={!!errors?.email}
    errorMessage={errors?.email}
    required
  />
</div>
```

**After:**

```astro
<FormField
  label="Email Address"
  htmlFor="email"
  required
  error={!!errors?.email}
  errorMessage={errors?.email}
>
  <Input type="email" id="email" name="email" placeholder="you@example.com" required />
</FormField>
```

**Verification:**

```bash
bun run typecheck
bun run lint:fix
```

**Commit:** `refactor: create FormField molecule and migrate form boilerplate`

---

## Task 3: Adopt `StatCard` Atom Across Summary Components

**Priority:** High — 11 inline stat-card instances across 6+ components

**Problem:** `atoms/StatCard.astro` already exists with `title`, `value`, `subtitle`, `subtitleIcon`, `progress`, `valueColor`, and `className` props — yet 6+ components rebuild the same card pattern from scratch with raw `<div>` wrappers, duplicating the card shell, title typography, and value display.

**Duplication map:**

| File                                       | Inline Stat Cards                     | Line Numbers    |
| ------------------------------------------ | ------------------------------------- | --------------- |
| `organisms/SummaryCards.astro`             | 3 (assets, spent, health)             | 176-320         |
| `organisms/TransactionSummaryCards.astro`  | 3 (income, expenses, savings)         | 97-162          |
| `partials/TransactionSummaryPartial.astro` | 3 (income, expenses, savings)         | 44-113          |
| `organisms/NetWorthWidget.astro`           | 1 (asset breakdown)                   | 186-204         |
| `partials/ReportSummaryCardsPartial.astro` | 4 (income, expenses, savings, health) | uses StatCard ✓ |

**Files:**

- Modify: `src/components/atoms/StatCard.astro` (extend with `icon` slot and `iconVariant` prop)
- Modify: `src/components/organisms/SummaryCards.astro`
- Modify: `src/components/organisms/TransactionSummaryCards.astro`
- Modify: `src/components/partials/TransactionSummaryPartial.astro`
- Modify: `src/components/organisms/NetWorthWidget.astro`

**Step 1: Extend `StatCard` with icon support**

Add an optional named slot for an icon overlay and an `iconVariant` prop:

```typescript
export interface Props extends Omit<HTMLAttributes<'div'>, 'class'> {
  title: string;
  value: string;
  subtitle?: string;
  subtitleIcon?: string;
  valueColor?: string;
  subtitleColor?: string;
  progress?: number;
  progressColor?: string;
  iconVariant?: 'success' | 'error' | 'accent' | 'info' | 'warning';
  className?: string;
}
```

Add a `<slot name="icon" />` positioned absolute top-right with opacity-5 styling (matching the existing pattern in TransactionSummaryCards).

**Step 2: Migrate each component**

Replace inline card markup with `<StatCard>` composition. Each component is a sub-commit.

**Before (TransactionSummaryCards.astro):**

```astro
<div class="card bg-success/5 border border-success/10 ...">
  <div class="absolute top-0 right-0 p-2 opacity-5 ...">
    <TrendingUp size={64} />
  </div>
  <div class="card-body p-4">
    <StatLabel label="Monthly Income" />
    <span class="text-xl font-bold text-success">{formatted}</span>
    <span class="text-xs text-base-content/50">{periodLabel}</span>
  </div>
</div>
```

**After:**

```astro
<StatCard
  title="Monthly Income"
  value={formatted}
  subtitle={periodLabel}
  valueColor="text-success"
  className="bg-success/5 border-success/10"
>
  <TrendingUp slot="icon" size={64} />
</StatCard>
```

**Verification:**

```bash
bun run typecheck
# Visual regression: check /dashboard, /transactions, /reports pages
```

**Commit:** `refactor: adopt StatCard atom in summary components, eliminating 11 inline duplicates`

---

## Task 4: Adopt `ProgressBar` Atom in Budget Components

**Priority:** High — 6 inline progress bar instances

**Problem:** `atoms/ProgressBar.astro` exists with `value`, `status`, `size`, `showLabel`, `animate`, and `ariaLabel` props — yet 6 places build progress bars from raw `<div>` elements with inline width styles.

**Duplication map:**

| File                                       | Line Numbers      | Current Pattern                     |
| ------------------------------------------ | ----------------- | ----------------------------------- |
| `organisms/SummaryCards.astro`             | 257-262           | Raw `<progress>` element            |
| `partials/CategoryDrillDownPartial.astro`  | 131-142           | Raw div with inline `style={width}` |
| `partials/BudgetHistoryTablePartial.astro` | 151-165 (mobile)  | Raw div with inline `style={width}` |
| `partials/BudgetHistoryTablePartial.astro` | 240-262 (desktop) | Raw div with inline `style={width}` |

**Note:** `BudgetSummary.astro` and `AssetPortfolioSummary.astro` use a **stacked allocation bar** (multiple colored segments side-by-side). This is a different pattern from a single progress bar and should be handled separately in Task 8.

**Files:**

- Modify: `src/components/organisms/SummaryCards.astro`
- Modify: `src/components/partials/CategoryDrillDownPartial.astro`
- Modify: `src/components/partials/BudgetHistoryTablePartial.astro`

**Step 1: Replace inline progress bars with `ProgressBar` atom**

For each occurrence, determine the `status` from the existing conditional logic:

```astro
<!-- Before (CategoryDrillDownPartial) -->
<div class="w-full bg-base-300 rounded-full h-2.5 overflow-hidden">
  <div
    class="h-full rounded-full bg-success"
    style={`width: ${progressPercent}%`}
    role="progressbar"
    aria-valuenow={progressPercent}
    aria-valuemin="0"
    aria-valuemax="100"
  >
  </div>
</div>

<!-- After -->
<ProgressBar
  value={progressPercent}
  status={progressPercent > 100 ? 'danger' : progressPercent > 80 ? 'warning' : 'ok'}
  size="sm"
  ariaLabel={`Budget progress for ${categoryName}`}
/>
```

**Step 2: For BudgetHistoryTablePartial, use same replacement in both mobile and desktop sections**

Both sections get the same ProgressBar with `size="sm"` and status derived from `percentageUsed`.

**Verification:**

```bash
bun run typecheck
# Visual regression: check /budget, /budget/history, /reports pages
```

**Commit:** `refactor: adopt ProgressBar atom in budget components, replacing 6 inline progress bars`

---

## Task 5: Adopt `Badge` Atom in Budget & Transaction Components

**Priority:** Medium — 10 inline badge instances

**Problem:** `atoms/Badge.astro` supports 11 variants including budget-specific ones (`optimal`, `review`, `exceeded`) — yet 10 places build badges from raw `<span>` elements with manually assembled class strings.

**Duplication map:**

| File                                       | Line Numbers   | Current Pattern                                                |
| ------------------------------------------ | -------------- | -------------------------------------------------------------- |
| `organisms/BudgetCard.astro`               | 257-262        | `px-2 py-0.5 rounded-md text-[9px] font-bold` + status classes |
| `organisms/NetWorthWidget.astro`           | 57-60, 153-156 | Custom growth badge with inline classes                        |
| `organisms/BudgetSummary.astro`            | 183-204        | Surplus/deficit indicator with inline styling                  |
| `partials/CategoryDrillDownPartial.astro`  | 38-64, 92      | Budget status badge with nested ternary                        |
| `partials/BudgetHistoryTablePartial.astro` | 109 (mobile)   | Status badge with inline classes                               |
| `partials/BudgetHistoryTablePartial.astro` | 244 (desktop)  | Status badge with inline classes                               |

**Files:**

- Modify: `src/components/organisms/BudgetCard.astro`
- Modify: `src/components/organisms/NetWorthWidget.astro`
- Modify: `src/components/organisms/BudgetSummary.astro`
- Modify: `src/components/partials/CategoryDrillDownPartial.astro`
- Modify: `src/components/partials/BudgetHistoryTablePartial.astro`

**Step 1: Map existing inline badge logic to Badge variants**

Use the existing `Badge` variant system:

- Budget < 80%: `variant="optimal"` (renders `badge-success`)
- Budget 80-99%: `variant="review"` (renders `badge-warning`)
- Budget >= 100%: `variant="exceeded"` (renders `badge-error`)

**Step 2: Replace inline badges**

```astro
<!-- Before (BudgetCard) -->
<span
  class={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider ${getStatusBadgeClasses(status)}`}
>
  {statusLabel}
</span>

<!-- After -->
<Badge
  variant={status === 'exceeded' ? 'exceeded' : status === 'review' ? 'review' : 'optimal'}
  size="sm"
>
  {statusLabel}
</Badge>
```

**Verification:**

```bash
bun run typecheck
bun run stylelint:fix
# Visual regression: check /budget, /budget/history pages
```

**Commit:** `refactor: adopt Badge atom in budget components, replacing 10 inline badge instances`

---

## Task 6: Adopt `EmptyState` Atom Across Components

**Priority:** Medium — 6 inline empty state instances

**Problem:** `atoms/EmptyState.astro` exists with `title`, `message`, `iconName`, `actionLabel`, `actionHref`, and `variant` props — yet 6 places rebuild empty states from scratch.

**Duplication map:**

| File                                            | Line Numbers        | Icon Used  | Has Action?            |
| ----------------------------------------------- | ------------------- | ---------- | ---------------------- |
| `organisms/SummaryCards.astro`                  | 162-171             | TrendingUp | No                     |
| `organisms/NetWorthWidget.astro`                | 130-144             | Wallet     | Yes ("Add Asset")      |
| `partials/TransactionListPartial.astro`         | empty state section | Receipt    | Yes ("Reset")          |
| `partials/CategoryDrillDownPartial.astro`       | 155-162             | —          | No                     |
| `partials/BudgetHistoryTablePartial.astro`      | 292-304             | Receipt    | Yes ("Start Tracking") |
| `partials/CategoryTransactionListPartial.astro` | empty state section | —          | No                     |

**Files:**

- Modify: `src/components/atoms/EmptyState.astro` (add `receipt` and `wallet` to icon map if missing)
- Modify: Each file listed above

**Step 1: Extend EmptyState icon map**

Check the current `iconMap` in `EmptyState.astro` and add any missing icons:

- Current: search, folder, inbox, calendar, file, wallet, trending, alert, info, check, plus
- Needed: `receipt` (Receipt from Lucide)

**Step 2: Replace inline empty states**

```astro
<!-- Before (NetWorthWidget) -->
<div class="flex flex-col items-center justify-center text-center py-8">
  <div class="w-16 h-16 bg-base-200 rounded-3xl flex items-center justify-center mb-4">
    <Wallet size={32} class="text-neutral" />
  </div>
  <h3 class="text-base font-semibold mb-1">No assets yet</h3>
  <p class="text-neutral text-sm mb-4">Add your first asset to start tracking</p>
  <a href="/assets/add" class="btn btn-accent btn-sm">Add Asset</a>
</div>

<!-- After -->
<EmptyState
  title="No assets yet"
  message="Add your first asset to start tracking"
  iconName="wallet"
  actionLabel="Add Asset"
  actionHref="/assets/add"
  variant="centered"
/>
```

**Verification:**

```bash
bun run typecheck
# Visual regression: check empty states on /dashboard, /transactions, /budget/history
```

**Commit:** `refactor: adopt EmptyState atom across 6 components`

---

## Task 7: Standardize Loading States on `Skeleton` Atom

**Priority:** Medium — 3 components using raw `animate-pulse`

**Problem:** `atoms/Skeleton.astro` provides variant-based loading placeholders, but some components build loading states with raw `animate-pulse` divs.

**Affected components:**

- `organisms/SpendingCard.astro` — inline animate-pulse divs for loading state
- `organisms/NetWorthWidget.astro` — inline animate-pulse divs
- `organisms/SummaryCards.astro` — inline animate-pulse divs (error/loading states)

**Files:**

- Modify: `src/components/organisms/SpendingCard.astro`
- Modify: `src/components/organisms/NetWorthWidget.astro`
- Modify: `src/components/organisms/SummaryCards.astro`

**Step 1: Replace inline loading placeholders with Skeleton atom**

```astro
<!-- Before -->
<div class="animate-pulse bg-base-300 h-8 w-32 rounded-lg"></div>

<!-- After -->
<Skeleton variant="heading" width="8rem" />
```

Use appropriate Skeleton variants: `text` for labels, `heading` for values, `rectangular` for content blocks.

**Verification:**

```bash
bun run typecheck
# Check loading states by adding artificial delay or throttling network
```

**Commit:** `refactor: standardize loading states on Skeleton atom`

---

## Task 8: Extract `AllocationBar` Molecule

**Priority:** Medium — 2 components with identical stacked bar pattern

**Problem:** `BudgetSummary.astro` and `AssetPortfolioSummary.astro` both implement a stacked horizontal bar showing percentage distribution across categories. This is distinct from `ProgressBar` (single value) and deserves its own molecule.

**Files:**

- Create: `src/components/molecules/AllocationBar.astro`
- Modify: `src/components/organisms/BudgetSummary.astro`
- Modify: `src/components/organisms/AssetPortfolioSummary.astro`

**Step 1: Create `AllocationBar` molecule**

```typescript
export interface AllocationSegment {
  label: string;
  percentage: number; // 0-100
  color: string; // CSS color value or DaisyUI class
}

export interface Props {
  segments: AllocationSegment[];
  height?: 'sm' | 'md' | 'lg'; // Default: 'md'
  showTooltip?: boolean;
  className?: string;
  ariaLabel?: string;
}
```

Renders a flex container with colored segments, each with `width: {percentage}%`. Includes tooltip on hover showing label + percentage.

**Step 2: Replace inline allocation bars**

Map each component's data structure to `AllocationSegment[]` and replace the raw div markup.

**Verification:**

```bash
bun run typecheck
# Visual regression: check /budget and /assets pages
```

**Commit:** `refactor: extract AllocationBar molecule from BudgetSummary and AssetPortfolioSummary`

---

## Task 9: Extract Chart Lifecycle Utility

**Priority:** Medium — 6 chart organisms duplicate ~80 lines of boilerplate each

**Problem:** All chart organisms duplicate four lifecycle patterns:

1. IntersectionObserver for lazy initialization
2. MutationObserver for theme changes (`data-theme` attribute)
3. MediaQueryList listener for system theme preference
4. Cleanup on `beforeunload` and `astro:before-swap`

**Chart organisms affected:**

- `organisms/FinancialVelocityChart.astro` (457 lines)
- `organisms/ResourceAllocationChart.astro` (447 lines)
- `organisms/SpendingChart.astro` (645 lines)
- `organisms/WealthTrajectory.astro`
- `organisms/LedgerProjections.astro`
- `organisms/CategoryIntelligenceTable.astro` (if it has chart logic)

**Files:**

- Create: `src/lib/utils/chart-lifecycle.ts`
- Modify: Each chart organism's `<script>` section

**Step 1: Create `chart-lifecycle.ts` utility**

```typescript
export interface ChartLifecycleOptions {
  containerSelector: string; // e.g., '[id^="velocity-chart-"][id$="-container"]'
  onInit: (container: HTMLElement, data: unknown) => void;
  onThemeChange: () => void;
  onCleanup: () => void;
  rootMargin?: string; // Default: '50px'
}

export function createChartLifecycle(options: ChartLifecycleOptions): {
  init: () => void;
  cleanup: () => void;
};
```

The utility manages:

- IntersectionObserver creation and container observation
- `data-chart-data` JSON parsing with XSS-safe validation
- Theme observer (MutationObserver on `documentElement` for `data-theme`)
- System theme media query listener
- Astro lifecycle event binding (`astro:before-swap`, `astro:after-swap`)
- `beforeunload` cleanup

Each chart organism only needs to provide the chart-specific logic (Chart.js configuration, data transformation, color updates).

**Step 2: Refactor each chart organism**

Replace the boilerplate in each chart's `<script>` with:

```typescript
import { createChartLifecycle } from '@/lib/utils/chart-lifecycle';

const lifecycle = createChartLifecycle({
  containerSelector: '[id^="velocity-chart-"][id$="-container"]',
  onInit: (container, data) => {
    /* Chart.js init specific to this chart */
  },
  onThemeChange: () => {
    /* Update colors for this chart type */
  },
  onCleanup: () => {
    /* Destroy Chart.js instances */
  },
});
```

**Step 3: Extract shared `isDarkTheme()` helper**

Currently duplicated in every chart. Move to `chart-lifecycle.ts`:

```typescript
export function isDarkTheme(): boolean {
  const explicitTheme = document.documentElement.getAttribute('data-theme');
  if (explicitTheme) return explicitTheme === 'dark' || explicitTheme === 'night';
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
```

**Verification:**

```bash
bun run typecheck
# Visual regression: check all pages with charts (/dashboard, /reports, /budget)
# Verify theme switching still updates chart colors
# Verify lazy loading still works (scroll charts into view)
```

**Commit:** `refactor: extract chart lifecycle utility, deduplicating ~480 lines across 6 chart organisms`

---

## Task 10: Reclassify Misplaced Organisms as Molecules

**Priority:** Medium — structural clarity, no functional changes

**Problem:** 8 components in `organisms/` compose only atoms — they never compose other organisms, making them molecules by atomic design definition.

| Component                      | What It Composes                | Why It's a Molecule     |
| ------------------------------ | ------------------------------- | ----------------------- |
| `DashboardError.astro`         | Card + Button atoms             | Error display card      |
| `AssetItemRow.astro`           | Icon + text + amount atoms      | Single row display      |
| `TransactionActionsBar.astro`  | Button atoms                    | Row of action buttons   |
| `AssetPageHeader.astro`        | Title + subtitle + Button       | Simple header           |
| `BudgetActions.astro`          | Modal + Button atoms            | Action button row       |
| `HeroSection.astro`            | Heading + Button atoms          | Landing hero            |
| `FeaturesGrid.astro`           | Card pattern repeated           | Feature card grid       |
| `RecentTransactionsList.astro` | Card + TransactionCard molecule | Transaction list widget |

**Files:**

- Move: Each component from `src/components/organisms/` to `src/components/molecules/`
- Modify: All files importing these components (update import paths)

**Step 1: Move files**

```bash
git mv src/components/organisms/DashboardError.astro src/components/molecules/DashboardError.astro
git mv src/components/organisms/AssetItemRow.astro src/components/molecules/AssetItemRow.astro
# ... etc for each component
```

**Step 2: Update all imports**

For each moved file, search for imports and update paths:

```bash
grep -r "organisms/DashboardError" src/ --include="*.astro" --include="*.ts"
```

Replace `@/components/organisms/X` with `@/components/molecules/X`.

**Step 3: Update any Storybook stories**

If any of these components have `.stories.ts` files, update the import paths there as well.

**Verification:**

```bash
bun run typecheck
bun run lint:fix
grep -r "organisms/DashboardError\|organisms/AssetItemRow\|organisms/TransactionActionsBar\|organisms/AssetPageHeader\|organisms/BudgetActions\|organisms/HeroSection\|organisms/FeaturesGrid\|organisms/RecentTransactionsList" src/
# Should return no results
```

**Commit:** `refactor: reclassify 8 organisms as molecules per atomic design principles`

---

## Task 11: Extract Budget Status Utility

**Priority:** Low — 4 components duplicate the same business logic

**Problem:** The percentage-to-status mapping (`>100% → danger/exceeded`, `>80% → warning/review`, `else → ok/optimal`) is reimplemented in 4+ components. `src/lib/tokens.ts` already has `getBudgetStatusClass()` but some components don't use it.

**Affected files:**

- `partials/CategoryDrillDownPartial.astro` (lines 38-64)
- `partials/BudgetHistoryTablePartial.astro` (lines 29-32)
- `organisms/BudgetCard.astro` (inline status logic)
- `organisms/BudgetSummary.astro` (surplus/deficit logic)

**Files:**

- Modify: `src/lib/utils/budget.ts` (consolidate all budget status helpers)
- Modify: Each affected component

**Step 1: Audit existing utilities**

`src/lib/tokens.ts` already exports:

- `getBudgetStatusClass(percentage)` → `'status-ok' | 'status-warning' | 'status-danger'`
- `getStatusBadgeClasses(status)` → DaisyUI badge class string

`src/lib/utils/budget.ts` may have additional helpers.

**Step 2: Add missing helpers if needed**

```typescript
// src/lib/utils/budget.ts
export function getBudgetStatus(percentage: number): {
  status: 'ok' | 'warning' | 'danger';
  badgeVariant: 'optimal' | 'review' | 'exceeded';
  label: string;
} {
  if (percentage >= 100)
    return { status: 'danger', badgeVariant: 'exceeded', label: 'Over Budget' };
  if (percentage >= 80) return { status: 'warning', badgeVariant: 'review', label: 'Near Limit' };
  return { status: 'ok', badgeVariant: 'optimal', label: 'On Track' };
}
```

**Step 3: Replace inline logic in each component**

Import and use `getBudgetStatus()` instead of ad-hoc ternary chains.

**Verification:**

```bash
bun run typecheck
```

**Commit:** `refactor: consolidate budget status logic into shared utility`

---

## Task 12: Merge MonthNavigator and YearNavigator into PeriodNavigator

**Priority:** Low — 2 molecules with near-identical structure

**Problem:** `MonthNavigator.astro` and `YearNavigator.astro` share the same structure (prev button + dropdown/label + next button) and their `.client.ts` files have nearly identical event handling logic.

**Files:**

- Create: `src/components/molecules/PeriodNavigator.astro`
- Create: `src/components/molecules/PeriodNavigator.client.ts`
- Modify: All files importing MonthNavigator or YearNavigator
- Delete: `src/components/molecules/MonthNavigator.astro` (after migration)
- Delete: `src/components/molecules/YearNavigator.astro` (after migration)
- Delete: Associated `.client.ts` files

**Step 1: Create generic `PeriodNavigator`**

```typescript
export interface PeriodOption {
  value: string;
  label: string;
}

export interface Props {
  options: PeriodOption[];
  selected: string;
  prevHref?: string;
  nextHref?: string;
  prevDisabled?: boolean;
  nextDisabled?: boolean;
  ariaLabel?: string;
  className?: string;
}
```

**Step 2: Migrate consumers**

Update pages that import MonthNavigator/YearNavigator to use PeriodNavigator with appropriate option lists.

**Verification:**

```bash
bun run typecheck
grep -r "MonthNavigator\|YearNavigator" src/ --include="*.astro" --include="*.ts"
# Should only return the delete-candidates
```

**Commit:** `refactor: merge MonthNavigator and YearNavigator into PeriodNavigator molecule`

---

## Execution Order & Dependencies

```
Task 1  (ConfirmationModal)     — no dependencies, highest impact
Task 2  (FormField)             — no dependencies, highest breadth
Task 3  (StatCard adoption)     — no dependencies
Task 4  (ProgressBar adoption)  — no dependencies
Task 5  (Badge adoption)        — no dependencies
Task 6  (EmptyState adoption)   — no dependencies
Task 7  (Skeleton adoption)     — no dependencies
Task 8  (AllocationBar)         — no dependencies
Task 9  (Chart lifecycle)       — no dependencies
Task 10 (Reclassify organisms)  — run AFTER Tasks 1-8 (some files may have moved)
Task 11 (Budget status utility) — run AFTER Task 5 (Badge adoption)
Task 12 (PeriodNavigator)       — no dependencies
```

Tasks 1-9 are independent and can be executed in any order (or in parallel by separate agents). Tasks 10-12 have soft dependencies as noted.

Each task produces one independently committable unit. Run quality gates before each commit:

```bash
bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck
```

---

## Risk Mitigation

| Risk                                                 | Impact | Mitigation                                                                      |
| ---------------------------------------------------- | ------ | ------------------------------------------------------------------------------- |
| Visual regression after StatCard/Badge migration     | Medium | Compare screenshots before/after on key pages                                   |
| ProgressBar animation behavior change                | Low    | ProgressBar atom already handles animation; verify `animate` prop               |
| Import path breakage after organism reclassification | High   | Run `grep -r` for old paths after every move; typecheck catches missing imports |
| Chart lifecycle refactor breaks lazy loading         | Medium | Test scroll-triggered chart init on /reports page                               |
| FormField slot composition edge cases                | Low    | Test with all input types (Input, CurrencyInput, DatePicker, Select, Checkbox)  |
| Partials used by `?_render=html` break after changes | Medium | Test interactive page endpoints manually (filter, paginate, drill-down)         |

---

## Success Criteria

- [ ] Zero inline stat-card patterns — all use `StatCard` atom
- [ ] Zero inline progress bars — all use `ProgressBar` atom or `AllocationBar` molecule
- [ ] Zero inline badges — all use `Badge` atom
- [ ] Zero inline empty states — all use `EmptyState` atom
- [ ] One `ConfirmationModal` molecule replaces 5 delete/confirm organisms
- [ ] One `FormField` molecule used across all forms
- [ ] Chart organisms share lifecycle utility — no duplicated observer boilerplate
- [ ] No component in `organisms/` that only composes atoms
- [ ] All quality gates pass: `lint`, `stylelint`, `format`, `typecheck`
- [ ] Net reduction of ~1,500 lines of duplicated UI code
