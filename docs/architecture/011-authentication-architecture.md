# ADR 011: Authentication Architecture

## Status

Accepted

## Context

Allowealth uses Better Auth as its authentication foundation. The system supports multiple authentication methods:

- Email/password with secure hashing (PBKDF2-SHA256)
- OAuth SSO (Google)
- Two-factor authentication (TOTP)
- Passkeys (WebAuthn/FIDO2)

Key requirements:

- Users can link multiple authentication methods to one account
- Implicit account linking is disabled for security
- All auth state lives in Better Auth tables
- The application owns domain data (users, workspaces, financial records)

## Decision

### 1. Better Auth Owns Authentication

All authentication flows run through the shared Better Auth server in `src/lib/auth/server.ts` and the Astro catch-all auth route at `src/pages/api/auth/[...all].ts`.

The application does not maintain:

- Custom OAuth callback handlers
- Pending-link cookies
- Custom OAuth state storage
- Custom session management

### 2. Plugin-Based Architecture

Authentication features are composed via Better Auth plugins:

```typescript
// src/lib/auth/server.ts
import { passkey } from '@better-auth/passkey';
import { twoFactor } from 'better-auth/plugins';

const authPlugins = [
  twoFactor(),
  passkey({
    rpID: getEnv('RP_ID') ?? new URL(getAuthBaseURL()).hostname,
    rpName: getEnv('RP_NAME') ?? 'Allowealth',
    origin: getAuthBaseURL(),
  }),
];
```

| Feature        | Plugin                 | Client Method                     |
| -------------- | ---------------------- | --------------------------------- |
| Email/password | Core                   | `authClient.signIn.email()`       |
| OAuth (Google) | Core                   | `authClient.signIn.social()`      |
| 2FA/MFA        | `twoFactor`            | `authClient.twoFactor.enable()`   |
| Passkeys       | `@better-auth/passkey` | `authClient.passkey.addPasskey()` |

### 3. Explicit Account Linking Only

Implicit linking is disabled:

```typescript
account: {
  accountLinking: {
    disableImplicitLinking: true,
  },
}
```

This produces these behaviors:

| Scenario                          | Behavior                                              |
| --------------------------------- | ----------------------------------------------------- |
| New OAuth user                    | Better Auth creates account; app bootstraps workspace |
| Existing user with linked OAuth   | Sign-in succeeds normally                             |
| Existing local user without OAuth | Sign-in blocked; must link from Security settings     |

### 4. Database Schema

Better Auth owns these tables:

- `user` - Authentication identity
- `session` - Session tokens
- `account` - OAuth account links
- `verification` - Email verification codes
- `twoFactor` - TOTP secrets and backup codes
- `passkey` - WebAuthn credentials

Application domain tables remain separate:

- `users` - Profile data
- `workspaces` - Workspace data
- Financial records (accounts, transactions, budgets)

### 5. Client API

Use the Better Auth client for all authentication operations:

```typescript
import { authClient } from '@/lib/auth/client';

// Sign in with email
await authClient.signIn.email({ email, password });

// Sign in with passkey
await authClient.signIn.passkey();

// Add a passkey (authenticated users only)
await authClient.passkey.addPasskey();

// List user's passkeys
const { data: passkeys } = await authClient.passkey.listUserPasskeys();

// Delete a passkey
await authClient.passkey.deletePasskey({ id });

// Enable 2FA
await authClient.twoFactor.enable();
```

### 6. Security Properties

- **Password hashing**: PBKDF2-SHA256 via Web Crypto API
- **Session security**: HTTP-only cookies with secure flag
- **CSRF protection**: Built into Better Auth
- **Rate limiting**: Per-endpoint rules via `secondaryStorage`
- **2FA**: TOTP with backup codes
- **Passkeys**: WebAuthn with user verification required
- **OAuth**: State parameter validation, PKCE where supported

## Passkeys (WebAuthn)

### Registration Flow

```
User clicks "Add Passkey" in Security settings
  → authClient.passkey.addPasskey()
  → Browser prompts for biometric/PIN
  → Credential created and stored
  → Passkey appears in list
```

### Authentication Flow

```
User clicks "Sign in with Passkey"
  → authClient.signIn.passkey()
  → Browser prompts for biometric/PIN
  → Credential verified
  → Session created, redirect to dashboard
```

### Conditional UI

The login page supports browser autofill for passkeys:

```typescript
// Preload conditional UI on login page
if (PublicKeyCredential.isConditionalMediationAvailable?.()) {
  authClient.signIn.passkey({ autoFill: true });
}
```

Add `autocomplete="username webauthn"` to the email field to enable browser passkey suggestions.

### Environment Variables

| Variable     | Purpose                          | Example                           |
| ------------ | -------------------------------- | --------------------------------- |
| `RP_ID`      | Relying Party ID (domain)        | `expenses.allowealth.com`         |
| `RP_NAME`    | Display name for passkey prompts | `Allowealth Expenses`             |
| `PUBLIC_URL` | Origin for WebAuthn              | `https://expenses.allowealth.com` |

### Local Testing with Passkeys

WebAuthn requires a secure context (HTTPS or localhost). For local development:

**Option 1: Use localhost (no HTTPS needed)**

```bash
# .env
PUBLIC_URL=http://localhost:4321
RP_ID=localhost
RP_NAME=Allowealth Local
```

Browsers allow WebAuthn on `localhost` without HTTPS.

**Option 2: Use HTTPS with mkcert**

For testing on mobile devices or when you need a non-localhost domain:

```bash
# Install mkcert
brew install mkcert

# Create local CA and certificates
mkcert -install
mkcert expenses.localhost.test

# Update .env
PUBLIC_URL=https://expenses.localhost.test:4321
RP_ID=expenses.localhost.test
RP_NAME=Allowealth Local
```

Then configure Astro to use HTTPS with the generated certificates.

**Option 3: Use a tunnel (ngrok, cloudflared)**

```bash
# Install cloudflared
brew install cloudflared

# Create tunnel
cloudflared tunnel --url http://localhost:4321

# Update .env with the HTTPS URL
PUBLIC_URL=https://your-tunnel.trycloudflare.com
RP_ID=your-tunnel.trycloudflare.com
```

## Two-Factor Authentication

### Setup Flow

1. User enables 2FA in Security settings
2. QR code displayed for TOTP app scan
3. User enters verification code to confirm
4. Backup codes generated and shown once

### Sign-In Flow

```
Email/password sign-in
  → If 2FA enabled: redirect to /login/verify-mfa
  → User enters TOTP code
  → Session created
```

## OAuth (Google)

### Linking Flow

Users link Google accounts from Security settings while authenticated. The UI calls:

```typescript
await authClient.linkSocial({ provider: 'google' });
```

### Unlinking

Users can unlink Google if they have another sign-in method (password or another OAuth account).

## Consequences

### Positive

- One auth system manages all authentication methods
- No custom OAuth callback code or session management
- Plugin architecture makes adding methods straightforward
- Consistent client API across all auth methods

### Negative

- Users must sign in before linking OAuth accounts (no implicit linking)
- WebAuthn requires HTTPS for non-localhost domains
- Session migration required when switching auth systems

## References

- `src/lib/auth/server.ts` - Better Auth server configuration
- `src/lib/auth/client.ts` - Better Auth client
- `src/db/schema/sqlite/better-auth.ts` - Auth tables
- `src/pages/security.astro` - Security settings UI
- `src/components/molecules/SecurityPasskeysCard.astro` - Passkey management
- `src/components/molecules/LoginForm.astro` - Login with passkey support
- Better Auth Passkey docs: https://better-auth.com/docs/plugins/passkey
