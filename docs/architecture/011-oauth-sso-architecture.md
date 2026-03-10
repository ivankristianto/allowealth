# ADR 011: OAuth SSO Integration

## Status

Accepted

## Context

Allowealth needs Google sign-in without preserving the old custom OAuth callback flow, pending-link cookies, or Arctic-specific wiring.

Key product requirements:

- Google is the first social sign-in provider.
- Existing email/password users must not be silently merged into Google sign-in.
- Linking must remain explicit and authenticated.
- OAuth behavior should follow Better Auth ownership instead of app-specific callback internals.

## Decision

### 1. Better Auth Owns OAuth

Google OAuth now runs through the shared Better Auth server in `src/lib/auth/server.ts` and the Astro catch-all auth route at `src/pages/api/auth/[...all].ts`.

The application no longer maintains:

- custom Google callback handlers
- pending-link cookies
- custom OAuth state storage
- Arctic client setup

### 2. Explicit Linking Only From Security Settings

Implicit linking is disabled:

```ts
account: {
  accountLinking: {
    disableImplicitLinking: true,
  },
}
```

That gives the product these outcomes:

| Scenario                                          | Behavior                                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| New Google user                                   | Better Auth creates the auth account, then app bootstrap creates the workspace              |
| Existing user with linked Google account          | Sign-in succeeds normally                                                                   |
| Existing local-account user without linked Google | Sign-in is blocked and the user is told to sign in first, then connect Google from Security |

The old `/auth/link-account` page and pre-auth consent step were intentionally removed.

### 3. Better Auth Tables Are Canonical For Sign-In

Better Auth now owns the auth user, session, account, verification, and 2FA tables used for authentication.

App-owned domain data remains separate:

- `users`
- `workspaces`
- financial records
- invitations

The app still owns one thin integration point: post-signup bootstrap that creates domain records exactly once for new auth users.

### 4. Linked Account Management Is Product UI, Not Callback Logic

Users start Google linking from the authenticated Security page. The UI calls Better Auth client methods to link or unlink Google, and the app surfaces the product-specific guidance around safe linking and unlinking.

## Security Properties

- Better Auth handles the provider flow and session lifecycle.
- Implicit account linking is disabled.
- Existing local accounts are protected from accidental merge during Google sign-in.
- Linking requires an authenticated session in Settings > Security.
- Unlinking follows Better Auth safety rules so users are not allowed to remove their last usable sign-in method.

## Consequences

### Positive

- One auth system owns Google sign-in and linked-account state.
- The app no longer carries custom OAuth callback code or pending-link cookies.
- The authenticated settings flow is easier to reason about than a pre-auth branching callback.
- Adding future providers can reuse the same Better Auth integration pattern.

### Negative

- Users with old sessions must sign in again after the Better Auth cutover.
- Existing local-account users cannot start linking from the Google login callback anymore; they must sign in first and link from Security.

## References

- `src/lib/auth/server.ts`
- `src/services/auth.service.ts`
- `src/components/molecules/SecurityConnectedAccountsCard.astro`
- `src/pages/security.astro`
- `docs/plans/2026-03-10-better-auth-migration-design.md`
