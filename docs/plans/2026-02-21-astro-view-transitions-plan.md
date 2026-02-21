# Astro View Transitions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add smooth crossfade page transitions with ClientRouter, persist toast container, and safely re-initialize all client-side JavaScript on soft navigation.

**Architecture:** Add `<ClientRouter />` to BaseLayout. Persist only the toast container (sidebar/footer crossfade naturally). Audit all 31 `.client.ts` files for proper lifecycle handling. Reset page-specific nano stores on navigation. Add `data-astro-reload` to auth flows and file upload forms. Handle desktop scroll restoration for custom scroll container.

**Tech Stack:** Astro 5 ClientRouter, `astro:transitions`, existing nano stores, existing `astro:page-load` patterns.

**Design Doc:** `docs/plans/2026-02-21-astro-view-transitions-design.md`

**Review Notes (Codex gpt-5.3-codex xhigh):**

- CSP nonce: NOT a blocker — all `is:inline` scripts are on auth pages (hard reload) or run once on initial load
- Chart.js: NOT an issue — SpendingChart, ResourceAllocationChart, FinancialVelocityChart, WealthTrajectory all destroy instances on `astro:before-swap`
- Store reset shapes: FIXED — now uses exact store types and existing `resetFilters()` function
- Scroll restoration: ADDED — desktop uses custom scroll container (`.drawer-content`), needs manual handling
- MobileDrawer scroll lock: ADDED — must close drawer on `astro:before-swap` to restore `body.style.overflow`
- Prefetch: OK — existing `hover` strategy is conservative, no changes needed
- `data-astro-reload` on auth: Clarified — only needed on `<a>` tags, not JS `window.location.href` calls (those already bypass router)

---

## Task 1: Add ClientRouter + Toast Container Persist

**Files:**

- Modify: `src/layouts/BaseLayout.astro`
- Modify: `src/components/molecules/ToastContainer.astro`

**Step 1: Add ClientRouter to BaseLayout**

In `src/layouts/BaseLayout.astro`, add the import and component:

```astro
---
import '../styles/globals.css';
import { ClientRouter } from 'astro:transitions';
import ToastContainer from '@/components/molecules/ToastContainer.astro';
// ... rest unchanged
---

<!doctype html>
<html lang="en" data-theme="light">
  <head>
    <!-- ... existing meta, title, favicon ... -->
    <ClientRouter />
    <!-- ... existing theme script, fonts ... -->
  </head>
  <body>
    <slot />
    <ToastContainer transition:persist="toast-container" />
    {perfDebugComment && <Fragment set:html={perfDebugComment} />}
  </body>
</html>
```

Changes:

- Line 2: Add `import { ClientRouter } from 'astro:transitions';`
- After line 28 (favicon): Add `<ClientRouter />`
- Line 49: Change `<ToastContainer />` to `<ToastContainer transition:persist="toast-container" />`

**Step 2: Remove toast cleanup on navigation**

In `src/components/molecules/ToastContainer.astro`, remove lines 247-254 (the `astro:page-load` cleanup handler):

```typescript
// DELETE this entire block:
// Cleanup on page navigation to prevent memory leaks
addEventListener('astro:page-load', () => {
  unsubscribe();
  renderedToasts.clear();
  focusRestoreMap.clear();
  clearAllToasts();
  motionQuery.removeEventListener('change', handleMotionPreferenceChange);
});
```

**Why:** With `transition:persist`, the toast container DOM and script state persist across soft navigations. The module script runs once and the subscription stays alive. The cleanup handler would destroy the subscription on every navigation, breaking toasts.

**Step 3: Verify dev server starts**

Run: `bun run dev`
Expected: No build errors.

**Step 4: Manual smoke test**

1. Open browser to `http://localhost:4321/dashboard`
2. Click "Transactions" in sidebar
3. Verify: smooth crossfade transition (no white flash)
4. Trigger a toast (e.g., add a transaction)
5. Navigate to another page while toast is visible
6. Verify: toast persists during navigation

**Step 5: Commit**

```bash
git add src/layouts/BaseLayout.astro src/components/molecules/ToastContainer.astro
git commit -m "feat: add Astro ClientRouter with crossfade transitions

Add <ClientRouter /> to BaseLayout for SPA-like page transitions.
Persist toast container across navigations to maintain notifications.
Remove toast cleanup handler that conflicts with persistence."
```

---

## Task 2: Hard Navigation for Auth & Forms

Auth flows and file uploads must bypass the ClientRouter to ensure full page reload (clean state).

**Files:**

Login links (`href="/login"`):

- Modify: `src/components/layouts/PublicNavbar.astro` (line ~65, "Sign in" button)
- Modify: `src/components/molecules/ForgotPasswordForm.astro` (line ~76, "Sign in" link)
- Modify: `src/components/molecules/MfaVerifyForm.astro` (line ~103, "Back to login" link)
- Modify: `src/pages/signup.astro` (lines ~137, ~155, ~326, login links)
- Modify: `src/pages/auth/link-account.astro` (line ~81 login link, line ~75 form)

Signup links (`href="/signup"`) — **CSP critical: signup page has `is:inline` scripts with nonces**:

- Modify: `src/components/molecules/landing/HeroSection.astro` (line ~65, "Get Started" button)
- Modify: `src/components/molecules/LoginForm.astro` (line ~158, "Sign up" link)
- Modify: `src/components/layouts/PublicNavbar.astro` (line ~67, "Sign up" button)
- Modify: `src/components/organisms/landing/PricingSection.astro` (line ~106, pricing CTA buttons)

Forms:

- Modify: `src/components/molecules/SecurityConnectedAccountsCard.astro` (line ~46, form POST)
- Modify: `src/components/molecules/CSVImportForm.astro` (line ~50, form with file upload)

**Step 1: Add `data-astro-reload` to auth links (login AND signup)**

For each `<a href="/login">`, `<a href="/login/...">`, and `<a href="/signup">` in auth-related pages, add the attribute:

```html
<!-- Before -->
<a href="/login">Sign in</a>
<a href="/signup">Sign up</a>

<!-- After -->
<a href="/login" data-astro-reload>Sign in</a>
<a href="/signup" data-astro-reload>Sign up</a>
```

**Why signup needs hard reload:** `/signup` contains `<script is:inline nonce={cspNonce}>` (lines 353-498). On soft navigation, the browser's CSP header from the original page has a different nonce, so these inline scripts would be blocked.

**Important:** `data-astro-reload` only works on `<a>`, `<form>`, and `<area>` elements (Astro warning `astro(2000)`). For `<Button>` components that render as `<a>` tags, you have two options:

1. Replace the `<Button>` with a plain `<a>` tag styled with DaisyUI button classes:

```astro
<a href="/signup" data-astro-reload class="btn btn-primary">Get Started</a>
```

2. Or modify the `Button` component to pass through `data-astro-reload` to its inner `<a>` tag (if it supports spread props).

Search patterns to find all links:

```bash
grep -rn 'href="/login\|href="/signup' src/ --include='*.astro' | grep -v node_modules | grep -v stories
```

**Step 2: Add `data-astro-reload` to POST forms and file uploads**

```html
<!-- CSVImportForm.astro - file upload form -->
<form method="POST" enctype="multipart/form-data" data-astro-reload>...</form>

<!-- SecurityConnectedAccountsCard.astro - OAuth disconnect -->
<form method="POST" data-astro-reload>...</form>

<!-- link-account.astro - OAuth link -->
<form method="POST" action="/api/auth/google/link" data-astro-reload>...</form>
```

**Step 3: Clarification on programmatic redirects**

`data-astro-reload` is only needed on **HTML `<a>` tags and `<form>` elements** — it tells the ClientRouter to bypass soft navigation for those elements.

**NOT needed for:**

- `window.location.href = '/login'` — already bypasses ClientRouter (hard reload)
- `fetch()` + redirect — already bypasses ClientRouter
- Login form (`LoginForm.astro`) — uses `fetch()` then `window.location.href`
- Logout (`UserProfile.astro`) — uses `fetch('/api/auth/logout')` then `window.location.href`
- MFA redirect (`MfaVerifyForm.astro`) — uses `fetch()` then `window.location.href`
- Registration redirect (`RegistrationForm.astro`) — uses `fetch()` then `window.location.href`

These all use JavaScript to redirect, which inherently bypasses the router.

**Step 4: Verify**

1. Navigate to login page → should be a full reload (check DevTools network tab)
2. Test logout → should hard reload to login
3. Test CSV import page → form should work normally

**Step 5: Commit**

```bash
git add -A  # review staged files first
git commit -m "fix: add data-astro-reload to auth flows and file uploads

Ensure login/logout, OAuth, and file upload forms bypass
ClientRouter for clean state transitions."
```

---

## Task 3: Client Script Fixes - Layout Components

Fix 4 layout-level `.client.ts` files that run on every page.

**Files:**

- Modify: `src/components/layouts/Header.client.ts`
- Modify: `src/components/layouts/MobileDrawer.client.ts`
- Modify: `src/components/atoms/ThemeToggle.client.ts`
- Modify: `src/components/layouts/PublicAuthCta.client.ts`

### Pattern: AbortController Cleanup

Each file should follow this pattern:

```typescript
let controller: AbortController | null = null;

function init() {
  // Abort previous listeners
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;

  // Query DOM elements (they may have changed after navigation)
  const element = document.querySelector('[data-my-element]');
  if (!element) return;

  // Attach listeners with signal for automatic cleanup
  element.addEventListener('click', handler, { signal });
  window.addEventListener('custom-event', handler, { signal });
}

document.addEventListener('astro:page-load', init);
```

### 3a: Header.client.ts

**Current issue:** No `astro:page-load` listener. Window event listeners (PERIOD_CHANGE_EVENT, FILTERS_RESET_EVENT) accumulate across navigations.

**Fix:**

1. Add module-level `AbortController`
2. Wrap all initialization in an `init()` function
3. Abort previous controller in init
4. Add all `addEventListener` calls with `{ signal }`
5. Add `document.addEventListener('astro:page-load', init)` at bottom
6. Call `init()` immediately for first page load

### 3b: MobileDrawer.client.ts

**Current issue:** Has `astro:page-load` but no cleanup. Document-level click, keydown, and media query listeners accumulate. **Critical:** Sets `body.style.overflow = 'hidden'` when open — navigating while drawer is open leaves stale scroll lock.

**Fix:**

1. Add `AbortController` to `init()` function
2. Pass `{ signal }` to document.addEventListener('click', ...) and keydown listeners
3. Media query listener: use `{ signal }` on `addEventListener('change', ...)`
4. **Add `astro:before-swap` handler that calls `close()`** to restore `body.style.overflow` before navigation:

```typescript
document.addEventListener('astro:before-swap', () => {
  // Close drawer and restore body overflow before page swap
  close();
});
```

### 3c: ThemeToggle.client.ts

**Current issue:** Has `astro:page-load` with INIT_ATTRIBUTE guard on toggles. Media query listener never cleaned up.

**Fix:**

1. Add `AbortController` for the media query change listener
2. Abort in init before re-adding
3. Toggle click listeners already guarded by INIT_ATTRIBUTE - verify they don't duplicate

### 3d: PublicAuthCta.client.ts

**Current issue:** No `astro:page-load`, no init guard. Window `pageshow` listener accumulates.

**Fix:**

1. Wrap in `init()` function with `AbortController`
2. Add `document.addEventListener('astro:page-load', init)`
3. Add `{ signal }` to pageshow listener

**Step: Verify each file**

After fixing each file:

1. Run `bun run typecheck` to verify no type errors
2. Navigate between pages in dev server
3. Check browser console for errors
4. Verify no duplicate event handlers (DevTools → Elements → Event Listeners)

**Step: Commit**

```bash
git add src/components/layouts/Header.client.ts src/components/layouts/MobileDrawer.client.ts src/components/atoms/ThemeToggle.client.ts src/components/layouts/PublicAuthCta.client.ts
git commit -m "fix: add lifecycle cleanup to layout client scripts

Add AbortController cleanup and astro:page-load listeners to
Header, MobileDrawer, ThemeToggle, and PublicAuthCta client scripts
to prevent event listener accumulation during view transitions."
```

---

## Task 4: Client Script Fixes - Page Orchestrators

Fix page-level orchestrator scripts that manage complex state.

**Files:**

- Review: `src/components/organisms/TransactionsPage.client.ts` (has init but uses `beforeunload`)
- Review: `src/components/organisms/BudgetPage.client.ts` (has cleanup but no `astro:page-load`)
- Modify: `src/components/organisms/BudgetHistoryPage.client.ts` (no lifecycle, nano store subscriptions leak)
- Modify: `src/components/organisms/CalculatorsPage.client.ts` (module-scope form listener)
- Review: `src/components/organisms/ReportsPage.client.ts` (has `astro:before-swap` cleanup)
- Modify: `src/pages/accounts/categories/account-categories.client.ts` (has `astro:page-load` but no cleanup reset)
- Modify: `src/pages/admin/diagnostics.client.ts` (module-scope listener, no cleanup)

### 4a: TransactionsPage.client.ts

**Current:** Has `init()` with initialized guard, uses `beforeunload` for cleanup.

**Fix:** Change `beforeunload` to `astro:before-swap` so cleanup happens on soft navigation too (not just hard page unload):

```typescript
// Before:
window.addEventListener('beforeunload', cleanup);

// After:
document.addEventListener('astro:before-swap', cleanup, { once: true });
window.addEventListener('beforeunload', cleanup);
```

Re-register the `astro:before-swap` listener in each `init()` call.

### 4b: BudgetPage.client.ts

**Current:** Has cleanup export and initialized state, but no `astro:page-load` listener.

**Fix:** Add `astro:page-load` listener that calls `init()`. Add `astro:before-swap` listener that calls `cleanup()`.

### 4c: BudgetHistoryPage.client.ts

**Current:** No lifecycle at all. Nano store subscriptions leak.

**Fix:**

1. Wrap in `init()` function
2. Track store unsubscribe functions
3. Add `astro:page-load` → init
4. Add `astro:before-swap` → cleanup (unsubscribe stores, abort controllers)

### 4d: CalculatorsPage.client.ts

**Current:** Module-scope form listener, no cleanup.

**Fix:**

1. Wrap in `init()` with AbortController
2. Add `astro:page-load` → init
3. Pass `{ signal }` to form submit listener

### 4e: AccountCategoriesPage.client.ts

**Current:** Has `astro:page-load` but `listenersAttached` flag never resets on navigation.

**Fix:** Add `astro:before-swap` that resets `listenersAttached = false`.

### 4f: Diagnostics.client.ts

**Current:** Module-scope refresh button listener, no lifecycle.

**Fix:**

1. Wrap in `init()` with AbortController
2. Add `astro:page-load` → init

**Step: Verify**

Run `bun run typecheck` after all changes.
Navigate between each page type (transactions → budget → reports → calculators → diagnostics).
Verify no console errors and interactive features work.

**Step: Commit**

```bash
git add src/components/organisms/TransactionsPage.client.ts src/components/organisms/BudgetPage.client.ts src/components/organisms/BudgetHistoryPage.client.ts src/components/organisms/CalculatorsPage.client.ts src/pages/accounts/categories/account-categories.client.ts src/pages/admin/diagnostics.client.ts
git commit -m "fix: add lifecycle management to page orchestrator scripts

Add astro:page-load and astro:before-swap handlers to page-level
client scripts. Fix store subscription leaks in BudgetHistoryPage.
Reset initialization flags on navigation."
```

---

## Task 5: Client Script Fixes - Interactive Components

Fix component-level scripts that manage interactive UI elements.

**Files (need work):**

- `src/components/molecules/NotificationDropdown.client.ts` — add init guard to prevent duplicate listeners
- `src/components/organisms/TransactionDrawer.client.ts` — add `astro:before-swap` cleanup
- `src/components/organisms/TransactionList.client.ts` — add `astro:page-load`, remove DOMContentLoaded
- `src/components/molecules/TransactionHistory.client.ts` — add `astro:page-load`
- `src/components/organisms/AccountSearch.client.ts` — add `astro:page-load`, clear debounce timer
- `src/components/organisms/WealthTrajectory.client.ts` — add `astro:before-swap` to clear debounce timers
- `src/components/molecules/CSVImportForm.client.ts` — add `astro:page-load`, refactor IIFE
- `src/components/molecules/SecurityConnectedAccountsCard.client.ts` — add `astro:before-swap`
- `src/components/molecules/ExpandableText.client.ts` — add `astro:page-load` + cleanup
- `src/components/molecules/AccountInlineHistory.client.ts` — add `astro:page-load`
- `src/components/organisms/BudgetInlineEdit.client.ts` — reset module state on `astro:before-swap`

**Files (no changes needed - utility/renderer modules):**

- `AccountCategoriesRenderer.client.ts` — pure render utility
- `BudgetHistoryRenderer.client.ts` — pure render utility
- `BudgetRenderer.client.ts` — pure render utility
- `ReportsRenderer.client.ts` — pure render utility
- `TransactionsRenderer.client.ts` — pure render utility
- `ConfirmationModal.client.ts` — utility functions only (no self-initialization)

### Fix Pattern

For each file listed above:

1. **If missing `astro:page-load`:** Add listener calling init function
2. **If missing cleanup:** Add `astro:before-swap` or AbortController
3. **If has DOMContentLoaded:** Replace with `astro:page-load` pattern:

```typescript
// Before:
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// After (with ClientRouter, astro:page-load fires on initial load AND navigations):
document.addEventListener('astro:page-load', init);
```

4. **If has debounce timers:** Clear on `astro:before-swap`:

```typescript
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

document.addEventListener('astro:before-swap', () => {
  if (debounceTimer) clearTimeout(debounceTimer);
});
```

5. **If has module-level state:** Reset on `astro:before-swap`:

```typescript
let activeEditCategoryId: string | null = null;

document.addEventListener('astro:before-swap', () => {
  activeEditCategoryId = null;
});
```

### Subagent Strategy

These 11 files touch independent code. They can be processed in parallel batches:

- **Batch A** (molecules): NotificationDropdown, TransactionHistory, CSVImportForm, SecurityConnectedAccountsCard, ExpandableText, AccountInlineHistory
- **Batch B** (organisms): TransactionDrawer, TransactionList, AccountSearch, WealthTrajectory, BudgetInlineEdit

**Step: Verify**

Run `bun run typecheck` after all changes.
Navigate between pages that use these components. Test key interactions:

- Open/close notification dropdown
- Open/close transaction drawer, submit a transaction
- Search accounts
- Expand/collapse text
- Edit budget inline

**Step: Commit**

```bash
git add src/components/molecules/ src/components/organisms/
git commit -m "fix: add lifecycle cleanup to interactive component scripts

Add astro:page-load and astro:before-swap handlers to component
client scripts. Fix debounce timer leaks, module state persistence,
and event listener accumulation during view transitions."
```

---

## Task 6: Nano Store Reset on Navigation

Reset page-specific nano stores when navigating away from their pages. Keep global stores alive.

**Files:**

- Create: `src/lib/stores/view-transition-cleanup.ts`
- Modify: `src/layouts/MainLayout.astro` (import the cleanup script)

**Step 1: Create cleanup module**

Create `src/lib/stores/view-transition-cleanup.ts`:

```typescript
/**
 * View Transition Store Cleanup
 *
 * Resets page-specific nano stores on navigation to prevent stale state.
 * Global stores (toast, currency, notification) persist across navigations.
 *
 * Store shapes verified from source files (2026-02-21 Codex review).
 */
import { resetFilters } from './transactionFiltersStore';
import {
  transactionsDataStore,
  isLoading as transactionsLoading,
  invalidateAllCache,
} from './transactionsDataStore';
import {
  selectedYear,
  isLoading as budgetLoading,
  availableYears,
  currency as budgetCurrency,
} from './budgetHistoryStore';

function resetPageStores() {
  // Reset transaction filters — uses existing resetFilters() which resets to:
  // { type: 'expense', search: '', user_id: '', category_id: '', category_ids: [],
  //   account_id: '', currency: '', start_date: '', end_date: '', page: 1, month: '' }
  resetFilters();

  // Reset transactions data store to initial state
  transactionsDataStore.set({
    transactions: [],
    pagination: { total: 0, limit: 50, offset: 0, page: 1, totalPages: 0 },
    summary: { income: 0, expenses: 0, transactionCount: 0 },
    loading: false,
    error: null,
    categories: [],
    availableMonths: [],
    currency: 'IDR',
  });
  transactionsLoading.set(false);

  // Invalidate the internal monthCache Map — prevents stale cached months
  // from being served when returning to transactions page
  invalidateAllCache();

  // Reset budget history atoms
  selectedYear.set(new Date().getFullYear());
  budgetLoading.set(false);
  availableYears.set([]);
  budgetCurrency.set('IDR');
}

document.addEventListener('astro:before-swap', resetPageStores);
```

**Step 2: Import cleanup in MainLayout**

In `src/layouts/MainLayout.astro`, add a script tag:

```astro
<script>
  import '@/lib/stores/view-transition-cleanup';
</script>
```

This module script runs once and registers the `astro:before-swap` listener.

**Step 3: Verify store shapes**

Read each store file to confirm the reset values match the initial state:

- `src/lib/stores/transactionFiltersStore.ts`
- `src/lib/stores/transactionsDataStore.ts`
- `src/lib/stores/budgetHistoryStore.ts`

**Step 4: Verify**

1. Go to transactions page, apply filters
2. Navigate to dashboard
3. Navigate back to transactions
4. Verify: filters are reset (re-hydrated from SSR data, not stale store)

**Step 5: Commit**

```bash
git add src/lib/stores/view-transition-cleanup.ts src/layouts/MainLayout.astro
git commit -m "feat: reset page-specific nano stores on view transition

Add view-transition-cleanup module that resets transaction and budget
stores on astro:before-swap. Global stores (toast, currency) persist."
```

---

## Task 7: Desktop Scroll Restoration

**Problem:** On desktop, scroll happens on `.drawer-content` container (`lg:h-screen lg:overflow-y-auto`), not on `window`. ClientRouter's automatic scroll restoration only uses `window.scrollY`, so back/forward navigation won't restore scroll position on desktop.

**Files:**

- Modify: `src/layouts/MainLayout.astro` (add scroll save/restore script)

**Step 1: Add scroll restoration script**

Add a `<script>` tag in `MainLayout.astro`:

```typescript
// Desktop scroll restoration for view transitions
// ClientRouter only restores window.scrollY, but our scroll container is .drawer-content
// Uses route-keyed sessionStorage so each page remembers its own scroll position.
// Only restores on history traversal (back/forward), not on fresh link clicks.

const SCROLL_PREFIX = 'vt-scroll:';
let isTraversal = false;

function getScrollContainer(): HTMLElement | null {
  return document.querySelector('.drawer-content');
}

// Detect history traversal via popstate (fires before astro:before-swap)
// popstate ONLY fires on back/forward, never on link clicks or navigate() calls
window.addEventListener('popstate', () => {
  isTraversal = true;
});

// Save scroll position keyed by current route before swap
document.addEventListener('astro:before-swap', () => {
  const container = getScrollContainer();
  if (container) {
    const key = SCROLL_PREFIX + window.location.pathname;
    sessionStorage.setItem(key, String(container.scrollTop));
  }
});

// Restore scroll position after page load — only on back/forward
document.addEventListener('astro:page-load', () => {
  const container = getScrollContainer();
  if (!container) return;

  if (isTraversal) {
    const key = SCROLL_PREFIX + window.location.pathname;
    const saved = sessionStorage.getItem(key);
    if (saved) {
      container.scrollTop = parseInt(saved, 10);
    }
  } else {
    // Fresh navigation: scroll to top (ClientRouter handles window, we handle .drawer-content)
    container.scrollTop = 0;
  }

  isTraversal = false;
});
```

**Why this approach:**

- Uses `popstate` event to detect back/forward — this is a standard API available in all browsers (unlike `window.navigation` which is Chromium-only)
- Route-keyed storage (`vt-scroll:/transactions`, `vt-scroll:/budget`) so each page remembers its own scroll position independently
- Fresh link clicks scroll `.drawer-content` to top (matching expected behavior)
- `isTraversal` flag resets after each `astro:page-load` to prevent stale state

**Step 2: Verify**

1. Navigate to transactions page, scroll down
2. Click to accounts page
3. Press browser back button
4. Verify: scroll position restored on transactions page

**Step 3: Commit**

```bash
git add src/layouts/MainLayout.astro
git commit -m "fix: add desktop scroll restoration for view transitions

ClientRouter only restores window scroll, but desktop uses
.drawer-content as scroll container. Save/restore scroll position
via sessionStorage on astro:before-swap and astro:page-load."
```

---

## Task 8: Integration Testing

Manual testing checklist. Run dev server with `bun run dev`.

**Core Navigation:**

- [ ] Dashboard → Transactions: crossfade, no white flash
- [ ] Transactions → Accounts: crossfade
- [ ] Accounts → Budget: crossfade
- [ ] Budget → Reports: crossfade
- [ ] Back button: works correctly, page state restored
- [ ] Forward button: works correctly

**Sidebar & Navigation:**

- [ ] Sidebar active state updates on navigation
- [ ] Sidebar collapse state persists across navigations (localStorage)
- [ ] Mobile bottom nav active state updates
- [ ] Mobile drawer opens/closes correctly after navigation
- [ ] Navigate while mobile drawer is open: drawer closes, body scroll restores

**Scroll Restoration:**

- [ ] Desktop: scroll down on page → navigate → back → scroll position restored
- [ ] Mobile: same test with window scroll

**Interactive Features (after navigation):**

- [ ] Transaction filters work after navigating to transactions
- [ ] Transaction drawer opens and submits (from any page)
- [ ] Budget inline edit works after navigating to budget
- [ ] Account search works after navigating to accounts
- [ ] Reports tab toggle works after navigating to reports
- [ ] Period navigator works after navigating to transactions/budget
- [ ] Notification dropdown opens/closes
- [ ] Charts render correctly after navigation (spending, allocation, velocity, wealth trajectory)

**Toast Persistence:**

- [ ] Add toast → navigate → toast remains visible
- [ ] Toast auto-dismisses correctly during/after navigation
- [ ] Manual dismiss works after navigation

**Auth Flows (hard navigation):**

- [ ] Click "Sign in" link → full page reload to login
- [ ] Login → redirect to dashboard (full reload via `window.location.href`)
- [ ] Logout → redirect to login (full reload via `window.location.href`)

**Forms:**

- [ ] CSV import form submits correctly (hard reload)
- [ ] OAuth disconnect form works (hard reload)
- [ ] Fetch-based forms (login, signup) work correctly — these use `window.location.href` to redirect, which already bypasses ClientRouter

**CSP Monitoring:**

- [ ] Open DevTools Console, filter for "Content Security Policy"
- [ ] Navigate through several pages
- [ ] Verify: no CSP violation warnings

**Dynamic Routes:**

- [ ] Navigate to `/accounts/[id]` detail page → works
- [ ] Navigate to `/admin/workspaces/[id]` → works
- [ ] Back from detail page → works

**Edge Cases:**

- [ ] Rapid clicking between pages: no errors
- [ ] Navigate during ongoing fetch: no stale data
- [ ] `prefers-reduced-motion`: transitions disabled
- [ ] Open drawer → navigate: drawer closes, body scroll restored
- [ ] Console: no errors, no listener leak warnings
- [ ] DaisyUI drawer checkbox state resets correctly on navigation

**Step: Run quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
bun run build
```

**Step: Measure bundle impact**

```bash
# Before (baseline from main branch):
# Record build output sizes

# After (with ClientRouter):
bun run build
# Compare JS bundle sizes — ClientRouter adds ~5-8KB gzipped
# Verify total stays under 250KB gzipped budget
```

**Step: Final commit**

Fix any issues found during testing, then commit fixes individually.

---

## Task 9 (Optional Enhancement): Sidebar Persist with Client-Side Active State

> Skip this task for MVP if crossfade already provides smooth enough transitions.
> The crossfade masks sidebar re-render, so persist provides minimal visual improvement.

**Files:**

- Modify: `src/components/layouts/Navigation.astro` — add `data-nav-href` to links, always render pulse dot
- Modify: `src/components/layouts/MobileNavigation.astro` — add `data-nav-href` to links
- Modify: `src/layouts/MainLayout.astro` — add `transition:persist` to Navigation, MobileNavigation, Footer
- Create: `src/lib/view-transitions/nav-active-state.ts` — client-side active state updater

**Step 1: Add data attributes to nav links**

In `Navigation.astro`, add `data-nav-href={item.href}` to each `<a>` tag (line 169). Also change the pulse dot from conditional render to CSS hidden:

```astro
<!-- Before -->{
  active && (
    <span class="ml-auto w-2 h-2 bg-accent rounded-full animate-pulse ..." aria-hidden="true" />
  )
}

<!-- After -->
<span
  class={`ml-auto w-2 h-2 bg-accent rounded-full animate-pulse ... ${active ? '' : 'hidden'}`}
  data-nav-dot
  aria-hidden="true"></span>
```

Same for admin nav items.

In `MobileNavigation.astro`, add `data-mobile-nav-href={item.href}` to each `<a>` tag (line 86). Note: uses different attribute name (`data-mobile-nav-href`) than sidebar (`data-nav-href`) so the updater script can target them separately.

**Step 2: Add transition:persist directives**

In `MainLayout.astro`:

```astro
<Navigation currentPath={currentPath} user={user} transition:persist="main-nav" />
<MobileNavigation currentPath={currentPath} transition:persist="mobile-nav" />
<Footer transition:persist="app-footer" />
```

**Step 3: Create active state updater**

Create `src/lib/view-transitions/nav-active-state.ts`:

```typescript
const ACTIVE_CLASSES = ['bg-accent/10', 'text-accent', 'font-bold', 'border-accent/20'];
const INACTIVE_CLASSES = [
  'text-base-content/60',
  'hover:text-base-content',
  'font-medium',
  'border-transparent',
];

function isActivePath(href: string, currentPath: string): boolean {
  if (href === '/settings') {
    return (
      currentPath === '/profile' ||
      currentPath === '/security' ||
      currentPath.startsWith('/settings')
    );
  }
  if (currentPath === href) return true;
  return currentPath.startsWith(href + '/');
}

function updateNavActiveState() {
  const path = window.location.pathname;

  // Update sidebar nav
  document.querySelectorAll<HTMLAnchorElement>('[data-nav-href]').forEach((link) => {
    const href = link.getAttribute('data-nav-href')!;
    const active = isActivePath(href, path);

    ACTIVE_CLASSES.forEach((cls) => link.classList.toggle(cls, active));
    INACTIVE_CLASSES.forEach((cls) => link.classList.toggle(cls, !active));
    link.setAttribute('aria-current', active ? 'page' : '');

    // Toggle pulse dot
    const dot = link.querySelector('[data-nav-dot]');
    dot?.classList.toggle('hidden', !active);

    // Toggle icon accent
    const icon = link.querySelector('svg');
    icon?.classList.toggle('text-accent', active);
  });

  // Update mobile nav
  document.querySelectorAll<HTMLAnchorElement>('[data-mobile-nav-href]').forEach((link) => {
    const href = link.getAttribute('data-mobile-nav-href')!;
    const active = isActivePath(href, path);

    link.classList.toggle('text-accent', active);
    link.setAttribute('aria-current', active ? 'page' : '');

    const iconBg = link.querySelector('.rounded-full');
    iconBg?.classList.toggle('bg-accent/20', active);
    iconBg?.classList.toggle('bg-base-200', !active);

    const icon = link.querySelector('svg');
    icon?.classList.toggle('scale-110', active);
  });
}

document.addEventListener('astro:after-swap', updateNavActiveState);
```

**Step 4: Import in MainLayout**

```astro
<script>
  import '@/lib/view-transitions/nav-active-state';
</script>
```

---

## Task 10 (Optional Enhancement): Replace window.location.href with navigate()

> This makes programmatic navigations use smooth transitions too.
> Without this, `window.location.href = url` causes a full reload (no transition).

**Pattern:**

```typescript
// Before:
window.location.href = '/budget?month=2024-01';

// After:
import { navigate } from 'astro:transitions/client';
navigate('/budget?month=2024-01');
```

**Files to update (in-app navigation only, NOT auth redirects):**

| File                                | Line       | Current URL            |
| ----------------------------------- | ---------- | ---------------------- |
| `BudgetPage.client.ts`              | ~190       | `/budget?month=...`    |
| `budget/index.astro`                | ~617       | `/budget?month=...`    |
| `ReportsPage.client.ts`             | ~261       | Row click href         |
| `AccountCategoryModal.astro`        | ~287       | Current path + params  |
| `CategoryDeleteDialog.astro`        | ~123       | Current path + params  |
| `AccountFormModal.astro`            | ~327       | `/accounts/categories` |
| `AccountCategoryDeleteDialog.astro` | ~113       | Current path + params  |
| `admin/workspaces/[id].astro`       | ~239       | `/admin/workspaces`    |
| `AdminWorkspaceTable.astro`         | ~79, ~85   | Row click href         |
| `AdminUserTable.astro`              | ~110, ~116 | Row click href         |
| `TransactionActionsBar.astro`       | ~127       | `/transactions/import` |
| `TabToggle.astro`                   | ~88        | Tab params             |
| `categories-client.ts`              | ~29, ~298  | Category filter params |
| `account-categories.client.ts`      | ~175       | Category filter params |
| `reports/members/index.astro`       | ~304, ~331 | Member report params   |

**DO NOT change these (keep as `window.location.href` for hard reload):**

- `UserProfile.astro` line ~198 → `/login` (logout)
- `LoginForm.astro` lines ~371, ~375 → auth redirects
- `MfaVerifyForm.astro` line ~226 → auth redirect
- `RegistrationForm.astro` line ~348 → auth redirect
- `signup.astro` line ~458 → auth redirect

---

## Subagent Execution Strategy

**Wave 1 (sequential - core infrastructure):**

- Task 1: ClientRouter + Toast persist
- Task 2: Hard navigation points

**Wave 2 (parallel - independent file groups):**

- Task 3: Layout component scripts (4 files, includes MobileDrawer scroll lock fix)
- Task 4: Page orchestrator scripts (6 files)
- Task 5: Interactive component scripts (11 files)

**Wave 3 (sequential - depends on Wave 2):**

- Task 6: Nano store lifecycle
- Task 7: Desktop scroll restoration

**Wave 4:**

- Task 8: Integration testing + quality gates + bundle measurement

**Wave 5 (optional, after core is stable):**

- Task 9: Sidebar persist
- Task 10: navigate() replacement
