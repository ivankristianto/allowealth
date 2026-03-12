# Migrate Authentication to Better Auth

**Issue:** #308
**Date:** 2026-03-10
**Status:** Approved

## Goal

Replace the current Lucia + Arctic + Oslo + custom auth stack with `better-auth` using its native Astro integration and built-in auth features. This is a clean break, not a migration project: old sessions can be invalidated, old auth internals can be removed, and the new design should follow `better-auth` best practices rather than preserve legacy patterns.

## Decisions

| Question | Decision |
|----------|----------|
| Migration strategy | Clean rewrite with no backward compatibility and no data migration |
| Auth library | `better-auth` as the single auth system |
| Astro integration | Use native `better-auth` Astro pattern with shared auth instance, catch-all auth route, and middleware-backed session lookup |
| Database strategy | Use `better-auth` native schema/tables for auth state |
| Google OAuth | Replace custom Google OAuth flow with built-in provider support |
| TOTP MFA | Replace custom MFA service, crypto helpers, and backup-code implementation with `better-auth` 2FA plugin |
| Account linking | Do not auto-link on first Google callback; require authenticated, explicit linking from settings/security |
| Session compatibility | Forced logout on deploy is acceptable |

## Architecture

`better-auth` becomes the only authentication system in the application. The server exposes one shared auth instance and a catch-all route at `/api/auth/[...all].ts`. Astro middleware reads the session through `better-auth`, then populates `Astro.locals.user` and `Astro.locals.session` for pages and API routes that need authenticated context.

This removes the current split ownership across Lucia, Arctic, Oslo, session cache utilities, custom OAuth cookie signing, and custom MFA code. `better-auth` owns the auth user model, sessions, linked accounts, password auth, Google OAuth, TOTP setup and verification, and backup code lifecycle. The application keeps only app-specific auth-adjacent logic: signup policy enforcement, initial workspace bootstrap, post-signup domain seeding, and route protection for product pages.

The new design does not carry forward the current `/auth/link-account` pending-cookie flow. Explicit linking remains a product requirement, but the link action moves into the authenticated settings/security area. If a user tries to sign in with Google before linking an existing local account, the system should not silently merge the accounts. Instead, it should block the sign-in and instruct the user to log in with their existing method first, then connect Google from settings.

## User Flows

### Email/Password Signup

The app uses `better-auth` signup to create the auth user. After successful signup, app-owned bootstrap logic creates the user's initial workspace and any required default records. This bootstrap must run exactly once per newly created user.

### Email/Password Login and Logout

Login, logout, password changes, session validation, email verification, and password reset use `better-auth` endpoints and client methods. Existing custom route handlers that only proxy these behaviors should be removed.

### Google Sign-In

Google uses `better-auth`'s built-in provider flow.

- New Google user: create auth account, run workspace bootstrap, start session.
- Existing user with linked Google account: start session normally.
- Existing local-account user without linked Google: block sign-in, show guidance to sign in with the existing method first, then link Google from settings.

### Two-Factor Authentication

Two-factor auth uses the `better-auth` 2FA plugin with TOTP and backup codes. The product capabilities remain the same at a high level:

- Enable TOTP
- Confirm setup with a verification code
- Show backup codes once
- Regenerate backup codes
- Disable 2FA
- Require second-factor verification during sign-in when enabled

The implementation no longer uses custom OTP generation, secret storage helpers, backup-code hashing utilities, or a dedicated MFA service layer unless a thin app-specific wrapper is required for UI composition.

### Linked Account Management

Users manage linked Google accounts from an authenticated settings/security surface. Linking is always explicit. Unlinking should follow `better-auth` safety rules so a user cannot remove the last available sign-in method and lock themselves out.

## Data and Ownership

Auth tables and auth lifecycle state come from `better-auth`'s native schema. Existing domain tables such as workspaces, transactions, budgets, and reports remain unchanged.

The only required bridge between auth state and product state is post-signup bootstrap. When a new auth user is created, the app must create the corresponding workspace and initialize required domain records. This integration point must be explicit and testable.

The old auth-specific persistence can be removed once the rewrite is complete, including:

- Lucia session and adapter code
- custom OAuth account-linking cookie flow
- custom MFA tables and helpers used only for the old auth implementation
- session cache utilities tied to Lucia validation

## Error Handling

The application should stop modeling auth as a large custom service with bespoke error enums for behaviors now owned by `better-auth`. `better-auth` errors should be translated only where user-facing messaging matters, such as:

- invalid login credentials
- blocked Google sign-in for an unlinked existing account
- failed link or unlink actions from settings
- invalid or expired password reset or verification actions

At internal boundaries, the design should prefer direct `better-auth` semantics over recreating a compatibility layer that mirrors the old system.

## Testing Strategy

Testing should verify behavior, not preserve old internals.

### Keep and Add

- Integration tests for post-signup workspace bootstrap and signup policy enforcement
- Middleware tests for authenticated session lookup and route protection
- Route and integration tests for auth-aware product pages and API handlers that rely on `Astro.locals`
- Browser or E2E tests for signup, login, logout, password reset, Google sign-in, 2FA enablement, backup code recovery, and Google link/unlink from settings

### Delete or Rewrite

- Tests that only validate Lucia session caching
- Tests for custom OAuth callback branching and signed pending-link cookies
- Tests for custom MFA crypto, backup-code hashing, or custom TOTP verification internals

## Risks

- The biggest integration risk is partial user bootstrap: auth user creation must not leave the app without the required workspace or seed data.
- The settings/security UI will change because the old pre-auth linking flow is being removed.
- The rewrite will invalidate all existing sessions, which is acceptable but must be communicated clearly.

## Out of Scope

- Passkeys or WebAuthn
- Additional OAuth providers beyond Google in this rewrite
- Preserving legacy auth tables or migrating existing auth data
- Retaining custom auth abstractions when `better-auth` already provides the behavior

## References

- `docs/architecture/003-api-authentication.md`
- `docs/architecture/011-oauth-sso-architecture.md`
- `src/services/auth.service.ts`
- `src/services/mfa.service.ts`
- `https://www.better-auth.com/docs/integrations/astro`
- `https://www.better-auth.com/docs/concepts/users-accounts`
- `https://www.better-auth.com/docs/plugins/2fa`
