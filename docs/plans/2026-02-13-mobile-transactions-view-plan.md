# Mobile Transactions View Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve mobile UI/UX for the transactions page — compact summary cards, edge-bleed action bar, simplified filter bar, PeriodNavigator relocated to header via slot system.

**Architecture:** Header gains a slot mechanism (rendered HTML string passed as prop through layout chain). PeriodNavigator moves from TransactionFiltersBar into the header. Summary cards get a compact mobile variant. Action bar bleeds to edge on mobile with horizontal scroll. Filter bar is simplified (search first, type+category second).

**Tech Stack:** Astro 5, Tailwind CSS v4, DaisyUI v5, @lucide/astro, bun:test

**Parallelization:** Tasks 1–4 touch separate files and can run as parallel subagents. Task 5 integrates all changes in the transaction page (depends on 1+4). Task 6 is final verification.

---

### Task 1: Header Slot System + Disable Notifications + Show Subtitle

**Files:**

- Modify: `src/components/layouts/Header.astro`
- Modify: `src/layouts/MainLayout.astro`
- Modify: `src/layouts/ProtectedLayout.astro`

**Context:** The header needs a mechanism for pages to inject content (like PeriodNavigator). Astro named slots can't be rendered twice, so we render the slot to an HTML string in ProtectedLayout and pass it as a prop through the layout chain. The Header renders it once in a row below the main header bar. On desktop it's right-aligned, on mobile centered.

**Step 1: Modify Header.astro**

1. Comment out `NotificationDropdown` import and usage:

Replace the import:

```typescript
// TODO: Re-enable when notification system is implemented
// import NotificationDropdown from '../molecules/NotificationDropdown.astro';
```

Replace the usage (line 78):

```astro
{/* TODO: Re-enable when notification system is implemented */}
{/* <NotificationDropdown /> */}
```

2. Show subtitle on all viewports — change `hidden sm:block` to always visible:

Replace:

```astro
<p class="text-sm font-medium text-neutral hidden sm:block mt-1.5 leading-none"></p>
```

With:

```astro
<p class="text-sm font-medium text-neutral mt-0.5 sm:mt-1.5 leading-none"></p>
```

3. Add `headerExtrasHtml` prop and render extras row:

Update Props interface:

```typescript
interface Props {
  title: string;
  subtitle?: string;
  showMenuToggle?: boolean;
  user?: User | null;
  /** Pre-rendered HTML for page-specific header content (e.g., PeriodNavigator) */
  headerExtrasHtml?: string;
}
```

Update destructuring:

```typescript
const { title, subtitle, showMenuToggle = true, user, headerExtrasHtml = '' } = Astro.props;
const hasHeaderExtras = headerExtrasHtml.length > 0;
```

4. Change header from single flex row to flex-col, and add extras row.

Replace the opening `<header>` tag and its class with:

```astro
<header
  class="fixed top-0 left-0 right-0 lg:left-64 lg:group-data-[sidebar-collapsed=true]:left-20 z-40 bg-base-100/80 backdrop-blur-xl border-b border-base-300/50 transition-[left] duration-300 ease-out"
>
  <!-- Main header bar -->
  <div
    class="flex items-center justify-between gap-4 px-4 sm:px-6 lg:px-10 py-4 sm:py-5 min-h-16 sm:min-h-20"
  >
  </div>
</header>
```

Replace the closing `</header>` region. After the main bar's closing `</div>` (right side), before `</header>`, add:

```astro
{/* Page-specific header extras (e.g., PeriodNavigator) */}
{
  hasHeaderExtras && (
    <div class="flex items-center justify-center sm:justify-end gap-3 px-4 sm:px-6 lg:px-10 pb-3">
      <Fragment set:html={headerExtrasHtml} />
    </div>
  )
}
```

**Step 2: Modify MainLayout.astro**

1. Add `headerExtrasHtml` prop:

```typescript
interface Props {
  title?: string;
  currentPath?: string;
  user?: User | null;
  subtitle?: string;
  headerExtrasHtml?: string;
}

const {
  title = 'allowealth',
  currentPath = '/',
  user,
  subtitle,
  headerExtrasHtml = '',
} = Astro.props;
const hasHeaderExtras = headerExtrasHtml.length > 0;
```

2. Pass `headerExtrasHtml` to Header:

```astro
<Header title={title} user={user} subtitle={subtitle} headerExtrasHtml={headerExtrasHtml} />
```

3. Adjust main content padding when extras are present:

Replace:

```astro
<main
  id="main-content"
  class="flex-1 px-4 lg:px-6 pt-24 sm:pt-28 pb-24 lg:pb-6 bg-base-200 theme-transition"
>
</main>
```

With:

```astro
<main
  id="main-content"
  class={`flex-1 px-4 lg:px-6 ${hasHeaderExtras ? 'pt-36 sm:pt-40' : 'pt-24 sm:pt-28'} pb-24 lg:pb-6 bg-base-200 theme-transition`}
>
</main>
```

**Step 3: Modify ProtectedLayout.astro**

1. Render the `header-extras` named slot to HTML string and pass it to MainLayout:

In frontmatter, after the existing code (before the template), add:

```typescript
// Render page-specific header extras (e.g., PeriodNavigator) to HTML string for slot forwarding
const headerExtrasHtml = Astro.slots.has('header-extras')
  ? await Astro.slots.render('header-extras')
  : '';
```

2. Pass to MainLayout:

Replace:

```astro
<MainLayout title={title} currentPath={currentPath} user={user} subtitle={subtitle}>
  <slot />
</MainLayout>
```

With:

```astro
<MainLayout
  title={title}
  currentPath={currentPath}
  user={user}
  subtitle={subtitle}
  headerExtrasHtml={headerExtrasHtml}
>
  <slot />
</MainLayout>
```

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

**Step 5: Commit**

```bash
git add src/components/layouts/Header.astro src/layouts/MainLayout.astro src/layouts/ProtectedLayout.astro
git commit -m "feat(header): add slot system for page-specific extras, disable notifications, show subtitle on mobile"
```

---

### Task 2: TransactionSummaryCards Compact Mobile

**Files:**

- Modify: `src/components/organisms/TransactionSummaryCards.astro`

**Context:** On mobile, the 3 full-height StatCards take too much space. Replace with compact single-row cards showing icon + label + value. Desktop keeps existing layout. Month info (periodLabel) is removed since it's now in the header subtitle.

**Step 1: Modify TransactionSummaryCards.astro**

Replace the entire template section (everything after the frontmatter `---`) with:

```astro
<div class="@container">
  {
    error ? (
      <div class="alert alert-error rounded-3xl" role="alert">
        <p>{error}</p>
      </div>
    ) : loading ? (
      <>
        {/* Mobile loading skeleton */}
        <div class="space-y-2 md:hidden">
          {Array.from({ length: 3 }).map(() => (
            <div class="flex items-center gap-3 bg-base-100 border border-base-300 rounded-xl px-4 py-3 shadow-sm">
              <Skeleton width="20px" height="20px" className="rounded shrink-0" />
              <Skeleton height="12px" width="40%" className="flex-1" />
              <Skeleton height="16px" width="30%" />
            </div>
          ))}
        </div>
        {/* Desktop loading skeleton */}
        <div class="hidden md:grid grid-cols-1 @2xl:grid-cols-3 gap-4 @sm:gap-6">
          <div class={cardClasses}>
            <div class="card-body p-4 @sm:p-6 @3xl:p-8">
              <Skeleton height="0.75rem" width="50%" className="mb-3 @sm:mb-4" />
              <Skeleton height="1.5rem" width="80%" className="@sm:h-9 mb-2 @sm:mb-3" />
              <Skeleton height="0.75rem" width="40%" />
            </div>
          </div>
          <div class={cardClasses}>
            <div class="card-body p-4 @sm:p-6 @3xl:p-8">
              <Skeleton height="0.75rem" width="50%" className="mb-3 @sm:mb-4" />
              <Skeleton height="1.5rem" width="80%" className="@sm:h-9 mb-2 @sm:mb-3" />
              <Skeleton height="0.75rem" width="40%" />
            </div>
          </div>
          <div class={cardClasses}>
            <div class="card-body p-4 @sm:p-6 @3xl:p-8">
              <Skeleton height="0.75rem" width="50%" className="mb-3 @sm:mb-4" />
              <Skeleton height="1.5rem" width="80%" className="@sm:h-9 mb-2 @sm:mb-3" />
              <Skeleton height="0.75rem" width="40%" />
            </div>
          </div>
        </div>
      </>
    ) : (
      <>
        {/* Mobile compact cards */}
        <div
          class="space-y-2 md:hidden"
          id="summary-cards-container-mobile"
          data-summary-container
          data-currency={currency}
        >
          <div
            class="flex items-center gap-3 bg-base-100 border border-base-300 rounded-xl px-4 py-3 shadow-sm"
            role="region"
            aria-label="Monthly Income"
            data-summary-card="income"
          >
            <TrendingUp size={20} class="stroke-current text-success shrink-0" aria-hidden="true" />
            <span class="text-xs font-bold text-base-content/50 uppercase tracking-wider flex-1">
              Income
            </span>
            <span class="text-sm font-bold text-success tabular-nums">
              {formatCurrency(monthlyIncome, currency)}
            </span>
          </div>

          <div
            class="flex items-center gap-3 bg-base-100 border border-base-300 rounded-xl px-4 py-3 shadow-sm"
            role="region"
            aria-label="Monthly Expenses"
            data-summary-card="expenses"
          >
            <TrendingDown size={20} class="stroke-current text-error shrink-0" aria-hidden="true" />
            <span class="text-xs font-bold text-base-content/50 uppercase tracking-wider flex-1">
              Expenses
            </span>
            <span class="text-sm font-bold text-error tabular-nums">
              {formatCurrency(monthlyExpenses, currency)}
              <span class="text-xs font-normal text-base-content/40 ml-1">
                ({transactionCount})
              </span>
            </span>
          </div>

          <div
            class="flex items-center gap-3 bg-base-100 border border-base-300 rounded-xl px-4 py-3 shadow-sm"
            role="region"
            aria-label="Net Savings"
            data-summary-card="savings"
          >
            <Wallet
              size={20}
              class={`stroke-current ${netSavingsClass} shrink-0`}
              aria-hidden="true"
            />
            <span class="text-xs font-bold text-base-content/50 uppercase tracking-wider flex-1">
              Net Savings
            </span>
            <span class={`text-sm font-bold ${netSavingsClass} tabular-nums`}>
              {formatCurrency(netSavings, currency)}
            </span>
          </div>
        </div>

        {/* Desktop full cards */}
        <div
          class="hidden md:grid grid-cols-1 @2xl:grid-cols-3 gap-4 @sm:gap-6"
          id="summary-cards-container"
          data-summary-container
          data-currency={currency}
        >
          <StatCard
            title="Monthly Income"
            value={formatCurrency(monthlyIncome, currency)}
            valueColor="text-success"
            subtitleColor="text-success/60"
            iconVariant="success"
            className="transition-all hover:shadow-md"
            data-summary-card="income"
          >
            <TrendingUp slot="icon" size={48} class="stroke-current" aria-hidden="true" />
          </StatCard>

          <StatCard
            title="Monthly Expenses"
            value={formatCurrency(monthlyExpenses, currency)}
            subtitle={`${transactionCount} items`}
            valueColor="text-error"
            subtitleColor="text-error/60"
            iconVariant="error"
            className="transition-all hover:shadow-md"
            data-summary-card="expenses"
          >
            <TrendingDown slot="icon" size={48} class="stroke-current" aria-hidden="true" />
          </StatCard>

          <StatCard
            title="Net Savings"
            value={formatCurrency(netSavings, currency)}
            valueColor={netSavingsClass}
            subtitleColor="text-base-content/40"
            className="transition-all hover:shadow-md"
            data-summary-card="savings"
          >
            <Wallet slot="icon" size={48} class="stroke-current text-primary" aria-hidden="true" />
            <div slot="details" class="flex items-center gap-1.5 text-xs text-base-content/40">
              <div
                class="tooltip tooltip-bottom"
                data-tip="Income minus expenses. Negative means you spent more than you earned this period."
              >
                <Info
                  size={14}
                  class="stroke-current cursor-help"
                  aria-label="What is Net Savings?"
                />
              </div>
              {netSavings < 0 && (
                <span class="text-error/60 font-medium">Spending exceeded income</span>
              )}
            </div>
          </StatCard>
        </div>
      </>
    )
  }
</div>
```

**Note:** The `periodLabel` prop is no longer used in the template. Remove the `subtitle` prop usage from both income and savings StatCards (replaced with `undefined` or omitted). Keep the prop in the interface for backward compatibility — other pages might still pass it. The `Info` import is already present.

**Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

**Step 3: Commit**

```bash
git add src/components/organisms/TransactionSummaryCards.astro
git commit -m "feat(mobile): add compact vertical summary cards for mobile view"
```

---

### Task 3: TransactionActionsBar Edge Bleed + Horizontal Scroll + Reorder

**Files:**

- Modify: `src/components/molecules/ActionBar.astro`
- Modify: `src/components/molecules/TransactionActionsBar.astro`
- Modify: `src/styles/globals.css` (add scrollbar-hide utility)

**Context:** On mobile, the action bar should bleed to page edges (no card border/rounded), buttons scroll horizontally, and Expense/Income appear first (most important actions). Desktop keeps existing layout.

**Step 1: Add scrollbar-hide utility to globals.css**

At the end of `src/styles/globals.css`, add:

```css
/* Hide scrollbar but keep scroll functionality */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
```

**Step 2: Modify ActionBar.astro**

Add `edgeBleed` prop and update layout for mobile scrolling with reordering:

Replace Props interface:

```typescript
export interface Props {
  className?: string;
  ariaLabel?: string;
  /** Bleed to page edges on mobile (no border/rounded) */
  edgeBleed?: boolean;
}
```

Replace destructuring:

```typescript
const { className = '', ariaLabel = 'Page actions', edgeBleed = false } = Astro.props;
```

Replace `containerClasses`:

```typescript
const containerClasses = [
  'bg-base-100',
  edgeBleed
    ? '-mx-4 px-4 py-2 border-y border-base-300 md:mx-0 md:rounded-card md:border md:shadow-sm md:p-4 lg:p-6'
    : 'rounded-card border border-base-300 shadow-sm p-2 md:p-4 lg:p-6',
  className,
]
  .filter(Boolean)
  .join(' ');
```

Replace the entire template (from `<div class={containerClasses}...>` to closing `</div>`):

```astro
<div class={containerClasses} role="toolbar" aria-label={ariaLabel}>
  {
    /* Primary Actions — first on mobile (order-first), pushed right on desktop (order-last + ml-auto) */
  }
  {
    hasPrimary && (
      <div class="order-first md:order-last md:ml-auto shrink-0">
        <slot name="primary" />
      </div>
    )
  }

  {/* Secondary Actions */}
  <div class="flex items-center gap-1 md:gap-2 shrink-0">
    <slot />
  </div>
</div>
```

Update the outer div to support horizontal scroll on mobile:

```astro
<div
  class={`${containerClasses} flex items-center gap-1 md:gap-3 flex-nowrap md:flex-wrap overflow-x-auto md:overflow-visible scrollbar-hide`}
  role="toolbar"
  aria-label={ariaLabel}
>
</div>
```

**Important:** Merge the `flex` layout classes INTO the containerClasses or onto the outer div. The final outer div should have both container + flex classes. Here's the complete final template:

```astro
<div
  class:list={[
    containerClasses,
    'flex items-center gap-1 md:gap-3 flex-nowrap md:flex-wrap overflow-x-auto md:overflow-visible scrollbar-hide',
  ]}
  role="toolbar"
  aria-label={ariaLabel}
>
  {/* Primary Actions — first on mobile, pushed right on desktop */}
  {
    hasPrimary && (
      <div class="order-first md:order-last md:ml-auto shrink-0">
        <slot name="primary" />
      </div>
    )
  }

  {/* Secondary Actions */}
  <div class="flex items-center gap-1 md:gap-2 shrink-0">
    <slot />
  </div>
</div>
```

**Step 3: Modify TransactionActionsBar.astro**

Pass `edgeBleed` to ActionBar:

Replace:

```astro
<ActionBar className={className} ariaLabel="Transaction actions" />
```

With:

```astro
<ActionBar className={className} ariaLabel="Transaction actions" edgeBleed />
```

No other changes needed — the slot reordering is handled by ActionBar's CSS `order` classes.

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

**Step 5: Commit**

```bash
git add src/styles/globals.css src/components/molecules/ActionBar.astro src/components/molecules/TransactionActionsBar.astro
git commit -m "feat(mobile): edge-bleed action bar with horizontal scroll and reordered buttons"
```

---

### Task 4: TransactionFiltersBar — New Layout + Remove PeriodNavigator

**Files:**

- Modify: `src/components/organisms/TransactionFiltersBar.astro`

**Context:** PeriodNavigator moves to the header (Task 5 handles the page integration). This task removes it from the filters bar and reorganizes: search on top, type toggle + category dropdown below. The client script's `PERIOD_CHANGE_EVENT` listener stays because it bridges period changes to `filterChange` events (the listener uses `window` events, so it works regardless of PeriodNavigator's DOM location).

**Step 1: Remove PeriodNavigator import and month-related props**

Remove the import:

```typescript
// Remove this line:
import PeriodNavigator from '@/components/molecules/PeriodNavigator.astro';
```

Remove month-related props from the interface. Update `Props`:

```typescript
export interface Props {
  typeFilter?: 'income' | 'expense';
  searchValue?: string;
  categoryIds?: string[];
  categories?: Array<{ id: string; name: string; type: string }>;
  showCategoryFilter?: boolean;
  baseUrl?: string;
  /** Current month key for reset button (e.g., "2026-02") */
  currentMonth?: string;
  /** Selected month key for reset visibility check */
  selectedMonth?: string;
}
```

Remove `monthSelector`, `availableMonths` from Props. Keep `currentMonth` and `selectedMonth` for reset button logic.

Update destructuring:

```typescript
const {
  typeFilter = 'expense',
  searchValue = '',
  categoryIds = [],
  categories = [],
  showCategoryFilter = true,
  baseUrl = '/transactions',
  currentMonth = '',
  selectedMonth = '',
} = Astro.props;
```

Remove the `periodOptions` computation:

```typescript
// Delete these lines:
const periodOptions = availableMonths.map((month) => ({
  value: month.key,
  label: month.label,
}));
```

**Step 2: Reorganize the template layout**

The new layout puts Search first (full width), then type toggle + category dropdown on the second row.

Replace the entire `<form>` template section with:

```astro
<!-- Filter Bar Container -->
<form
  action={baseUrl}
  method="get"
  class="flex flex-col gap-3 sm:gap-4"
  role="search"
  aria-label="Filter transactions"
  id="transaction-filters-form"
  data-filter-form
>
  {/* Row 1: Search + Reset */}
  <div class="flex items-center gap-2 sm:gap-3 w-full">
    <!-- Search Input -->
    <div class="relative flex-1">
      <Search
        size={18}
        class="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-base-content/40 stroke-current pointer-events-none z-10"
        aria-hidden="true"
      />
      <label for="search-input" class="sr-only">Search activity</label>
      <input
        id="search-input"
        type="search"
        name="search"
        value={searchValue}
        placeholder="Search..."
        class={mainSearchInputClass}
        data-filter-search
      />
    </div>

    <!-- Reset Filters Button -->
    <button
      type="button"
      class={`btn btn-ghost btn-sm gap-1 sm:gap-2 text-base-content/60 hover:text-primary hover:bg-primary/10 rounded-lg sm:rounded-xl transition-colors shrink-0 min-h-[44px] ${hasActiveFilters ? '' : 'hidden'}`}
      aria-label="Reset filters"
      data-reset-filters
      data-current-month={currentMonth}
    >
      <RotateCcw size={16} class="stroke-current" aria-hidden="true" />
      <span class="text-xs sm:text-sm">Reset</span>
    </button>
  </div>

  {/* Row 2: Type filter + Category */}
  <div class="flex flex-wrap items-center gap-2 sm:gap-4 w-full">
    <!-- Type Filter (Tab-style) -->
    <input type="hidden" name="type" value={typeFilter} id="type-filter-hidden" />
    <div
      class="flex bg-base-200 p-1 rounded-xl sm:rounded-2xl shrink-0"
      role="group"
      aria-label="Filter by transaction type"
      id="type-filter-group"
      data-filter-type-group
    >
      <button
        type="button"
        class={`px-3 sm:px-6 py-2 sm:py-2.5 min-h-[44px] min-w-[44px] text-xs font-bold rounded-lg sm:rounded-xl transition-all focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
          typeFilter === 'expense'
            ? 'bg-base-100 shadow text-primary'
            : 'text-base-content/50 hover:text-base-content/70'
        }`}
        data-filter-type="expense"
        data-filter-url={buildFilterUrl({ type: 'expense' })}
        aria-pressed={typeFilter === 'expense'}
      >
        Expenses
      </button>
      <button
        type="button"
        class={`px-3 sm:px-6 py-2 sm:py-2.5 min-h-[44px] min-w-[44px] text-xs font-bold rounded-lg sm:rounded-xl transition-all focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
          typeFilter === 'income'
            ? 'bg-base-100 shadow text-primary'
            : 'text-base-content/50 hover:text-base-content/70'
        }`}
        data-filter-type="income"
        data-filter-url={buildFilterUrl({ type: 'income' })}
        aria-pressed={typeFilter === 'income'}
      >
        Income
      </button>
    </div>

    <!-- Category Filter (Multi-select with search) -->
    {
      showCategoryFilter && categories.length > 0 && (
        <div class="dropdown" id="category-dropdown">
          <input
            type="hidden"
            name="category_ids"
            id="category-filter"
            value={categoryIds.join(',')}
          />
          <button
            type="button"
            tabindex={0}
            class="flex items-center gap-2 px-4 py-3 text-xs font-bold border border-base-300 bg-base-100 text-base-content rounded-2xl shadow-sm hover:border-base-content/30 transition-colors min-w-[160px]"
            aria-label="Filter by category"
            aria-haspopup="listbox"
            aria-expanded="false"
            data-category-trigger
          >
            <Tag size={16} class="stroke-current text-base-content/40" aria-hidden="true" />
            <span class="flex-1 text-left truncate" data-category-label>
              {getSelectedCategoriesLabel()}
            </span>
            <ChevronDown
              size={14}
              class="stroke-current text-base-content/40 shrink-0"
              aria-hidden="true"
            />
          </button>
          <div
            tabindex={0}
            class="dropdown-content z-50 p-3 shadow-lg bg-base-100 rounded-2xl w-72 border border-base-300 mt-2"
            role="listbox"
            aria-multiselectable="true"
            aria-label="Select categories"
          >
            {/* Search input */}
            <div class="mb-2">
              <label for="category-search" class={categorySearchLabelClass}>
                Search categories
              </label>
              <div class="relative">
                <Search
                  size={14}
                  class="absolute left-3 top-1/2 -translate-y-1/2 text-base-content/40 stroke-current pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="category-search"
                  type="text"
                  placeholder="Search categories..."
                  class={categorySearchInputClass}
                  data-category-search
                />
              </div>
            </div>
            {/* Clear All / Count */}
            <div class="flex items-center justify-between pb-2 mb-2 border-b border-base-200">
              <button
                type="button"
                class="text-xs font-medium text-accent hover:text-accent/80 transition-colors"
                data-category-clear-all
              >
                Clear all
              </button>
              <span class="text-xs text-base-content/50" data-category-count>
                {categoryIds.length} selected
              </span>
            </div>
            {/* Category Options */}
            <div class="space-y-1 max-h-52 overflow-y-auto" data-category-list>
              {categories
                .filter((cat) => cat.type === typeFilter)
                .map((cat) => {
                  const isSelected = categoryIds.includes(cat.id);
                  return (
                    <label
                      class={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors hover:bg-base-200 ${isSelected ? 'bg-accent/10' : ''}`}
                      data-category-option={cat.id}
                      data-category-name={cat.name.toLowerCase()}
                    >
                      <div
                        class={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-accent border-accent' : 'border-base-300'}`}
                        data-checkbox-visual={cat.id}
                      >
                        {isSelected && (
                          <Check size={12} class="stroke-white stroke-3" aria-hidden="true" />
                        )}
                      </div>
                      <span class="text-sm font-medium text-base-content truncate">{cat.name}</span>
                    </label>
                  );
                })}
            </div>
          </div>
        </div>
      )
    }
  </div>
</form>
```

**Step 3: Clean up unused imports**

Remove `PeriodNavigator` import (already done in Step 1). Also remove the `// Period navigator logic moved to PeriodNavigator component` comment.

**Step 4: Update `hasActiveFilters` check**

The check currently references `selectedMonth` and `currentMonth`. These are still passed as props, so the logic stays the same:

```typescript
const hasActiveFilters =
  typeFilter !== 'expense' ||
  searchValue !== '' ||
  categoryIds.length > 0 ||
  (selectedMonth !== '' && selectedMonth !== currentMonth);
```

**Step 5: Client script — keep PERIOD_CHANGE_EVENT listener**

The `<script>` section stays mostly unchanged. The `PERIOD_CHANGE_EVENT` listener on `window` still works because PeriodNavigator dispatches global events. The `updateResetButtonVisibility` function queries `[data-period-input]` via `document.querySelector` which finds it in the header. No changes needed to the client script.

**Step 6: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

**Step 7: Commit**

```bash
git add src/components/organisms/TransactionFiltersBar.astro
git commit -m "feat(mobile): reorganize filter bar layout — search first, remove PeriodNavigator"
```

---

### Task 5: Transaction Page Integration

**Files:**

- Modify: `src/pages/transactions/index.astro`

**Context:** Wire PeriodNavigator to the header via `slot="header-extras"`, pass subtitle showing current month, and update TransactionFiltersBar props (remove month-related props, add currentMonth/selectedMonth).

**Depends on:** Tasks 1 (header slot system) and 4 (updated FiltersBar props).

**Step 1: Add PeriodNavigator import and slot injection**

The file already imports `transactionService` and has `availableMonthsWithLabels`, `selectedMonth`, `currentMonthKey`, and `formatMonthKey`. Use these to set up PeriodNavigator in the header.

Add import at top:

```typescript
import PeriodNavigator from '@/components/molecules/PeriodNavigator.astro';
```

Compute period options (this was previously done in FiltersBar — move the computation here):

```typescript
const periodOptions = availableMonthsWithLabels.map((month) => ({
  value: month.key,
  label: month.label,
}));
```

**Step 2: Update ProtectedLayout usage**

Replace:

```astro
<ProtectedLayout
  title="Transactions"
  currentPath={currentPath}
  subtitle="View and manage your transactions"
/>
```

With:

```astro
<ProtectedLayout
  title="Transactions"
  currentPath={currentPath}
  subtitle={formatMonthKey(effectiveMonth)}
>
  <PeriodNavigator
    slot="header-extras"
    options={periodOptions}
    selected={selectedMonth || currentMonthKey}
    ariaLabel="Select month"
    inputName="month"
  /></ProtectedLayout
>
```

**Important:** The PeriodNavigator goes BEFORE the page content div but INSIDE ProtectedLayout. It uses `slot="header-extras"` to be captured by the layout chain.

**Step 3: Update TransactionFiltersBar props**

Replace:

```astro
<TransactionFiltersBar
  typeFilter={typeFilter}
  searchValue={searchValue}
  categoryIds={categoryIds}
  categories={categories}
  showCategoryFilter={true}
  monthSelector={true}
  availableMonths={availableMonthsWithLabels}
  selectedMonth={selectedMonth || currentMonthKey}
  currentMonth={currentMonthKey}
  baseUrl={baseUrl}
/>
```

With:

```astro
<TransactionFiltersBar
  typeFilter={typeFilter}
  searchValue={searchValue}
  categoryIds={categoryIds}
  categories={categories}
  showCategoryFilter={true}
  currentMonth={currentMonthKey}
  selectedMonth={selectedMonth || currentMonthKey}
  baseUrl={baseUrl}
/>
```

Removed: `monthSelector`, `availableMonths` (no longer accepted by FiltersBar).

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

**Step 5: Commit**

```bash
git add src/pages/transactions/index.astro
git commit -m "feat(mobile): relocate PeriodNavigator to header, pass month subtitle"
```

---

### Task 6: Quality Gates + Build Verification

**Depends on:** All previous tasks.

**Step 1: Run full quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

All must pass.

**Step 2: Run build**

```bash
bun run build
```

Expected: Build succeeds with no errors.

**Step 3: Commit any auto-fixes from linters**

```bash
git status
# If changes from auto-fixes:
git add -A && git commit -m "style: apply linter auto-fixes"
```

**Step 4: Visual verification recommendation**

Open `http://mobile-view-improvements.expenses.local:4322/transactions` in iPhone 12 Pro viewport. Verify:

1. **Header:** Title + month subtitle visible, no notification bell, PeriodNavigator below header bar (mobile) or right-aligned (desktop)
2. **Summary cards:** Compact vertical rows on mobile (icon + label + value), full StatCards on desktop
3. **Action bar:** Bleeds to edges on mobile, Expense/Income first, horizontally scrollable, card style on desktop
4. **Filter bar:** Search on top, type toggle + category dropdown below, no PeriodNavigator
5. **PeriodNavigator:** Changing month updates subtitle, triggers filter refresh, page content updates correctly
