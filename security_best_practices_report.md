# Better Auth Migration Security Review

## Executive Summary

Reviewed the Better Auth migration surface on the current branch, focusing on the new auth catch-all route, login and MFA flows, middleware integration, and related auth helpers.

Confirmed 2 security findings:

1. A post-login redirect path was accepted from `?redirect=` and reused in client-side navigation without app-owned normalization.
2. Turnstile verification trusted `x-forwarded-for` before Cloudflare's client IP header, allowing spoofed IP attribution on protected auth requests.

Both findings have been fixed on this branch. No additional critical findings were confirmed in the reviewed Better Auth migration files.

## High Severity

### F-001: Unsanitized post-auth redirect target in login and MFA flows

- Rule ID: `F-001`
- Severity: High
- Status: Fixed
- Impact: An attacker-controlled `redirect` query parameter could turn successful auth completion into an open redirect, which is useful for phishing and token-adjacent login flow abuse.
- Location:
  - `src/pages/login.astro:13-17`
  - `src/pages/login/verify-mfa.astro:13-18`
  - `src/components/molecules/LoginForm.astro:174-177`
  - `src/components/molecules/LoginForm.astro:295-319`
  - `src/components/molecules/MfaVerifyForm.astro:132-133`
  - `src/components/molecules/MfaVerifyForm.astro:228-229`
  - `src/lib/auth/redirect.ts:1-38`
- Evidence:

```ts
const redirect = sanitizePostAuthRedirect(url.searchParams.get('redirect'));
const redirectTo = sanitizePostAuthRedirect(loginForm?.dataset.redirect);
window.location.href = redirectTo || '/dashboard';
```

- Triage:
  - Confirmed.
  - Better Auth already validates `callbackURL` on the server, but the app still had its own client-side redirect plumbing and needed its own normalization at the page/component boundary.
- Fix:
  - Added `sanitizePostAuthRedirect(...)` in `src/lib/auth/redirect.ts`.
  - Applied it on both server-rendered entry pages and client-side auth components before any redirect decision.
  - Added targeted tests in `src/lib/auth/redirect.test.ts`.
- Mitigation:
  - Keep all app-owned redirect plumbing relative-path only.
  - Reuse the same helper anywhere future auth-adjacent pages accept `redirect`, `next`, or `returnTo`.
- False positive notes:
  - None. This branch directly consumed query-derived redirect state in client navigation logic.

## Medium Severity

### F-002: Spoofable forwarding header used for Turnstile IP attribution

- Rule ID: `F-002`
- Severity: Medium
- Status: Fixed
- Impact: A client could influence the IP sent to Turnstile by supplying `x-forwarded-for`, weakening auth anti-abuse checks tied to client IP.
- Location:
  - `src/pages/api/auth/[...all].ts:7-23`
  - `src/pages/api/auth/[...all].ts:56-57`
- Evidence:

```ts
const cloudflareIp = headers.get('cf-connecting-ip');
if (cloudflareIp) return cloudflareIp.trim();
```

- Triage:
  - Confirmed.
  - The new Better Auth catch-all route is the branch-owned enforcement point for Turnstile on credential sign-in and sign-up.
  - In a Cloudflare deployment, `cf-connecting-ip` is the trusted header and should win over user-controlled forwarding chains.
- Fix:
  - Reordered IP extraction to prefer `cf-connecting-ip`, then `x-real-ip`, then `x-forwarded-for`.
  - Added a regression test in `src/__tests__/api/auth/[...all].test.ts`.
- Mitigation:
  - When a trusted server-provided client address is available in future route contexts, prefer it over any raw header parsing.
- False positive notes:
  - None. The original implementation preferred `x-forwarded-for` before the Cloudflare header.

## Residual Risk / Verification Notes

- Production should still be checked for correct auth env configuration, especially `BETTER_AUTH_SECRET`, `PUBLIC_URL`, `PUBLIC_TURNSTILE_SITE_KEY`, and `TURNSTILE_SECRET_KEY`.
- This review was scoped to the Better Auth migration branch surface, not the entire application.
