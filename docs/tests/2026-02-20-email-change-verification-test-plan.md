# Email Change Verification — Manual Test Plan

**Branch:** `feat-223-email-change-verification`
**Date:** 2026-02-20
**Issue:** [#223 — Add email change with verification and OAuth unlinking](https://github.com/ivankristianto/allowealth/issues/223)

## Overview

This feature adds email change functionality via a verify-first flow. Users edit their email on the profile page, a verification email is sent to the new address, and the old email remains active until verification completes. All OAuth connections are unlinked when the change is requested. Tests cover the profile form UI, email change request flow, verification endpoint, session invalidation, OAuth unlinking, error handling, and edge cases.

## Prerequisites

- Dev server running: `bun run dev` → `http://feat-223-email-change-verification.expenses.local:4321`
- Database seeded: `bun run db:reset` (creates schema + seed data)
- **Admin login:** `demo@example.com` / `demo123456789`
- **Member login:** `member@example.com` / `demo123456789`
- Email mode set to `EMAIL_MODE=console` in `.env` (verification links logged to dev server console)
- Seed data creates a "Demo Family" workspace with both users, both email-verified
- To test OAuth warning: link a Google account on `/security` first (if Google OAuth is configured)

---

## Test Steps

### 1. Profile Page — Initial State

**Services under test:** UserService (`getById`), UserMetaService (`getUserSettings`), EmailVerificationService (`getPendingEmailChange`)

| Step | Action                                                        | Expected Result                                                                                |
| ---- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1.1  | Log in as `demo@example.com`, navigate to `/profile`          | Profile page loads with "Public Profile" card containing name, email, phone, and bio fields    |
| 1.2  | Observe the email field                                       | Email field shows `demo@example.com`, is editable, no pending verification indicator visible   |
| 1.3  | Observe below the email field                                 | No "Pending verification" info badge is shown                                                  |
| 1.4  | Check the `GET /api/user/profile` response (browser DevTools) | Response JSON includes `email: "demo@example.com"` and does NOT include a `pendingEmail` field |

---

### 2. Profile Page — Email Change Request (Happy Path)

**Services under test:** EmailVerificationService (`requestEmailChange`), UserService (`updateProfile`), UserMetaService (`setUserMeta`)

> **Critical:** Core email change flow — must create pending state, send verification, and not change email immediately.

| Step | Action                                                                                | Expected Result                                                                                                                          |
| ---- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 2.1  | On `/profile`, change the email field to `newemail@example.com`                       | Email field value changes. If OAuth is linked, an orange warning appears: "Changing your email will unlink all connected OAuth accounts" |
| 2.2  | Click "Save Profile Changes"                                                          | An info toast appears: "Verification email sent to newemail@example.com". Page reloads                                                   |
| 2.3  | After reload, observe the email field area                                            | Email field still shows `demo@example.com` (unchanged). Below it, an info badge reads: "Pending verification: **newemail@example.com**"  |
| 2.4  | Check dev server console output                                                       | A "Confirm your new email address" email template is logged, addressed to `newemail@example.com`, with a verification link               |
| 2.5  | Copy the verification URL from the console (e.g., `/api/auth/verify-email?token=...`) | URL contains a valid token parameter                                                                                                     |
| 2.6  | Try logging in with `demo@example.com` / `demo123456789`                              | Login succeeds — old email still works during pending verification                                                                       |
| 2.7  | Navigate to `/profile` again                                                          | Pending verification badge is still visible with `newemail@example.com`                                                                  |

---

### 3. Email Verification — Completing the Change

**Services under test:** EmailVerificationService (`verifyEmail`), Lucia Auth (`deleteUserSessions`), session-cache (`invalidateUserSessions`)

> **Critical:** Verification must update email, invalidate all sessions, and redirect to login.

| Step | Action                                                                 | Expected Result                                                                                 |
| ---- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 3.1  | Open the verification URL from step 2.5 in the browser                 | Browser redirects to `/login?email-changed=true`                                                |
| 3.2  | Observe the login page                                                 | A green success banner shows: "Email changed successfully! Please sign in with your new email." |
| 3.3  | Try logging in with the OLD email `demo@example.com` / `demo123456789` | Login fails — "Invalid email or password" error                                                 |
| 3.4  | Log in with the NEW email `newemail@example.com` / `demo123456789`     | Login succeeds, redirects to `/dashboard`                                                       |
| 3.5  | Navigate to `/profile`                                                 | Email field shows `newemail@example.com`. No pending verification badge is visible              |
| 3.6  | Check `GET /api/user/profile` response                                 | Response shows `email: "newemail@example.com"`, no `pendingEmail` field                         |

**Cleanup:** Change the email back to `demo@example.com` by repeating steps 2.1-2.5 and 3.1-3.4 with the original email, so subsequent tests work with seed credentials.

---

### 4. Profile Update — Non-Email Fields Update Independently

**Services under test:** UserService (`updateProfile`), UserMetaService (`setUserMeta`)

| Step | Action                                                                                                    | Expected Result                                                                                                  |
| ---- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 4.1  | On `/profile`, change only the name to "Updated Name" (keep email the same), click "Save Profile Changes" | Success toast: "Profile updated successfully!". Name field shows "Updated Name". No email verification triggered |
| 4.2  | Change phone to "+1234567890" and bio to "Test bio", click "Save Profile Changes"                         | Success toast. Phone and bio fields persist the new values                                                       |
| 4.3  | Reload the page                                                                                           | Name shows "Updated Name", phone shows "+1234567890", bio shows "Test bio" — all changes persisted               |

---

### 5. Fail-Fast — Duplicate Email Rejection

**Services under test:** EmailVerificationService (`requestEmailChange`)

> **Critical:** Duplicate email must be rejected WITHOUT changing name, phone, or bio.

| Step | Action                                                                                                                | Expected Result                                                                                                        |
| ---- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 5.1  | On `/profile`, change name to "Should Not Save", change email to `member@example.com` (already taken by another user) | Fields show the new values in the form                                                                                 |
| 5.2  | Click "Save Profile Changes"                                                                                          | Error toast: "Email already exists". No success toast                                                                  |
| 5.3  | Reload the page                                                                                                       | Name is unchanged (still the previous value, NOT "Should Not Save"). Email is unchanged. No pending verification badge |
| 5.4  | Check dev server console                                                                                              | No verification email was sent                                                                                         |

---

### 6. Overwrite Pending Change — New Request Replaces Old

**Services under test:** EmailVerificationService (`requestEmailChange`), token factory (`createToken`)

| Step | Action                                                                | Expected Result                                                                                             |
| ---- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 6.1  | On `/profile`, change email to `first-change@example.com`, click Save | Info toast about verification sent. Page reloads with pending badge showing `first-change@example.com`      |
| 6.2  | Note the verification URL from console (URL #1)                       | Verification URL is logged for `first-change@example.com`                                                   |
| 6.3  | Change email to `second-change@example.com`, click Save               | Info toast about verification sent. Page reloads with pending badge now showing `second-change@example.com` |
| 6.4  | Note the new verification URL from console (URL #2)                   | A new verification URL is logged for `second-change@example.com`                                            |
| 6.5  | Try visiting URL #1 (the old verification link)                       | Redirects to `/login?error=invalid_token` — old token was invalidated when new request was made             |
| 6.6  | Visit URL #2 (the new verification link)                              | Redirects to `/login?email-changed=true` — email changed to `second-change@example.com`                     |

**Cleanup:** Change email back to `demo@example.com`.

---

### 7. Cancel Pending Change — Revert to Current Email

**Services under test:** UserMetaService (`deleteUserMeta`), EmailVerificationService (`getPendingEmailChange`)

| Step | Action                                                                  | Expected Result                                                                                             |
| ---- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 7.1  | On `/profile`, change email to `temp@example.com`, click Save           | Info toast, page reloads with pending badge for `temp@example.com`                                          |
| 7.2  | Note the verification URL from console                                  | Verification URL logged                                                                                     |
| 7.3  | Change email back to the current email (`demo@example.com`), click Save | Success toast: "Profile updated successfully!" (no email change toast). Page reloads, pending badge is gone |
| 7.4  | Visit the verification URL from step 7.2                                | Redirects to `/login?error=invalid_token` — token was cleaned up when change was cancelled                  |

---

### 8. OAuth Unlinking on Email Change

**Services under test:** auth.service (`getLinkedOAuthAccounts`), EmailVerificationService (`requestEmailChange`)

> **Critical:** OAuth accounts must be unlinked when email change is requested.

**Prerequisite:** Link a Google account on the `/security` page first. If Google OAuth is not configured in `.env`, skip this section.

| Step | Action                                                                              | Expected Result                                                                                         |
| ---- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 8.1  | Navigate to `/security`, verify Google account is listed under "Connected Accounts" | Connected Accounts card shows the linked Google account with its email                                  |
| 8.2  | Navigate to `/profile`, change email to `oauth-test@example.com`                    | OAuth warning appears below email field: "Changing your email will unlink all connected OAuth accounts" |
| 8.3  | Click "Save Profile Changes"                                                        | Info toast about verification sent. Email change initiated                                              |
| 8.4  | Navigate to `/security`                                                             | Connected Accounts card shows NO linked accounts — Google was unlinked                                  |
| 8.5  | Navigate back to `/profile`                                                         | OAuth warning is no longer shown below email field (no OAuth accounts to warn about)                    |

---

### 9. OAuth Warning — Show/Hide Behavior

**Services under test:** Client-side JS (profile form)

**Prerequisite:** User has at least one linked OAuth account.

| Step | Action                                                                         | Expected Result                                                                                 |
| ---- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| 9.1  | On `/profile`, observe below the email field                                   | OAuth warning is hidden (display: none) since email hasn't been changed yet                     |
| 9.2  | Type a different character in the email field (e.g., change `demo` to `demo1`) | OAuth warning appears in orange: "Changing your email will unlink all connected OAuth accounts" |
| 9.3  | Clear the change, restore email to the original value                          | OAuth warning hides again                                                                       |

---

### 10. Expired Token

**Services under test:** EmailVerificationService (`verifyEmail`)

| Step | Action                                                                                                                                         | Expected Result                                                                           |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 10.1 | Request an email change, note the verification URL from console                                                                                | Verification URL logged                                                                   |
| 10.2 | Manually expire the token in the DB: `UPDATE email_verification_tokens SET expires_at = datetime('now', '-1 hour') WHERE user_id = '<userId>'` | Token is now expired                                                                      |
| 10.3 | Visit the verification URL                                                                                                                     | Redirects to `/login?error=expired_token`. Banner shows: "Verification link has expired." |
| 10.4 | Navigate to `/profile` (log in with old email)                                                                                                 | Pending verification badge is still visible (pending_email not cleared by expired token)  |

---

### 11. Invalid Token

**Services under test:** EmailVerificationService (`verifyEmail`)

| Step | Action                                                        | Expected Result                                                              |
| ---- | ------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 11.1 | Visit `/api/auth/verify-email?token=completely-invalid-token` | Redirects to `/login?error=invalid_token`. Error message shown on login page |
| 11.2 | Visit `/api/auth/verify-email` (no token param)               | Redirects to `/login?error=invalid_token`                                    |

---

### 12. Session Invalidation After Email Change

**Services under test:** Lucia Auth (`deleteUserSessions`), session-cache (`invalidateUserSessions`)

> **Critical:** All sessions must be invalidated after email change completes.

| Step | Action                                                                    | Expected Result                                                                   |
| ---- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 12.1 | Log in as the test user in two different browsers (or normal + incognito) | Both sessions are active, both can access `/dashboard`                            |
| 12.2 | Request an email change from browser #1                                   | Verification email sent                                                           |
| 12.3 | Click the verification link from browser #2                               | Browser #2 redirects to `/login?email-changed=true`                               |
| 12.4 | In browser #1, try to navigate to any protected page (e.g., `/dashboard`) | Redirects to `/login` — session was invalidated                                   |
| 12.5 | In browser #2, try to navigate to `/dashboard`                            | Also redirects to `/login` — all sessions invalidated, not just the verifying one |

---

### 13. Login Page Banners

**Services under test:** login.astro (query param handling)

| Step | Action                                   | Expected Result                                                                         |
| ---- | ---------------------------------------- | --------------------------------------------------------------------------------------- |
| 13.1 | Navigate to `/login?email-changed=true`  | Green success banner: "Email changed successfully! Please sign in with your new email." |
| 13.2 | Navigate to `/login?error=email_taken`   | Error message: "Email change failed — the email is now used by another account."        |
| 13.3 | Navigate to `/login?error=invalid_token` | Error message: "Invalid verification link. Please request a new one."                   |
| 13.4 | Navigate to `/login?error=expired_token` | Error banner: "Verification link has expired."                                          |
| 13.5 | Navigate to `/login` (no params)         | No banner or error message shown                                                        |

---

### 14. API Response Shape

**Services under test:** Profile API (`GET`, `PUT`)

| Step | Action                                                              | Expected Result                                                                                                        |
| ---- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 14.1 | `GET /api/user/profile` with no pending change                      | Response: `{ success: true, data: { id, name, email, phone, bio } }` — no `pendingEmail` field                         |
| 14.2 | Request email change, then `GET /api/user/profile`                  | Response includes `pendingEmail: "new@example.com"` alongside existing fields                                          |
| 14.3 | `PUT /api/user/profile` with a new email                            | Response includes `pendingEmail` and `message` fields alongside profile data                                           |
| 14.4 | `PUT /api/user/profile` with duplicate email (`member@example.com`) | Response: `{ success: false, error: { message: "Email already exists", code: "EMAIL_ALREADY_EXISTS" } }` with HTTP 409 |

---

### 15. Member User — Email Change

**Services under test:** Same services, different user role

| Step | Action                                                            | Expected Result                                                |
| ---- | ----------------------------------------------------------------- | -------------------------------------------------------------- |
| 15.1 | Log in as `member@example.com`, navigate to `/profile`            | Profile page loads, email field shows `member@example.com`     |
| 15.2 | Change email to `member-new@example.com`, click Save              | Info toast about verification. Page reloads with pending badge |
| 15.3 | Verify in console that email was sent to `member-new@example.com` | Email template logged with correct recipient                   |
| 15.4 | Complete verification via the link                                | Redirects to login. Can log in with `member-new@example.com`   |

**Cleanup:** Change email back to `member@example.com`.

---

### 16. Mobile Responsiveness

| Step | Action                                             | Expected Result                                                                 |
| ---- | -------------------------------------------------- | ------------------------------------------------------------------------------- |
| 16.1 | Open `/profile` in a mobile viewport (375px wide)  | Profile form stacks vertically. Email field and pending badge are fully visible |
| 16.2 | Pending verification badge (if active) is readable | Badge text wraps cleanly, icon stays aligned, no horizontal overflow            |
| 16.3 | OAuth warning (if visible) is readable             | Warning text wraps, icon stays aligned                                          |
| 16.4 | Submit email change on mobile                      | Toast notification is visible and not clipped                                   |

---

## Summary Checklist

| #   | Area                        | Key Assertion                                                         | Pass |
| --- | --------------------------- | --------------------------------------------------------------------- | ---- |
| 1   | Initial state               | No pending badge when no change is pending                            | [ ]  |
| 2   | Email change request        | Verification sent, email NOT changed immediately, pending badge shown | [ ]  |
| 3   | Email verification          | Email updated, sessions invalidated, redirect to login                | [ ]  |
| 4   | Non-email profile update    | Name/phone/bio update without triggering email verification           | [ ]  |
| 5   | Duplicate email (fail-fast) | 409 error, NO profile changes persisted                               | [ ]  |
| 6   | Overwrite pending change    | New request invalidates old token, new token works                    | [ ]  |
| 7   | Cancel pending change       | Revert to current email clears pending state and tokens               | [ ]  |
| 8   | OAuth unlinking             | OAuth accounts unlinked on email change request                       | [ ]  |
| 9   | OAuth warning UI            | Warning shows/hides based on email field changes                      | [ ]  |
| 10  | Expired token               | Expired token rejected with appropriate error                         | [ ]  |
| 11  | Invalid token               | Invalid/missing token rejected                                        | [ ]  |
| 12  | Session invalidation        | ALL sessions invalidated after email change completes                 | [ ]  |
| 13  | Login banners               | Correct banners for email-changed, email_taken, token errors          | [ ]  |
| 14  | API response shape          | pendingEmail included/excluded correctly in GET and PUT               | [ ]  |
| 15  | Member user                 | Email change works for non-admin users                                | [ ]  |
| 16  | Mobile                      | Pending badge, OAuth warning, and toasts render correctly on mobile   | [ ]  |

**Critical paths:** Steps 2, 3, 5, 8, and 12 are highest priority.

## Automated Test Coverage

| Suite                    | Tests | File                                              |
| ------------------------ | ----- | ------------------------------------------------- |
| EmailVerificationService | 10+   | `src/services/email-verification.service.test.ts` |

Full suite after implementation: run `bun run test` to verify all pass.
