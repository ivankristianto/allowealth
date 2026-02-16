# Budget Details via CategoryDrillDownModal

## Problem

BudgetCard "View" and BudgetTable "Details" buttons redirect to the transactions page. This is a temporary solution. The CategoryDrillDownModal already exists on the reports page and provides a better UX: an in-context modal with budget overview, progress bar, and transaction list.

## Design

Reuse the existing CategoryDrillDownModal on the budget page by:

1. Adding the modal component to `pages/budget/index.astro`
2. Converting navigation links in BudgetCard and BudgetTable to buttons with data attributes
3. Adding event delegation in the budget page client script to dispatch `open-category-drilldown` events

### Data Flow

```
Button click → delegation handler reads data-* attrs → dispatches 'open-category-drilldown'
→ modal listener catches event → fetches /api/reports/category-drilldown?_render=html
→ renders server-side partial → injects HTML into modal
```

### Changes

| File                                | Change                                                             |
| ----------------------------------- | ------------------------------------------------------------------ |
| `pages/budget/index.astro`          | Import + render `CategoryDrillDownModal`                           |
| `BudgetCard.astro`                  | `<a>` → `<button data-view-details>` with category data attributes |
| `BudgetTable.astro`                 | `<a>` → `<button data-view-details>` with category data attributes |
| `pages/budget/index.astro` (script) | Add delegation handler for `[data-view-details]` clicks            |

### Unchanged

- `CategoryDrillDownModal.astro` — self-initializing, event-driven
- `CategoryDrillDownPartial.astro` — server-rendered content
- `/api/reports/category-drilldown` — existing API
- Reports page — unaffected
