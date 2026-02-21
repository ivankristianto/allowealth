# Astro View Transitions - Manual Test Plan

**Branch:** `astro-view-transition`
**Date:** 2026-02-21
**Design:** `docs/plans/2026-02-21-astro-view-transitions-design.md`
**Plan:** `docs/plans/2026-02-21-astro-view-transitions-plan.md`

## Overview

This plan verifies that Astro's `<ClientRouter />` provides smooth crossfade page transitions, persists the toast container across navigations, properly re-initializes all client-side JavaScript after soft navigation, resets page-specific nano stores, forces hard reload on auth flows, and restores scroll position on desktop back/forward.

## Prerequisites

- Local dev server running: `bun run dev` at `http://localhost:4321`
- Logged in as: `demo@example.com` / `demo123456789`
- Chrome DevTools open (Console + Network tabs)
- Seeded database with test data: `bun run db:seed` (transactions, accounts, budgets, categories exist)
- Desktop viewport: >= 1024px wide (sidebar visible)
- For mobile tests: resize to < 1024px or use Chrome DevTools device toolbar (e.g. iPhone 14, 390px)

---

## 1. Core Crossfade Transitions

> **Critical:** Primary feature — every navigation must crossfade without white flash.

**How to verify crossfade:** Watch for a smooth opacity fade between old and new page content (~300ms). The page should NOT flash white or blank between navigations. In DevTools Network tab, confirm the navigation does NOT trigger a full document request (no `document` type entry for the target page — only `fetch` for the HTML).

| Step | Action                              | Expected Result                                                                                                                        |
| ---- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 1.1  | Navigate to `/dashboard`            | Dashboard loads normally (initial hard load)                                                                                           |
| 1.2  | Click "Transactions" in the sidebar | Smooth crossfade to `/transactions`. No white flash. Network tab shows a `fetch` request for `/transactions`, not a full document load |
| 1.3  | Click "Accounts" in the sidebar     | Smooth crossfade to `/accounts`. No white flash                                                                                        |
| 1.4  | Click "Budget" in the sidebar       | Smooth crossfade to `/budget`. No white flash                                                                                          |
| 1.5  | Click "Reports" in the sidebar      | Smooth crossfade to `/reports`. No white flash                                                                                         |
| 1.6  | Click "Forecast" in the sidebar     | Smooth crossfade to `/forecast`. No white flash                                                                                        |
| 1.7  | Click "Calculators" in the sidebar  | Smooth crossfade to `/calculators`. No white flash                                                                                     |
| 1.8  | Click "Dashboard" in the sidebar    | Smooth crossfade back to `/dashboard`. No white flash                                                                                  |

---

## 2. Browser History (Back/Forward)

| Step | Action                                             | Expected Result                                                                                       |
| ---- | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 2.1  | From `/dashboard`, click "Transactions" in sidebar | Navigates to `/transactions` with crossfade                                                           |
| 2.2  | Click "Accounts" in sidebar                        | Navigates to `/accounts` with crossfade                                                               |
| 2.3  | Click browser **Back** button                      | Returns to `/transactions` with crossfade. Page content is correct. Sidebar highlights "Transactions" |
| 2.4  | Click browser **Back** button again                | Returns to `/dashboard` with crossfade. Sidebar highlights "Dashboard"                                |
| 2.5  | Click browser **Forward** button                   | Returns to `/transactions` with crossfade                                                             |
| 2.6  | Click browser **Forward** button again             | Returns to `/accounts` with crossfade                                                                 |

---

## 3. Sidebar Active State

| Step | Action                                                      | Expected Result                                                                 |
| ---- | ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 3.1  | Navigate to `/dashboard`                                    | "Dashboard" link is highlighted (bold, accent color, pulse dot visible)         |
| 3.2  | Click "Transactions" in sidebar                             | "Transactions" link becomes highlighted. "Dashboard" is no longer highlighted   |
| 3.3  | Click "Budget" in sidebar                                   | "Budget" link becomes highlighted. "Transactions" is no longer highlighted      |
| 3.4  | Navigate to `/accounts/categories` (via Accounts page link) | "Accounts" parent link is highlighted (sub-route match)                         |
| 3.5  | Click browser Back button from any page                     | Sidebar active state updates to match the current URL                           |
| 3.6  | Click "Profile" or "Security" in sidebar                    | "Settings" parent link is highlighted (alias match for `/profile`, `/security`) |

---

## 4. Sidebar Collapse Persistence

| Step | Action                                                   | Expected Result                                        |
| ---- | -------------------------------------------------------- | ------------------------------------------------------ |
| 4.1  | On desktop (>=1024px), click the sidebar collapse toggle | Sidebar collapses to icon-only mode                    |
| 4.2  | Navigate to another page via sidebar icon                | Sidebar remains collapsed after navigation             |
| 4.3  | Hard refresh the page (Ctrl+Shift+R / Cmd+Shift+R)       | Sidebar is still collapsed (persisted in localStorage) |
| 4.4  | Click collapse toggle again to expand                    | Sidebar expands back to full width                     |
| 4.5  | Navigate to another page                                 | Sidebar remains expanded                               |

---

## 5. Toast Persistence

> **Critical:** Toast container uses `transition:persist` — toasts must survive navigations.

| Step | Action                                                                           | Expected Result                                                                          |
| ---- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 5.1  | Navigate to `/transactions`                                                      | Page loads                                                                               |
| 5.2  | Trigger a toast (e.g., create/edit a transaction, or trigger a validation error) | Toast notification appears in the corner                                                 |
| 5.3  | Immediately click "Dashboard" in sidebar (while toast is still visible)          | Page crossfades to `/dashboard`. Toast remains visible and continues its countdown timer |
| 5.4  | Wait for toast to auto-dismiss                                                   | Toast disappears normally with animation                                                 |
| 5.5  | Trigger another toast, then navigate to a different page                         | Toast persists across navigation                                                         |
| 5.6  | Click the dismiss button (X) on the toast after navigating                       | Toast dismisses correctly                                                                |

---

## 6. Auth Flows — Hard Navigation

> **Critical:** Auth pages use `is:inline` scripts with CSP nonces. Soft navigation would break them.

**How to verify hard reload:** In DevTools Network tab, a hard reload shows a full `document` type request for the target URL (not a `fetch`). The browser tab loading indicator does a full cycle. Alternatively, check that `document.startViewTransition` is NOT called (no crossfade animation).

| Step | Action                                                                                                                                 | Expected Result                                                                                                                 |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 6.1  | While logged in on `/dashboard`, find and click a "Sign in" link (e.g., navigate to landing page `/` first, click "Sign in" in navbar) | Full page reload to `/login`. Network tab shows a `document` request. No crossfade animation                                    |
| 6.2  | From landing page `/`, click "Sign up" or "Get Started" button                                                                         | Full page reload to `/signup`. No crossfade. No CSP errors in console                                                           |
| 6.3  | On `/signup`, check DevTools Console for CSP violations                                                                                | No `Content Security Policy` errors. Inline scripts on signup page execute correctly (form validation, password strength meter) |
| 6.4  | On `/login`, enter `demo@example.com` / `demo123456789` and submit                                                                     | Login succeeds. Redirects to `/dashboard` via full page reload (`window.location.href`). No crossfade                           |
| 6.5  | On `/dashboard`, click user avatar/profile menu, then click "Logout"                                                                   | Full page reload to `/login`. All client state is cleared                                                                       |
| 6.6  | On `/signup` page, click "Sign in" link at the bottom                                                                                  | Full page reload to `/login`. No crossfade                                                                                      |
| 6.7  | On `/forgot-password` page, click "Back to sign in" link                                                                               | Full page reload to `/login`                                                                                                    |

---

## 7. Forms — Hard Navigation

> **Critical:** POST forms and file uploads must bypass the ClientRouter.

| Step | Action                                                                                 | Expected Result                                                                                                                                 |
| ---- | -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 7.1  | Navigate to `/transactions/import` (CSV import page)                                   | Page loads                                                                                                                                      |
| 7.2  | Select a CSV file and submit the import form                                           | Form submits with full page reload (POST with `multipart/form-data`). No ClientRouter interception. Network tab shows a `document` POST request |
| 7.3  | Navigate to `/security` (Security settings page)                                       | Page loads                                                                                                                                      |
| 7.4  | If a connected OAuth account exists, click "Disconnect" on the connected accounts card | Form submits with full page reload (POST). Account is disconnected                                                                              |

---

## 8. Interactive Features After Navigation

> **Critical:** All client-side JavaScript must re-initialize correctly after soft navigation. This tests Tasks 3-5 (lifecycle cleanup in ~25 `.client.ts` files).

### 8a. Transaction Filters

| Step | Action                                                         | Expected Result                                                                 |
| ---- | -------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 8a.1 | Navigate to `/dashboard`, then click "Transactions" in sidebar | `/transactions` loads via crossfade                                             |
| 8a.2 | Click a filter dropdown (e.g., category, account, type)        | Dropdown opens. Options are populated                                           |
| 8a.3 | Select a filter option                                         | Transaction list updates to show filtered results. Summary updates              |
| 8a.4 | Navigate to `/dashboard`, then back to `/transactions`         | Filters are reset to defaults (not stale from previous visit). Fresh data loads |

### 8b. Transaction Drawer

| Step | Action                                                                     | Expected Result                                                     |
| ---- | -------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 8b.1 | On `/transactions`, click the "Add Transaction" button (FAB or action bar) | Transaction drawer slides open from the right                       |
| 8b.2 | Fill in transaction fields and submit                                      | Toast confirms creation. Drawer closes. Transaction appears in list |
| 8b.3 | Navigate to `/budget`, then back to `/transactions`                        | "Add Transaction" button still works. Drawer opens correctly        |
| 8b.4 | Click on an existing transaction row                                       | Transaction drawer opens with pre-filled data for editing           |

### 8c. Budget Page

| Step | Action                                                  | Expected Result                                                                 |
| ---- | ------------------------------------------------------- | ------------------------------------------------------------------------------- |
| 8c.1 | Navigate to `/budget`                                   | Budget page loads with current month data                                       |
| 8c.2 | Use the period navigator (month arrows) to change month | Budget data updates for the selected month                                      |
| 8c.3 | Click on a budget category row to inline-edit           | Edit mode activates. Input field appears with current value                     |
| 8c.4 | Change the value and save (click save or press Enter)   | Value updates. Toast confirms save                                              |
| 8c.5 | Navigate to `/transactions`, then back to `/budget`     | Budget page re-initializes correctly. Period navigator works. Inline edit works |

### 8d. Budget History

| Step | Action                                                | Expected Result                                                                                                          |
| ---- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 8d.1 | Navigate to `/budget/history`                         | Budget history page loads with chart and data                                                                            |
| 8d.2 | Change the year selector                              | Data and chart update for selected year                                                                                  |
| 8d.3 | Navigate to `/budget`, then back to `/budget/history` | Page re-initializes. Year selector and chart work correctly. No duplicate store subscriptions (check console for errors) |

### 8e. Reports

| Step | Action                                            | Expected Result                                                   |
| ---- | ------------------------------------------------- | ----------------------------------------------------------------- |
| 8e.1 | Navigate to `/reports`                            | Reports page loads with charts (spending chart, allocation chart) |
| 8e.2 | Toggle between report tabs/views if available     | Charts re-render correctly. No blank or broken chart canvases     |
| 8e.3 | Navigate to `/dashboard`, then back to `/reports` | Charts render correctly. No canvas reuse errors in console        |

### 8f. Account Search

| Step | Action                                             | Expected Result                                       |
| ---- | -------------------------------------------------- | ----------------------------------------------------- |
| 8f.1 | Navigate to `/accounts`                            | Accounts page loads with account list                 |
| 8f.2 | Type in the search/filter input                    | Account list filters in real-time (debounced)         |
| 8f.3 | Clear search input                                 | Full account list returns                             |
| 8f.4 | Navigate to `/dashboard`, then back to `/accounts` | Search input works correctly. No stale debounce timer |

### 8g. Calculators

| Step | Action                                                | Expected Result                           |
| ---- | ----------------------------------------------------- | ----------------------------------------- |
| 8g.1 | Navigate to `/calculators`                            | Calculator page loads                     |
| 8g.2 | Fill in calculator form fields and submit/calculate   | Results display correctly                 |
| 8g.3 | Navigate to another page, then back to `/calculators` | Form re-initializes. Submit handler works |

### 8h. Notification Dropdown

| Step | Action                                                      | Expected Result                                                  |
| ---- | ----------------------------------------------------------- | ---------------------------------------------------------------- |
| 8h.1 | On any page, click the notification bell icon in the header | Notification dropdown opens                                      |
| 8h.2 | Close the dropdown (click outside or press Escape)          | Dropdown closes                                                  |
| 8h.3 | Navigate to another page                                    | No errors in console                                             |
| 8h.4 | Click notification bell again on the new page               | Dropdown opens correctly. No duplicate items or broken listeners |

### 8i. Expandable Text

| Step | Action                                                                    | Expected Result                            |
| ---- | ------------------------------------------------------------------------- | ------------------------------------------ |
| 8i.1 | Find a page with expandable/truncated text (e.g., long transaction notes) | Text is truncated with "Show more" link    |
| 8i.2 | Click "Show more"                                                         | Text expands to full content               |
| 8i.3 | Click "Show less"                                                         | Text collapses back                        |
| 8i.4 | Navigate to another page and back                                         | Expandable text resets and works correctly |

---

## 9. Dynamic Routes

| Step | Action                                                                  | Expected Result                                                     |
| ---- | ----------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 9.1  | On `/accounts`, click on an account row to navigate to `/accounts/[id]` | Account detail page loads with crossfade. Account data is displayed |
| 9.2  | Click browser Back button                                               | Returns to `/accounts` with crossfade. Account list is displayed    |
| 9.3  | Navigate to `/accounts/[id]` again, then click "Accounts" in sidebar    | Returns to `/accounts` with crossfade                               |
| 9.4  | (Admin only) Navigate to `/admin/workspaces`, click a workspace row     | Workspace detail page `/admin/workspaces/[id]` loads with crossfade |
| 9.5  | Click browser Back button from workspace detail                         | Returns to `/admin/workspaces` with crossfade                       |

---

## 10. Nano Store Reset

> **Critical:** Page-specific stores must reset on navigation to prevent stale data.

| Step | Action                                                                 | Expected Result                                                                                                                         |
| ---- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 10.1 | Navigate to `/transactions`                                            | Transaction list loads with default filters                                                                                             |
| 10.2 | Apply filters: set type to "Income", select a category, type in search | Filtered transaction list displays                                                                                                      |
| 10.3 | Navigate to `/dashboard`                                               | Dashboard loads                                                                                                                         |
| 10.4 | Navigate back to `/transactions` (via sidebar, not browser Back)       | Filters are reset to defaults: type is "Expense" (default), no category selected, search is empty. Data is fresh from server, not stale |
| 10.5 | Navigate to `/budget/history`, change year to a previous year          | Data shows for that year                                                                                                                |
| 10.6 | Navigate to `/dashboard`, then back to `/budget/history`               | Year resets to current year (not stale previous selection). Available years re-fetches                                                  |

---

## 11. Desktop Scroll Restoration

> **Critical:** Desktop uses `.drawer-content` as scroll container, not `window`. ClientRouter can't auto-restore.

| Step | Action                                                                           | Expected Result                                                                                                 |
| ---- | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| 11.1 | Navigate to `/transactions` (ensure enough data for scrolling)                   | Transaction list loads                                                                                          |
| 11.2 | Scroll down significantly in the content area (not the sidebar)                  | Content scrolls. Note the approximate scroll position                                                           |
| 11.3 | Click "Accounts" in sidebar                                                      | `/accounts` loads. Content area scrolls to top                                                                  |
| 11.4 | Click browser **Back** button                                                    | Returns to `/transactions`. Content area scroll position is restored to the approximate position from step 11.2 |
| 11.5 | Click browser **Forward** button                                                 | Returns to `/accounts`. Content area is at the top                                                              |
| 11.6 | From `/accounts`, click "Budget" in sidebar (fresh navigation, not back/forward) | `/budget` loads. Content area starts at the top (not restored from any previous visit)                          |

---

## 12. Mobile Navigation

**Setup:** Resize browser to < 1024px width or use Chrome DevTools device toolbar.

### 12a. Bottom Nav

| Step  | Action                                                      | Expected Result                                                                             |
| ----- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| 12a.1 | On mobile viewport, verify bottom navigation bar is visible | 5 nav items visible at bottom of screen (including FAB center button)                       |
| 12a.2 | Tap "Transactions" in bottom nav                            | Page crossfades to `/transactions`. "Transactions" icon is highlighted (accent color)       |
| 12a.3 | Tap "Budget" in bottom nav                                  | Page crossfades to `/budget`. "Budget" icon is highlighted. "Transactions" is unhighlighted |
| 12a.4 | Tap "Dashboard" in bottom nav                               | Page crossfades to `/dashboard`. Correct icon is highlighted                                |

### 12b. Mobile Drawer

> **Critical:** MobileDrawer scroll lock — navigating while drawer is open must restore `body.style.overflow`.

| Step  | Action                                                    | Expected Result                                                                                                       |
| ----- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 12b.1 | On mobile viewport, tap the hamburger menu icon           | Mobile drawer slides open. Body scroll is locked (page behind drawer cannot scroll)                                   |
| 12b.2 | Tap a navigation item in the drawer (e.g., "Accounts")    | Drawer closes. Page navigates to `/accounts` with crossfade. **Body scroll is restored** — page content is scrollable |
| 12b.3 | Open mobile drawer again                                  | Drawer opens normally. No duplicate event listeners                                                                   |
| 12b.4 | Open drawer, then tap browser Back button (if applicable) | Drawer closes gracefully. Body scroll is restored. No stuck scroll lock                                               |
| 12b.5 | Verify page is scrollable after all drawer interactions   | Page scrolls normally. No `overflow: hidden` stuck on body                                                            |

---

## 13. Theme Toggle

| Step | Action                                             | Expected Result                                                                     |
| ---- | -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 13.1 | On desktop, click the theme toggle (sun/moon icon) | Theme switches between light and dark. `data-theme` attribute on `<html>` changes   |
| 13.2 | Navigate to another page                           | Theme persists (same `data-theme` value). No flash of wrong theme                   |
| 13.3 | Toggle theme again on the new page                 | Theme switches correctly. No duplicate click handlers (only toggles once per click) |
| 13.4 | Hard refresh the page                              | Theme persists from localStorage                                                    |

---

## 14. Header Behavior

The header is NOT persisted (it has page-specific subtitle, slots, and dynamic height). It swaps with the page content during crossfade.

| Step | Action                                                 | Expected Result                                                                    |
| ---- | ------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| 14.1 | On `/dashboard`, note the header subtitle/breadcrumb   | Shows dashboard-specific header content                                            |
| 14.2 | Navigate to `/transactions`                            | Header updates to show transactions-specific subtitle. Period navigator is present |
| 14.3 | Navigate to `/accounts`                                | Header updates to accounts-specific content                                        |
| 14.4 | Use period navigator on `/transactions` (month arrows) | Period changes. Header subtitle updates. Custom events fire correctly              |

---

## 15. Charts After Navigation

| Step | Action                                                                       | Expected Result                                                                                   |
| ---- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 15.1 | Navigate to `/reports`                                                       | Charts render (spending chart, allocation chart, etc.)                                            |
| 15.2 | Navigate to `/dashboard`                                                     | Dashboard charts render (if any)                                                                  |
| 15.3 | Navigate back to `/reports`                                                  | Charts render correctly. No "Canvas is already in use" errors in console. No blank chart canvases |
| 15.4 | Navigate to `/forecast` (if it has charts)                                   | Charts render. Previous chart instances are properly destroyed                                    |
| 15.5 | Rapidly navigate: `/reports` → `/dashboard` → `/reports` → `/budget/history` | Each page's charts render correctly. No console errors                                            |

---

## 16. CSP Monitoring

> **Critical:** CSP nonce + ClientRouter compatibility must be verified.

| Step | Action                                                                                                     | Expected Result                                                                               |
| ---- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 16.1 | Open DevTools Console. In the filter input, type `Content Security Policy` or `CSP`                        | Console filter is set                                                                         |
| 16.2 | Navigate through 5-6 pages via sidebar: Dashboard → Transactions → Budget → Reports → Accounts → Dashboard | No CSP violation warnings appear in console                                                   |
| 16.3 | Navigate to `/signup` (should be hard reload)                                                              | No CSP violations. Signup form inline scripts work (password strength meter, form validation) |
| 16.4 | Navigate to `/login` (should be hard reload)                                                               | No CSP violations                                                                             |
| 16.5 | After login, navigate through app pages again                                                              | No CSP violations accumulated                                                                 |

---

## 17. Event Listener Leak Check

| Step | Action                                                                                                            | Expected Result                                                         |
| ---- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 17.1 | Navigate to `/transactions`                                                                                       | Page loads                                                              |
| 17.2 | Open DevTools → Elements panel. Select the `document` node. Click "Event Listeners" tab in the sidebar            | Note the number of listeners for `click`, `keydown`, and custom events  |
| 17.3 | Navigate to `/dashboard`, then back to `/transactions`                                                            | Event listener count should be similar to step 17.2 (not doubled)       |
| 17.4 | Repeat navigation 5 more times: `/transactions` → `/dashboard` → `/transactions` → `/dashboard` → `/transactions` | Event listener count remains stable. Does NOT grow with each navigation |
| 17.5 | Check Console tab for any warnings about memory leaks or "too many listeners"                                     | No warnings                                                             |

---

## 18. Reduced Motion (Accessibility)

| Step | Action                                                                    | Expected Result                                                                                                     |
| ---- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 18.1 | In Chrome DevTools, open Rendering panel (Cmd+Shift+P → "Show Rendering") | Rendering panel opens                                                                                               |
| 18.2 | Enable "Emulate CSS media feature prefers-reduced-motion: reduce"         | Reduced motion is emulated                                                                                          |
| 18.3 | Navigate between pages via sidebar                                        | Page transitions happen **instantly** (no crossfade animation). Content swaps without any visible transition effect |
| 18.4 | Disable reduced motion emulation                                          | Crossfade animations return on next navigation                                                                      |

---

## 19. Edge Cases

### 19a. Rapid Navigation

| Step  | Action                                                                                                             | Expected Result                                                              |
| ----- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| 19a.1 | Click sidebar items rapidly: Dashboard, Transactions, Accounts, Budget in quick succession (~200ms between clicks) | Final page loads correctly. No errors in console. No stuck transition states |
| 19a.2 | Check that the URL matches the last clicked page                                                                   | URL is correct. Page content matches                                         |

### 19b. Navigate During Fetch

| Step  | Action                                                                                      | Expected Result                                                                                      |
| ----- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 19b.1 | Navigate to `/transactions`                                                                 | Transaction data starts loading                                                                      |
| 19b.2 | While data is still loading (loading spinner visible), quickly click "Dashboard" in sidebar | Dashboard loads. No stale transaction data appears. No console errors about aborted fetches crashing |

### 19c. DaisyUI Drawer Checkbox

| Step  | Action                               | Expected Result                                          |
| ----- | ------------------------------------ | -------------------------------------------------------- |
| 19c.1 | On mobile, open the hamburger drawer | Drawer opens. Hidden checkbox is checked                 |
| 19c.2 | Navigate to a page                   | Drawer checkbox resets. Drawer is closed on the new page |
| 19c.3 | Open drawer again                    | Opens normally (checkbox state wasn't stuck)             |

### 19d. Confirmation Modals

| Step  | Action                                                      | Expected Result                                        |
| ----- | ----------------------------------------------------------- | ------------------------------------------------------ |
| 19d.1 | On `/transactions`, select a transaction and click "Delete" | Confirmation modal appears                             |
| 19d.2 | Click "Cancel" to dismiss the modal                         | Modal closes                                           |
| 19d.3 | Navigate to another page and back to `/transactions`        | Delete button still works. Modal still opens correctly |

### 19e. Account Detail → List Navigation

| Step  | Action                                                     | Expected Result                          |
| ----- | ---------------------------------------------------------- | ---------------------------------------- |
| 19e.1 | On `/accounts`, click an account to go to `/accounts/[id]` | Detail page loads with crossfade         |
| 19e.2 | Click "Accounts" in sidebar to go back to `/accounts`      | Account list loads. Not stale data       |
| 19e.3 | Click a different account                                  | Different account detail loads correctly |

---

## 20. Admin Pages (Super Admin Only)

**Prerequisite:** Log in as `superadmin@example.com` / `demo123456789`

| Step | Action                                                        | Expected Result                                          |
| ---- | ------------------------------------------------------------- | -------------------------------------------------------- |
| 20.1 | Navigate to `/admin`                                          | Admin dashboard loads                                    |
| 20.2 | Click "Users" in admin sidebar                                | `/admin/users` loads with crossfade. User table displays |
| 20.3 | Click "Workspaces" in admin sidebar                           | `/admin/workspaces` loads with crossfade                 |
| 20.4 | Click "Diagnostics" in admin sidebar                          | `/admin/diagnostics` loads. Refresh button works         |
| 20.5 | Click the refresh button on diagnostics page                  | Diagnostics data refreshes                               |
| 20.6 | Navigate to `/admin/users`, then back to `/admin/diagnostics` | Refresh button still works (no stale AbortController)    |
| 20.7 | Click "Audit Logs" in admin sidebar                           | `/admin/audit-logs` loads with crossfade                 |

---

## Summary Checklist

| #   | Area                  | Key Assertion                                                   | Pass |
| --- | --------------------- | --------------------------------------------------------------- | ---- |
| 1   | Crossfade             | All sidebar navigations use smooth crossfade, no white flash    | [ ]  |
| 2   | Back/Forward          | Browser history navigation works with crossfade                 | [ ]  |
| 3   | Sidebar Active        | Active state updates correctly on every navigation              | [ ]  |
| 4   | Sidebar Collapse      | Collapse state persists across navigations and page refresh     | [ ]  |
| 5   | Toast Persist         | Toast survives navigation, auto-dismiss and manual dismiss work | [ ]  |
| 6   | Auth Hard Reload      | Login, signup, and logout links trigger full page reload        | [ ]  |
| 7   | CSP Clean             | No Content Security Policy violations in console                | [ ]  |
| 8   | Forms Hard Reload     | CSV import and OAuth disconnect forms bypass ClientRouter       | [ ]  |
| 9   | Transaction Filters   | Filters work after navigation, reset on re-visit                | [ ]  |
| 10  | Transaction Drawer    | Opens, submits, and closes correctly after navigation           | [ ]  |
| 11  | Budget Inline Edit    | Edit mode activates and saves after navigation                  | [ ]  |
| 12  | Charts                | All charts render without errors after navigating away and back | [ ]  |
| 13  | Store Reset           | Transaction filters and budget history reset on navigation      | [ ]  |
| 14  | Desktop Scroll        | Scroll position restored on Back, resets to top on fresh nav    | [ ]  |
| 15  | Mobile Drawer         | Drawer closes on navigation, body scroll is restored            | [ ]  |
| 16  | Mobile Bottom Nav     | Active state updates, navigation works                          | [ ]  |
| 17  | Theme Toggle          | Works after navigation, no duplicate handlers                   | [ ]  |
| 18  | Header Swap           | Page-specific header content updates on each navigation         | [ ]  |
| 19  | No Listener Leaks     | Event listener count stable across repeated navigations         | [ ]  |
| 20  | Reduced Motion        | Transitions disabled when prefers-reduced-motion is set         | [ ]  |
| 21  | Rapid Navigation      | No errors or stuck states on rapid clicking                     | [ ]  |
| 22  | Account Detail        | Dynamic route `/accounts/[id]` navigates and returns correctly  | [ ]  |
| 23  | Admin Pages           | Diagnostics refresh, user/workspace tables work after nav       | [ ]  |
| 24  | Notification Dropdown | Opens/closes correctly after navigation                         | [ ]  |

**Critical paths:** Steps 1, 5, 6, 7, 10, 13, 14, 15 are highest priority.
