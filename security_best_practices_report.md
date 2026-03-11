# Security Best Practices Report

## Executive Summary

I reviewed the TypeScript/Astro code under `src/` with emphasis on auth, session handling, token lifecycle, API protection, and browser-side trust boundaries.

The highest-priority issues are:

1. A production deployment can fall back to a hardcoded Better Auth secret if `NODE_ENV` is not exactly `"production"`.
2. Password reset, email verification, and workspace invitation tokens are stored in plaintext in the database.
3. Password changes do not revoke existing sessions.
4. Expired API keys can remain usable through the MCP endpoint for up to the cache TTL.

I did not find a clean, directly exploitable user-controlled DOM XSS path in the reviewed frontend code. I did find several architectural browser-side patterns that would amplify the impact of any future escaping, cache-poisoning, or callback-handling bug.

## High Severity

### AW-SEC-001: Better Auth can fall back to a known hardcoded secret

- Severity: High
- Location:
  - `src/lib/auth/server.ts:14`
  - `src/lib/auth/server.ts:15`
  - `src/lib/auth/server.ts:17`
  - `src/lib/auth/server.ts:20`
- Evidence:
  - `src/lib/auth/server.ts:14` determines production mode only via `getEnv('NODE_ENV') === 'production'`.
  - `src/lib/auth/server.ts:15`-`17` falls back to `'better-auth-dev-secret-for-local-development-only-0123456789'` whenever that check is false.
  - `src/lib/auth/server.ts:20`-`21` throws only when `secret` is absent.
- Impact:
  - A real deployment with an unset or nonstandard `NODE_ENV` can use a public, known signing secret for auth material. That breaks the trust boundary for session-related authentication.
- Fix:
  - Require `BETTER_AUTH_SECRET` explicitly in all non-test environments.
  - Do not infer permission to use a dev secret from `NODE_ENV`.
  - If a development fallback is kept, gate it behind an explicit local-development flag and fail closed otherwise.

### AW-SEC-002: Recovery and invitation tokens are stored in plaintext at rest

- Severity: High
- Location:
  - `src/services/base/token.factory.ts:15`
  - `src/services/base/token.factory.ts:21`
  - `src/services/base/token.factory.ts:32`
  - `src/services/base/token.factory.ts:40`
  - `src/db/schema/sqlite/password-reset-tokens.ts:15`
  - `src/db/schema/sqlite/email-verification-tokens.ts:15`
  - `src/db/schema/sqlite/workspace-invitations.ts:13`
  - `src/services/workspace-invitation.service.ts:118`
  - `src/services/workspace-invitation.service.ts:128`
  - `src/services/workspace-invitation.service.ts:149`
- Evidence:
  - `src/services/base/token.factory.ts:15` generates a raw `nanoid(64)` token.
  - `src/services/base/token.factory.ts:21`-`25` inserts the raw token into the database.
  - `src/services/base/token.factory.ts:32`-`35` validates by direct token equality against the stored value.
  - `src/services/base/token.factory.ts:40`-`41` consumes by direct token equality.
  - `src/services/workspace-invitation.service.ts:118` and `src/services/workspace-invitation.service.ts:128` do the same for invitation tokens.
  - The backing schemas store these tokens in plain `text` columns.
- Impact:
  - Anyone with database read access can immediately use password reset, email verification, or invitation tokens as bearer credentials.
- Fix:
  - Store only a hash of each token at rest.
  - Keep plaintext only long enough to send the outbound email/link.
  - Validate incoming tokens by hashing them and comparing the stored hash.
  - Treat these tokens like API keys or passwords, not ordinary identifiers.

## Medium Severity

### AW-SEC-003: Password changes do not revoke existing sessions

- Severity: Medium
- Location:
  - `src/pages/api/user/password.ts:17`
  - `src/pages/api/user/password.ts:18`
  - `src/services/user.service.ts:137`
  - `src/services/user.service.ts:145`
  - `src/services/user.service.ts:156`
- Evidence:
  - `src/pages/api/user/password.ts:18` explicitly documents that the session remains active after password change.
  - `src/services/user.service.ts:137`-`160` updates password hashes only and never deletes or rotates session records.
  - The codebase already deletes sessions for other sensitive flows, for example `src/pages/api/auth/verify-email.ts:63`.
- Impact:
  - If an attacker already has a stolen session cookie, the victim changing their password does not remove that attacker’s access.
- Fix:
  - Revoke all other sessions on password change at minimum.
  - Prefer revoking all sessions and forcing fresh authentication for the current session as well.

### AW-SEC-004: Expired API keys can stay valid through the cache window

- Severity: Medium
- Location:
  - `src/services/api-key.service.ts:181`
  - `src/services/api-key.service.ts:205`
  - `src/services/api-key.service.ts:216`
  - `src/services/api-key.service.ts:226`
  - `src/pages/api/mcp.ts:119`
- Evidence:
  - `src/services/api-key.service.ts:181`-`183` checks key expiration only in `validate()`.
  - `src/services/api-key.service.ts:205`-`231` caches the successful auth context for 300 seconds.
  - `src/services/api-key.service.ts:216`-`218` returns cached auth context without re-checking expiration.
  - `src/pages/api/mcp.ts:119` uses `validateCached()` for MCP authentication.
- Impact:
  - An API key that expires shortly after a successful request can remain usable until the cache entry ages out.
- Fix:
  - Include the key expiration in the cached value and reject cached entries after expiration.
  - Cap cache TTL to the remaining key lifetime.
  - Alternatively avoid caching positive auth for expiring bearer tokens.

### AW-SEC-005: Turnstile protection fails open when the secret is missing

- Severity: Medium
- Location:
  - `src/lib/turnstile.ts:38`
  - `src/lib/turnstile.ts:40`
  - `src/pages/api/auth/[...all].ts:5`
  - `src/pages/api/auth/[...all].ts:57`
- Evidence:
  - `src/lib/turnstile.ts:40`-`42` returns `{ success: true }` when `TURNSTILE_SECRET_KEY` is unset.
  - `src/pages/api/auth/[...all].ts:5` protects `/api/auth/sign-in/email` and `/api/auth/sign-up/email`.
  - `src/pages/api/auth/[...all].ts:57` trusts the verification result directly.
- Impact:
  - A missing environment variable silently disables anti-automation on the most abuse-prone auth endpoints.
- Fix:
  - Fail closed in environments where Turnstile is expected.
  - Add startup validation so protected routes cannot run without the required secret.
  - If local development must skip Turnstile, gate that explicitly and visibly.

### AW-SEC-006: Multiple browser renderers inject raw HTML fragments into `innerHTML`

- Severity: Medium
- Location:
  - `src/components/organisms/ReportsRenderer.client.ts:102`
  - `src/components/organisms/ReportsRenderer.client.ts:140`
  - `src/components/organisms/ReportsRenderer.client.ts:170`
  - `src/components/organisms/ReportsRenderer.client.ts:194`
  - `src/components/organisms/TransactionsRenderer.client.ts:148`
  - `src/components/organisms/TransactionsRenderer.client.ts:182`
  - `src/components/organisms/TransactionsRenderer.client.ts:230`
  - `src/components/organisms/BudgetRenderer.client.ts:111`
  - `src/components/organisms/BudgetRenderer.client.ts:160`
  - `src/components/organisms/BudgetRenderer.client.ts:193`
  - `src/components/organisms/BudgetRenderer.client.ts:206`
  - `src/components/organisms/RecurringPage.client.ts:155`
  - `src/components/organisms/RecurringPage.client.ts:174`
  - `src/components/organisms/RecurringPage.client.ts:188`
  - `src/components/organisms/RecurringPage.client.ts:200`
  - `src/components/molecules/SecurityApiKeysCard.astro:197`
- Evidence:
  - These modules fetch same-origin HTML partials and insert them directly into the DOM with `innerHTML`.
- Impact:
  - This is not a direct exploit by itself, but it creates many DOM-XSS sinks. Any future escaping mistake, cache-poisoning issue, or accidental raw-HTML response on these endpoints becomes executable in the browser.
- Fix:
  - Prefer DOM patching or parsing into inert documents and extracting only expected nodes.
  - Consider Trusted Types enforcement for HTML sinks.
  - At minimum, isolate these sinks behind one audited helper instead of repeating them broadly.
- False positive notes:
  - I did not confirm a current user-controlled payload reaching these sinks. This is a blast-radius and secure-design finding.

### AW-SEC-007: Auth clients trust server-returned redirect URLs without local validation

- Severity: Medium
- Location:
  - `src/components/molecules/LoginForm.astro:314`
  - `src/components/atoms/GoogleButton.astro:84`
- Evidence:
  - `src/components/molecules/LoginForm.astro:314` navigates to `result.url`.
  - `src/components/atoms/GoogleButton.astro:84` does the same for social sign-in.
  - The code correctly sanitizes user-supplied redirect parameters earlier, but it does not validate the final server-returned URL before navigation.
- Impact:
  - If the backend or upstream auth library ever returns an attacker-controlled absolute URL, the browser will follow it directly, enabling phishing or open-redirect style abuse.
- Fix:
  - Validate that returned URLs are same-origin before navigation.
  - If cross-origin redirects are required for OAuth, allowlist exact expected origins.

## Low Severity

### AW-SEC-008: `PERF_DEBUG` exposes internal route and timing data to all page visitors

- Severity: Low
- Location:
  - `src/layouts/BaseLayout.astro:22`
  - `src/layouts/BaseLayout.astro:51`
  - `src/lib/perf/collector.ts:387`
  - `src/lib/perf/collector.ts:392`
  - `src/lib/perf/collector.ts:403`
  - `src/lib/perf/collector.ts:417`
  - `src/lib/perf/collector.ts:425`
  - `src/lib/perf/collector.ts:441`
  - `src/lib/perf/collector.ts:450`
- Evidence:
  - `src/layouts/BaseLayout.astro:22` reads `perf.toHtmlComment()`.
  - `src/layouts/BaseLayout.astro:51` injects it into every page.
  - `src/lib/perf/collector.ts` includes route, dialect, cache driver, query names, service names, and timing information in the comment.
- Impact:
  - If `PERF_DEBUG=true` is enabled outside a trusted environment, every browser client receives internal stack and profiling data in page source.
- Fix:
  - Restrict this to local development only.
  - Consider tying it to an authenticated admin-only flag instead of a raw environment switch.

## Notes

- Positive finding: user-supplied post-auth redirects are normalized defensively in `src/lib/auth/redirect.ts:7`.
- Positive finding: I did not find a direct, confirmed user-controlled DOM XSS path in the reviewed frontend code.
- Residual deployment risk: `src/lib/rate-limit.ts` uses a process-local in-memory `Map`. That is acceptable for local development but should not be treated as strong production rate limiting in multi-instance deployments.

## Recommended Fix Order

1. Remove the Better Auth dev-secret fallback and require an explicit secret.
2. Hash password reset, email verification, and invitation tokens at rest.
3. Revoke sessions on password change.
4. Fix cached API key expiration handling on `/api/mcp`.
5. Make Turnstile configuration fail closed where bot protection is expected.
6. Reduce frontend `innerHTML` sink surface and validate server-returned redirect URLs.
