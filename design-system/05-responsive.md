# Responsive Design

Mobile-first responsive patterns using **container queries** for component layouts and **viewport breakpoints** for page-level chrome.

## Container Queries (Preferred)

Components respond to their **container width**, not the viewport. This handles sidebar offsets, embedded contexts, and reusable layouts automatically.

### Breakpoints

```
@xs: 320px   @sm: 384px   @md: 448px   @lg: 512px   @xl: 576px
@2xl: 672px  @3xl: 768px  @4xl: 896px  @5xl: 1024px @6xl: 1152px  @7xl: 1280px
```

### Viewport → Container Mapping

The sidebar is 256px wide (visible at `lg:` 1024px). Use this mapping when converting viewport breakpoints:

| Viewport       | Container        | Rationale                             |
| -------------- | ---------------- | ------------------------------------- |
| `sm:` (640px)  | `@sm:` (384px)   | 640 - 256 = 384                       |
| `md:` (768px)  | `@2xl:` (672px)  | 768 - 256 = 512, round up for padding |
| `lg:` (1024px) | `@3xl:` (768px)  | 1024 - 256 = 768                      |
| `xl:` (1280px) | `@5xl:` (1024px) | 1280 - 256 = 1024                     |

### Pattern

```html
<!-- 1. Add @container to parent wrapper (NO padding on this element) -->
<div class="@container">
  <!-- 2. Use @-prefixed breakpoints on children -->
  <div class="grid grid-cols-1 @3xl:grid-cols-2 gap-4 @sm:gap-6">
    <div>Card 1</div>
    <div>Card 2</div>
  </div>
</div>
```

### When to Use Container Queries

| Use container queries (`@`) | Use viewport breakpoints             |
| --------------------------- | ------------------------------------ |
| Component grids and layouts | Sidebar show/hide (`lg:drawer-open`) |
| Card padding and spacing    | MainLayout chrome (`px-4 lg:px-6`)   |
| Show/hide within components | Navigation bar visibility            |
| Table ↔ card switching      | Top-level page structure             |
| Typography scaling in cards | —                                    |

### Rules

1. **`@container` must NOT have padding.** Container queries measure content-box width. Padding reduces the measured width, causing breakpoints to fire later than expected.

```html
<!-- ❌ Wrong: padding reduces measured width -->
<section class="@container p-6">...</section>

<!-- ✅ Correct: wrapper has no padding, section has padding -->
<div class="@container">
  <section class="p-6">...</section>
</div>
```

2. **Place `@container` on the outermost wrapper** of the component, not on inner elements.

3. **Use ResizeObserver instead of `matchMedia`** when JavaScript needs container-width awareness:

```typescript
// ❌ Viewport-based
const mql = window.matchMedia('(min-width: 1024px)');
mql.addEventListener('change', (e) => {
  /* ... */
});

// ✅ Container-based
const observer = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const isWide = entry.contentRect.width >= 1024;
    // ...
  }
});
observer.observe(containerElement);
```

### Migrated Components

These components use container queries (reference implementations):

- `BudgetCardGrid` / `BudgetCard` — POC, first migration
- `ReportChartsPartial` — 2-col chart grid
- `ReportSummaryCardsPartial` — 4-col stat cards
- `TransactionSummaryCards` — 3-col summary cards
- `SpendingChart` — chart + legend layout
- `BudgetSummary` — 12-col grid + ResizeObserver for details auto-open
- `BudgetHistoryTablePartial` — table ↔ card switching
- `dashboard.astro` — page-level grid
- `budget/history.astro` — page-level + table header

## Viewport Breakpoints

Still used for page-level chrome that does not depend on container width.

```typescript
sm: 640px   md: 768px   lg: 1024px   xl: 1280px   2xl: 1536px
```

## Mobile-First Approach

```html
<!-- ✅ Base → larger -->
<div class="text-sm @2xl:text-base @5xl:text-lg">
  <!-- ❌ Desktop-first -->
  <div class="text-lg @2xl:text-base @sm:text-sm"></div>
</div>
```

## Page Container Standard

MainLayout provides base padding and vertical offsets: `px-4 lg:px-6 pt-24 sm:pt-28 pb-24 lg:pb-6`.

**Do NOT add extra horizontal padding on mobile** - use only MainLayout's padding.

### Full-Width Pages (dashboard, transactions, budget)

```html
<div class="@container max-w-7xl mx-auto @sm:px-2 @3xl:px-6 space-y-6 @sm:space-y-8">
  <!-- Page content with container query context -->
</div>
```

- **Mobile**: No extra padding (uses MainLayout's `p-4` = 16px)
- **@sm** (384px): `px-2` adds 8px extra (24px total)
- **@3xl** (768px): `px-6` adds 24px extra (48px total)
- **Vertical**: `space-y-6` mobile, `space-y-8` on @sm+

### Narrower Pages (forms, settings)

```html
<div class="space-y-6">
  <div class="max-w-2xl">
    <!-- Narrower content like forms -->
  </div>
</div>
```

No extra padding needed - container is already narrow.

## Common Patterns

### Grid Layout

```html
<!-- 1 col mobile, 2 at @3xl, 3 at @5xl -->
<div class="@container">
  <div class="grid grid-cols-1 @3xl:grid-cols-2 @5xl:grid-cols-3 gap-4 @2xl:gap-6"></div>
</div>
```

### Show/Hide

```html
<div class="hidden @3xl:block">Wide container only</div>
<div class="@3xl:hidden">Narrow container only</div>
```

### Tables

```html
<div class="@container">
  <!-- Desktop: table rows -->
  <div class="hidden @3xl:grid grid-cols-7">...</div>

  <!-- Mobile: card layout -->
  <div class="@3xl:hidden space-y-3">
    <div class="p-4">Card view...</div>
  </div>
</div>
```

### Typography

```html
<h1 class="text-2xl @3xl:text-3xl font-bold">Page Title</h1>
<p class="text-sm @2xl:text-base">Body text</p>
```

### Spacing

```html
<div class="p-4 @sm:p-6 @3xl:p-8">
  <div class="space-y-4 @2xl:space-y-6 @5xl:space-y-8"></div>
</div>
```

### Navigation

```html
<!-- Sidebar visibility still uses viewport breakpoints -->
<nav>
  <div class="hidden lg:flex gap-6">Desktop nav</div>
  <button class="lg:hidden">Menu</button>
</nav>
```

### Forms

```html
<!-- Full width mobile, half at @2xl -->
<div class="grid grid-cols-1 @2xl:grid-cols-2 gap-4">
  <input id="first-name" />
  <input id="last-name" />
</div>

<!-- Full width buttons mobile, auto at @sm -->
<button class="w-full @sm:w-auto">Submit</button>
```

## Touch Targets

Minimum **44x44px** on mobile.

```html
<button class="btn min-h-[44px]">
  <button class="btn-square w-11 h-11"></button>
</button>
```

## Testing Checklist

- [ ] Test at 375px (mobile, no sidebar)
- [ ] Test at 1024px (sidebar visible, content ~720px — key breakpoint)
- [ ] Test at 1100px (sidebar + content ~800px)
- [ ] Test at 1440px (full desktop)
- [ ] Verify `@container` wrapper has no padding
- [ ] Touch targets ≥44px
- [ ] No horizontal overflow
- [ ] Text readable without zooming
