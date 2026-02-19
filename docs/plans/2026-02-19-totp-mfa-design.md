# TOTP MFA Design Document

**Date:** 2026-02-19
**Issue:** [#169](https://github.com/ivankristianto/allowealth/issues/169)
**Status:** Design approved, extending existing plan

---

## Overview

Add optional TOTP-based multi-factor authentication with backup codes. This document extends the existing implementation plan (`2026-02-08-totp-mfa.md`) with 3 additional features decided during brainstorming, plus a runtime compatibility fix.

## Decisions from Brainstorming

| Decision             | Choice                            | Rationale                                         |
| -------------------- | --------------------------------- | ------------------------------------------------- |
| Dashboard banner     | Dismissible banner (localStorage) | Low friction, user discovers MFA organically      |
| Audit logging        | Yes, log MFA events               | Financial app — security events must be trackable |
| Admin MFA visibility | Show badge in members list        | Admins need security posture awareness            |
| Device naming        | Skip for now                      | Single device covers 95% of use cases             |
| Pending auth state   | Temporary signed cookie (5min)    | Clean separation from Lucia sessions              |

## Architecture Summary

### Core Flow (from existing plan)

- **Database**: 2 new tables (`user_mfa`, `user_mfa_backup_codes`) in both SQLite and PostgreSQL
- **Crypto**: AES-256-GCM for TOTP secret encryption, PBKDF2-SHA256 for backup code hashing, all via Web Crypto API
- **Libraries**: `@oslojs/otp` (TOTP), `qrcode` (QR generation)
- **Login flow**: Password → check MFA → set `mfa_pending` cookie (5min) → redirect to `/login/verify-mfa` → verify TOTP/backup → create Lucia session
- **Setup flow**: Security page → "Enable MFA" → modal with QR code → verify code → show backup codes
- **Service**: `MfaService` handles all business logic (setup, verify, disable, backup codes)

### Addition 1: Dismissible MFA Banner on Dashboard

**Component:** `MfaEnableBanner.astro`
**Location:** Rendered in `src/pages/dashboard.astro` after the onboarding checklist, before the main dashboard content.

**Server-side logic:**

- Fetch MFA status via `mfaService.getStatus(user.id)`
- If MFA is not enabled, render the banner component
- Banner shows only when MFA is disabled

**Client-side logic:**

- Check `localStorage.getItem('mfa-banner-dismissed')` — if set, hide banner via CSS
- On dismiss click, set `localStorage.setItem('mfa-banner-dismissed', 'true')` and hide
- Link to `/security` page

**Design:**

- Uses existing `BudgetAlertBanner` pattern with `variant="info"`
- Title: "Protect your account with two-factor authentication"
- Message: "Add an extra layer of security to your financial data."
- CTA: "Enable MFA" link to `/security`
- Dismissible via X button

### Addition 2: Audit Logging for MFA Events

**Changes to `src/lib/audit-log.ts`:**

Add new action types:

```typescript
type AuditAction = ... | 'mfa_setup_init' | 'mfa_enable' | 'mfa_disable' | 'mfa_backup_regenerate';
```

Add new entity type:

```typescript
type AuditEntityType = ... | 'user_mfa';
```

**Changes to `MfaService`:**

Add fire-and-forget `void logAuditEvent(...)` calls in:

- `initSetup()` → `action: 'mfa_setup_init'`
- `verifySetup()` → `action: 'mfa_enable'`, `newValue: { backupCodesGenerated: 10 }`
- `disable()` → `action: 'mfa_disable'`
- `regenerateBackupCodes()` → `action: 'mfa_backup_regenerate'`, `newValue: { codesGenerated: 10 }`

**Note:** Login MFA verification events (success/failure) are logged in the API route (`/api/auth/login/verify-mfa`), not in the service, because the service doesn't have access to workspace context during login. The login endpoint logs `action: 'login'` with `newValue: { mfa: true }` to distinguish MFA logins.

### Addition 3: Admin MFA Status Badge in Members List

**Changes to `WorkspaceService.getMembers()`:**

Join with `user_mfa` table to include `mfa_enabled` boolean in the response:

```typescript
interface WorkspaceMember {
  // ... existing fields
  mfaEnabled: boolean;
}
```

Query modification: Left join `user_mfa` on `user_id`, map `mfa_enabled` to the member object (default `false` if no MFA record).

**Changes to Settings Members panel (`src/pages/settings/index.astro`):**

Next to each member's name/role, show a small shield icon badge when `mfaEnabled` is true:

- `ShieldCheck` icon from Lucide, size 14, in `text-success` color
- Tooltip: "MFA enabled"
- Only visible to admin users (already scoped by the settings page)

### Fix: Runtime Compatibility for Encryption Key

**Problem:** The existing plan uses `import.meta.env.EMAIL_ENCRYPTION_KEY` which is build-time only on Cloudflare Workers.

**Fix:** Use `getEnv('EMAIL_ENCRYPTION_KEY')` from the project's environment helper instead. This works across all runtimes (Bun dev, Cloudflare Workers prod).

**Affected file:** `src/services/mfa.service.ts` — the `getEncryptionKey()` function.

## Files Affected (Full List)

### From Existing Plan (14 tasks)

- `package.json` — new dependencies
- `src/db/schema/{sqlite,postgresql}/user-mfa.ts` — new table
- `src/db/schema/{sqlite,postgresql}/user-mfa-backup-codes.ts` — new table
- `src/db/schema/{sqlite,postgresql}/index.ts` — exports
- `src/db/schema/sqlite/relations.ts` — relations
- `drizzle/{sqlite,postgresql}/` — migration files
- `src/lib/auth/mfa-crypto.ts` + test — crypto utilities
- `src/services/mfa.service.ts` + test — MFA service
- `src/services/index.ts` — service export
- `.env.example` — env documentation
- `src/pages/api/auth/mfa/{setup,verify-setup,status,disable,regenerate-backup-codes}.ts` — API endpoints
- `src/pages/api/auth/login/verify-mfa.ts` — login MFA verification
- `src/pages/api/auth/login.ts` — login flow modification
- `src/lib/csrf.ts` — CSRF exemption for MFA login
- `src/pages/login/verify-mfa.astro` — MFA verification page
- `src/components/molecules/MfaVerifyForm.astro` — verify form
- `src/components/molecules/LoginForm.astro` — MFA redirect handling
- `src/components/molecules/SecurityMfaCard.astro` — rewrite for live status
- `src/pages/security.astro` — wire MFA status + modals
- `src/components/organisms/MfaSetupModal.astro` — setup wizard
- `src/components/organisms/MfaBackupCodesModal.astro` — backup codes display
- `src/middleware/route-guard.ts` — MFA page access
- `openapi/` — API documentation

### New Files (3 additions)

- `src/components/molecules/MfaEnableBanner.astro` — dashboard banner
- `src/pages/dashboard.astro` — render banner
- `src/lib/audit-log.ts` — new action/entity types
- `src/services/mfa.service.ts` — audit log calls (already modified)
- `src/services/workspace.service.ts` — MFA status in members query
- `src/pages/settings/index.astro` — MFA badge in members list

## Security Considerations

- TOTP secrets encrypted at rest (AES-256-GCM, unique IV per encryption)
- Backup codes hashed with PBKDF2-SHA256 (100K iterations, constant-time comparison)
- Pending MFA cookie is HttpOnly, SameSite=Strict, 5-minute max age
- Rate limiting: 5 MFA attempts per 15 minutes per IP
- TOTP validates ±1 time window (90 seconds total) for clock drift
- All crypto via Web Crypto API (cross-runtime: Bun, Workers)
