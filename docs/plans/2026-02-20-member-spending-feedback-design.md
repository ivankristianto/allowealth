# Member Spending Page Feedback — Design

**Date:** 2026-02-20
**Status:** Proposed

## Changes

### 1. Remove "Family" from stat card titles

Replace hardcoded "Family" labels with generic equivalents matching `ReportSummaryCardsPartial`:

| Current         | Proposed       |
| --------------- | -------------- |
| FAMILY INCOME   | TOTAL INCOME   |
| FAMILY EXPENSES | TOTAL EXPENSES |
| FAMILY NET      | NET SAVINGS    |

**File:** `src/pages/reports/members/index.astro` (lines 247, 258, 274)

### 2. New `Breadcrumb` atom + move navigation from header slot to container

**Problem:** The "Member Spending" button and back arrows are in the header slot, which is not the right place for navigation.

**Solution:** Create a reusable `Breadcrumb` atom using DaisyUI's `breadcrumbs` class (same pattern as admin pages). Move navigation from header slot into the page body.

**Component:** `src/components/atoms/Breadcrumb.astro`

```typescript
interface BreadcrumbItem {
  label: string;
  href?: string; // omit for current page (last item)
}

interface Props {
  items: BreadcrumbItem[];
}
```

Renders as:

```html
<nav aria-label="Breadcrumb">
  <div class="breadcrumbs text-sm">
    <ul>
      <li><a href="/reports">Reports</a></li>
      <li>Member Spending</li>
      <!-- no link = current page -->
    </ul>
  </div>
</nav>
```

**Usage:**

- **Reports page** (`/reports`): `Reports » [Member Spending]` — Member Spending is a clickable link
- **Member overview** (`/reports/members`): `[Reports] » Member Spending`
- **Member detail** (`/reports/members?user_id=X`): `[Reports] » [Member Spending] » Ivan`

**Header slot changes:**

- Both pages: header slot contains only `ReportSelector` (no back buttons or navigation links)

### 3. Fix CategoryDrillDown detail button on member spending page

**Root cause:** The member spending detail view renders `CategoryTablePartial` with `data-view-details` buttons, but the page's inline `<script>` does not handle clicks on those buttons. Only `ReportsPage.client.ts` (imported by the main reports page) has the `handleDrillDownClick` event delegation.

**Fix:** Add drill-down click handler to the member spending page's inline script:

1. Event delegation on `document` for `[data-view-details]` clicks
2. Extract data attributes (categoryId, name, icon, color, spent, budgetLimit)
3. Dispatch `open-category-drilldown` custom event with `period: currentPeriod`

## Files Changed

| File                                    | Change                                                                       |
| --------------------------------------- | ---------------------------------------------------------------------------- |
| `src/components/atoms/Breadcrumb.astro` | **New** — reusable breadcrumb component                                      |
| `src/pages/reports/members/index.astro` | Rename stat card titles, add breadcrumb, fix drilldown, simplify header slot |
| `src/pages/reports/index.astro`         | Replace Member Spending button in header with breadcrumb in body             |
