---
paths:
  - 'src/lib/auth/**/*.ts'
  - 'src/components/**/security-*.ts'
  - 'src/components/**/LoginForm.astro'
---

# Authentication Patterns

## Better Auth Integration

All authentication flows use Better Auth. The server configuration lives in `src/lib/auth/server.ts` and the client in `src/lib/auth/client.ts`.

### Server Configuration

```typescript
import { betterAuth } from 'better-auth';
import { passkey } from '@better-auth/passkey';
import { twoFactor } from 'better-auth/plugins';

const auth = betterAuth({
  plugins: [
    twoFactor(),
    passkey({
      rpID: getEnv('RP_ID') ?? new URL(getAuthBaseURL()).hostname,
      rpName: getEnv('RP_NAME') ?? 'Allowealth',
      origin: getAuthBaseURL(),
    }),
  ],
});
```

### Client Usage

```typescript
import { authClient } from '@/lib/auth/client';

// Always use authClient for auth operations
await authClient.signIn.email({ email, password });
await authClient.signIn.passkey();
await authClient.passkey.addPasskey();
```

## Passkeys (WebAuthn)

### Rules

- ✅ Use `@better-auth/passkey` plugin - no custom WebAuthn code
- ✅ Call `authClient.passkey.addPasskey()` for registration
- ✅ Call `authClient.signIn.passkey()` for authentication
- ✅ Add `autocomplete="username webauthn"` to email fields for conditional UI
- ✅ Support conditional UI autofill on login pages
- ❌ Write custom WebAuthn ceremony handlers - use Better Auth client methods

### Client Script Pattern

```typescript
// Add passkey button handler
const addBtn = document.getElementById('add-passkey-btn');
addBtn?.addEventListener('click', async () => {
  const result = await authClient.passkey.addPasskey();
  if (result?.error) {
    addToast(result.error.message || 'Failed to register passkey', 'error');
    return;
  }
  addToast('Passkey registered successfully', 'success');
  await refreshPasskeyList();
});
```

### Conditional UI (Autofill)

```typescript
// Preload passkey autofill on login page
if (
  typeof PublicKeyCredential !== 'undefined' &&
  PublicKeyCredential.isConditionalMediationAvailable
) {
  PublicKeyCredential.isConditionalMediationAvailable().then((available) => {
    if (available) {
      authClient.signIn.passkey({ autoFill: true });
    }
  });
}
```

## Two-Factor Authentication

### Rules

- ✅ Use `twoFactor` plugin from `better-auth/plugins`
- ✅ Use `twoFactorClient` on the client side
- ✅ Check `user.twoFactorEnabled` to determine if 2FA is required
- ✅ Redirect to `/login/verify-mfa` when `twoFactorRedirect` is true
- ❌ Implement custom TOTP verification

### Server-Side 2FA Check

```typescript
const result = await authClient.signIn.email({
  email,
  password,
  fetchOptions: {
    onSuccess(context) {
      if (context.data?.twoFactorRedirect) {
        // Redirect to MFA verification
      }
    },
  },
});
```

## OAuth / SSO

### Rules

- ✅ Use Better Auth's built-in social providers
- ✅ Disable implicit linking: `disableImplicitLinking: true`
- ✅ Link accounts only from authenticated Security settings
- ✅ Use `authClient.linkSocial()` for linking
- ❌ Write custom OAuth callback handlers

### Account Linking

```typescript
// Explicit linking from Security page
await authClient.linkSocial({ provider: 'google' });
```

## Local Testing

### Passkeys Require HTTPS (Except localhost)

WebAuthn requires a secure context. For local development:

**Option 1: Use localhost**

```bash
# .env
PUBLIC_URL=http://localhost:4321
RP_ID=localhost
```

**Option 2: Use HTTPS with mkcert**

```bash
brew install mkcert
mkcert -install
mkcert expenses.localhost.test

# Update .env
PUBLIC_URL=https://expenses.localhost.test:4321
RP_ID=expenses.localhost.test
```

**Option 3: Use a tunnel**

```bash
cloudflared tunnel --url http://localhost:4321
```

### Environment Variables

| Variable               | Required     | Description                                |
| ---------------------- | ------------ | ------------------------------------------ |
| `BETTER_AUTH_SECRET`   | Yes          | Encryption key for sessions                |
| `PUBLIC_URL`           | Yes          | Base URL for auth callbacks                |
| `RP_ID`                | For passkeys | Domain for WebAuthn (defaults to hostname) |
| `RP_NAME`              | For passkeys | Display name in passkey prompts            |
| `GOOGLE_CLIENT_ID`     | For OAuth    | Google OAuth client ID                     |
| `GOOGLE_CLIENT_SECRET` | For OAuth    | Google OAuth client secret                 |

## Session Management

### Rules

- ✅ Use `Astro.locals.user` from middleware
- ✅ Use `auth.api.getSession()` for server-side session validation
- ✅ Use `auth.api.listSessions()` for session management
- ❌ Access session cookies directly

### Server-Side Session Check

```typescript
import { auth } from '@/lib/auth/server';

const session = await auth.api.getSession({
  headers: Astro.request.headers,
});
```

## Testing Authentication

### Unit Tests

Test component structure, not WebAuthn ceremonies:

```typescript
// Verify client calls correct methods
expect(source).toContain('authClient.passkey.addPasskey()');
expect(source).toContain('authClient.signIn.passkey()');
```

### E2E Tests

For passkey flows, use Playwright with virtual authenticators:

```typescript
// Enable virtual authenticator for testing
await page.evaluate(() => {
  // WebAuthn testing API
});
```

Note: Passkey E2E tests require browser support for WebAuthn testing APIs.
