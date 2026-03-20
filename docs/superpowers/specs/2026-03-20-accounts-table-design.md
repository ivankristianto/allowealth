# Accounts Table Layout Design

**Ticket:** ALL-57
**Status:** Approved
**Date:** 2026-03-20

## Problem

The accounts page uses collapsible accordion groups (Liquid, Non-Liquid, Debt). Users must click each group to see their accounts. This slows scanning and makes cross-group comparison impossible.

## Solution

Replace the accordion layout with an inline-grouped table that shows all accounts at a glance, grouped by account class with colored separator rows.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Table structure | Inline group headers (option B) | Single scrollable table preserves grouping while eliminating clicks |
| Group order | Liquid → Debt → Non-Liquid | Liquid assets come first (daily use), debt second (awareness), non-liquid last (long-term, grows over time) |
| Allocation percentages | Per-currency basket | Respects ADR 012 (no cross-currency conversion); percentages calculated only for the selected currency |
| Currency visibility | All accounts visible regardless of currency | Non-matching currency rows appear dimmed (reduced opacity) but remain in the table |
| Number formatting | Full values always | `54,700,000` not `54.7M` — no compaction |
| Sorting | Clickable column headers | Standard table UX; sorting operates within groups |
| Filtering | Existing ActionFilterBar | Text search, type, category, currency, owner filters remain unchanged |
| View toggle | Card ↔ Table (follows budget page pattern) | Persists preference to localStorage; existing card view preserved |
| Mobile | Stacked card layout | Table collapses to mini-cards on mobile; group headers remain |

## Table Structure

### Desktop

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🔍 Search   │ Type ▾ │ Category ▾ │ Currency ▾ │ Owner ▾ │  ☐ Cards │ ☰ Table │
├─────────────────────────────────────────────────────────────────────────────┤
│ Account ↕  │ Type ↕  │ Category ↕ │ Owner ↕ │ Balance ↕ │ Updated ↕ │ Actions │
├─────────────────────────────────────────────────────────────────────────────┤
│ ▓▓▓ Liquid · Cash & equivalents · 3 accounts · IDR 54,700,000 + $2,000    │
│                                                         42% of IDR ✓      │
├─────────────────────────────────────────────────────────────────────────────┤
│   BCA Checking    │ Bank Account │ Savings │ Ivan │ IDR 45,200,000 │ Mar 18 │
│   GoPay           │ E-Wallet     │ Daily   │ Ivan │ IDR 1,500,000  │ Mar 15 │
│   Wise USD (dim)  │ Bank Account │ Savings │ Ivan │ $2,000         │ Mar 10 │
├─────────────────────────────────────────────────────────────────────────────┤
│ ▓▓▓ Debt · Liabilities & loans · 1 account · IDR -3,200,000               │
│                                                          2% of IDR ✓      │
├─────────────────────────────────────────────────────────────────────────────┤
│   BCA Credit Card │ Credit Card  │ —       │ Ivan │ IDR -3,200,000 │ Mar 19 │
├─────────────────────────────────────────────────────────────────────────────┤
│ ▓▓▓ Non-Liquid · Investments & holdings · 3 accounts · IDR 82,300,000     │
│                                                    + $12,400 · 56% of IDR │
├─────────────────────────────────────────────────────────────────────────────┤
│   Bibit MF        │ Mutual Fund  │ Invest  │ Ivan │ IDR 82,300,000 │ Mar 17 │
│   Stockbit        │ Stock        │ Invest  │ Ivan │ IDR 25,000,000 │ Mar 12 │
│   IB (dim)        │ Stock        │ Invest  │ Ivan │ $12,400        │ Mar 14 │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Mobile (Stacked Cards)

Each account row collapses to a mini-card:

```
┌──────────────────────────────┐
│ Liquid           42% of IDR ✓│
│ 3 accts · IDR 54,700,000    │
├──────────────────────────────┤
│ BCA Checking              ⋯ │
│ Bank Account · Savings · Ivan│
│ IDR 45,200,000       Mar 18 │
├──────────────────────────────┤
│ GoPay                     ⋯ │
│ E-Wallet · Daily · Ivan     │
│ IDR 1,500,000        Mar 15 │
├──────────────────────────────┤
│ (dimmed) Wise USD         ⋯ │
│ Bank Account · Savings · Ivan│
│ $2,000               Mar 10 │
├──────────────────────────────┤
│ Debt              2% of IDR ✓│
│ 1 acct · IDR -3,200,000     │
├──────────────────────────────┤
│ ...                          │
└──────────────────────────────┘
```

## Group Header Row

Each group header spans the full table width and contains:

- **Left side:** Class name (bold, color-coded) + subtitle + account count badge
- **Right side:** Subtotals per currency + allocation percentage badge

### Allocation Percentage

Calculated per currency basket for the selected workspace currency:

- **Formula:** `(sum of group balances in selected currency) / (total of all non-debt balances in selected currency)` for liquid and non-liquid; `abs(debt) / (total non-debt)` for debt
- **Targets:** Liquid ≥ 30%, Debt ≤ 10%, Non-Liquid = grow
- **Visual indicators:** ✓ when within target range; the badge uses the group's color scheme

Accounts in a non-selected currency still appear in the table (visible, not hidden) but render at reduced opacity and do not contribute to the percentage calculation.

### Color Scheme

Each group has a background gradient and matching text colors:

| Group | Background | Text | Badge BG | Badge Text |
|-------|-----------|------|----------|------------|
| Liquid | `#1e3a2f → #1a2e28` | `#b7e4c7` | `#2d6a4f` | `#b7e4c7` |
| Debt | `#2d1a22 → #251520` | `#f4a5b5` | `#6b2737` | `#f4a5b5` |
| Non-Liquid | `#1a2d40 → #162538` | `#a9d6e5` | `#1b4965` | `#a9d6e5` |

These match the existing `AccountGroupCard` color coding.

## Columns

| Column | Alignment | Sortable | Notes |
|--------|-----------|----------|-------|
| Account | Left | Yes | Name, indented under group header |
| Type | Left | Yes | Account type label (Bank Account, Stock, etc.) |
| Category | Left | Yes | Category name or `—` if none |
| Owner | Left | Yes | User display name |
| Balance | Right | Yes | Full formatted value with currency prefix; tabular-nums; debt in red |
| Updated | Left | Yes | Short date (e.g., "Mar 18") |
| Actions | Center | No | Update balance, edit, more (ellipsis dropdown) |

### Sorting Behavior

- Click a column header to sort ascending; click again to toggle descending
- Sorting operates within each group (accounts stay under their group header)
- Default sort: by balance descending within each group
- Visual indicator: ↑/↓ arrow on the active sort column

## View Toggle

Follows the existing budget page pattern (`BudgetFilterControls`):

- Two toggle buttons in the filter bar: Cards (grid icon) and Table (list icon)
- `aria-pressed` for accessibility
- Preference persisted to `localStorage` key `accounts-view-mode`
- Both views rendered server-side; toggle shows/hides with `hidden` class

## Existing Card View

The current card view (`AccountGroupCard` + `AccountItemRow`) remains unchanged. The table view is an addition, not a replacement. Users choose their preferred view.

## Components

### New

- **`AccountTable.astro`** — The table component with group headers, account rows, and sorting
- **`AccountTableRow.astro`** — Individual account row within the table (mirrors AccountItemRow data)
- **`AccountFilterControls.astro`** — Filter bar with view toggle (extends existing ActionFilterBar pattern)

### Modified

- **`src/pages/accounts/index.astro`** — Add table view alongside existing card view; add view toggle

### Unchanged

- `AccountGroupCard.astro` — Existing card view stays
- `AccountItemRow.astro` — Existing card rows stay
- `ActionFilterBar` — Existing filter logic stays
- Account service, types, utilities — No backend changes

## Client-Side Behavior

### View Toggle Script (`accounts-table.client.ts`)

- Toggle between card and table views
- Persist preference to `localStorage`
- Initialize from stored preference on page load

### Column Sorting Script (same file or separate)

- Click handler on sortable `<th>` elements
- Sort rows within each group (DOM reorder, no server roundtrip)
- Track sort state via `data-sort-column` and `data-sort-direction` attributes
- Use `data-sort-value` attributes on `<td>` for numeric/date sorting

## Out of Scope

- Account CRUD operations (add/edit/delete flows unchanged)
- Portfolio summary and reconciliation cards (remain as-is)
- Backend API changes
- Cross-currency conversion or exchange rate infrastructure
- Allocation target configuration UI (targets are display-only for now)
