# Add Google SSO Integration for Login and Registration

## Summary

Implement Google OAuth 2.0 Single Sign-On (SSO) to allow users to authenticate using their Google accounts as an alternative to password-based authentication.

## Type of Feature

- [x] ✨ New feature (authentication enhancement)
- [x] 🔒 Security improvement (OAuth 2.0)

## Problem Statement

Currently, users can only authenticate using email/password credentials. Adding Google SSO will:
- Reduce friction during signup (no password creation required)
- Improve security (leverage Google's authentication infrastructure)
- Enable faster onboarding for users with Google accounts
- Provide account recovery options beyond password reset

## Proposed Solution

### High-Level Architecture

**Database Changes:**
- Add `oauth_accounts` table to link OAuth providers to users
- Make `password_hash` column nullable in `users` table (OAuth-only accounts)
- Schema changes required for both SQLite and PostgreSQL

**Authentication Flow:**
1. User clicks "Sign in with Google" button
2. Redirect to `/api/auth/google/authorize` → Google consent screen
3. Google redirects to `/api/auth/google/callback` with authorization code
4. Exchange code for access token, fetch user profile
5. **Account Linking Strategy:**
   - If email exists → Link OAuth to existing account
   - If email is new → Create new user + workspace (OAuth-only)
6. Create Lucia session and redirect to dashboard

**Library & Dependencies:**
- Use `arctic` package (Lucia's official OAuth library)
- Framework-agnostic, works across all runtimes (Node.js, Bun, Workers)

**Environment Variables:**
```bash
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
```

### Technical Implementation

**New Database Table:**
```sql
CREATE TABLE oauth_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'google', 'github', etc.
  provider_user_id TEXT NOT NULL, -- Google's user ID
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE(provider, provider_user_id)
);
```

**New API Routes:**
- `GET /api/auth/google/authorize` - Initiate OAuth flow
- `GET /api/auth/google/callback` - Handle OAuth callback
- `POST /api/auth/unlink-oauth` - Allow users to unlink OAuth accounts (future)

**UI Changes:**
- Add "Sign in with Google" button to login page (`/login`)
- Add "Sign up with Google" button to signup page (`/signup`)
- Display linked OAuth accounts in settings (`/settings`)
- Add visual separator between password and OAuth login options

### Security Considerations

- [x] Validate OAuth state parameter to prevent CSRF attacks
- [x] Verify email from Google matches existing account before linking
- [x] Rate limit OAuth endpoints (same as login: 10 requests/15 min)
- [x] Handle OAuth errors gracefully (show user-friendly messages)
- [x] Log OAuth authentication attempts for audit trail
- [x] Ensure HTTPS in production for secure callback handling

### Account Linking Edge Cases

1. **User has password account, tries OAuth with same email:**
   - Link OAuth account to existing user
   - User can now sign in with password OR Google

2. **User has OAuth-only account, tries to set password:**
   - Allow password creation in settings
   - Transition from OAuth-only to hybrid account

3. **User tries to link multiple Google accounts:**
   - Only one Google account per user (enforce uniqueness)
   - Show error if trying to link a second Google account

4. **Email verification conflict:**
   - If Google email is not verified, reject OAuth login
   - Require Google account to have verified email

## Implementation Plan

### Phase 1: Database & Backend (Week 1)
- [ ] Create migration: Add `oauth_accounts` table (SQLite + PostgreSQL)
- [ ] Create migration: Make `password_hash` nullable
- [ ] Apply migrations locally: `bun run db:migrate`
- [ ] Create `OAuthAccountService` for CRUD operations
- [ ] Add Google OAuth config to environment variables
- [ ] Write unit tests for `OAuthAccountService`

### Phase 2: OAuth Flow (Week 1-2)
- [ ] Implement `/api/auth/google/authorize` endpoint
- [ ] Implement `/api/auth/google/callback` endpoint
- [ ] Add state parameter validation (CSRF protection)
- [ ] Implement account linking logic (email matching)
- [ ] Add error handling for OAuth failures
- [ ] Add rate limiting to OAuth endpoints
- [ ] Update OpenAPI documentation

### Phase 3: UI Integration (Week 2)
- [ ] Add "Sign in with Google" button to LoginForm
- [ ] Add "Sign up with Google" button to SignupForm
- [ ] Create reusable `OAuthButton` component
- [ ] Add OAuth loading states (spinner during redirect)
- [ ] Display linked accounts in `/settings` page
- [ ] Add visual separator (e.g., "OR" divider) between auth methods
- [ ] Test on Chrome, Firefox, Safari

### Phase 4: Testing & Documentation (Week 2-3)
- [ ] E2E tests: Google OAuth login flow
- [ ] E2E tests: Account linking scenarios
- [ ] E2E tests: OAuth error handling
- [ ] Update `CLAUDE.md` with OAuth guidelines
- [ ] Update `README.md` with Google OAuth setup instructions
- [ ] Document environment variable requirements

### Phase 5: Deployment (Week 3)
- [ ] Set up Google OAuth credentials in Google Cloud Console
- [ ] Add environment variables to production (.env.production)
- [ ] Run migrations on production database: `bun run db:migrate:prod`
- [ ] Deploy to staging for QA testing
- [ ] Monitor OAuth error rates in production
- [ ] Rollout to 100% of users

## Dependencies

**New Package:**
- `arctic` - OAuth 2.0 library for Lucia Auth

**Google Cloud Console Setup:**
1. Create OAuth 2.0 credentials in Google Cloud Console
2. Configure authorized redirect URIs:
   - Development: `http://localhost:4321/api/auth/google/callback`
   - Production: `https://yourdomain.com/api/auth/google/callback`
3. Set scopes: `email`, `profile` (openid)
4. Copy Client ID and Client Secret to environment variables

## Acceptance Criteria

- [ ] Users can sign in using their Google account
- [ ] New users are automatically created when signing in with Google
- [ ] Existing users (email match) have OAuth account linked automatically
- [ ] OAuth-only users can sign in without a password
- [ ] Users with both password and OAuth can use either method
- [ ] OAuth errors show user-friendly messages (not raw API errors)
- [ ] Rate limiting prevents OAuth abuse
- [ ] All tests pass (unit + E2E)
- [ ] OpenAPI documentation updated
- [ ] Works on all supported browsers (Chrome, Firefox, Safari)

## Out of Scope (Future Enhancements)

- GitHub OAuth integration (separate issue)
- Apple Sign-In (separate issue)
- Microsoft OAuth (separate issue)
- OAuth account unlinking in UI (settings page)
- Multi-factor authentication for OAuth accounts

## Testing Checklist

### Manual Testing
- [ ] Sign up with Google (new user) → Creates account + workspace
- [ ] Sign in with Google (existing email) → Links to existing account
- [ ] Sign in with Google after linking → Successfully authenticates
- [ ] Sign in with password after OAuth linking → Both methods work
- [ ] OAuth error handling → Shows friendly error message
- [ ] Rate limiting → Blocks excessive OAuth attempts

### E2E Tests
- [ ] `test('google-oauth-signup')` - New user signup via Google
- [ ] `test('google-oauth-login-existing-user')` - Email match linking
- [ ] `test('google-oauth-rate-limiting')` - Prevents abuse
- [ ] `test('google-oauth-error-handling')` - Invalid state parameter

## References

- Lucia Auth OAuth Guide: https://lucia-auth.com/guides/oauth/
- Arctic Library Docs: https://arctic.js.org/
- Google OAuth 2.0 Docs: https://developers.google.com/identity/protocols/oauth2

## Labels

`enhancement`, `auth`, `security`, `oauth`

## Estimated Effort

**Story Points:** 13 (Large)
**Duration:** 2-3 weeks
**Complexity:** High (OAuth flow, account linking logic, migration coordination)
