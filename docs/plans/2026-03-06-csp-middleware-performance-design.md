# CSP Middleware Performance Design

**Problem**

`src/middleware/security-headers.ts` currently reads and rewrites every HTML response to inject a CSP nonce into `<script>` tags. On Cloudflare Workers this burns CPU on the hottest path and risks the 50 ms CPU budget.

**Root Cause**

The middleware rewrite exists because Astro emits some processed component scripts inline when they are small enough. Those inline scripts do not carry a nonce, so the app compensates by buffering HTML and rewriting it at request time.

**Approved Approach**

Disable Astro's automatic script inlining by setting `vite.build.assetsInlineLimit` to `0`. This forces processed component scripts to ship as external module files instead of inline blocks. Keep the existing nonce-based CSP for the small set of deliberate inline scripts and attach `nonce={Astro.locals.cspNonce}` directly where needed.

**Why This Approach**

- Removes per-request HTML body reads and rewrites.
- Preserves the current `ClientRouter` and view-transition architecture.
- Keeps CSP strict for intentional inline scripts.
- Avoids a larger migration to Astro's experimental hash-based CSP, which currently conflicts with this app's transition usage.

**Non-Goals**

- Replacing `ClientRouter`
- Migrating to Astro experimental CSP
- Reworking style CSP in this change

**Expected Outcome**

The middleware becomes header-only. HTML responses stay streaming-friendly, Cloudflare Worker CPU drops materially on page requests, and CSP still allows only self-hosted/external scripts plus deliberate nonce-tagged inline scripts.
