# Budget UX Triage - Manual Test Plan

**PR:** #255
**Branch:** `budget-ux-triage`
**Date:** 2026-02-21

## Overview

Six UX improvements to the budget page: severity-based default sort with CRITICAL badge, triage summary in header with overbudget filter toggle, card layout swap (budget as anchor), toolbar grouping with visual divider, prev/next navigation in drilldown modal, and updated sort dropdown. Tests cover each change in isolation and as integrated interactions.

## Prerequisites

- Local dev server running: `bun run dev` → `http://localhost:4321`
- Database seeded with budget data: `bun run aw seed` (needs at least 8+ budget categories with a mix of statuses)
- Logged in as any user with a workspace
- **Required seed state:** At least 2 categories at 150%+ usage (CRITICAL), 3+ categories at 100-149% (exceeded), 3+ categories under 80% (ok), and 1-2 at 80-100% (warning)
- Test on both desktop (1280px+) and mobile (375px) viewports

---

## Test Steps

### 1. Default Sort by Severity

**Components under test:** `BudgetCardGrid.astro`, `BudgetFilterControls.astro`

> **Critical:** This is the primary UX fix — the entire issue centers on showing worst problems first.

| Step | Action                                                | Expected Result                                                                                               |
| ---- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 1.1  | Navigate to `http://localhost:4321/budget`            | Budget page loads with card grid visible                                                                      |
| 1.2  | Read the first 3 budget cards top-to-bottom           | Cards are sorted by % used descending — the highest percentage category appears first (e.g., 225% before 72%) |
| 1.3  | Check the sort dropdown value                         | Default selected option is "% Used ↓"                                                                         |
| 1.4  | Verify a 225% category card appears before a 72% card | The over-budget card with highest percentage is visually above/before any healthy card                        |

### 2. CRITICAL Badge Display

**Components under test:** `BudgetCard.astro`, `getBudgetStatus` utility

> **Critical:** New visual indicator for severe overspend.

| Step | Action                                       | Expected Result                                                              |
| ---- | -------------------------------------------- | ---------------------------------------------------------------------------- |
| 2.1  | Find a budget card with percentage >= 150%   | Badge shows "CRITICAL X%" in red with bold/extrabold styling (not "X% Used") |
| 2.2  | Find a budget card with percentage 100-149%  | Badge shows "X% Used" in red (standard exceeded badge, not CRITICAL)         |
| 2.3  | Find a budget card with percentage 80-99%    | Badge shows "X% Used" in yellow/warning color                                |
| 2.4  | Find a budget card with percentage under 80% | Badge shows "X% Used" in green/success color                                 |

### 3. Card Layout — Budget as Anchor

**Components under test:** `BudgetCard.astro`

| Step | Action                                 | Expected Result                                                                                      |
| ---- | -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 3.1  | Inspect any budget card's body section | Left column shows "BUDGET" label with the budget amount in large bold text (e.g., Rp5,000,000)       |
| 3.2  | Check the right side of the same card  | Right column shows "SPENT" label with the spent amount in smaller, muted text (text-base-content/60) |
| 3.3  | Locate the edit pencil icon            | Edit pencil icon appears next to the budget amount (left side), not the spent amount                 |
| 3.4  | Click the edit pencil on a budget card | Inline edit activates on the budget amount field (existing behavior preserved)                       |
| 3.5  | Enter a new budget value and confirm   | Budget amount updates, card refreshes with new percentage, card re-sorts to correct position         |

### 4. Triage Summary in Header

**Components under test:** `BudgetSummary.astro`, `BudgetSummaryPartial.astro`, API overview endpoint

> **Critical:** New aggregate health indicator — must count categories accurately.

| Step | Action                                             | Expected Result                                                                                                    |
| ---- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 4.1  | Look at the budget summary card (top of page)      | Shows three stats: Allocated Budget, Total Budget Spent, and Overbudget/Remaining                                  |
| 4.2  | Check "Allocated Budget" label styling             | Label is neutral color (no orange or colored label text), amount in base-content                                   |
| 4.3  | Check "Total Budget Spent" label styling           | Label is neutral color (NOT orange as before), amount color changes based on status (error if over, base if under) |
| 4.4  | Check Overbudget/Remaining label styling           | Label is neutral color, only the amount value itself is colored (error red or success green)                       |
| 4.5  | Find the triage strip below the three stats        | Shows text like "8 of 15 over budget · 3 critical" with red accent on the counts                                   |
| 4.6  | Count budget cards with exceeded status manually   | The "over budget" count in the triage strip matches the actual number of exceeded cards                            |
| 4.7  | Count cards with 150%+ manually                    | The "critical" count in the triage strip matches the number of cards showing CRITICAL badge                        |
| 4.8  | Check triage strip when all categories are healthy | Navigate to a month with no overbudget categories — strip shows "All categories within budget" in green            |

### 5. Overbudget Filter Toggle

**Components under test:** `BudgetPage.client.ts`, triage strip button

| Step | Action                                              | Expected Result                                                                               |
| ---- | --------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 5.1  | Click "Show overbudget only" button in triage strip | Only budget cards with "exceeded" status remain visible; healthy and warning cards are hidden |
| 5.2  | Check button text after clicking                    | Button text changes to "Show all categories"                                                  |
| 5.3  | Verify the visible card count                       | Number of visible cards matches the "X of Y over budget" count from the triage strip          |
| 5.4  | Click "Show all categories"                         | All budget cards become visible again, button text reverts to "Show overbudget only"          |
| 5.5  | Activate filter, then type in search input          | Both filters work together — search narrows within the overbudget-only set                    |
| 5.6  | Change sort dropdown while filter is active         | Cards re-sort within the filtered set (only exceeded cards reorder)                           |

### 6. Sort Dropdown Options

**Components under test:** `BudgetFilterControls.astro`, `BudgetPage.client.ts`

| Step | Action                                          | Expected Result                                                              |
| ---- | ----------------------------------------------- | ---------------------------------------------------------------------------- |
| 6.1  | Open the sort dropdown                          | Shows 5 options: "% Used ↓", "Budget ↓", "Spent ↓", "Title A-Z", "Title Z-A" |
| 6.2  | Select "Budget ↓"                               | Cards re-sort with highest budget amount first                               |
| 6.3  | Select "Spent ↓"                                | Cards re-sort with highest spent amount first                                |
| 6.4  | Select "Title A-Z"                              | Cards re-sort alphabetically by category name                                |
| 6.5  | Select "% Used ↓"                               | Cards return to severity/triage order (highest percentage first)             |
| 6.6  | Change sort, then navigate to a different month | Sort resets to "% Used ↓" default after page content refreshes               |

### 7. Toolbar Grouping

**Components under test:** `BudgetActions.astro`, `ActionBar.astro`

| Step | Action                                                         | Expected Result                                                                                                  |
| ---- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 7.1  | Look at the action bar on desktop                              | Left side: [Categories] [Import] [Export] [Copy], then a vertical divider line, then [+ New Budget] on the right |
| 7.2  | Verify "Initialize All" is hidden                              | When all categories have budgets, "Initialize All" button does not appear at all (no disabled/greyed out state)  |
| 7.3  | Delete a budget category so there are uninitialized categories | "Initialize All" button appears in the toolbar                                                                   |
| 7.4  | Check mobile viewport (375px)                                  | Action bar is horizontally scrollable, New Budget appears first (order-first), divider is not visible on mobile  |
| 7.5  | Click "New Budget"                                             | Set New Budget modal opens (existing behavior preserved)                                                         |
| 7.6  | Click "Categories"                                             | Navigates to `/budget/categories` page (existing behavior preserved)                                             |
| 7.7  | Click "Import"                                                 | Import modal opens (existing behavior preserved)                                                                 |
| 7.8  | Click "Export"                                                 | CSV downloads (existing behavior preserved)                                                                      |

### 8. Prev/Next Navigation in Drilldown Modal

**Components under test:** `CategoryDrillDownModal.astro`, `BudgetPage.client.ts`

> **Critical:** New navigation pattern — must not break existing modal behavior.

| Step | Action                                                              | Expected Result                                                                                                  |
| ---- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 8.1  | Click "Details" on the first budget card                            | Drilldown modal opens showing category transactions with loading spinner then content                            |
| 8.2  | Check bottom of modal content                                       | Prev/Next navigation bar visible: "← Prev" (hidden/invisible for first item), "1 / N" counter, "Next →" button   |
| 8.3  | Click "Next →"                                                      | Modal content refreshes with next category's transactions (loading spinner, then content); counter shows "2 / N" |
| 8.4  | Click "Next →" again                                                | Third category loads; "← Prev" button is now visible                                                             |
| 8.5  | Click "← Prev"                                                      | Previous category loads; counter decrements                                                                      |
| 8.6  | Navigate to the last category via Next                              | "Next →" button becomes hidden/invisible; "← Prev" remains visible                                               |
| 8.7  | Press right arrow key on keyboard                                   | Nothing happens (already at last item)                                                                           |
| 8.8  | Press left arrow key on keyboard                                    | Previous category loads (keyboard navigation works)                                                              |
| 8.9  | Close modal, change sort to "Title A-Z", open Details on first card | Modal shows alphabetically first category; Next → goes to alphabetically second category                         |
| 8.10 | Activate "Show overbudget only" filter, then open Details           | Modal only navigates between exceeded categories; "1 / N" counter reflects filtered count                        |
| 8.11 | Close and reopen the modal                                          | Modal opens fresh with loading state (no stale content from previous category)                                   |

### 9. Responsive Behavior

**Components under test:** All modified components

| Step | Action                                     | Expected Result                                                                               |
| ---- | ------------------------------------------ | --------------------------------------------------------------------------------------------- |
| 9.1  | View budget page at 375px width (mobile)   | Cards display in single column, budget summary collapses allocations, triage strip is visible |
| 9.2  | View budget page at 768px width (tablet)   | Cards display in 2-column grid                                                                |
| 9.3  | View budget page at 1280px width (desktop) | Cards display in 3-column grid, summary allocations auto-expand, toolbar shows divider        |
| 9.4  | Open drilldown modal on mobile             | Prev/Next buttons are tap-friendly (44px min touch target), modal is scrollable               |

### 10. Data Consistency After Interactions

**Components under test:** Inline edit, sort, filter interactions

| Step | Action                                             | Expected Result                                                                              |
| ---- | -------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 10.1 | Inline-edit a budget to change its percentage tier | Card badge updates (e.g., "72% Used" → "CRITICAL 200%"), card moves to correct sort position |
| 10.2 | After editing, check triage strip counts           | Over budget count and critical count update to reflect the change                            |
| 10.3 | Create a new budget via "New Budget" modal         | New card appears in grid at correct sort position, triage counts update                      |
| 10.4 | Navigate to different month and back               | All state resets correctly — default sort, no filter active, fresh triage counts             |

---

## Summary Checklist

| #   | Area              | Key Assertion                                                           | Result  |
| --- | ----------------- | ----------------------------------------------------------------------- | ------- |
| 1   | Default Sort      | Cards sorted by % used descending on page load                          | PASS    |
| 2   | CRITICAL Badge    | 150%+ categories show "CRITICAL X%" in red bold                         | PASS    |
| 3   | Card Layout       | Budget amount is left/prominent, Spent is right/muted                   | PASS    |
| 4   | Triage Summary    | "X of Y over budget · Z critical" matches actual card counts            | PASS    |
| 5   | Overbudget Filter | Toggle shows only exceeded cards, button text updates                   | PASS    |
| 6   | Sort Dropdown     | "% Used ↓" is default, all 5 sort options work                          | PASS    |
| 7   | Toolbar Grouping  | Visual divider before New Budget, Initialize All hidden when 0          | PASS    |
| 8   | Modal Prev/Next   | Navigate between categories, keyboard arrows work, counter updates      | PASS    |
| 9   | Responsive        | Mobile single column, tablet 2-col, desktop 3-col with expanded summary | PARTIAL |
| 10  | Data Consistency  | Inline edit updates badge/sort/triage counts correctly                  | PARTIAL |

**Critical paths:** Steps 1 (sort), 2 (CRITICAL badge), 4 (triage counts), and 8 (modal navigation) are highest priority.

## Automated Test Coverage

| Suite                        | Tests | File                                                         |
| ---------------------------- | ----- | ------------------------------------------------------------ |
| BudgetCard utility tests     | 17+   | `src/components/organisms/BudgetCard.test.ts`                |
| BudgetCardGrid sorting tests | 15+   | `src/components/organisms/BudgetCardGrid.test.ts`            |
| BudgetSummary utility tests  | 10+   | `src/components/organisms/BudgetSummary.test.ts`             |
| BudgetActions config tests   | 4     | `src/components/molecules/BudgetActions.test.ts`             |
| getBudgetStatus (isCritical) | 5     | `src/components/organisms/BudgetCard.test.ts` (new tests)    |
| Triage count computation     | 3     | `src/components/organisms/BudgetSummary.test.ts` (new tests) |

Full suite: Run `bun test src/components/organisms/Budget*.test.ts src/components/molecules/Budget*.test.ts`
