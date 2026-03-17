# Nav Restructure — Design Spec

**Date:** 2026-03-17
**Status:** Approved
**Scope:** Primary sidebar navigation + mobile command center

---

## Problem

The primary navigation has two issues:

1. **Docs link silently exits the app.** It looks identical to every other nav item but opens an external site with no indication and no way to return. Users lose their place.
2. **10 flat items is hard to scan.** No visual grouping makes the list monotonous and slows navigation.

---

## Solution

Restructure the sidebar into three labeled groups — **Track / Plan / Analyze** — with Docs moved to a muted utility zone at the bottom. Apply the same grouping to the mobile command center.

---

## Information Architecture

### Sidebar (Desktop)

```
Dashboard                    ← standalone, top

── Track ──────────────────
  Transactions
  Recurring
  Accounts                   ← moved here from between Reports and Forecast

── Plan ────────────────────
  Budget
  Forecast

── Analyze ─────────────────
  Reports                    ← icon changed to BarChart2
  Calculators

────────────────────────────
  Settings
  Docs ↗                     ← muted, external icon, opens in new tab

── bottom ──────────────────
  [User avatar] Dad ▾
```

### Sidebar — Collapsed (Icon-Only)

- Section labels are hidden (too narrow to display)
- Dividers between groups are preserved for visual rhythm
- All items remain present as icons with tooltips

### Mobile Command Center (Bottom Sheet)

```
[handle bar]
[User card: avatar · name · email]

── Overview ────────────────
  Dashboard (full-width row)

── Track ───────────────────
  Transactions · Recurring · Accounts   (3-column grid)

── Plan ────────────────────
  Budget · Forecast                     (2-column grid)

── Analyze ─────────────────
  Reports · Calculators                 (2-column grid)

────────────────────────────
  Profile
  Security
  Settings
  ──
  Documentation ↗
  ──
  Sign out
```

---

## Design Decisions

| Decision | Choice | Reason |
|---|---|---|
| Group labels | Track / Plan / Analyze | Verb-based, action-oriented; maps to how users think about their finances |
| Docs treatment | Muted color + ↗ icon + `target="_blank"` | Signals external destination without removing it from nav |
| Docs position | Below Settings in utility zone | Help/reference links belong below primary features |
| Collapsed groups | Dividers only, labels hidden | Labels cannot fit at icon-only width; dividers preserve group rhythm |
| Reports icon | `BarChart2` (vertical bars) | Cleaner and more distinct than current `ChartBar` (horizontal) |
| Accounts group | Track (with Transactions + Recurring) | Accounts is a tracking surface, not a planning or analysis tool |
| Mobile user nav | User card at top + links at bottom | Surfaces user context immediately on open; conventional placement for profile/logout |

---

## Component Changes

### `src/components/layouts/UserNav.astro`

- Import `BarChart2` from `@lucide/astro` (replace `ChartBar`)
- Add section labels (`Track`, `Plan`, `Analyze`) as non-interactive `<li role="presentation">` items with an inner `<span aria-hidden="true">` — purely visual, not announced by screen readers as headings
- Add `<li role="presentation"><hr aria-hidden="true" /></li>` dividers between groups and above the utility zone
- Reorder nav items to match new IA (Accounts moves into Track group)
- Apply muted styling to Docs item: `text-base-content/40` — intentionally lower than the `/60` used for inactive items to signal "utility, not primary nav"
- Add `ExternalLink` icon (small, inline) to Docs item label
- Add `target="_blank" rel="noopener noreferrer"` to Docs `<a>` tag
- Section label `<span>` elements: hidden via CSS when sidebar is in collapsed state (the existing `.sidebar-collapsed` class or equivalent already controls label visibility)
- Dividers: visible in both expanded and collapsed states

### `src/components/layouts/MobileCommandCenter.astro`

**Scope:** Changes apply to the `!isSuperAdmin` user branch only. The super admin branch (Dashboard, Workspaces, Users, Audit Logs, Diagnostics grid) is left untouched.

**Sheet structure — before → after:**

```
BEFORE                          AFTER
────────────────────────────    ────────────────────────────
[handle bar]                    [handle bar]
[Accent header: Navigation,     [User card: avatar, name,
 "Quick access...", close btn]   email, close button]
[3-col main grid]               [Overview: Dashboard row]
[More Options accordion          [Track group + label]
 (Forecast, Calculators, Docs)] [Plan group + label]
[User card: avatar, name,       [Analyze group + label]
 email, Profile, Security,      [User links: Profile,
 Settings, Sign out]             Security, Settings,
                                 Docs ↗, Sign out]
```

Specific changes:
- **Remove** the existing accent header bar (Menu icon, "Navigation" title, subtitle). The close button moves into the user card row.
- **Add** user card at the top of the sheet (avatar, display name, email) immediately below the handle bar
- **Remove** the "More Options" accordion and its associated JS toggle logic (`[data-more-menu-btn]`, `[data-more-menu-content]`, `ChevronDown` toggle, `moreMenuBtn` guard in `closeSheet`)
- **Remove** the existing bottom user card section — its links (Profile, Security, Settings, Sign out) migrate to the new bottom utility section
- **Add** section labels (`Track`, `Plan`, `Analyze`) above each grid block
- **Reorder** grid items to match sidebar groups (Accounts into Track, remove from "More")
- **Add** Docs link to user links section at bottom (muted styling, ↗ icon, `target="_blank"`)
- Import `BarChart2` (replace `ChartBar`) for Reports tile

---

## Accessibility

- Section labels are decorative (`aria-hidden="true"`); the surrounding `<nav>` already provides screen reader context for the sidebar
- Dividers are decorative (`aria-hidden="true"`)
- Docs link includes `aria-label="Documentation (opens in new tab)"` to communicate the external destination to screen readers
- Collapsed sidebar items retain visible tooltips (existing behaviour preserved)

---

## Out of Scope

- Adding new nav items
- Changing the sidebar collapse toggle mechanism
- Changing the sidebar width or animation
- Admin nav (`AdminNav.astro`) — no changes needed
- Public navbar (`PublicNavbar.astro`) — separate surface, not in scope
