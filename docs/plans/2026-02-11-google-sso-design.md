# Google SSO Integration Design

**Issue:** #153 — Add Google SSO Integration for Login and Registration
**Date:** 2026-02-11
**Status:** Approved

## Design Decisions

| Decision              | Choice                              | Rationale                                                              |
| --------------------- | ----------------------------------- | ---------------------------------------------------------------------- |
| OAuth schema          | Separate `oauth_accounts` table     | Extensible for future providers (GitHub, Auth0) without schema changes |
| Account linking UX    | Dedicated confirmation page         | Clear consent, no client-side state management                         |
| Email verification    | Reuse `email_verified_at` timestamp | No redundant column; null = unverified, timestamp = verified           |
| Avatar storage        | `avatar_url` on `users` table       | Simple queries; one canonical avatar per user                          |
| OAuth library         | Arctic (Lucia v3 recommended)       | Same author as Lucia, Web Crypto API, PKCE, 50+ providers              |
| Service naming        | `loginOrRegisterWithOAuth()`        | Provider-agnostic from day one; `provider` param                       |
| CSRF for OAuth routes | State parameter + PKCE              | Whitelist GET routes from CSRF middleware                              |

## 1. Database Schema

### Changes to `users` table (both SQLite + PostgreSQL)

- Add `avatar_url` (text, nullable) — canonical avatar for the user
- Make `password_hash` nullable — OAuth-only users don't have passwords

### New `oauth_accounts` table (both dialects)

| Column                | Type               | Notes                                          |
| --------------------- | ------------------ | ---------------------------------------------- |
| `id`                  | text (PK)          | nanoid                                         |
| `user_id`             | text (FK -> users) | cascade delete                                 |
| `provider`            | text               | e.g., `"google"`, `"github"`                   |
| `provider_account_id` | text               | Provider's unique user ID (Google `sub` claim) |
| `email`               | text               | Provider-reported email                        |
| `created_at`          | integer/timestamp  |                                                |

**Constraints:**

- Unique constraint on `(provider, provider_account_id)` — one link per provider identity
- Index on `user_id` for lookup
- Index on `(provider, provider_account_id)` for login lookup

### Migration backfill

Set `email_verified_at = current timestamp` for all existing users who have a non-null `password_hash` (they already authenticated via email).

### Dual dialect migrations

Both SQLite and PostgreSQL schema files must be updated. Generate migrations for both:

```bash
bun run db:generate          # SQLite
bun run db:generate:prod     # PostgreSQL
bun run db:migrate           # Apply locally
```

## 2. OAuth Configuration

**New file: `src/lib/auth/oauth.ts`**

```typescript
import { Google } from 'arctic';
import { getEnv } from '@/lib/utils/env';

export const google = new Google(
  getEnv('GOOGLE_CLIENT_ID'),
  getEnv('GOOGLE_CLIENT_SECRET'),
  `${getEnv('PUBLIC_APP_URL')}/api/auth/google/callback`
);
```

**Environment variables (add to `.env.example`):**

- `GOOGLE_CLIENT_ID` — from Google Cloud Console
- `GOOGLE_CLIENT_SECRET` — from Google Cloud Console

Arctic uses Web Crypto API internally — compatible with Bun, Node.js, and Cloudflare Workers.

## 3. Service Layer

### New method: `loginOrRegisterWithOAuth()`

**Parameters:**

```typescript
interface OAuthProfile {
  provider: string; // "google", "github", etc.
  providerAccountId: string; // Provider's unique ID
  email: string;
  name: string;
  avatarUrl?: string;
}
```

**Return:** `{ user, session, isNewUser: boolean } | { needsLinking: true, pendingUserId: string }`

**Logic flow:**

1. Look up `oauth_accounts` by `(provider, provider_account_id)`
2. **Found** -> existing linked user -> create Lucia session, return `{ user, session, isNewUser: false }`
3. **Not found** -> check if a user exists with matching email:
   - **Email exists, no link for this provider** -> return `{ needsLinking: true, pendingUserId }`
   - **Email doesn't exist** -> create new user + workspace + oauth_account -> create session, return `{ user, session, isNewUser: true }`

### New method: `confirmAccountLink()`

Called after user consents on the linking page:

1. Insert row into `oauth_accounts`
2. Update user's `avatar_url` if currently null
3. Set `email_verified_at` if currently null
4. Create Lucia session, return user

### Refactor: Extract workspace initialization

Extract workspace + default categories creation from `register()` into a shared `initializeWorkspace(userId)` method so both password signup and OAuth signup use the same logic.

### Unlink method: `unlinkOAuthProvider()`

1. Verify user has a password (cannot remove last auth method)
2. Delete the `oauth_accounts` record
3. Clear `avatar_url` if it came from the unlinked provider

## 4. API Routes

### `GET /api/auth/google` — Initiate OAuth

1. Generate cryptographic `state` (32 random bytes, hex encoded)
2. Generate PKCE `codeVerifier` via Arctic
3. Store both in HTTP-only cookies (10-min expiry, `SameSite=lax`, `Secure` in prod)
4. Build Google authorization URL with Arctic (scopes: `openid`, `email`, `profile`)
5. Redirect user to Google

### `GET /api/auth/google/callback` — Handle callback

1. Read `state` and `code` from URL query params
2. Read stored `state` and `codeVerifier` from cookies
3. Validate state matches (CSRF protection)
4. Clear state/verifier cookies
5. Exchange `code` for tokens via Arctic (using `codeVerifier` for PKCE)
6. Fetch Google user profile (`sub`, `email`, `name`, `picture`)
7. Call `loginOrRegisterWithOAuth(profile)`
8. If `needsLinking` -> store pending link info in short-lived cookie, redirect to `/auth/link-account`
9. If new or existing user -> set `sid` cookie via Lucia, redirect to `/dashboard`

### `POST /api/auth/google/link` — Confirm account linking

1. Read pending link info from cookie
2. Validate the pending link hasn't expired (10-min window)
3. Call `confirmAccountLink(provider, userId, profile)`
4. Set `sid` cookie, redirect to `/dashboard`

### `POST /api/auth/google/unlink` — Unlink account

1. Require authenticated session
2. Verify user has a password (cannot remove last auth method)
3. Call `unlinkOAuthProvider(userId, "google")`
4. Return success with toast message

### CSRF middleware

Whitelist `/api/auth/google` and `/api/auth/google/callback` (GET routes — state param provides CSRF protection). POST routes (`/link`, `/unlink`) use standard CSRF protection.

## 5. UI Components

### `GoogleButton.astro` (atom)

- DaisyUI `btn` classes, white background, Google brand colors
- Google "G" icon from `simple-icons` (already installed)
- Props: `action` ("Sign in" | "Sign up"), optional `class`
- Links to `/api/auth/google` (GET redirect, not form POST)
- Minimum 44x44px touch target for mobile
- ARIA label: "Sign in with Google" / "Sign up with Google"

### Login page update (`LoginForm.astro`)

- Add `GoogleButton` with "Sign in with Google" below the existing form
- DaisyUI divider between form and OAuth: `<div class="divider">OR</div>`
- Mobile: full-width button; desktop: same width as form

### Signup page update (`signup.astro`)

- Add `GoogleButton` with "Sign up with Google" above the email/password form
- Same divider pattern as login

### Account linking page (`/auth/link-account`)

- New page at `src/pages/auth/link-account.astro`
- Uses `AuthLayout` (same as login/signup)
- Shows: "An account with {email} already exists"
- Explains what linking means
- Two buttons: "Link my Google account" (POST `/api/auth/google/link`) and "Cancel" (redirect to `/login`)

### Security settings update (`/security`)

- Show linked Google account if present (email + avatar)
- "Unlink Google Account" button (only if user has a password set)
- Warning toast if attempting to unlink the last auth method

## 6. Security

- **PKCE:** Arctic generates code challenge/verifier (SHA-256)
- **State parameter:** 32 random bytes in HTTP-only cookie, validated on callback
- **Cookie security:** All OAuth cookies are `HttpOnly`, `SameSite=lax`, `Secure` in production, 10-minute expiry
- **Rate limiting:** Same IP-based limits as login (10 attempts/15min) on the callback endpoint
- **Soft-deleted users:** `loginOrRegisterWithOAuth` checks `deleted_at` before creating session
- **Token validation:** Tokens validated server-side via Arctic before session creation
- **Account linking consent:** Explicit user action required on dedicated page

## 7. Testing

### E2E tests (Playwright)

Mock Google OAuth responses in tests (intercept Arctic's token exchange):

1. New user signup via Google -> lands on dashboard
2. Returning user login via Google -> lands on dashboard
3. Existing email user -> account linking page -> confirm -> dashboard
4. Account linking -> cancel -> back to login
5. Unlink Google from security page (with password backup)
6. Unlink rejected when no password exists
7. Invalid state parameter -> error page
8. Expired linking cookie -> redirect to login with error toast

### Manual testing checklist

- Mobile and desktop viewports
- Keyboard navigation (Tab through Google button, Enter to activate)
- Different Google accounts
- Session persistence after OAuth login
- Logout and re-login flows

## 8. Extensibility

Adding a new provider (e.g., GitHub) requires:

1. **Database:** No changes — `oauth_accounts` table supports any provider
2. **OAuth config:** Add `export const github = new GitHub(...)` to `oauth.ts`
3. **Service:** No changes — `loginOrRegisterWithOAuth()` accepts `provider` param
4. **API routes:** New route pair `/api/auth/github` + `/api/auth/github/callback` (same pattern)
5. **UI:** New `GitHubButton.astro` component, add to login/signup pages

For Auth0 or generic OIDC: Arctic has a generic `OAuth2Client` that works with any OIDC-compliant provider.

## 9. OpenAPI Updates

Add to `openapi/paths/auth.yml`:

- `GET /api/auth/google` — Initiate Google OAuth flow
- `GET /api/auth/google/callback` — Google OAuth callback
- `POST /api/auth/google/link` — Confirm account linking
- `POST /api/auth/google/unlink` — Unlink Google account

Add to `openapi/schemas/`:

- `OAuthAccount.yml` — OAuth account schema

## 10. Dependencies

- Install: `bun add arctic`
- Already installed: `simple-icons` (Google icon)
- Environment: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

## 11. Implementation Order

Per AGENTS.md: **UI -> Service -> API -> CLI -> Seeder**

1. Database schema + migrations (both dialects)
2. Install Arctic dependency
3. OAuth configuration (`src/lib/auth/oauth.ts`)
4. `GoogleButton.astro` component
5. Login/signup page UI updates
6. Account linking page
7. Service layer methods
8. API route handlers
9. CSRF middleware whitelist
10. Security page updates (unlink)
11. OpenAPI documentation
12. E2E tests
13. Quality gates (lint, typecheck, format)
