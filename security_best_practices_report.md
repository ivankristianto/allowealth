# Security Best Practices Report

## Executive Summary

I reviewed and then remediated the Better Auth and Cloudflare Turnstile migration issues identified earlier on 2026-03-11.

The three validated findings from that review are fixed on this branch:

1. bearer links are no longer logged through auth email fallback paths outside development or test
2. production startup now fails when Turnstile config is missing
3. Better Auth now has explicit rate-limit rules, explicit client-IP headers, and shared secondary storage when Upstash cache is configured

I did not identify a remaining confirmed CSRF or redirect regression in the Better Auth integration during this remediation pass.

## Remediated Findings

### AW-SEC-001: Bearer action links exposed in logs on email fallback paths

- Status: Fixed
- Updated locations:
  - `/Users/ivan/Works/allowealth.worktrees/migrate-to-better-auth/src/lib/auth/server.ts:101`
  - `/Users/ivan/Works/allowealth.worktrees/migrate-to-better-auth/src/services/email/email.service.ts:87`
  - `/Users/ivan/Works/allowealth.worktrees/migrate-to-better-auth/src/services/email/email.service.ts:160`
- Remediation:
  - password reset now goes through `EmailService` instead of logging the raw reset URL
  - password reset delivery failures are swallowed and logged without tokens so the forgot-password flow remains indistinguishable for existing and nonexistent emails
  - console email fallback is limited to development and test
  - production-like environments now throw `EMAIL_NOT_CONFIGURED` instead of logging token-bearing content

### AW-SEC-002: Turnstile protection failed open when production captcha config was missing

- Status: Fixed
- Updated locations:
  - `/Users/ivan/Works/allowealth.worktrees/migrate-to-better-auth/src/lib/auth/server.ts:34`
  - `/Users/ivan/Works/allowealth.worktrees/migrate-to-better-auth/src/lib/auth/server.ts:36`
- Remediation:
  - production startup now throws if either `PUBLIC_TURNSTILE_SITE_KEY` or `TURNSTILE_SECRET_KEY` is missing
  - captcha is no longer silently disabled in production

### AW-SEC-003: Better Auth abuse controls relied on implicit defaults

- Status: Fixed
- Updated locations:
  - `/Users/ivan/Works/allowealth.worktrees/migrate-to-better-auth/src/lib/auth/server.ts:39`
  - `/Users/ivan/Works/allowealth.worktrees/migrate-to-better-auth/src/lib/auth/server.ts:113`
  - `/Users/ivan/Works/allowealth.worktrees/migrate-to-better-auth/src/lib/auth/secondary-storage.ts:1`
- Remediation:
  - Better Auth now has explicit route-specific rate-limit rules for sign-in, sign-up, password reset, and social sign-in initiation
  - Better Auth now prefers `cf-connecting-ip` before `x-forwarded-for`
  - Better Auth now uses shared secondary storage when the existing cache layer is backed by Upstash

## Residual Risk

- Shared Better Auth storage still depends on deployment configuration. If production runs on a multi-instance or serverless target without Upstash configured, Better Auth falls back to in-memory rate-limit storage. That is safer than the previous implicit setup because the rules are now explicit, but it is still weaker than shared storage.

## Verification

- `bun test src/lib/auth/server.test.ts src/services/email/email.service.test.ts 'src/__tests__/api/auth/[...all].test.ts'`
- `bun run typecheck`
- `bun run build`
- `bunx eslint src/lib/auth/server.ts src/lib/auth/secondary-storage.ts src/services/email/email.service.ts src/lib/auth/server.test.ts src/services/email/email.service.test.ts`
