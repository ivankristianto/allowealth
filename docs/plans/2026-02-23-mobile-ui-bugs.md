# Mobile UI Bug Report — iPhone 12 Pro (390×844)

**Date:** 2026-02-23
**Tester:** QA Agent (automated, Playwright + manual code analysis)
**Device Emulation:** iPhone 12 Pro — 390×844 px, 3× DPI
**Branch:** `main` (v0.16.0)
**URL:** http://main.expenses.local:4321

---

## Executive Summary

6 confirmed UI bugs found across Dashboard, Budget, Accounts, and Navigation. One is **critical** (Settings unreachable on mobile). Two are **high severity** (broken metric display, hidden primary action). Three are **medium/low**.

---

## Bug Inventory

| #   | Severity    | Page      | Component                                 | Description                                                      |
| --- | ----------- | --------- | ----------------------------------------- | ---------------------------------------------------------------- |
| 1   | 🔴 CRITICAL | All pages | `Navigation.astro`                        | Hamburger nav: Settings & Calculators hidden behind user card    |
| 2   | 🟠 HIGH     | Dashboard | `SpendingCard.astro`                      | Amount + budget label breaks across 2 lines — "/" orphaned       |
| 3   | 🟠 HIGH     | Budget    | `BudgetActions.astro` + `ActionBar.astro` | "Copy Budget" button invisible — scrollbar-hide hides affordance |
| 4   | 🟡 MEDIUM   | Accounts  | `AccountActions.astro`                    | "Transfer" button clipped to "Trans" with no scroll affordance   |
| 5   | 🟡 MEDIUM   | Forecast  | `ProtectedLayout.astro` / forecast page   | Header subtitle wraps to 2 lines                                 |
| 6   | 🟢 LOW      | All pages | `Navigation.astro`                        | Bottom nav bar renders behind open hamburger drawer              |

---

## Detailed Findings

---

### BUG-1 🔴 CRITICAL — Hamburger nav: Settings & Calculators unreachable on mobile

**Screenshot:** `detail-02-hamburger-nav-open.png`

**What happens:**
When the hamburger menu is opened, the sidebar drawer shows 8 nav items (Dashboard → Settings). On a 390×844 screen, only 5 full items are visible (Dashboard, Transactions, Budget, Accounts, Reports). "Forecast" is partially visible at the bottom. "Calculators" and "Settings" are completely hidden behind the `UserProfile` card that's pinned at the bottom of the drawer.

```
Drawer layout (mobile, 844px total height):
─────────────────────────────
  Logo + ✕ close       ~80px
  v0.16.0 version      ~30px
  Dashboard            ~58px  ← visible
  Transactions         ~58px  ← visible
  Budget               ~58px  ← visible
  Accounts             ~58px  ← visible
  Reports              ~58px  ← visible
  Forecast             ~20px  ← PARTIALLY visible (cropped)
  [Calculators]             ← HIDDEN (under UserProfile)
  [Settings]                ← HIDDEN (under UserProfile)
─────────────────────────────
  UserProfile card     ~80px  ← pinned at bottom
  Bottom navigation    ~70px  ← persistent bottom bar
─────────────────────────────
```

**Why it's critical:**
Settings and Calculators are **not in the bottom navigation bar**. The hamburger menu is the _only_ path to reach them on mobile. Users cannot access Settings (profile, password, notifications, workspace) at all on mobile.

**Root cause — `Navigation.astro`:**
The `<aside>` has `pb-20 lg:pb-0` (80px bottom padding for the mobile bottom bar). The `<ul>` menu uses `flex-1 overflow-y-auto`, which should scroll — but the computed height of the `<ul>` is insufficient because the padding + UserProfile card consume too much space, leaving the `<ul>` with only ~550px of scroll room for items that total ~464px (8 items × 58px) — but the items are `shrink-0` so they don't compress, and the scroll region doesn't extend past where Forecast is partially visible.

**Fix options:**

Option A — Make nav list independently scrollable with explicit max-height:

```diff
- class="menu w-full flex-1 px-4 space-y-2 overflow-y-auto flex flex-col flex-nowrap ..."
+ class="menu w-full flex-1 px-4 space-y-2 overflow-y-auto flex flex-col flex-nowrap min-h-0 ..."
```

Adding `min-h-0` to a `flex-1` child forces it to respect overflow scrolling within a flex column.

Option B — Reduce nav item height on mobile:

```diff
- class="... py-4 px-5 ..."
+ class="... py-3 px-5 lg:py-4 ..."
```

Reduces each item from ~58px to ~50px → saves 64px across 8 items, enough to reveal all items.

Option C — Reduce the `pb-20` bottom padding:
The `pb-20` on `<aside>` was likely added to compensate for the bottom tab bar, but the bottom tab bar is **outside** the drawer and positioned fixed — the aside doesn't need padding for it.

```diff
- class="... pb-20 lg:pb-0"
+ class="... lg:pb-0"
```

**Recommended:** Apply Option A (`min-h-0`) + Option C (remove `pb-20`) together.

---

### BUG-2 🟠 HIGH — Dashboard: SpendingCard amount wraps — "/" stranded at line end

**Screenshot:** `detail-01-dashboard-spending-card.png`

**What happens:**
On the dashboard spending summary card, the expense amount displays as:

```
Rp84.492.275,29 /
Rp55M
```

The "/" character is stranded at the end of line 1. The budget limit "Rp55M" wraps to line 2. The intended display is `Rp84.492.275,29 / Rp55M` as a single inline expression.

**Root cause — `SpendingCard.astro` lines ~136-143:**

```html
<h3 class="text-2xl @sm:text-3xl font-bold mt-1.5 tracking-tight leading-none">
  {spentFormatted}
  <span class="text-sm @sm:text-base text-base-content/60 ..."> / {budgetFormatted} </span>
</h3>
```

The `<h3>` content is inline, so the browser wraps at the space before `/`. The card icon to the left (~50px) reduces the effective text width to ~290px. At `text-2xl` (24px bold), `Rp84.492.275,29` occupies ~240px, leaving only ~50px — not enough for `/ Rp55M` (~60px at `text-sm`), so it wraps.

**Fix — `SpendingCard.astro`:**

```diff
- <h3 class="text-2xl @sm:text-3xl font-bold mt-1.5 tracking-tight leading-none">
-   {spentFormatted}
-   <span class="text-sm @sm:text-base text-base-content/60 font-medium tracking-normal">
-     / {budgetFormatted}
-   </span>
- </h3>
+ <div class="flex items-baseline gap-1.5 flex-wrap mt-1.5">
+   <span class="text-2xl @sm:text-3xl font-bold tracking-tight leading-none">{spentFormatted}</span>
+   <span class="text-sm @sm:text-base text-base-content/60 font-medium tracking-normal whitespace-nowrap">/ {budgetFormatted}</span>
+ </div>
```

`whitespace-nowrap` on the budget label prevents it from being split across lines. `flex-wrap` allows the whole expression to wrap as a unit only when necessary.

---

### BUG-3 🟠 HIGH — Budget page: "Copy Budget" button invisible (no scroll affordance)

**Screenshot:** `detail-04-budget-action-bar.png`, `03-budget-scroll500.png`

**What happens:**
The Budget action bar shows `+ New`, `Categories`, `Import`, `Export`, and then a partial "C" at the right edge. The "Copy Budget" button (and potentially "Initialize All") are cut off and not visible. Users have no indication the bar is scrollable because `scrollbar-hide` removes the scrollbar entirely.

**Root cause — `ActionBar.astro` + `budget-actions.config.ts`:**

```ts
// budget-actions.config.ts
export const BUDGET_ACTIONS_MOBILE_SCROLL_CLASS = 'overflow-x-auto overflow-y-hidden';
```

```html
<!-- ActionBar.astro -->
class="... flex-nowrap overflow-x-auto overflow-y-hidden scrollbar-hide"
```

`scrollbar-hide` is intentional to avoid visual noise, but with no other scroll indicator, users miss the hidden content.

**Fix options:**

Option A — Add a scroll fade-edge gradient to indicate more content:

```html
<!-- Wrap ActionBar in a position:relative container and add a right-fade -->
<div class="relative">
  <ActionBar ...>...</ActionBar>
  <div
    class="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-base-100 pointer-events-none"
    id="action-bar-fade"
    aria-hidden="true"
  ></div>
</div>
```

Option B — Show the scrollbar on mobile (remove `scrollbar-hide`):

```diff
- 'overflow-x-auto overflow-y-hidden md:overflow-visible scrollbar-hide'
+ 'overflow-x-auto overflow-y-hidden md:overflow-visible'
```

Option C — Restructure budget actions: show only the 4 most-used items on mobile, put secondary actions (Copy, Initialize All) in a `···` overflow menu button.

**Recommended:** Option C provides the cleanest mobile UX. Option A is a quick win.

---

### BUG-4 🟡 MEDIUM — Accounts page: "Transfer" button clipped to "Trans"

**Screenshot:** `detail-05-accounts-tabs.png`

**What happens:**
The Accounts action bar shows `+ New`, `All`, `Mine`, `Categories`, then `Trans` (truncated, "Transfer" is cut off). Same `scrollbar-hide` issue as BUG-3.

**Root cause — `AccountActions.astro`:**
Same `ActionBar` with `scrollbar-hide`. The "Transfer" button label `<span class="text-xs md:text-sm">Transfer</span>` is wide enough to overflow the visible area.

**Fix:**
Same as BUG-3 — either fade-edge gradient or restructure. Additionally, consider showing just the icon for "Transfer" on mobile (`text-xs md:text-sm` → icon-only with `sr-only` label) since `ArrowRightLeft` is a universally understood transfer icon.

```diff
- <span class="text-xs md:text-sm">Transfer</span>
+ <span class="sr-only">Transfer</span>  <!-- icon-only on mobile, label on desktop -->
+ <span class="hidden md:inline">Transfer</span>
```

---

### BUG-5 🟡 MEDIUM — Forecast: Page header subtitle wraps to 2 lines

**Screenshot:** `detail-07-forecast-header.png`

**What happens:**
The header area shows:

```
≡  Forecast                IDR  🌙
   Based on your spending
   patterns
```

The subtitle "Based on your spending patterns" wraps to 2 lines because it's too long for the available horizontal space (390px − hamburger button − IDR/theme buttons ≈ ~200px for subtitle text).

**Root cause:**
The subtitle `slot` in `ProtectedLayout` renders as a `<p>` below the page title. On mobile, the header is a horizontal flex row with the title area on the left and controls (IDR switcher, theme toggle) on the right. The subtitle text is 32 characters and doesn't truncate.

**Specific to Forecast** — the subtitle is defined in `/src/pages/forecast/index.astro`:

```astro
<ProtectedLayout title="Forecast" subtitle="Based on your spending patterns" />
```

**Fix options:**

Option A — Shorten the subtitle for mobile:

```diff
- subtitle="Based on your spending patterns"
+ subtitle="Spending forecast"
```

Option B — Truncate subtitle at 1 line:
In the layout, add `truncate` to the subtitle element:

```html
<p class="text-sm text-base-content/60 truncate">...</p>
```

Option C — Hide subtitle on mobile (`hidden sm:block`).

**Recommended:** Option A (shorter subtitle). "Spending forecast" is concise and meaningful at all sizes.

---

### BUG-6 🟢 LOW — Bottom nav bar visible behind open hamburger drawer

**Screenshot:** `detail-02-hamburger-nav-open.png`

**What happens:**
When the hamburger nav drawer is open, the bottom navigation bar (Transactions, Accounts, FAB, Budgets, Reports) remains fully visible and interactive at the bottom of the screen, below the drawer content. The drawer does not cover or suppress the bottom nav.

**Impact:** Low — the bottom nav bar links are still valid navigation targets. However, it looks visually unpolished: the bottom nav shows **while the side nav is open**, creating two simultaneous navigation surfaces. Users can accidentally tap bottom nav items while intending to tap sidebar items.

**Fix:**
Add a DaisyUI drawer-open state class to hide the bottom nav when the drawer is open:

```css
/* When drawer is open, hide bottom nav */
#drawer-toggle:checked ~ .drawer-side ~ * .btm-nav {
  display: none;
}
```

Or in the Astro/JS layer, toggle a `data-drawer-open` attribute and use CSS:

```css
[data-drawer-open='true'] .mobile-bottom-nav {
  visibility: hidden;
}
```

---

## Lower-Severity Observations (not bugs, worth tracking)

| #   | Page                  | Observation                                                                                                                                                        |
| --- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A   | Budget                | `BudgetTable.astro` has `overflow-x-auto` correctly — 6-column table scrolls horizontally. The scroll hint is subtle; consider adding a `···` or chevron indicator |
| B   | Transactions          | Income/Expense summary cards (`Rp92.433.617,29`) display correctly without overflow at 390px                                                                       |
| C   | Reports               | "Overview > Member Spending" breadcrumb renders correctly on mobile                                                                                                |
| D   | Budget category modal | Modal opens full-screen with no visible close button in first viewport. Confirm DaisyUI modal has accessible close affordance above the fold                       |
| E   | Settings              | `Manage your preferences` subtitle in header is short enough to display correctly                                                                                  |

---

## Fix Priority Order

```
1. BUG-1  (CRITICAL) — Navigation min-h-0 + remove pb-20       → Settings/Calculators accessible
2. BUG-2  (HIGH)     — SpendingCard flex items-baseline         → Core metric readable
3. BUG-3  (HIGH)     — Budget action bar overflow affordance    → Copy Budget discoverable
4. BUG-4  (MEDIUM)   — Transfer icon-only on mobile            → Transfer button fits
5. BUG-5  (MEDIUM)   — Forecast subtitle shortened              → Header balanced
6. BUG-6  (LOW)      — Hide bottom nav when drawer open         → Polished UX
```

---

## Files to Modify

| File                                            | Bugs         |
| ----------------------------------------------- | ------------ |
| `src/components/layouts/Navigation.astro`       | BUG-1, BUG-6 |
| `src/components/organisms/SpendingCard.astro`   | BUG-2        |
| `src/components/molecules/ActionBar.astro`      | BUG-3, BUG-4 |
| `src/components/molecules/BudgetActions.astro`  | BUG-3        |
| `src/components/molecules/AccountActions.astro` | BUG-4        |
| `src/pages/forecast/index.astro`                | BUG-5        |

---

## Test Scenarios to Verify Fixes

- [ ] Open hamburger menu on 390px → all 8 nav items visible or scrollable → tap Settings → settings page loads
- [ ] Dashboard expense card shows "Rp84.492.275,29 / Rp55M" on a single visual line
- [ ] Budget page: Copy Budget button visible or scroll affordance visible without scrolling
- [ ] Accounts page: Transfer button fully visible or icon-only representation clear
- [ ] Forecast header: subtitle fits on 1 line
- [ ] Open hamburger + tap bottom nav item while drawer open → no accidental navigation
