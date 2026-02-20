# Email Change with Verification Design

**Issue:** #223
**Date:** 2026-02-20

## Summary

Users can change their email from the profile page. The new email must be verified before taking effect (verify-first flow). All OAuth connections are unlinked when the change is requested.

## Architecture Decisions

- **Storage:** Reuse existing `user_meta` table (new `PENDING_EMAIL` key) + existing `email_verification_tokens` table. No new tables or migrations.
- **Verification endpoint:** Reuse `GET /api/auth/verify-email` with branching logic based on `pending_email` presence in `user_meta`.
- **API trigger:** Modify existing `PUT /api/user/profile` — when email differs, trigger verification flow instead of direct update. Other fields (name, phone, bio) update immediately.
- **Service:** Extend `EmailVerificationService` with `requestEmailChange()`, `getPendingEmailChange()`, and modify `verifyEmail()` to branch.

## Flow

### Email Change Request

```
User edits email on profile -> PUT /api/user/profile
  +-- name/phone/bio -> update immediately
  +-- email differs from current?
        +-- Check new email not taken (409 if taken)
        +-- Store pending_email in user_meta
        +-- Delete old verification tokens for user
        +-- Create new verification token
        +-- Send verification email to NEW email
        +-- Unlink ALL OAuth accounts
        +-- Return { ...profile, pendingEmail: "new@example.com" }
```

### Email Change Verification

```
User clicks verification link -> GET /api/auth/verify-email?token=...
  +-- Validate token (existing logic)
  +-- Check user_meta for pending_email
  +-- If pending_email exists:
  |     +-- Update user.email to pending_email
  |     +-- Set email_verified_at = now
  |     +-- Delete pending_email from user_meta
  |     +-- Consume token
  |     +-- Invalidate all user sessions (force re-login)
  |     +-- Redirect to /login?email-changed=true
  +-- If no pending_email:
        +-- Existing signup verification flow (unchanged)
```

## Data Storage

No new tables. Uses existing infrastructure:

- **`user_meta`** — new key `PENDING_EMAIL` stores the requested new email
- **`email_verification_tokens`** — reused as-is for the verification token

```
user_meta: { pending_email: "new@example.com" }
email_verification_tokens: { token: "abc...", user_id: "usr_123", expires_at: +24h }
```

### User Meta Key

```typescript
USER_META_KEYS = {
  ...existing,
  PENDING_EMAIL: 'pending_email',
};
```

Validation: `z.string().email().max(255)`

## Service Changes

### EmailVerificationService

- `requestEmailChange(userId, newEmail)` — stores pending_email, creates token, sends email, unlinks OAuth
- `getPendingEmailChange(userId)` — returns pending email or null (for UI)
- `verifyEmail(token)` — modified to branch on pending_email presence

### EmailService / EmailTemplateService

- `sendEmailChangeVerification(email, verificationUrl, userName)` — new template
- Subject: "Confirm your new email address"
- Body: explains the change, 24-hour expiry, ignore-if-not-you

### UserService

- `updateProfile()` — remove direct email update; caller handles email change via EmailVerificationService

## API Changes

### PUT /api/user/profile

- If email changed: call `emailVerificationService.requestEmailChange()` instead of direct update
- Response includes `pendingEmail` field when a change is pending

### GET /api/user/profile

- Include `pendingEmail` from user_meta in response

### GET /api/auth/verify-email

- Add branching for email change vs signup verification

## UI Changes

### Profile Page (ManageAccountForms.astro)

- Email field stays editable
- If `pendingEmail` exists, show info badge: "Pending verification: new@example.com"
- After saving with new email, show toast: "Verification email sent to new@example.com"
- OAuth warning shown before submitting if user has linked accounts

### Login Page

- Handle `?email-changed=true` query param to show success message

## Error Handling & Edge Cases

| Scenario                                          | Behavior                                                  |
| ------------------------------------------------- | --------------------------------------------------------- |
| New email already taken                           | 409 error, no changes made                                |
| New email same as current                         | No-op, just update other fields                           |
| Change requested while one pending                | Overwrites pending_email, new token, resends verification |
| Token expired (24h)                               | Validation fails, redirect with error. User re-requests   |
| Email changed back to current while pending       | Clear pending_email, delete token, no verification needed |
| OAuth unlinked but user requests different change | OAuth stays unlinked (by design)                          |
| User not logged in when clicking link             | Token consumed, email updated, redirect to login          |

## Security

- **Email enumeration:** Acceptable since user is authenticated (unlike signup)
- **Session invalidation:** All sessions invalidated after email change completes
- **OAuth unlinking:** Happens at request time (not verification time) per spec
- **Token single-use:** Existing factory deletes previous tokens
- **Case normalization:** Email lowercased before storage (existing pattern)

## Out of Scope

- Password confirmation before email change
- Email change history or audit log
- Notification to old email about pending change
- Rate limiting beyond existing API rate limits
- Dedicated cancel UI (only by requesting a new change)
- Email change cooldown period

## Files Changed

| File                                                | Change                                                                        |
| --------------------------------------------------- | ----------------------------------------------------------------------------- |
| `src/lib/constants/user-meta-keys.ts`               | Add `PENDING_EMAIL` key + validation                                          |
| `src/services/email-verification.service.ts`        | Add `requestEmailChange()`, `getPendingEmailChange()`, modify `verifyEmail()` |
| `src/services/email/email.service.ts`               | Add `sendEmailChangeVerification()`                                           |
| `src/services/email/email-template.service.ts`      | Add email change template                                                     |
| `src/services/user.service.ts`                      | Modify `updateProfile()` to skip direct email update                          |
| `src/pages/api/user/profile.ts`                     | Add email change logic to PUT, add pendingEmail to GET                        |
| `src/pages/api/auth/verify-email.ts`                | Add email change branch                                                       |
| `src/components/organisms/ManageAccountForms.astro` | Show pending email state, OAuth warning                                       |
| `src/pages/login.astro`                             | Handle `?email-changed=true` query param                                      |
