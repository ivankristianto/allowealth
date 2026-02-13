# Mobile Transactions View Design

**Date:** 2026-02-13
**Baseline device:** iPhone 12 Pro (390x844)
**Scope:** Mobile view for `/transactions` page, extended to tablet where applicable

## 1. Header.astro — Subtitle + Slot + Disable Notifications

**File:** `src/components/layouts/Header.astro`

**Changes:**

- Disable `NotificationDropdown` — comment out with `<!-- TODO: Re-enable when notification system is implemented -->`
- Remove the `NotificationDropdown` import (comment it out)
- Show subtitle on mobile too — remove `hidden sm:block` gate, show on all viewports
- The subtitle will display the current month/year (passed from each page)
- Add `<slot name="header-extras" />` for page-specific header content (e.g., PeriodNavigator)

**Header mobile layout:**

```
[Menu] Transactions         [ThemeToggle]
       January 2025
```

**Props:** No changes needed — subtitle already exists as optional prop.

## 2. MainLayout.astro + ProtectedLayout.astro — Slot Passthrough

**Files:**

- `src/layouts/MainLayout.astro`
- `src/layouts/ProtectedLayout.astro`

**Changes:**

- MainLayout: Accept and pass a named slot `header-extras` to Header
- Header: Render `<slot name="header-extras" />` in the right-side area (desktop) and below the header bar (mobile)
- ProtectedLayout: Pass through the `header-extras` slot to MainLayout

**Mechanism:** Astro named slots propagate through layout chains. Pages use:

```astro
<ProtectedLayout title="Transactions" ...>
  <PeriodNavigator slot="header-extras" ... />
  <div>...page content...</div>
</ProtectedLayout>
```

**Mobile rendering:** The header-extras slot content renders as a separate row below the fixed header, with the same glass-effect background. This means the header has two rows on mobile when extras are present.

**Desktop rendering:** The header-extras slot content renders inline in the right-side controls area, beside CurrencySelector.

## 3. TransactionSummaryCards.astro — Compact Vertical Mobile Layout

**File:** `src/components/organisms/TransactionSummaryCards.astro`

**Changes:**

- Mobile (`< md`): Vertical stack of 3 compact single-row cards
- Each card: small icon (left) + label (middle) + bold value (right, color-coded)
- Remove period label subtitle from all cards (month info is now in header)
- Keep existing color coding: income=success, expenses=error, net=dynamic
- Desktop (`md+`): Keep existing 3-column grid with full StatCard components

**Mobile card layout:**

```
┌─ 📈 Monthly Income      Rp 9.750.000 ─┐  (text-success)
├─ 📉 Monthly Expenses    Rp 5.200.000 ─┤  (text-error)
└─ 💰 Net Savings         Rp 4.550.000 ─┘  (text-success/text-error)
```

Each compact card: ~48px height, rounded-xl, border, small icon (20px), text-xs label, text-sm bold value.

**Desktop:** Unchanged — 3 full StatCards in a grid.

## 4. TransactionActionsBar.astro — Edge Bleed + Horizontal Scroll + Reorder

**File:** `src/components/molecules/TransactionActionsBar.astro`
**File:** `src/components/molecules/ActionBar.astro`

**Changes:**

- Mobile: Remove card border/rounded — bleed to edges with negative margins (`-mx-4`) or remove container padding
- Horizontal scrollable when items overflow (`overflow-x-auto`, `flex-nowrap`)
- Reorder: Expense/Income buttons FIRST (left), then Scan, Import, Export
- Hide scrollbar visually but keep scroll functionality
- Desktop: Keep existing layout

**Mobile layout (scrollable):**

```
[Expense] [Income] [Scan] [Import] [Export]  →
```

## 5. TransactionFiltersBar.astro — New Layout + Remove PeriodNavigator

**File:** `src/components/organisms/TransactionFiltersBar.astro`

**Changes:**

- Remove PeriodNavigator from this component entirely
- Remove `monthSelector`, `availableMonths`, `selectedMonth`, `currentMonth` props
- Remove PeriodNavigator import and related logic
- New mobile layout:
  - Row 1: Search input (full width)
  - Row 2: Expense|Income toggle + All Categories dropdown (side by side)

```
┌─────────────────────────────────┐
│ 🔍 Search...                    │
├──────────────┬──────────────────┤
│ Expenses|Income │ All Categories ▼│
└──────────────┴──────────────────┘
```

- Keep Reset button behavior (shown when filters are active)
- Desktop: Similar layout, can be single row

## 6. PeriodNavigator Relocation to Header

**Files:**

- `src/pages/transactions/index.astro` — inject PeriodNavigator via header-extras slot
- `src/components/molecules/PeriodNavigator.astro` — no structural changes needed

**Transaction page usage:**

```astro
<ProtectedLayout title="Transactions" subtitle={formatMonthKey(effectiveMonth)} ...>
  <PeriodNavigator slot="header-extras" options={periodOptions} selected={selectedMonth} ... />
  <div id="transactions-page">...</div>
</ProtectedLayout>
```

**Mobile:** PeriodNavigator appears below the header title row as a full-width bar.
**Desktop:** PeriodNavigator appears inline in header right side, beside CurrencySelector.

**Subtitle:** The header subtitle shows the current month/year (e.g., "January 2025") derived from the effective month selection. This provides context even when PeriodNavigator is in a separate row.

## 7. Transaction Page Integration

**File:** `src/pages/transactions/index.astro`

**Changes:**

- Pass `subtitle={formatMonthKey(effectiveMonth)}` to ProtectedLayout
- Inject PeriodNavigator via `slot="header-extras"` instead of passing month data to TransactionFiltersBar
- Remove month-related props from TransactionFiltersBar usage
- Keep all other page logic unchanged

## Decisions

- **Notification dropdown:** Disabled (not deleted) with TODO comment for future development
- **Summary cards mobile:** Vertical compact with icon + label + value, color-coded
- **ActionBar reorder:** Expense/Income first on mobile (higher priority actions)
- **PeriodNavigator:** Lives in header via slot, not in filter bar
- **Subtitle:** Shows formatted month on all viewports (not hidden on mobile)
- **Implementation:** Use subagent-driven development for parallel task execution
