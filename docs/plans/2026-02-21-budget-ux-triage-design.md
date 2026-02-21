# Budget UX Triage Design

**Issue**: [#255 — Budget: no severity sorting, cluttered toolbar, poor triage UX](https://github.com/ivankristianto/allowealth/issues/255)
**Date**: 2026-02-21
**Approach**: Server-side default sort + client-side filter toggle (Approach A)

## Summary

Six UX improvements to make the budget page a triage-first tool. The page's primary job is showing the worst problems first — the current design defeats that purpose.

## Changes

### 1. Default Sort by Severity + CRITICAL Badge

**Files**: `BudgetCardGrid.astro`, `BudgetFilterControls.astro`, `BudgetCard.astro`

**Sort**: Change default from `budget_amount` desc to `percentage_used` desc. Add `"usage-desc"` as first/default option in sort dropdown.

**CRITICAL badge**: New badge variant when `percentageUsed >= 150`:

- `< 80%` → green "X% Used"
- `80-100%` → yellow "X% Used"
- `100-149%` → red "X% Used"
- `≥ 150%` → red bold "CRITICAL X%"

**Data attributes**: Add `data-sort-usage` and `data-budget-status` to card wrapper elements for client-side re-sorting and filtering.

### 2. Triage Summary Integrated into Header

**Files**: `BudgetSummary.astro`, `BudgetSummaryPartial.astro`, budget service

**New props**:

- `totalCategories: number`
- `overBudgetCount: number`
- `criticalCount: number`

Computed from `BudgetOverview[]` data in the service/partial layer.

**Triage strip** (below the 3 stats, inside the summary card):

- Text: `"{overBudgetCount} of {totalCategories} over budget · {criticalCount} critical"`
- If no critical: omit critical part
- If no overbudget: "All categories within budget" (success tone)
- Filter toggle button: "Show overbudget only" → toggles card visibility via `data-budget-status`
- When active: "Show all categories"

**Visual hierarchy fix**:

- Allocated: base-content, largest text (anchor)
- Spent: base-content with muted percentage inline (not orange label)
- Overbudget: error color on amount only, label stays neutral

### 3. Card Layout — Budget as Anchor

**Files**: `BudgetCard.astro`

Swap columns:

- **Left (prominent)**: BUDGET label + amount (`text-base md:text-lg font-bold`) + edit pencil
- **Right (secondary)**: SPENT label + amount (`text-xs md:text-sm font-bold text-base-content/60`)

No logic changes — pure template reordering.

### 4. Toolbar Grouping

**Files**: `BudgetActions.astro`

Layout: `[Categories] [Import] [Export] [Copy] | [+ New Budget]`

- Visual divider (`border-l border-base-300`) before primary CTA slot
- Initialize All: fully hidden when `uninitializedCount === 0` (remove disabled state, just don't render)
- New Budget stays in primary slot with accent styling

### 5. Prev/Next Navigation in Drilldown Modal

**Files**: `CategoryDrillDownModal.astro`, `BudgetPage.client.ts`

- Store ordered category list (follows current sort order) in client-side state
- Add `[← Prev]` / `[Next →]` buttons in modal header area
- Clicking nav dispatches new `open-category-drilldown` event for adjacent category
- Keyboard: left/right arrow keys when modal is open
- Edge cases: hide Prev on first, hide Next on last

### 6. Sort Dropdown Update

**Files**: `BudgetFilterControls.astro`, `BudgetPage.client.ts`

New default options: `% Used ↓` (default), Budget ↓, Spent ↓, Title A-Z, Title Z-A

Client-side sort uses `data-sort-usage` attribute on card wrappers.

## Architecture Notes

- **Server-side**: Default sort order changed in `BudgetCardGrid`. Triage counts computed from existing `BudgetOverview[]` data — no new DB queries.
- **Client-side**: Filter toggle hides/shows cards via CSS (no re-fetch). Prev/next modal nav dispatches existing custom events.
- **No API changes**: All data already available in existing overview response. Just computing derived values server-side.
- **No new dependencies**: Uses existing Badge, Button, and ProgressBar atoms.

## Out of Scope

- Budget table view sort (only card view gets severity sort)
- AI advice banner changes
- Budget history page changes
