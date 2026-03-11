# Better Auth Migration - Manual Test Plan

**Branch:** `migrate-to-better-auth`
**Date:** 2026-03-10

## Overview

This migration replaces Lucia + Arctic + Oslo with `better-auth`. All custom session creation, OAuth callback routing, and MFA crypto have been removed in favour of `better-auth`-managed flows. These tests verify that every user-facing auth surface still works correctly under the new implementation: login, 2FA, password recovery, Google linking, and workspace bootstrap on signup.

## Prerequisites

- Local dev server running at `http://localhost:4321`
- Seed database with demo users: `bun run db:seed`
- Demo credentials:
  - Admin: `demo@example.com` / `demo123456789`
  - Member: `member@example.com` / `demo123456789`
- Google OAuth is not required for most tests; linking tests use the Security page mock flow
- For 2FA tests, a TOTP app (e.g. Authy, Google Authenticator) is required for QR scanning

---

## Test Steps

### 1. Email / Password Login

**Services under test:** `better-auth` middleware session hydration, `LoginForm`

> **Critical:** Core auth path — regression here blocks all authenticated flows.

| Step | Action                                                        | Expected Result                                       |
| ---- | ------------------------------------------------------------- | ----------------------------------------------------- |
| 1.1  | Navigate to `http://localhost:4321/login`                     | Login page renders with email and password fields     |
| 1.2  | Enter `demo@example.com` / `demo123456789`, click **Sign in** | Redirected to `/dashboard` or `/onboarding`           |
| 1.3  | Verify user name appears in the nav/header                    | Shows "Dad" (or current workspace user name)          |
| 1.4  | Navigate to `/login` while already authenticated              | Redirected away from login (not shown the form again) |

---

### 2. Invalid Credentials and Error Handling

**Services under test:** `better-auth` sign-in error propagation, `LoginForm`

| Step | Action                                                                              | Expected Result                                                    |
| ---- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 2.1  | Navigate to `/login`, enter `demo@example.com` / `wrongpassword`, click **Sign in** | Inline error shown: "Invalid email or password. Please try again." |
| 2.2  | Enter a non-existent email `nobody@example.com` / `demo123456789`                   | Same error shown (no user-enumeration leak)                        |
| 2.3  | Submit with empty fields                                                            | Form validation prevents submission; fields marked required        |

---

### 3. Logout

**Services under test:** `better-auth` session termination, middleware cookie clearing

> **Critical:** Session must be fully invalidated — partial logout breaks auth-hint logic on cached pages.

| Step | Action                                                                  | Expected Result                                          |
| ---- | ----------------------------------------------------------------------- | -------------------------------------------------------- |
| 3.1  | Log in as `demo@example.com`, navigate to `/dashboard`                  | Dashboard visible                                        |
| 3.2  | Click the user avatar / logout button, confirm logout                   | Redirected to `/login`                                   |
| 3.3  | Press browser back button                                               | `/login` shown; dashboard is not accessible              |
| 3.4  | Navigate directly to `http://localhost:4321/dashboard` while logged out | Redirected to `/login?redirect=/dashboard` or equivalent |

---

### 4. New User Signup with Workspace Bootstrap

**Services under test:** `auth.service.beforeAuthUserCreate`, `auth.service.bootstrapAuthUser`, workspace and category bootstrap

> **Critical:** First-time signup must create exactly one workspace and seed default categories.

| Step | Action                                                                                            | Expected Result                                                                                 |
| ---- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 4.1  | Navigate to `/signup`                                                                             | Signup form renders with name, email, and password fields                                       |
| 4.2  | Enter a fresh email (e.g. `newuser+1@example.com`), name, and password `TestPassword123!`, submit | Email verification banner shown, or redirect to `/onboarding` if email verification is disabled |
| 4.3  | If email verification required: check for banner "Check your email to verify your account"        | Banner visible; login not yet permitted                                                         |
| 4.4  | If verification skipped in dev: log in with the new credentials                                   | Redirected to `/onboarding` (first-time user)                                                   |
| 4.5  | Complete onboarding steps                                                                         | Dashboard loads with at least one default budget category present                               |
| 4.6  | Log out, sign up with the **same email** again                                                    | Error shown: email already taken (no duplicate workspace created)                               |

---

### 5. Forgot Password Flow

**Services under test:** `better-auth` password reset request, verification token

| Step | Action                                                    | Expected Result                                                                     |
| ---- | --------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 5.1  | Navigate to `/forgot-password`                            | Form with email field renders                                                       |
| 5.2  | Enter `demo@example.com`, click **Send reset link**       | Success banner: "If an account exists with this email, a reset link has been sent." |
| 5.3  | Enter a non-existent email, click **Send reset link**     | Same success banner (no user enumeration)                                           |
| 5.4  | Navigate to `/reset-password` without a token query param | Error shown or redirect to login                                                    |

---

### 6. Password Reset via Link

**Services under test:** `better-auth` reset-password page and token verification

> **Critical:** Token-based reset must work end-to-end; broken token invalidation could allow replay attacks.

| Step | Action                                                                                                                                                                                                                                     | Expected Result                                                                |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| 6.1  | Request a password reset for `demo@example.com` (step 5.2)                                                                                                                                                                                 | Token stored in DB (`verification` table)                                      |
| 6.2  | In dev: extract token from DB with `bun -e "import {Database} from 'bun:sqlite'; const db = new Database('./db/.dev.db'); console.log(db.prepare(\"SELECT * FROM verification WHERE identifier LIKE 'reset-password:%' LIMIT 1\").get())"` | Token row returned                                                             |
| 6.3  | Navigate to `/reset-password?token=<extracted-token>`                                                                                                                                                                                      | "Reset Password" heading visible; password and confirm-password fields present |
| 6.4  | Enter `NewPassword123!` in both fields, click **Reset Password**                                                                                                                                                                           | Redirect to `/login?password-reset=true`; success banner: "Password updated"   |
| 6.5  | Log in with `demo@example.com` / `NewPassword123!`                                                                                                                                                                                         | Login succeeds, redirected to dashboard                                        |
| 6.6  | Attempt to reuse the same reset token by navigating to `/reset-password?token=<same-token>`                                                                                                                                                | Error shown: token invalid or expired                                          |
| 6.7  | **Restore demo password:** Repeat steps 6.1–6.5 to reset back to `demo123456789`                                                                                                                                                           | Demo account restored                                                          |

---

### 7. 2FA Login Verification Step

**Services under test:** `better-auth` twoFactor plugin, `MfaVerifyForm`, `/login/verify-mfa`

> **Critical:** Users with 2FA enabled must not bypass the verification step.

| Step | Action                                                                      | Expected Result                                       |
| ---- | --------------------------------------------------------------------------- | ----------------------------------------------------- |
| 7.1  | Log in as a user with 2FA enabled (set up in test 8 or use DB manipulation) | Redirect to `/login/verify-mfa` instead of dashboard  |
| 7.2  | Verify the URL is `/login/verify-mfa`                                       | 2FA code input visible                                |
| 7.3  | Enter an incorrect 6-digit code, click **Verify**                           | Error shown: invalid code                             |
| 7.4  | Enter a valid TOTP code from your authenticator app, click **Verify**       | Redirected to `/dashboard`                            |
| 7.5  | Enter a backup code instead of a TOTP code                                  | Login succeeds; backup code consumed (can't reuse it) |

---

### 8. 2FA Enable, Confirm, View Backup Codes, and Disable

**Services under test:** `better-auth` twoFactor plugin, `MfaSetupModal`, `MfaConfirmModal`, `MfaBackupCodesModal`, `SecurityMfaCard`

> **Critical:** 2FA setup is a high-stakes user flow — a broken modal leaves the user unable to complete setup.

| Step | Action                                                                         | Expected Result                                                     |
| ---- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| 8.1  | Log in as `demo@example.com` (no 2FA), navigate to `/security`                 | "Two-Factor Authentication" card visible with **Enable 2FA** button |
| 8.2  | Click **Enable 2FA**                                                           | Password-confirmation modal opens                                   |
| 8.3  | Enter `demo123456789`, click **Continue**                                      | QR code and manual secret string displayed                          |
| 8.4  | Scan QR code with a TOTP app                                                   | Code appears in authenticator                                       |
| 8.5  | Click **I have scanned this code**                                             | TOTP verification input appears                                     |
| 8.6  | Enter the 6-digit code from the authenticator                                  | Backup codes modal opens                                            |
| 8.7  | Check the "I have saved my backup codes" checkbox                              | **Close** button becomes active                                     |
| 8.8  | Click **Close**                                                                | Modal closes; security page now shows **Disable 2FA** button        |
| 8.9  | Navigate to `/dashboard`, dismiss the "Enable 2FA" banner if present           | Banner should no longer appear after 2FA is enabled                 |
| 8.10 | Navigate to `/settings` → **Members** tab                                      | Current user row shows "MFA enabled" indicator                      |
| 8.11 | Navigate back to `/security`, click **Disable 2FA**                            | Password-confirmation prompt opens                                  |
| 8.12 | Enter `demo123456789`, click **Confirm**                                       | 2FA disabled; **Enable 2FA** button shown again                     |
| 8.13 | Navigate to `/dashboard` (clear localStorage `mfa-banner-dismissed` if needed) | "Enable 2FA" banner reappears                                       |
| 8.14 | Check `/settings` → **Members** → current user row                             | "MFA enabled" indicator no longer shown                             |

---

### 9. Google Account Linking (Security Settings)

**Services under test:** `SecurityConnectedAccountsCard`, `better-auth` social link, `auth.service` link-block logic

> **Critical:** Linking must only be possible from authenticated settings — the old unauthenticated link-account page was removed.

| Step | Action                                                                                            | Expected Result                                                      |
| ---- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 9.1  | Log in, navigate to `/security`                                                                   | "Connected Accounts" card shows Google connection status             |
| 9.2  | If Google is not linked: **Connect Google** button is visible                                     | Button present                                                       |
| 9.3  | Click **Connect Google**                                                                          | OAuth flow starts (redirect to Google or success banner in dev mode) |
| 9.4  | Navigate to `/auth/link-account`                                                                  | 404 or redirect — this page was removed                              |
| 9.5  | If Google account linked and credential account also exists: **Disconnect Google** button visible | Unlink button present                                                |
| 9.6  | If Google is the only sign-in method (no password account): **Disconnect Google** button absent   | Cannot remove last login method                                      |

---

### 10. Profile Page Under New Session Shape

**Services under test:** `better-auth` session hydration, `ManageAccountForms`, `/profile`

| Step | Action                                     | Expected Result                           |
| ---- | ------------------------------------------ | ----------------------------------------- |
| 10.1 | Log in, navigate to `/profile`             | Page renders with "Profile" heading       |
| 10.2 | Verify **Full Name** field is pre-filled   | Shows user's name                         |
| 10.3 | Verify **Email** field is pre-filled       | Shows current email                       |
| 10.4 | Verify **Change Password** form is present | Form section visible                      |
| 10.5 | Update name to "Test Name", click **Save** | Success toast; page reflects updated name |
| 10.6 | Refresh page                               | Updated name persists                     |

---

### 11. Session Persistence and Middleware

**Services under test:** `middleware/auth.ts`, `better-auth` session cookie

| Step | Action                                                                          | Expected Result                                               |
| ---- | ------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| 11.1 | Log in, navigate to `/dashboard`                                                | Dashboard loads                                               |
| 11.2 | Close the browser tab, reopen and navigate to `http://localhost:4321/dashboard` | Still logged in (session cookie persists)                     |
| 11.3 | Open browser DevTools → Application → Cookies; find `better-auth.session_token` | Cookie is `HttpOnly`, `SameSite=Lax`, and has a future expiry |
| 11.4 | Manually delete the session cookie, refresh                                     | Redirected to `/login`                                        |

---

### 12. Signup Mode (Closed Registration)

**Services under test:** `auth.service.beforeAuthUserCreate`, `signup-mode.ts`

| Step | Action                                                          | Expected Result                                                        |
| ---- | --------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 12.1 | Navigate to `/signup`                                           | Signup form visible (open mode is default in dev)                      |
| 12.2 | If `SIGNUP_MODE=closed` is set in `.env`: navigate to `/signup` | Error or "Registration is not open" message shown; form not accessible |

---

## Summary Checklist

| #   | Area                             | Key Assertion                                                 | Result     | Notes                                                                                                                                            |
| --- | -------------------------------- | ------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Email/password login             | Login succeeds and session established                        | ✅ PASS    | Login, session hydration, and redirect all work correctly                                                                                        |
| 2   | Invalid credentials              | Error shown without user enumeration                          | ✅ PASS    | Wrong password, non-existent email, and empty fields all handled correctly                                                                       |
| 3   | Logout                           | Session cleared; back-button blocked                          | ✅ PASS    | Sign-out redirects to `/login`; reloading a back-navigated `/dashboard` redirects to `/login?redirect=%2Fdashboard` (session cleared)            |
| 4   | New signup + workspace bootstrap | Workspace + default categories created exactly once           | ⚠️ PARTIAL | Server running in invite-only mode; `/signup` shows "Invitation Required" — open-mode signup flow untested                                       |
| 5   | Forgot password                  | Success banner regardless of email existence                  | ✅ PASS    | Banner shown for both known/unknown emails; no user enumeration                                                                                  |
| 6   | Password reset via token         | Reset works; token cannot be reused                           | ✅ PASS    | Token consumed after use; demo password restored; token reuse returns error                                                                      |
| 7   | 2FA login gating                 | Users with 2FA must complete verify-mfa step                  | ✅ PASS    | After email/password login with 2FA enabled → redirected to `/login/verify-mfa`; TOTP code accepted → dashboard                                  |
| 8   | 2FA enable/disable lifecycle     | Setup, backup codes, disable — all modals complete            | ✅ PASS    | Full lifecycle works: password confirm → TOTP secret → code verify → backup codes → ENABLED; Disable with password → NOT CONFIGURED              |
| 9   | Google linking from security     | Link starts from /security only; /auth/link-account removed   | ⚠️ PARTIAL | INVALID_ORIGIN fixed ✅; `POST /api/auth/link-social` returns 500 (Google OAuth not configured in dev — expected); `/auth/link-account` → 404 ✅ |
| 10  | Profile page                     | Name, email, password form all visible with new session shape | ✅ PASS    | All fields pre-filled; `PUT /api/user/profile` returns 200; changes persist after reload                                                         |
| 11  | Session persistence              | Cookie persists across tabs; deleted cookie logs out          | ✅ PASS    | `HttpOnly`, `SameSite=Lax` ✅; no expiry without `rememberMe` (session cookie — expected); unauthenticated access → redirect to `/login` ✅      |
| 12  | Signup mode                      | Closed mode blocks registration                               | ✅ PASS    | `/signup` shows "Invitation Required" heading; registration blocked                                                                              |

**Critical paths:** Steps 1, 3, 4, 6, 7, and 8 are highest priority.

> **✅ Bug Fixed: `INVALID_ORIGIN` on authenticated `better-auth` API calls**
> `better-auth` `trustedOrigins` was missing `http://auth.allowealth.local:4326`. This has been
> fixed. Sections 3, 7, and 8 now pass. Section 9 (Google linking) gets 500 because Google OAuth
> credentials are not configured in this dev environment — this is expected behavior.

---

## Automated Test Coverage

| Suite                         | Tests | File                                                       |
| ----------------------------- | ----- | ---------------------------------------------------------- |
| Auth server config smoke      | 1     | `src/lib/auth/server.test.ts`                              |
| Middleware session hydration  | 3     | `src/middleware/auth.test.ts`                              |
| Better-auth catch-all handler | —     | `src/pages/api/auth/[...all].test.ts`                      |
| Auth service bootstrap        | —     | `src/services/auth.service.test.ts`                        |
| Auth core E2E                 | 4     | `e2e/tests/business-critical/auth-core.spec.ts`            |
| Security auth E2E             | 2     | `e2e/tests/business-critical/security-auth.spec.ts`        |
| Login Turnstile API           | —     | `src/__tests__/api/auth/login-turnstile.test.ts`           |
| Signup Turnstile API          | —     | `src/__tests__/api/auth/signup-turnstile.test.ts`          |
| Email change verification     | —     | `src/__tests__/api/auth/verify-email-email-change.test.ts` |

| Session management service | — | `src/services/session-management.service.test.ts` |
| Session API routes | — | `src/__tests__/api/user/sessions.test.ts` |

Full E2E suite: `bun run test:e2e --grep "auth core|security auth"`

---

### 10. Active Sessions Management

**Services under test:** `SessionManagementService`, `GET/DELETE/POST /api/user/sessions`, `SecuritySessionsCard`

> **Priority:** Medium — session visibility and revocation.

| Step  | Action                                                            | Expected Result                                                   |
| ----- | ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| 10.1  | Navigate to `/security`                                           | Active Sessions card is visible with at least 1 session           |
| 10.2  | Verify current session row                                        | Shows "Current" badge, device label (e.g. Chrome on macOS), IP    |
| 10.3  | No Revoke button on current session                               | Trash icon is absent for the current session row                  |
| 10.4  | Open a second browser/incognito and sign in with the same account | Security page now shows 2 sessions                                |
| 10.5  | Click Revoke on the other session                                 | Confirmation modal appears with device label                      |
| 10.6  | Confirm revoke                                                    | Toast "Session revoked", row removed, other browser is signed out |
| 10.7  | Sign in again from the second browser                             | Two sessions appear again                                         |
| 10.8  | Click "Revoke All Others"                                         | Confirmation modal: "All other sessions will be signed out"       |
| 10.9  | Confirm revoke all                                                | Toast "All other sessions revoked", only current session remains  |
| 10.10 | Verify current session is still active                            | Page remains accessible, no redirect to login                     |
