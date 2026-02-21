# Astro View Transitions with ClientRouter

## Goal

Add smooth crossfade page transitions across all pages using Astro's `<ClientRouter />`. Eliminate white flash on navigation, persist stable layout elements, and safely re-initialize client-side JavaScript after soft navigation.

## Motivation

Polish and feel — make the app feel native/premium before MVP launch. The codebase is already ~60% prepared (18/31 `.client.ts` files use `astro:page-load`).

## CSP Compatibility

**Status: Compatible.** The project uses nonce-based CSP via HTTP headers (`src/middleware/security-headers.ts`). Astro docs warn CSP headers are unsupported with ClientRouter, but analysis shows this is **not a blocker** for this project:

1. **All `is:inline` scripts are on auth pages** (signup, forgot-password) which use hard reload (`data-astro-reload`) — fresh CSP header on every load.
2. **The theme script in BaseLayout** (`is:inline nonce={cspNonce}`) runs once on initial hard load. `<html>` element persists across soft navigations, so `data-theme` stays set.
3. **All other scripts are module scripts** bundled by Vite, loaded as `<script type="module" src="...">` — allowed by `script-src: 'self'` without nonces.
4. **Nonce injection middleware** adds nonces to all `<script>` tags in HTML responses, but module scripts from `src` are allowed by `'self'` regardless.

**Mitigation:** Monitor browser console for CSP violations after enabling ClientRouter. If issues arise, switch to `Content-Security-Policy-Report-Only` during stabilization.

## Architecture

### ClientRouter Setup

Add `<ClientRouter />` to `BaseLayout.astro` `<head>`. This enables SPA-like client-side routing with crossfade transitions for all pages.

```astro
---
import { ClientRouter } from 'astro:transitions';
---

<head>
  <ClientRouter />
</head>
```

Default `fade` animation. `prefers-reduced-motion` automatically disables animations.

### Persist Strategy

| Element                                  | Persist | Reason                                           |
| ---------------------------------------- | ------- | ------------------------------------------------ |
| Sidebar (`Navigation.astro`)             | Yes     | URL-based active state, collapse in localStorage |
| Footer (`Footer.astro`)                  | Yes     | Static content                                   |
| Toast container (`ToastContainer.astro`) | Yes     | Self-managed nano store                          |
| Mobile nav (`MobileNavigation.astro`)    | Yes     | URL-based active state                           |
| Header (`Header.astro`)                  | **No**  | Page-specific subtitle, slots, dynamic height    |
| Main content                             | **No**  | Page-specific, swaps with crossfade              |

#### Sidebar Active State Client-Side Update

Since `currentPath` is a server-rendered Astro prop, persisted sidebar won't update active classes. Fix with `astro:after-swap` listener:

```typescript
document.addEventListener('astro:after-swap', () => {
  const path = window.location.pathname;
  document.querySelectorAll('[data-nav-link]').forEach((link) => {
    const href = link.getAttribute('href');
    const active = isActivePath(href, path);
    link.classList.toggle('bg-accent/10', active);
    link.classList.toggle('text-accent', active);
    link.classList.toggle('font-bold', active);
    link.setAttribute('aria-current', active ? 'page' : '');
  });
});
```

Same `isActive()` logic already in `Navigation.astro`, ported to client-side.

### Script Re-initialization

#### Already Working (18 files)

These `.client.ts` files already listen to `astro:page-load`. Verify they have cleanup guards (no duplicate listeners):

- ThemeToggle, Header, MobileDrawer, ScrollHint
- TransactionsPage, BudgetPage, BudgetHistoryPage, ReportsPage
- TransactionDrawer, PeriodNavigator, Drawer, ConfirmationModal
- NotificationDropdown, AccountSearch, CalculatorsPage
- TransactionHistory, TransactionList, CSVImportForm

#### Need `astro:page-load` Added (~13 files)

Audit and add initialization lifecycle to remaining `.client.ts` files. Pattern:

```typescript
function init() {
  // cleanup previous listeners if needed
  // re-query DOM elements
  // attach event listeners
}

document.addEventListener('astro:page-load', init);
```

#### Cleanup Pattern

Prevent event listener accumulation across navigations:

```typescript
let controller: AbortController | null = null;

function init() {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;

  element.addEventListener('click', handler, { signal });
}
```

### Nano Store Lifecycle

#### Page-Specific Stores (reset on navigation)

Reset on `astro:before-swap`:

- `transactionFiltersStore` — filter state for transactions page
- `transactionsDataStore` — cached transaction data
- `budgetHistoryStore` — budget timeline state

```typescript
document.addEventListener('astro:before-swap', () => {
  resetTransactionFilters();
  resetTransactionsData();
  resetBudgetHistory();
});
```

#### Global Stores (keep alive)

These survive navigation:

- `toastStore` — active toast notifications
- `currencyStore` — selected currency
- `notificationStore` — notification queue

### Edge Cases

#### Hard Navigation Points

Add `data-astro-reload` to force full page reload:

- **Login/logout links** — must reset all client state
- **CSV import form** — file upload requires real form submission
- **OAuth redirect links** — external redirects

#### Drawer/Modal Cleanup

Close open drawers and modals on navigation:

```typescript
document.addEventListener('astro:before-swap', () => {
  // Close any open drawers
  document.querySelectorAll('[data-drawer][data-open]').forEach((drawer) => {
    drawer.removeAttribute('data-open');
  });
  // Cancel ongoing motion animations
});
```

#### MobileDrawer Scroll Lock

MobileDrawer sets `body.style.overflow = 'hidden'` when open. Must close drawer and restore overflow on `astro:before-swap` to prevent stale scroll lock on the next page.

#### Back/Forward Navigation

- Nano stores re-hydrate from SSR `data-ssr-data` attributes on page-load
- History state preserved by Astro's router

#### Scroll Restoration

**Desktop:** Scroll happens on `.drawer-content` container (not window). ClientRouter's automatic scroll restoration only works with `window.scrollY`. Desktop needs manual scroll position save/restore via `astro:before-swap` (save) and `astro:page-load` (restore).

**Mobile:** Uses default window scroll — automatic restoration works.

### Animation Details

- **Default**: Crossfade (`fade`) ~300ms
- **Reduced motion**: Instant swap, no animation (automatic)
- **Fallback**: `animate` mode (default) — Astro simulates transitions in non-Chromium browsers

No custom `transition:animate` directives needed. Default fade is sufficient for MVP.

## Complexity Estimate

| Area                                    | Effort       | Risk       |
| --------------------------------------- | ------------ | ---------- |
| ClientRouter + persist setup            | ~30 min      | Low        |
| Sidebar active state client fix         | ~30 min      | Low        |
| Audit 18 existing `.client.ts` files    | ~1 hour      | Low        |
| Add lifecycle to ~13 `.client.ts` files | ~2 hours     | Medium     |
| Nano store cleanup/reset                | ~1 hour      | Medium     |
| Edge cases (forms, auth, drawers)       | ~1 hour      | Medium     |
| Testing all flows                       | ~2 hours     | Medium     |
| Scroll restoration (desktop)            | ~30 min      | Medium     |
| MobileDrawer scroll lock fix            | ~15 min      | Low        |
| **Total**                               | **~9 hours** | **Medium** |

## What We're NOT Doing

- No custom morph animations between shared elements
- No `transition:name` on individual cards/rows
- No slide animations (crossfade only)
- No `transition:persist-props`
- No `data-astro-rerun` (using `astro:page-load` pattern instead)

## Success Criteria

1. All page navigations use smooth crossfade (no white flash)
2. Sidebar, footer, toast persist without flicker
3. Sidebar active state updates correctly on navigation
4. All interactive features work after soft navigation (filters, drawers, forms)
5. Nano stores reset properly between page-specific contexts
6. Login/logout performs hard navigation
7. Back/forward browser buttons work correctly
8. No event listener leaks (verified via DevTools)
9. `prefers-reduced-motion` disables animations
