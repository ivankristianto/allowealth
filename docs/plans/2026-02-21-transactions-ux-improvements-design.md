# Transactions UX Improvements Design

**Issue:** [#254 - Transactions: ambiguous toolbar, unclear tab state, and dangerous delete affordance](https://github.com/ivankristianto/allowealth/issues/254)
**Date:** 2026-02-21

## Scope

Three UX fixes for the transactions page, validated against the live page:

1. **Desktop row actions → kebab menu** (issue #4 from the report)
2. **Toolbar visual separator** (issue #1)
3. **History icon tooltip copy** (issue #3)

Issues #2 (tab active state) and #5 (income in red) were verified as non-issues — the tab already has a white pill + shadow active state, and income correctly renders green.

## Fix 1: Desktop Kebab Menu for Row Actions

**Problem:** Three action icons (history, edit, delete) are always visible on every desktop row. The red trash icon creates accidental-delete risk and visual clutter.

**Solution:** Replace the 3 inline icons with a single `...` kebab menu button on desktop, reusing the dropdown pattern already used in the mobile layout.

**Before:**

```
[date] [icon+desc] [account] [amount] [🕐] [✏️] [🗑️]
```

**After:**

```
[date] [icon+desc] [account] [amount] [⋯]
                                       ├── View edit history (conditional)
                                       ├── Edit
                                       └── Delete (text-error)
```

**File:** `src/components/molecules/TransactionCard.astro` — desktop layout (lines ~329-375)

**Details:**

- Single `btn btn-ghost btn-sm btn-square` button with `EllipsisVertical` icon
- DaisyUI dropdown menu (`dropdown dropdown-end`) with menu items
- History item only shown when `hasHistory` is true
- Delete item styled with `text-error` and opens existing confirmation modal
- All `data-*` attributes preserved for client-side event delegation
- Keyboard accessible: button is always focusable, menu opens on click/Enter

**Not changed:** Mobile layout — already uses this pattern via the `...` dropdown.

## Fix 2: Toolbar Visual Separator

**Problem:** Import/Export/Scan and Expense/Income buttons share the same container with no visual grouping on desktop.

**Solution:** Add a vertical divider between secondary actions (left) and primary entry shortcuts (right) on desktop.

**Before:**

```
[Import] [Export] [Scan Receipt]                    [⊖ Expense] [⊕ Income]
```

**After:**

```
[Import] [Export] [Scan Receipt]  |  [⊖ Expense] [⊕ Income]
```

**File:** `src/components/molecules/ActionBar.astro` — before the primary slot (line ~58)

**Details:**

- Divider element: `hidden md:block border-l border-base-300 h-6 self-center`
- Only visible on desktop (`hidden md:block`)
- Mobile unchanged — Expense/Income already render first via `order-first`

## Fix 3: History Icon Tooltip Copy

**Problem:** Tooltip says "History" / "No history" — vague.

**Solution:** Update to "View edit history" / "No edit history" for clarity.

**File:** `src/components/molecules/TransactionCard.astro` — line ~332 (desktop) and mobile equivalent

**Details:**

- Desktop tooltip: `data-tip={hasHistory ? 'View edit history' : 'No edit history'}`
- Mobile menu item text: "View edit history" (if present)
- `aria-label` updated to match

## Out of Scope

- Issue #2 (tab active state): Already implemented with `bg-base-100 shadow text-primary` pill style
- Issue #5 (income in red on Expenses tab): Could not reproduce; `variant={isExpense ? 'negative' : 'positive'}` logic is correct
