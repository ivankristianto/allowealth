# ADR 011: OAuth SSO Integration

## Status

Accepted

## Context

Users need authentication options beyond email/password. Social sign-in reduces friction (no password to remember, single-click login) and leverages identity providers' existing email verification.

Key requirements:

- **Provider-agnostic design**: Google first, but GitHub/Apple may follow.
- **Account linking**: Existing email/password users must be able to add Google sign-in without losing data.
- **Cross-runtime compatibility**: Must work in Bun, Node.js, and Cloudflare Workers (no native addons).
- **Security**: PKCE, CSRF protection, and tamper-proof state for the linking flow.

## Decision

### 1. Provider-Agnostic Schema

A separate `oauth_accounts` table rather than adding provider columns to `users`:

```sql
oauth_accounts (
  id              TEXT PRIMARY KEY,
  user_id         TEXT REFERENCES users(id) ON DELETE CASCADE,
  provider        TEXT,          -- 'google', 'github', etc.
  provider_account_id TEXT,      -- provider's unique user ID
  email           TEXT,
  created_at      TIMESTAMP
)
UNIQUE (provider, provider_account_id)
INDEX (user_id)
```

This supports multiple providers per user and adding new providers without schema migrations. The `users.password_hash` column was made nullable to support OAuth-only accounts, and `users.avatar_url` was added for provider-sourced profile images.

### 2. Arctic Library

[Arctic](https://arcticjs.dev/) was chosen over alternatives (passport.js, next-auth, oslo/oauth2) because:

- Built on **Web Crypto API** — no native addons, works in Workers.
- Built-in **PKCE** support (code verifier/challenge generation).
- Minimal API surface — one client class per provider.
- Lazy initialization avoids errors when env vars are absent (tests, CI).

### 3. Three-Outcome Callback Pattern

`loginOrRegisterWithOAuth(profile)` produces exactly one of three outcomes:

| Outcome                   | Condition                                                         | Action                                                                                            |
| ------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| **Direct login**          | `oauth_accounts` row exists for `(provider, provider_account_id)` | Create session, redirect to `/dashboard`                                                          |
| **Consent-based linking** | User with matching email exists but no OAuth link                 | Store pending link in signed cookie, redirect to `/auth/link-account`                             |
| **Auto-register**         | No matching email or OAuth link                                   | Create user + workspace + oauth_account in a transaction, seed defaults, redirect to `/dashboard` |

The linking flow requires explicit user consent on a dedicated page — no silent merging of accounts.

### 4. HMAC-Signed Cookies for Linking State

Pending link data is stored in a signed HttpOnly cookie rather than a database table:

- **Payload**: JSON with `userId`, `provider`, `providerAccountId`, `email`, `name`, `avatarUrl`, `expiresAt`.
- **Signing**: HMAC-SHA256 via Web Crypto API. Format: `base64(json).hmac_hex`.
- **Verification**: Constant-time comparison prevents timing oracle attacks.
- **Expiry**: 10 minutes. Cookie is deleted after use (one-time).
- **Signing key**: `GOOGLE_CLIENT_SECRET` (sufficient for single-provider; see Future Considerations).

This avoids an extra DB table for ephemeral state and keeps the linking flow stateless on the server side.

### 5. Unlink Safety Gate

Before unlinking an OAuth provider, the service verifies the user has a password set. This prevents lockout for users who signed up via OAuth and never set a password. The check is simple: if `password_hash` is null, unlinking is denied with `OAUTH_UNLINK_DENIED`.

## Security Measures

| Layer             | Mechanism                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------- |
| CSRF              | Random `state` parameter in HttpOnly cookie, validated with constant-time comparison        |
| Code interception | PKCE flow (code verifier + SHA-256 challenge)                                               |
| Cookie tampering  | HMAC-SHA256 signature on pending link cookie                                                |
| Timing attacks    | Constant-time comparison for state, HMAC, and cookie signatures                             |
| Rate limiting     | 10 requests / 15 minutes per IP on callback endpoint                                        |
| Email trust       | `email_verified` claim enforced — unverified Google emails rejected                         |
| Session safety    | Workspace `status = 'active'` and `user.deleted_at IS NULL` checked before session creation |
| Cookie hardening  | `HttpOnly`, `SameSite=Lax`, `Secure` (production), `Max-Age=600`                            |

## Consequences

### Positive

- **Provider-agnostic**: Adding a new provider requires only a new Arctic client and route files; the service layer is reused as-is.
- **No native dependencies**: Entire flow uses Web Crypto API, compatible with Cloudflare Workers.
- **Data preservation**: Account linking preserves existing transactions, budgets, and settings.
- **Auto-verified email**: OAuth users inherit Google's email verification, skipping the verification email flow.
- **Stateless linking**: No extra DB table for temporary linking state.

### Negative

- **10-minute linking window**: Cookie-based state expires; users who delay consent must restart the flow.
- **Single signing key**: `GOOGLE_CLIENT_SECRET` is reused for cookie signing; multi-provider setups should use a dedicated secret.
- **Password-gated unlink**: OAuth-only users must set a password before unlinking, which adds a step.

## Future Considerations

- **Additional providers** (GitHub, Apple): Create new Arctic client + route files in `src/pages/api/auth/{provider}/`. The service layer (`loginOrRegisterWithOAuth`, `confirmAccountLink`, `unlinkOAuthProvider`) works without changes.
- **Dedicated `COOKIE_SIGNING_SECRET`**: Decouple cookie signing from any provider secret to support multi-provider setups cleanly.
- **Multi-provider avatar tracking**: Currently `avatar_url` is a single field on `users`. Multiple providers could source different avatars — may need a preference column.
- **Passwordless accounts**: OAuth-only users can't unlink without setting a password first. A future "set password" flow or alternative lockout check (e.g., requiring at least one other linked provider) would improve UX.
- **SSO enforcement per workspace**: Admin setting to require OAuth sign-in for all workspace members.

## References

- Implementation: `src/lib/auth/oauth.ts`, `src/services/auth.service.ts`, `src/pages/api/auth/google/`
- Cookie signing: `src/lib/crypto/cookie-signature.ts`
- DB schema: `src/db/schema/sqlite/oauth-accounts.ts`
- Design doc: `docs/plans/2026-02-11-google-sso-design.md`
- Arctic docs: https://arcticjs.dev/
