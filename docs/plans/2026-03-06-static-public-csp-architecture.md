# Static Public CSP Architecture

## Problem

Cloudflare serves prerendered HTML as static assets. Those requests bypass the Astro worker and do not run `src/middleware/security-headers.ts`.

That means a prerendered page cannot depend on:

- middleware-injected security headers
- per-request CSP nonces
- any HTML rewrite step in the worker

## Architecture

Allowealth now uses two CSP paths:

### 1. Prerendered public pages

Routes:

- `/`
- `/privacy`
- `/terms`

Requirements:

- The page must be explicitly prerendered with `export const prerender = true;`
- Shared layout scripts must stay external
- Security headers must be defined in `public/_headers`

Implementation details:

- `src/layouts/BaseLayout.astro` loads `/scripts/theme-init.js` instead of an inline theme bootstrap
- `public/_headers` defines CSP and the other static security headers for the prerendered public routes
- `src/middleware/auth.ts` and `src/middleware/csrf.ts` short-circuit static public routes so prerender does not touch cookie-backed request state

### 2. Worker-rendered routes

Routes:

- authenticated pages
- forms with deliberate inline scripts
- any route handled by the Astro worker

Requirements:

- `src/middleware/security-headers.ts` remains the source of truth for security headers
- Inline scripts must read `Astro.locals.cspNonce` and render `nonce={cspNonce}`

Implementation details:

- The middleware stays header-only
- No response body buffering or HTML rewrite is allowed on the hot path

## Why This Split Exists

CSP nonces must be unique per HTTP response. Static HTML cannot safely ship a reusable nonce.

For public prerendered pages, the correct model is:

- no inline script dependency in shared layouts
- static headers at the asset layer

For worker-rendered pages, the correct model is:

- per-request nonce generation in middleware
- manual nonce application only where inline scripts are intentional

## Rules For Future Public Static Pages

When adding a new public page that should stay prerendered:

1. Add `export const prerender = true;`
2. Keep all layout and page scripts external
3. Add the route to `public/_headers`
4. Extend `src/__tests__/public-static-security.test.ts`
5. Run `bun run scripts/verify-static-public-security.mjs`
6. Verify the built route is emitted as static HTML and excluded from worker routing
