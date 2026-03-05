# ADR 013: Astro View Transitions with ClientRouter

## Status

Accepted (implemented in [#266](https://github.com/ivankristianto/allowealth/pull/266))

## Context

Page navigations cause a white flash and full page reload, making the app feel like a traditional server-rendered site rather than a polished native application. The codebase is partially prepared — 18 of 31 `.client.ts` files already use the `astro:page-load` lifecycle event. Astro's `<ClientRouter />` enables SPA-like client-side routing with minimal changes.

### CSP Compatibility

The project uses nonce-based CSP via HTTP headers. Analysis confirms compatibility:

1. All `is:inline` scripts are on auth pages which use `data-astro-reload` (hard reload = fresh CSP header)
2. The theme script in BaseLayout runs once on initial hard load; `<html>` persists across soft navigations
3. All other scripts are Vite-bundled module scripts, allowed by `script-src: 'self'`

## Decision

Add `<ClientRouter />` to `BaseLayout.astro` for crossfade page transitions across all pages.

### 1. Persist Strategy

| Element         | Persist | Reason                                           |
| --------------- | ------- | ------------------------------------------------ |
| Sidebar         | Yes     | URL-based active state, collapse in localStorage |
| Footer          | Yes     | Static content                                   |
| Toast container | Yes     | Self-managed nano store                          |
| Mobile nav      | Yes     | URL-based active state                           |
| Header          | No      | Page-specific subtitle, slots, dynamic height    |
| Main content    | No      | Page-specific, swaps with crossfade              |

Persisted sidebar requires a client-side `astro:after-swap` listener to update active navigation state (the server-rendered `currentPath` prop doesn't update on soft navigation).

### 2. Script Re-initialization

**Pattern:** All `.client.ts` files use `astro:page-load` for initialization with `AbortController` cleanup to prevent listener accumulation.

**See `.claude/rules/frontend/astro.md` → "Client Script Initialization" for the complete standard pattern, anti-patterns, and decision tree.**

### 3. Nano Store Lifecycle

**Page-specific stores** (transaction filters, transaction data, budget history) reset on `astro:before-swap`.

**Global stores** (toasts, currency, notifications) survive navigation.

### 4. Hard Navigation Points

`data-astro-reload` forces full page reload for:

- Login/logout links (must reset all client state)
- CSV import form (file upload requires real form submission)
- OAuth redirect links (external redirects)

### 5. Edge Cases

- **Drawer/modal cleanup:** Close open drawers and cancel animations on `astro:before-swap`
- **MobileDrawer scroll lock:** Restore `body.style.overflow` on `astro:before-swap`
- **Desktop scroll restoration:** Manual save/restore via `astro:before-swap` and `astro:page-load` (scroll container is `.drawer-content`, not `window`)
- **Mobile scroll:** Uses default window scroll — automatic restoration works
- **Back/forward navigation:** Nano stores re-hydrate from SSR `data-ssr-data` attributes

### 6. Animation

Default crossfade (`fade`) ~300ms. `prefers-reduced-motion` automatically disables animations. Astro simulates transitions in non-Chromium browsers via `animate` mode.

## Consequences

### Positive

- Eliminates white flash between page navigations
- Sidebar, footer, toast persist without flicker
- All interactive features work after soft navigation
- `prefers-reduced-motion` respected automatically

### Negative

- Every `.client.ts` file must handle `astro:page-load` lifecycle and cleanup
- Persisted elements need client-side state synchronization (e.g., sidebar active state)
- Desktop scroll restoration requires manual implementation

### Non-Goals

- Custom morph animations between shared elements
- `transition:name` on individual cards/rows
- Slide animations (crossfade only)
- `transition:persist-props`
