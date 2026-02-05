# Email Verification System Design

**Date:** 2026-02-05
**Status:** Approved
**Author:** System Design

## Overview

Implement mandatory email verification for all user registrations (both standard and invitation-based). Users are completely blocked from logging in until their email is verified. Workspaces are created immediately but marked as inactive until the owner verifies their email.

## Requirements Summary

1. **Email verification is REQUIRED** for all users (regular signup and invited users)
2. **Users are completely blocked** until email is verified
3. **Verification email sent immediately** after registration
4. **Verification tokens expire** after 24 hours
5. **Unverified accounts persist indefinitely**, users can request new verification emails anytime
6. **Login attempt shows error** with "Resend verification email" link inline on login form
7. **Workspace created immediately** but marked as "inactive" until email verified
8. **For invited users**, only the new user is blocked - existing workspace members unaffected
9. **After verification**, redirect to login page with success message (must log in explicitly)
10. **Resend rate limiting**: 3 per email + 10 per IP (whichever hits first)
11. **No automated cleanup** of unverified accounts

## Database Schema Changes

### New Table: `email_verification_tokens`

**SQLite Schema:**

```typescript
export const emailVerificationTokens = sqliteTable('email_verification_tokens', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => nanoid()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token')
    .notNull()
    .unique()
    .$defaultFn(() => nanoid(64)),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$defaultFn(() => new Date()),
});
```

**PostgreSQL Schema:**

```typescript
export const emailVerificationTokens = pgTable('email_verification_tokens', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => nanoid()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  token: text('token')
    .notNull()
    .unique()
    .$defaultFn(() => nanoid(64)),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

**Indexes:**

- `token` (unique, for fast lookup during verification)
- `user_id` (for cleanup queries)
- `expires_at` (for finding expired tokens)

### Modified Table: `users`

**Add field:**

```typescript
emailVerifiedAt: timestamp | null; // null = unverified
```

### Modified Table: `workspaces`

**Add field:**

```typescript
status: enum ('active' | 'inactive')  // inactive until owner verifies email
```

**Key Design Decisions:**

- Separate token table allows multiple tokens per user (if they resend)
- Only the latest token matters - old tokens remain but are ignored after new one is generated
- Workspace status defaults to 'inactive' for new workspaces, 'active' for existing (invited users)
- Soft delete on users cascades to verification tokens (no orphaned tokens)

## Registration Flow Changes

### Standard Registration (No Invitation)

```
1. POST /api/auth/signup { email, password, name, workspaceName? }
2. Validate input (existing validation)
3. Check email uniqueness (existing check)
4. Create user (email_verified_at = null)
5. Create workspace (status = 'inactive')
6. Set user as admin of workspace
7. Generate verification token (64-char nanoid, expires in 24h)
8. Send verification email
9. Return 201 { message: "Check your email to verify your account" }
```

### Invitation-Based Registration

```
1. POST /api/auth/signup?token={invitationToken} { email, password, name }
2. Validate invitation token (existing validation)
3. Verify email matches invitation (existing check)
4. Create user (email_verified_at = null)
5. Add user to existing workspace (status remains 'active')
6. Set user role from invitation
7. Mark invitation as accepted
8. Generate verification token (same as above)
9. Send verification email
10. Return 201 { message: "Check your email to verify your account" }
```

**Key Points:**

- Both flows now create unverified users
- Workspace creation only happens for standard registration
- Invited users join active workspaces but are personally blocked
- Default asset categories still created only for standard registration (after verification)
- Response is identical for both flows (consistent UX)

## Email Verification Flow

### New Endpoint: `GET /api/auth/verify-email?token={verificationToken}`

```
1. Look up token in email_verification_tokens table
2. Validate token exists and not expired (< 24 hours old)
3. Get associated user
4. Check if user already verified (email_verified_at !== null)
   - If already verified: redirect to login with info message
5. Update user.email_verified_at = now()
6. If user is workspace owner (creator), update workspace.status = 'active'
7. If user was invited, workspace already active (no change)
8. Initialize default asset categories (for workspace owners only)
9. Delete all verification tokens for this user (cleanup)
10. Redirect to /login?verified=true
11. Login page shows success message: "Email verified! Please log in"
```

**Error Handling:**

- Invalid token → Redirect to `/login?error=invalid_token`
- Expired token → Redirect to `/login?error=expired_token&email={user.email}`
- Already verified → Redirect to `/login?info=already_verified`
- Server error → Redirect to `/login?error=verification_failed`

**Security:**

- Tokens are single-use (deleted after verification)
- Old tokens automatically invalidated when new one generated
- No token enumeration (same error for invalid/expired)

## Login Flow Changes

### Modified Endpoint: `POST /api/auth/login { email, password }`

```
1. Validate credentials (existing logic)
2. Check if user is soft-deleted (existing check)
3. NEW: Check if email is verified (email_verified_at !== null)
   - If NOT verified:
     - Return 403 {
         error: "Email not verified",
         code: "EMAIL_NOT_VERIFIED",
         email: user.email
       }
4. Check if workspace is active (status = 'active')
   - If NOT active:
     - Return 403 {
         error: "Workspace inactive",
         code: "WORKSPACE_INACTIVE"
       }
5. Create Lucia session (existing logic)
6. Return user + session
```

**Login Page (`/login`) Updates:**

```typescript
// Client-side handling of verification errors
if (response.code === 'EMAIL_NOT_VERIFIED') {
  showError(
    'Please verify your email to log in. ' +
      "<button onclick='resendVerification()'>Resend verification email</button>"
  );
}
```

**Key Points:**

- Email verification checked before session creation
- Clear error codes for client-side handling
- Email included in error response for resend functionality
- Workspace status checked as secondary gate
- Existing rate limiting remains (5 login attempts per hour per IP)

## Resend Verification Email

### New Endpoint: `POST /api/auth/resend-verification { email }`

```
1. Rate limit check:
   - 10 attempts per hour per IP (returns 429 if exceeded)
   - 3 attempts per hour per email (returns 429 if exceeded)
2. Look up user by email
   - If not found: Return 200 (don't reveal user existence)
3. Check if already verified (email_verified_at !== null)
   - If verified: Return 200 { message: "If your email is unverified, check your inbox" }
4. Generate new verification token (64-char nanoid, expires 24h)
5. Insert new token (old tokens remain but ignored)
6. Send verification email
7. Return 200 { message: "If your email is unverified, check your inbox" }
```

**Rate Limiting Implementation:**

```typescript
// Track both IP and email-based limits
const ipKey = `resend_verification:ip:${clientIP}`;
const emailKey = `resend_verification:email:${email}`;

// Check IP limit: 10/hour
if ((await rateLimiter.check(ipKey, 10, 3600)) === false) {
  return 429;
}

// Check email limit: 3/hour
if ((await rateLimiter.check(emailKey, 3, 3600)) === false) {
  return 429;
}
```

**Security:**

- Generic success message (no user enumeration)
- Dual rate limiting prevents abuse
- Old tokens persist but only latest token is functional
- Same email content as initial verification

**Client Integration:**

- Button on login page after 403 error
- Shows loading state during request
- Displays success toast: "Verification email sent! Check your inbox"

## Verification Email Content

### Email Template Structure

**Standard Registration:**

```
Subject: Verify your email - [App Name]

Hi {userName},

Thanks for signing up! Please verify your email address to activate your account.

[Verify Email Button]
{baseUrl}/api/auth/verify-email?token={verificationToken}

This link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.

---
Need help? Contact support@example.com
```

**Invitation-Based Registration:**

```
Subject: Verify your email - [App Name]

Hi {userName},

You've been invited to join "{workspaceName}" by {inviterName}.

Please verify your email address to access the workspace.

[Verify Email Button]
{baseUrl}/api/auth/verify-email?token={verificationToken}

This link will expire in 24 hours.

---
Need help? Contact support@example.com
```

**Email Service Integration:**

- Use existing `EmailService` (`src/services/email/`)
- New method: `sendVerificationEmail(user, token, workspace?, inviter?)`
- Supports Resend, SendGrid, Console providers
- HTML + plain text versions
- Button styled with brand colors

**Configuration:**

```typescript
// src/config/email-templates.ts
export const VERIFICATION_EMAIL = {
  subject: 'Verify your email',
  expirationHours: 24,
  buttonText: 'Verify Email',
  buttonColor: '#primary-color',
};
```

## UI Changes

### Signup Page (`/signup`) Changes

```typescript
// After successful registration response
if (response.status === 201) {
  // Show success message (not redirect immediately)
  showSuccessMessage('Account created! Check your email to verify your account.', {
    persistent: true,
  });

  // Optionally redirect to login after 3 seconds
  setTimeout(() => navigate('/login?registered=true'), 3000);
}
```

### Login Page (`/login`) Changes

```typescript
// URL parameter handling
const params = new URLSearchParams(window.location.search);

if (params.get('registered') === 'true') {
  showInfoBanner('Check your email to verify your account before logging in');
}

if (params.get('verified') === 'true') {
  showSuccessBanner('Email verified! You can now log in');
}

if (params.get('error') === 'invalid_token') {
  showErrorBanner('Invalid verification link. Request a new one below.');
}

if (params.get('error') === 'expired_token') {
  const email = params.get('email');
  showErrorBanner(
    'Verification link expired. ' +
      `<button onclick="resendVerification('${email}')">Resend verification email</button>`
  );
}

// Login error handling
if (loginError.code === 'EMAIL_NOT_VERIFIED') {
  showErrorMessage(
    'Please verify your email to log in. ' +
      `<button onclick="resendVerification('${loginError.email}')">Resend verification email</button>`
  );
}
```

**New UI Components Needed:**

1. Inline error banner with action button (for unverified email)
2. Success banner for post-verification
3. Loading state for resend button
4. Toast notification for resend success

**Design System Compliance:**

- Use DaisyUI alert components (`alert-error`, `alert-success`, `alert-info`)
- Buttons use `btn btn-link` for inline actions
- Follow design tokens for spacing and colors
- Mobile-first responsive design

## Service Layer Architecture

### New Service: `EmailVerificationService`

**Location:** `src/services/email-verification.service.ts`

```typescript
class EmailVerificationService {
  // Generate token and send email
  async createVerificationToken(userId: string): Promise<void>;

  // Verify token and activate user/workspace
  async verifyEmail(token: string): Promise<{
    success: boolean;
    user?: User;
    error?: string;
  }>;

  // Check if user needs verification
  async needsVerification(userId: string): Promise<boolean>;

  // Cleanup expired tokens (can be run as cron job)
  async cleanupExpiredTokens(): Promise<number>;
}
```

### Modified Service: `AuthService`

**Location:** `src/services/auth.service.ts`

```typescript
class AuthService {
  // Updated to create unverified users
  async register(
    email: string,
    password: string,
    name: string,
    workspaceName?: string
  ): Promise<{ userId: string }>;

  // Updated to create unverified invited users
  async registerWithInvitation(
    email: string,
    password: string,
    name: string,
    workspaceId: string,
    role: string
  ): Promise<{ userId: string }>;

  // Updated to check email verification
  async login(
    email: string,
    password: string
  ): Promise<{ user: User; session: Session } | { error: string; code: string; email?: string }>;

  // New: Resend verification with rate limiting
  async resendVerification(email: string, clientIP: string): Promise<{ success: boolean }>;
}
```

### Modified Service: `WorkspaceService`

**Location:** `src/services/workspace.service.ts`

```typescript
class WorkspaceService {
  // New: Activate workspace after email verification
  async activateWorkspace(workspaceId: string): Promise<void>;

  // Updated to create inactive workspaces
  async createWorkspace(name: string, ownerId: string): Promise<Workspace>;

  // New: Check workspace status
  async isWorkspaceActive(workspaceId: string): Promise<boolean>;
}
```

### Service Integration Flow

```
AuthService.register()
  → WorkspaceService.createWorkspace() [status: inactive]
  → EmailVerificationService.createVerificationToken()
  → EmailService.sendVerificationEmail()

EmailVerificationService.verifyEmail()
  → Mark user.email_verified_at
  → WorkspaceService.activateWorkspace() [if owner]
  → AssetCategoryService.seedDefaultCategories() [if owner]
```

## Testing Strategy

### Unit Tests Required

**EmailVerificationService Tests:**

```typescript
- Generate token creates unique 64-char token
- Token expires after 24 hours
- Verify valid token marks user as verified
- Verify expired token returns error
- Verify invalid token returns error
- Verify already-verified user is idempotent
- Cleanup removes only expired tokens
```

**AuthService Tests:**

```typescript
- Register creates unverified user
- Register creates inactive workspace
- RegisterWithInvitation creates unverified user in active workspace
- Login rejects unverified users
- Login rejects inactive workspaces
- Resend respects rate limits (IP and email)
- Resend doesn't reveal user existence
```

**WorkspaceService Tests:**

```typescript
- ActivateWorkspace updates status correctly
- ActivateWorkspace only affects target workspace
```

### E2E Tests Required

**Registration Flow:**

```typescript
- User registers → receives email → verifies → logs in successfully
- User registers → tries to log in before verification → gets error + resend option
- User clicks resend → receives new email → verifies with new token
```

**Invitation Flow:**

```typescript
- Invited user registers → receives email → verifies → logs in to existing workspace
- Workspace remains active for existing members during new user verification
```

**Edge Cases:**

```typescript
- Expired token redirect to login with resend option
- Multiple resend requests respect rate limits
- Old tokens invalidated after new token generated
- Already verified users can't re-verify
```

### Edge Cases Handled

1. **User clicks verify link twice** → Second click shows "already verified" message
2. **User requests multiple resends** → Only latest token works
3. **Token expires** → Clear error message with resend option
4. **Workspace owner never verifies** → Workspace stays inactive, no auto-cleanup
5. **Rate limit exceeded** → 429 with "Too many requests, try again later"
6. **Email service fails** → Log error, return generic success (prevent enumeration)
7. **User soft-deleted after token generated** → Verification fails gracefully

## Migration Strategy & Rollout

### Database Migration Steps

**1. Add new columns (non-breaking):**

SQLite migration:

```sql
ALTER TABLE users ADD COLUMN email_verified_at INTEGER;
ALTER TABLE workspaces ADD COLUMN status TEXT DEFAULT 'active';
```

PostgreSQL migration:

```sql
ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP;
ALTER TABLE workspaces ADD COLUMN status TEXT DEFAULT 'active';
```

**2. Create verification tokens table:**

SQLite:

```sql
CREATE TABLE email_verification_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_token ON email_verification_tokens(token);
CREATE INDEX idx_user_id ON email_verification_tokens(user_id);
CREATE INDEX idx_expires_at ON email_verification_tokens(expires_at);
```

PostgreSQL:

```sql
CREATE TABLE email_verification_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_token ON email_verification_tokens(token);
CREATE INDEX idx_user_id ON email_verification_tokens(user_id);
CREATE INDEX idx_expires_at ON email_verification_tokens(expires_at);
```

**3. Backfill existing users (mark as verified):**

```sql
-- Mark all existing users as verified
UPDATE users
SET email_verified_at = created_at
WHERE email_verified_at IS NULL;

-- Mark all existing workspaces as active
UPDATE workspaces
SET status = 'active'
WHERE status IS NULL OR status = '';
```

### Rollout Strategy

**Phase 1: Database Migration (Non-breaking)**

- Run migrations on dev/staging
- Backfill existing users as verified
- Verify data integrity
- Deploy to production (no code changes yet)

**Phase 2: Service Layer (No user impact)**

- Deploy EmailVerificationService
- Update AuthService with verification logic
- Feature flag: `ENABLE_EMAIL_VERIFICATION=false`
- Test in staging with feature flag enabled

**Phase 3: API Changes (Breaking for new users only)**

- Deploy updated signup/login endpoints
- Deploy verify-email and resend endpoints
- Enable feature flag: `ENABLE_EMAIL_VERIFICATION=true`
- Existing users unaffected (already verified)

**Phase 4: UI Updates**

- Deploy updated signup page
- Deploy updated login page with resend functionality
- Monitor error rates and email delivery

### Rollback Plan

- Set `ENABLE_EMAIL_VERIFICATION=false` (immediate)
- Revert API changes if needed
- Data persists (email_verified_at remains for re-enable)

### Monitoring

**Metrics to Track:**

- Verification rate (emails sent vs verified)
- Resend API usage
- Blocked login attempts (EMAIL_NOT_VERIFIED)
- Token expiration rate

**Alerts:**

- High failure rates (>5%)
- Email delivery failures
- Rate limit abuse patterns

## Implementation Checklist

### Database Layer

- [ ] Create SQLite schema for email_verification_tokens
- [ ] Create PostgreSQL schema for email_verification_tokens
- [ ] Add email_verified_at to users table (both dialects)
- [ ] Add status to workspaces table (both dialects)
- [ ] Generate migrations for SQLite
- [ ] Generate migrations for PostgreSQL
- [ ] Create backfill script for existing users
- [ ] Test migrations on staging

### Service Layer

- [ ] Create EmailVerificationService
- [ ] Update AuthService.register()
- [ ] Update AuthService.registerWithInvitation()
- [ ] Update AuthService.login()
- [ ] Add AuthService.resendVerification()
- [ ] Update WorkspaceService.createWorkspace()
- [ ] Add WorkspaceService.activateWorkspace()
- [ ] Add WorkspaceService.isWorkspaceActive()

### API Endpoints

- [ ] Create GET /api/auth/verify-email
- [ ] Create POST /api/auth/resend-verification
- [ ] Update POST /api/auth/signup
- [ ] Update POST /api/auth/login
- [ ] Update OpenAPI documentation

### Email Templates

- [ ] Create verification email HTML template
- [ ] Create verification email plain text template
- [ ] Create invitation verification email variant
- [ ] Add email configuration constants

### UI Components

- [ ] Update /signup page with success message
- [ ] Update /login page with verification handling
- [ ] Add resend button component
- [ ] Add verification banner components
- [ ] Add loading states for resend
- [ ] Add toast notifications for success

### Testing

- [ ] Unit tests for EmailVerificationService
- [ ] Unit tests for AuthService changes
- [ ] Unit tests for WorkspaceService changes
- [ ] E2E test: Standard registration flow
- [ ] E2E test: Invitation registration flow
- [ ] E2E test: Resend verification
- [ ] E2E test: Token expiration
- [ ] E2E test: Rate limiting

### Deployment

- [ ] Deploy database migrations to staging
- [ ] Backfill existing users on staging
- [ ] Deploy service layer with feature flag off
- [ ] Test with feature flag on in staging
- [ ] Deploy to production (feature flag off)
- [ ] Enable feature flag in production
- [ ] Monitor metrics and alerts

## Success Criteria

1. ✅ All new users (standard and invited) must verify email before login
2. ✅ Existing users can log in immediately (backfilled as verified)
3. ✅ Workspace activation tied to owner email verification
4. ✅ Invited users don't affect workspace status
5. ✅ Resend functionality works with rate limits
6. ✅ Email delivery >95% success rate
7. ✅ Verification completion rate >80% within 24 hours
8. ✅ Zero data loss during migration
9. ✅ Feature can be toggled off without data corruption

## Open Questions

None - all requirements clarified during design phase.

## References

- Current registration flow: `src/pages/api/auth/signup.ts`
- Current auth service: `src/services/auth.service.ts`
- Current workspace service: `src/services/workspace.service.ts`
- Invitation system: `src/services/workspace-invitation.service.ts`
- Email service: `src/services/email/`
- Password reset (similar token pattern): `src/services/password-reset.service.ts`
