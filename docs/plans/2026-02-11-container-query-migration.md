# Container Query Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate 8 responsive layout components from viewport breakpoints (`md:`, `lg:`, `xl:`) to CSS container queries (`@container` + `@2xl:`, `@3xl:`, `@5xl:`, etc.) so layouts respond to actual container width instead of viewport width.

**Architecture:** Each component wraps its content in an `@container` element and replaces viewport breakpoint prefixes with container query prefixes. The parent container's actual width drives layout changes, eliminating the 256px sidebar miscalculation on tablets. This is a CSS-only migration with one JS change in BudgetSummary.

**Tech Stack:** Tailwind CSS v4 (built-in container queries), Astro 5.x SSR components

**Issue:** [#210](https://github.com/ivankristianto/allowealth/issues/210)

---

## Context

### The Problem

The sidebar is 256px wide and visible at `lg:` (1024px viewport) via `lg:drawer-open` on `MainLayout.astro`. At 1100px viewport, actual content width is only ~748px, but `lg:` (1024px) breakpoints still fire — causing cramped 2-column grids and overflowing tables.

### Container Query Breakpoints (Tailwind v4)

| Prefix  | Width  | Typical Use                                 |
| ------- | ------ | ------------------------------------------- |
| `@xs:`  | 320px  | Always-on tweaks (barely wider than mobile) |
| `@sm:`  | 384px  | Small spacing/padding adjustments           |
| `@md:`  | 448px  | Medium spacing adjustments                  |
| `@lg:`  | 512px  | Medium component width                      |
| `@xl:`  | 576px  | Flex direction changes (row/col)            |
| `@2xl:` | 672px  | 2-column grids, medium gaps                 |
| `@3xl:` | 768px  | 2-3 column grids, table views               |
| `@4xl:` | 896px  | Spacious table padding                      |
| `@5xl:` | 1024px | 4-column grids, 12-col layouts              |

### Content Width at Key Viewports

| Viewport | Sidebar | Main Padding | Effective Content Width |
| -------- | ------- | ------------ | ----------------------- |
| 375px    | Hidden  | 32px         | ~343px                  |
| 768px    | Hidden  | 32px         | ~736px                  |
| 1024px   | 256px   | 48px         | ~720px                  |
| 1100px   | 256px   | 48px         | ~796px                  |
| 1280px   | 256px   | 48px         | ~976px                  |
| 1440px   | 256px   | 48px         | ~1136px                 |

### Proof of Concept Reference

**BudgetCardGrid.astro** (already migrated):

- Outer wrapper: `<div class="@container">`
- Grid: `grid-cols-1 @2xl:grid-cols-2 @5xl:grid-cols-3`
- Gap: `gap-3 @2xl:gap-6 @5xl:gap-8`

**BudgetCard.astro** (already migrated):

- Each card: `<div class="h-full @container">`
- Internal: `p-4 @xs:p-5 @md:p-6`, `gap-2 @xs:gap-3`, etc.

### Viewport → Container Query Mapping Guide

This mapping accounts for the 256px sidebar at desktop:

| Viewport Prefix | Container Prefix | Reasoning                                          |
| --------------- | ---------------- | -------------------------------------------------- |
| `sm:` (640px)   | `@sm:` (384px)   | Spacing tweaks — should apply on small+ containers |
| `md:` (768px)   | `@2xl:` (672px)  | Medium layout changes — 2-col grids, gaps          |
| `lg:` (1024px)  | `@3xl:` (768px)  | With sidebar, content is ~768px at lg viewport     |
| `xl:` (1280px)  | `@5xl:` (1024px) | With sidebar, content is ~1024px at xl viewport    |

### Out of Scope

- Typography sizing (stays viewport-based — readability scales with screen distance)
- Navigation/sidebar layout changes
- BudgetCardGrid and BudgetCard (already migrated)
- NetWorthWidget (no viewport breakpoints — verified, no changes needed)

---

## Task 1: ReportChartsPartial — Chart Grid

**Complexity:** Low (2 breakpoint instances)

**Files:**

- Modify: `src/components/partials/ReportChartsPartial.astro:43`

**Step 1: Add `@container` wrapper and convert breakpoints**

Change line 43 from:

```html
<div class="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8" data-report-charts></div>
```

To:

```html
<div class="@container" data-report-charts>
  <div class="grid grid-cols-1 @3xl:grid-cols-2 gap-6 @2xl:gap-8"></div>
</div>
```

And close the new wrapper div after the child components (before the closing `</div>` on the last line).

**Mapping:**

- `xl:grid-cols-2` → `@3xl:grid-cols-2` (768px) — 2 charts need ~384px each
- `md:gap-8` → `@2xl:gap-8` (672px) — wider gap when there's room

**Step 2: Run quality gates**

```bash
bun run typecheck && bun run lint:fix && bun run stylelint:fix && bun run format:fix
```

Expected: All pass

**Step 3: Commit**

```bash
git add src/components/partials/ReportChartsPartial.astro
git commit -m "refactor: migrate ReportChartsPartial to container queries"
```

---

## Task 2: ReportSummaryCardsPartial — Stat Cards Grid

**Complexity:** Low (3 breakpoint instances)

**Files:**

- Modify: `src/components/partials/ReportSummaryCardsPartial.astro:34`

**Step 1: Add `@container` wrapper and convert breakpoints**

Change line 34 from:

```html
<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6" data-summary-cards></div>
```

To:

```html
<div class="@container" data-summary-cards>
  <div class="grid grid-cols-1 @2xl:grid-cols-2 @5xl:grid-cols-4 gap-4 @2xl:gap-6"></div>
</div>
```

And close the new wrapper div after the StatCard components.

**Mapping:**

- `md:grid-cols-2` → `@2xl:grid-cols-2` (672px) — 2 cards per row
- `xl:grid-cols-4` → `@5xl:grid-cols-4` (1024px) — all 4 cards in a row
- `md:gap-6` → `@2xl:gap-6` (672px) — wider gap at medium+

**Step 2: Run quality gates**

```bash
bun run typecheck && bun run lint:fix && bun run stylelint:fix && bun run format:fix
```

Expected: All pass

**Step 3: Commit**

```bash
git add src/components/partials/ReportSummaryCardsPartial.astro
git commit -m "refactor: migrate ReportSummaryCardsPartial to container queries"
```

---

## Task 3: TransactionSummaryCards — Stat Cards

**Complexity:** Medium (8 breakpoint instances across loading + normal states)

**Files:**

- Modify: `src/components/organisms/TransactionSummaryCards.astro`

**Step 1: Add `@container` wrapper and convert all viewport breakpoints**

The component has two grid divs (loading state line 63 and normal state line 88) plus card padding classes.

Wrap the entire component output in `<div class="@container">` and convert:

| Location                    | Old Class                      | New Class                         |
| --------------------------- | ------------------------------ | --------------------------------- |
| Line 52 (cardClasses)       | `sm:rounded-card`              | `@sm:rounded-card`                |
| Line 63 (loading grid)      | `md:grid-cols-3`               | `@2xl:grid-cols-3`                |
| Line 63 (loading grid)      | `sm:gap-6`                     | `@sm:gap-6`                       |
| Line 65, 72, 79 (card-body) | `sm:p-6 lg:p-8`                | `@sm:p-6 @3xl:p-8`                |
| Line 66-68 (skeleton)       | `sm:mb-4`, `sm:h-9`, `sm:mb-3` | `@sm:mb-4`, `@sm:h-9`, `@sm:mb-3` |
| Line 88 (normal grid)       | `md:grid-cols-3`               | `@2xl:grid-cols-3`                |
| Line 88 (normal grid)       | `sm:gap-6`                     | `@sm:gap-6`                       |

**Implementation approach:**

1. In the `cardClasses` array (line 51-54), change `sm:rounded-card` to `@sm:rounded-card`
2. Wrap the ternary output (`error ? ... : loading ? ... : ...`) in a `<div class="@container">`
3. Replace all viewport prefixes in both grid divs and card-body classes

**Step 2: Run quality gates**

```bash
bun run typecheck && bun run lint:fix && bun run stylelint:fix && bun run format:fix
```

Expected: All pass

**Step 3: Commit**

```bash
git add src/components/organisms/TransactionSummaryCards.astro
git commit -m "refactor: migrate TransactionSummaryCards to container queries"
```

---

## Task 4: SpendingChart — Chart + Legend Layout

**Complexity:** Medium (9+ breakpoint instances)

**Files:**

- Modify: `src/components/organisms/SpendingChart.astro`

**Step 1: Add `@container` to the Card content wrapper and convert breakpoints**

The component is wrapped in a `<Card>` atom. Add `@container` to the inner flex container (line 74):

Change line 74 from:

```html
<div class="flex flex-col gap-6"></div>
```

To:

```html
<div class="@container flex flex-col gap-6"></div>
```

Then convert all viewport breakpoints:

| Location                   | Old Class           | New Class             |
| -------------------------- | ------------------- | --------------------- |
| Line 86 (loading flex)     | `xl:flex-row`       | `@xl:flex-row`        |
| Line 87 (loading chart)    | `xl:w-[180px]`      | `@xl:w-[180px]`       |
| Line 117 (chart flex)      | `xl:flex-row`       | `@xl:flex-row`        |
| Line 124 (chart container) | `xl:mx-0`           | `@xl:mx-0`            |
| Line 150 (legend)          | `sm:space-y-3`      | `@xs:space-y-3`       |
| Line 158 (legend item)     | `sm:p-3.5`          | `@xs:p-3.5`           |
| Line 158 (legend item)     | `sm:rounded-2xl`    | `@xs:rounded-2xl`     |
| Line 162 (legend item gap) | `sm:gap-3`          | `@xs:gap-3`           |
| Line 164 (color dot)       | `sm:w-3.5 sm:h-3.5` | `@xs:w-3.5 @xs:h-3.5` |
| Line 164 (color dot)       | `sm:rounded-lg`     | `@xs:rounded-lg`      |
| Line 169 (category name)   | `sm:text-base`      | `@xs:text-base`       |
| Line 169 (category name)   | `sm:max-w-[200px]`  | `@xs:max-w-[200px]`   |
| Line 175 (percentage)      | `sm:text-base`      | `@xs:text-base`       |

**Mapping reasoning:**

- `xl:flex-row` → `@xl:flex-row` (576px) — chart+legend go side-by-side when component has ≥576px
- `sm:` legend tweaks → `@xs:` (320px) — these are minor size bumps that should apply on nearly all containers except the smallest phone

**Step 2: Run quality gates**

```bash
bun run typecheck && bun run lint:fix && bun run stylelint:fix && bun run format:fix
```

Expected: All pass

**Step 3: Commit**

```bash
git add src/components/organisms/SpendingChart.astro
git commit -m "refactor: migrate SpendingChart to container queries"
```

---

## Task 5: Dashboard Page — Grid Layouts

**Complexity:** Low-Medium (6 breakpoint instances, but page-level layout)

**Files:**

- Modify: `src/pages/dashboard.astro`

**Step 1: Add `@container` to the main content wrapper and convert breakpoints**

Change line 146-149 from:

```html
<div
  class="max-w-7xl mx-auto sm:px-2 lg:px-6 space-y-6 sm:space-y-8"
  data-testid="dashboard-page"
></div>
```

To:

```html
<div
  class="@container max-w-7xl mx-auto @sm:px-2 @3xl:px-6 space-y-6 @sm:space-y-8"
  data-testid="dashboard-page"
></div>
```

Then convert the grid layouts inside:

| Location | Old Class        | New Class          |
| -------- | ---------------- | ------------------ |
| Line 147 | `sm:px-2`        | `@sm:px-2`         |
| Line 147 | `lg:px-6`        | `@3xl:px-6`        |
| Line 147 | `sm:space-y-8`   | `@sm:space-y-8`    |
| Line 165 | `lg:grid-cols-2` | `@3xl:grid-cols-2` |
| Line 165 | `sm:gap-8`       | `@sm:gap-8`        |
| Line 189 | `lg:grid-cols-3` | `@3xl:grid-cols-3` |
| Line 189 | `sm:gap-8`       | `@sm:gap-8`        |
| Line 190 | `lg:col-span-2`  | `@3xl:col-span-2`  |
| Line 198 | `sm:space-y-8`   | `@sm:space-y-8`    |

**Mapping reasoning:**

- `lg:` grid changes → `@3xl:` (768px) — 2-col/3-col grids only when dashboard has ≥768px available. At 1024px viewport with sidebar, content is ~720px so grid stays single-col. At ~1076px viewport, content crosses 768px and grid activates. This fixes the cramped layout at 1100px.
- `sm:` spacing → `@sm:` (384px) — minor padding/gap adjustments

**Step 2: Run quality gates**

```bash
bun run typecheck && bun run lint:fix && bun run stylelint:fix && bun run format:fix
```

Expected: All pass

**Step 3: Commit**

```bash
git add src/pages/dashboard.astro
git commit -m "refactor: migrate dashboard grid layout to container queries"
```

---

## Task 6: BudgetSummary — 12-Column Grid + JS

**Complexity:** High (12+ breakpoint instances + JavaScript change)

**Files:**

- Modify: `src/components/organisms/BudgetSummary.astro`

### Step 1: Add `@container` and convert CSS breakpoints

The component has a `<section>` wrapper with `cardClasses`. Add `@container` to the inner grid wrapper.

**cardClasses (line 94):**

- `lg:p-10` → `@3xl:p-10`

**Loading state grid (line 107):**

- `xl:grid-cols-12` → `@5xl:grid-cols-12`
- `xl:gap-10` → `@5xl:gap-10`

**Loading left column (line 109):**

- `xl:col-span-4` → `@5xl:col-span-4`
- `xl:gap-8` → `@5xl:gap-8`

**Loading right column (line 127):**

- `xl:col-span-8` → `@5xl:col-span-8`
- `xl:gap-8` → `@5xl:gap-8`

**Loading legend grid (line 134):**

- `sm:grid-cols-3` → `@sm:grid-cols-3`
- `xl:grid-cols-4` → `@5xl:grid-cols-4`
- `xl:gap-4` → `@5xl:gap-4`

**Normal state grid (line 152):**

- `xl:grid-cols-12` → `@5xl:grid-cols-12`
- `xl:gap-10` → `@5xl:gap-10`

**Left column (line 154):**

- `xl:col-span-4` → `@5xl:col-span-4`
- `xl:gap-8` → `@5xl:gap-8`

**Typography (lines 161, 171, 174):**

- `lg:text-3xl` → `@3xl:text-3xl`
- `lg:mt-3` → `@3xl:mt-3`

**Right column details (line 212):**

- `xl:col-span-8` → `@5xl:col-span-8`

**Summary header (line 213):**

- `xl:pointer-events-none` → `@5xl:pointer-events-none`

**Header text (line 214):**

- `xl:text-lg` → `@5xl:text-lg`

**Tap to expand label (line 217):**

- `xl:hidden` → `@5xl:hidden`

**Share distribution label (line 220):**

- `hidden xl:block` → `hidden @5xl:block`

**Summary/details spacing (line 213):**

- `xl:mb-8` → `@5xl:mb-8`

**Details content gap (line 225):**

- `xl:gap-8` → `@5xl:gap-8`

**Legend grid (line 239):**

- `sm:grid-cols-3` → `@sm:grid-cols-3`
- `xl:grid-cols-4` → `@5xl:grid-cols-4`
- `xl:gap-4` → `@5xl:gap-4`

### Step 2: Update the `<script>` to use ResizeObserver instead of matchMedia

The current script (line 267-293) uses `window.matchMedia('(min-width: 1280px)')` which is viewport-based. Replace with a `ResizeObserver` that checks the actual container width.

Change the script from:

```typescript
const initializedDetails = new WeakSet<Element>();

function initBudgetAllocations() {
  document.querySelectorAll<HTMLDetailsElement>('[data-budget-allocations]').forEach((details) => {
    if (initializedDetails.has(details)) return;
    initializedDetails.add(details);

    // Open by default on wide desktop (xl breakpoint = 1280px)
    const mq = window.matchMedia('(min-width: 1280px)');
    if (mq.matches) details.open = true;

    mq.addEventListener('change', (e) => {
      details.open = e.matches;
    });
  });
}
```

To:

```typescript
const initializedDetails = new WeakSet<Element>();
const detailsObservers = new Map<Element, ResizeObserver>();

function initBudgetAllocations() {
  document.querySelectorAll<HTMLDetailsElement>('[data-budget-allocations]').forEach((details) => {
    if (initializedDetails.has(details)) return;
    initializedDetails.add(details);

    // Find the @container ancestor to observe its width
    const container =
      details.closest('section')?.querySelector('.@container\\/budget-summary') ??
      details.closest('section');
    if (!container) return;

    // Open by default when container is wide enough (@5xl = 1024px)
    const WIDE_THRESHOLD = 1024;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        details.open = entry.contentRect.width >= WIDE_THRESHOLD;
      }
    });

    observer.observe(container);
    detailsObservers.set(details, observer);
  });
}

function cleanupBudgetAllocations() {
  detailsObservers.forEach((observer) => observer.disconnect());
  detailsObservers.clear();
}
```

Also update the event listeners at the bottom to call cleanup:

```typescript
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initBudgetAllocations);
} else {
  initBudgetAllocations();
}

document.addEventListener('astro:before-swap', cleanupBudgetAllocations);
document.addEventListener('astro:page-load', initBudgetAllocations);
```

**Note:** The `ResizeObserver` approach actually needs to observe the section element itself (the card), since that's the container whose width changes. The `@container` class can go on the section or on the inner grid wrapper. The simplest approach: add `@container` class to the `<section>` element by including it in `cardClasses`.

**Updated approach for `@container` placement:**

Add `@container` to `cardClasses` (line 88-101):

```typescript
const cardClasses = [
  '@container',
  'bg-base-100 rounded-card border border-base-300',
  'shadow-sm',
  'p-6 @3xl:p-10',
  'relative overflow-hidden',
  className,
]
  .filter(Boolean)
  .join(' ');
```

Then the ResizeObserver can simply observe `details.closest('section')`.

### Step 3: Run quality gates

```bash
bun run typecheck && bun run lint:fix && bun run stylelint:fix && bun run format:fix
```

Expected: All pass

### Step 4: Commit

```bash
git add src/components/organisms/BudgetSummary.astro
git commit -m "refactor: migrate BudgetSummary to container queries

Replace viewport breakpoints with container queries for the 12-column
grid layout and allocation details. Uses ResizeObserver instead of
matchMedia for the auto-open behavior on wide containers."
```

---

## Task 7: BudgetHistoryTablePartial — Mobile/Desktop View Switch

**Complexity:** High (10+ breakpoint instances, mobile/desktop conditional rendering)

**Files:**

- Modify: `src/components/partials/BudgetHistoryTablePartial.astro`

**Step 1: Add `@container` wrapper and convert all breakpoints**

Wrap the outermost element. The component renders either a `<div class="divide-y ...">` or an empty state. Wrap both in a `@container`:

At the top of the template (line 72), change the opening to wrap in `@container`:

```html
<div class="@container">
  { sortedHistory.length > 0 ? (
  <div class="divide-y divide-base-100">...</div>
  ) : ( ... ) }
</div>
```

Then convert all viewport breakpoints inside each history row:

**Mobile view (line 97):**

- `lg:hidden` → `@3xl:hidden`

**Desktop view (line 196):**

- `hidden lg:grid` → `hidden @3xl:grid`

**Desktop row cells (lines 197, 209, 217, 225, 235, 265, 273):**
Each has `px-4 xl:px-8 py-5 xl:py-6`. Convert all to:

- `xl:px-8` → `@4xl:px-8`
- `xl:py-6` → `@4xl:py-6`

**Desktop month name (line 198):**

- `xl:gap-3` → `@4xl:gap-3`

**Desktop month text (line 199):**

- `xl:text-base` → `@4xl:text-base`

**Desktop "Current" badge (line 202):**

- `xl:px-2` → `@4xl:px-2`

**Mapping reasoning:**

- `lg:hidden` / `lg:grid` → `@3xl:` (768px) — table needs at least 768px to display 7 columns comfortably
- `xl:` padding → `@4xl:` (896px) — spacious padding when container is wide

**Step 2: Run quality gates**

```bash
bun run typecheck && bun run lint:fix && bun run stylelint:fix && bun run format:fix
```

Expected: All pass

**Step 3: Commit**

```bash
git add src/components/partials/BudgetHistoryTablePartial.astro
git commit -m "refactor: migrate BudgetHistoryTablePartial to container queries

Mobile/desktop view switch now uses container width (@3xl = 768px)
instead of viewport lg breakpoint. Table padding scales with @4xl."
```

---

## Task 8: Visual Regression Testing

**Complexity:** Medium (manual testing at 4 viewport sizes)

**Step 1: Build the project**

```bash
bun run build
```

Expected: Build succeeds with no errors

**Step 2: Start dev server**

```bash
bun run dev
```

**Step 3: Test each page at all 4 viewport sizes**

Open browser DevTools and test at these viewport widths:

- **375px** (mobile)
- **768px** (tablet without sidebar)
- **1100px** (tablet/small laptop with sidebar — the problem viewport)
- **1440px** (desktop with sidebar)

**Pages to test:**

| Page              | Components                                                  | What to Verify                                                                                                |
| ----------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `/dashboard`      | SpendingChart, SpendingCard, NetWorthWidget, CashFlowWidget | Grid stacks on narrow, 2-col on wide. Chart legend direction.                                                 |
| `/transactions`   | TransactionSummaryCards                                     | 3 stat cards stack on narrow, row on wide. Card padding scales.                                               |
| `/budget`         | BudgetSummary, BudgetCardGrid                               | 12-col grid stacks on narrow, side-by-side on wide. Details auto-opens on wide. Budget cards grid responsive. |
| `/budget/history` | BudgetHistoryTablePartial                                   | Card layout on narrow, table on wide. No overlap/overflow at 1100px.                                          |
| `/reports`        | ReportSummaryCardsPartial, ReportChartsPartial              | 4 stat cards stack → 2-col → 4-col. Charts stack → 2-col.                                                     |

**Key regression check at 1100px viewport:**

- Dashboard grids should NOT be 2-column (content is ~748px < 768px threshold)
- Budget summary should NOT be 12-column
- Budget history should show card layout (not table)
- These should switch to multi-column at ~1076px+ viewport (when content crosses 768px)

**Step 4: Commit a verification note**

No code changes — this is a manual verification step. If issues are found, fix them in subsequent commits.

---

## Task 9: Update Design System Documentation

**Complexity:** Low

**Files:**

- Modify: `design-system/05-responsive.md`

**Step 1: Add container queries section to the responsive design docs**

Add a new section after the existing breakpoints documentation explaining:

- When to use container queries vs viewport breakpoints
- The `@container` pattern with Tailwind v4
- Viewport → container query mapping table
- Reference to BudgetCardGrid/BudgetCard as examples

**Content to add:**

````markdown
## Container Queries (Tailwind v4)

Components that live inside layout containers (sidebar + main content) should use
**container queries** instead of viewport breakpoints. Container queries respond to
the component's actual available width, not the viewport.

### When to Use

| Use Case                        | Approach                                                       |
| ------------------------------- | -------------------------------------------------------------- |
| Component inside sidebar layout | Container queries (`@container` + `@2xl:`)                     |
| Typography sizing               | Viewport breakpoints (readability scales with screen distance) |
| Navigation/sidebar visibility   | Viewport breakpoints (fixed layout concerns)                   |
| Page-level max-width            | Viewport breakpoints or `max-w-*`                              |

### Pattern

```html
<!-- Parent: mark as container -->
<div class="@container">
  <!-- Children: use container query prefixes -->
  <div class="grid grid-cols-1 @3xl:grid-cols-2 @5xl:grid-cols-3">...</div>
</div>
```
````

### Container Query Breakpoints

| Prefix  | Width  | Typical Use                    |
| ------- | ------ | ------------------------------ |
| `@xs:`  | 320px  | Minor size tweaks              |
| `@sm:`  | 384px  | Spacing adjustments            |
| `@2xl:` | 672px  | 2-column grids                 |
| `@3xl:` | 768px  | 2-3 column grids, table views  |
| `@5xl:` | 1024px | 4-column grids, 12-col layouts |

### Viewport → Container Mapping

| Viewport       | Container        | Reasoning                          |
| -------------- | ---------------- | ---------------------------------- |
| `sm:` (640px)  | `@sm:` (384px)   | Spacing tweaks                     |
| `md:` (768px)  | `@2xl:` (672px)  | Medium layouts                     |
| `lg:` (1024px) | `@3xl:` (768px)  | Sidebar reduces content to ~768px  |
| `xl:` (1280px) | `@5xl:` (1024px) | Sidebar reduces content to ~1024px |

### Examples

- `BudgetCardGrid.astro` — grid layout with container queries
- `BudgetCard.astro` — card internals with container queries
- `SpendingChart.astro` — flex direction change with container queries

````markdown
**Step 2: Run format**

```bash
bun run format:fix
```
````

**Step 3: Commit**

```bash
git add design-system/05-responsive.md
git commit -m "docs: add container query guidelines to design system"
```

---

## Execution Order Summary

| Task | Component                 | Complexity | Breakpoints |
| ---- | ------------------------- | ---------- | ----------- |
| 1    | ReportChartsPartial       | Low        | 2           |
| 2    | ReportSummaryCardsPartial | Low        | 3           |
| 3    | TransactionSummaryCards   | Medium     | 8           |
| 4    | SpendingChart             | Medium     | 9+          |
| 5    | Dashboard page            | Low-Med    | 9           |
| 6    | BudgetSummary             | High       | 12+ JS      |
| 7    | BudgetHistoryTablePartial | High       | 10+         |
| 8    | Visual Regression Testing | Medium     | Manual      |
| 9    | Design System Docs        | Low        | N/A         |

Total estimated breakpoint conversions: ~55 class changes + 1 JS refactor
