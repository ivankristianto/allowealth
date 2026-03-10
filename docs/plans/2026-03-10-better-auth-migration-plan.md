# Better Auth Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the legacy Lucia + Arctic + Oslo auth stack with `better-auth`, keep app-specific workspace bootstrap and explicit Google linking, and remove obsolete auth code.

**Architecture:** Add a shared `better-auth` server instance, Astro catch-all auth route, and middleware-backed session hydration. Keep only thin app-owned auth logic for signup policy, workspace bootstrap, and security/settings composition; delete custom session, OAuth callback, and MFA internals.

**Tech Stack:** Astro 5, TypeScript, Bun, Drizzle ORM, SQLite, Cloudflare D1, better-auth

---

### Task 1: Install Better Auth and add auth schema scaffolding

**Files:**
- Modify: `package.json`
- Modify: `bun.lock`
- Modify: `src/env.d.ts`
- Modify: `.env.example`
- Create: `src/db/schema/sqlite/better-auth.ts`
- Modify: `src/db/schema/sqlite/index.ts`
- Modify: `src/db/schema/sqlite/relations.ts`
- Test: `src/lib/auth/server.test.ts`

**Step 1: Write the failing auth config smoke test**

Create `src/lib/auth/server.test.ts` with a smoke test that imports the planned auth module and asserts:

```ts
import { describe, expect, it } from 'bun:test';

describe('better-auth server config', () => {
  it('creates an auth instance with google and two-factor enabled', async () => {
    const mod = await import('./server');
    expect(mod.auth).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/lib/auth/server.test.ts`

Expected: FAIL with `Cannot find module './server'` or equivalent.

**Step 3: Install dependencies and add the Drizzle schema file**

- Add `better-auth` to dependencies.
- Remove `lucia`, `@lucia-auth/adapter-drizzle`, `arctic`, `@oslojs/otp`, `qrcode`, and `@types/qrcode`.
- Add `BETTER_AUTH_SECRET` and any required auth base URL env typings to `src/env.d.ts` and `.env.example`.
- Create `src/db/schema/sqlite/better-auth.ts` for `better-auth`-managed auth tables.
- Export the new auth tables from `src/db/schema/sqlite/index.ts`.
- Update `src/db/schema/sqlite/relations.ts` only where app-level relations need the new auth tables.

Use `users` as the app’s canonical user table only if the current `better-auth` Drizzle adapter cleanly supports that mapping; otherwise introduce `better-auth` auth tables in `better-auth.ts` and update relations deliberately rather than mixing old Lucia schema and new auth schema.

**Step 4: Run the smoke test and typecheck**

Run: `bun test src/lib/auth/server.test.ts`

Expected: PASS

Run: `bun run typecheck`

Expected: FAIL only on the remaining legacy auth consumers, not on the new schema file itself.

**Step 5: Commit**

```bash
git add package.json bun.lock .env.example src/env.d.ts src/db/schema/sqlite/better-auth.ts src/db/schema/sqlite/index.ts src/db/schema/sqlite/relations.ts src/lib/auth/server.test.ts
git commit -m "feat(auth): add better-auth schema scaffolding"
```

### Task 2: Add the core Better Auth server, client, and Astro handler

**Files:**
- Create: `src/lib/auth/server.ts`
- Create: `src/lib/auth/client.ts`
- Create: `src/lib/auth/types.ts`
- Create: `src/pages/api/auth/[...all].ts`
- Modify: `src/middleware/auth.ts`
- Modify: `src/lib/api-utils.ts`
- Modify: `src/lib/auth/requireAuth.ts`
- Modify: `src/env.d.ts`
- Test: `src/middleware/auth.test.ts`

**Step 1: Write the failing middleware/session test**

Add `src/middleware/auth.test.ts` covering:

- unauthenticated request sets `locals.user = null`
- authenticated request resolves session through the new auth instance
- stale session clears auth state instead of throwing

**Step 2: Run test to verify it fails**

Run: `bun test src/middleware/auth.test.ts`

Expected: FAIL because middleware still imports Lucia/session-cache code.

**Step 3: Implement the new core auth integration**

- Create `src/lib/auth/server.ts` with the shared `better-auth` instance, Google provider, and 2FA plugin.
- Create `src/lib/auth/client.ts` with the browser client used by auth pages and security/settings flows.
- Create `src/lib/auth/types.ts` so app components stop importing library-specific Lucia types directly.
- Add `src/pages/api/auth/[...all].ts` as the single auth endpoint entrypoint.
- Rewrite `src/middleware/auth.ts` to call `auth.api.getSession(...)` and populate `Astro.locals`.
- Remove session-cache usage from middleware.
- Update `src/lib/api-utils.ts` and `src/lib/auth/requireAuth.ts` to rely on the new locals shape.

Keep `auth_hint` only if the current static-page behavior still needs it. If it remains necessary, set it from the new middleware based on `better-auth` session presence rather than Lucia cookies.

**Step 4: Run targeted verification**

Run: `bun test src/middleware/auth.test.ts`

Expected: PASS

Run: `bun test src/lib/auth/server.test.ts`

Expected: PASS

Run: `bun run typecheck`

Expected: FAIL only on consumers still importing `@/lib/auth/lucia` or old auth routes.

**Step 5: Commit**

```bash
git add src/lib/auth/server.ts src/lib/auth/client.ts src/lib/auth/types.ts src/pages/api/auth/[...all].ts src/middleware/auth.ts src/lib/api-utils.ts src/lib/auth/requireAuth.ts src/env.d.ts src/middleware/auth.test.ts
git commit -m "feat(auth): add better-auth astro integration"
```

### Task 3: Rebuild app-owned bootstrap and explicit linking rules on top of Better Auth

**Files:**
- Modify: `src/services/auth.service.ts`
- Modify: `src/services/auth.service.test.ts`
- Modify: `src/services/account-category.service.ts`
- Modify: `src/services/workspace.service.ts`
- Modify: `src/lib/auth/signup-mode.ts`
- Modify: `src/pages/signup.astro`
- Modify: `src/pages/login.astro`

**Step 1: Write the failing service tests**

Add or update `src/services/auth.service.test.ts` to cover:

- new email/password signup bootstraps a workspace exactly once
- new Google signup bootstraps a workspace exactly once
- existing local-account user attempting Google sign-in without prior linking is rejected with a user-facing “sign in first, then connect Google” outcome
- linked Google account login succeeds without the old pending-link cookie flow

**Step 2: Run test to verify it fails**

Run: `bun test src/services/auth.service.test.ts`

Expected: FAIL because the current service still depends on Lucia/Arctic behavior.

**Step 3: Implement the thin app-owned auth layer**

- Reduce `src/services/auth.service.ts` to app-owned concerns only:
  - signup policy checks
  - new-user workspace bootstrap
  - linked-account queries needed by the settings UI
  - explicit link-blocking rules for existing local accounts
- Remove direct session creation, password hashing, OAuth callback branching, and custom pending-link cookie responsibilities from this service.
- Reuse existing workspace/category bootstrap helpers where possible instead of duplicating setup logic.
- Update `src/pages/signup.astro` and `src/pages/login.astro` to call the new client/server flows rather than legacy `/api/auth/login` and `/api/auth/signup` handlers.

**Step 4: Run targeted verification**

Run: `bun test src/services/auth.service.test.ts`

Expected: PASS

Run: `bun run typecheck`

Expected: FAIL only on remaining UI and route consumers that still depend on legacy auth files.

**Step 5: Commit**

```bash
git add src/services/auth.service.ts src/services/auth.service.test.ts src/services/account-category.service.ts src/services/workspace.service.ts src/lib/auth/signup-mode.ts src/pages/signup.astro src/pages/login.astro
git commit -m "feat(auth): rebuild bootstrap and linking rules for better-auth"
```

### Task 4: Replace legacy login, recovery, and verification flows with Better Auth client flows

**Files:**
- Modify: `src/pages/login.astro`
- Modify: `src/pages/login/verify-mfa.astro`
- Modify: `src/pages/forgot-password.astro`
- Create: `src/pages/reset-password.astro`
- Modify: `src/components/organisms/ManageAccountForms.astro`
- Modify: `src/pages/profile.astro`
- Test: `e2e/auth-core.spec.ts`

**Step 1: Write the failing auth-core E2E spec**

Create `e2e/auth-core.spec.ts` covering:

- email/password login success
- 2FA-required login reaches the verification step
- forgot-password request succeeds
- reset-password page loads and accepts a valid reset token flow
- profile page still renders correctly when authenticated under the new session shape

**Step 2: Run test to verify it fails**

Run: `bun run test:e2e --grep "auth core"`

Expected: FAIL because the pages still submit to removed or Lucia-specific endpoints.

**Step 3: Rewire the pages**

- Update `src/pages/login.astro` to use `better-auth` client sign-in and handle the 2FA-required branch.
- Update `src/pages/login/verify-mfa.astro` to verify the second factor through `better-auth` instead of `/api/auth/login/verify-mfa`.
- Update `src/pages/forgot-password.astro` and create `src/pages/reset-password.astro` around `better-auth` recovery flows.
- Update `src/components/organisms/ManageAccountForms.astro` and `src/pages/profile.astro` so authenticated profile rendering depends on the new user type module rather than Lucia types.

Prefer using the `better-auth` client on custom Astro pages instead of recreating bespoke API wrappers.

**Step 4: Run targeted verification**

Run: `bun run test:e2e --grep "auth core"`

Expected: PASS

Run: `bun run typecheck`

Expected: FAIL only on security/settings or legacy cleanup files not yet migrated.

**Step 5: Commit**

```bash
git add src/pages/login.astro src/pages/login/verify-mfa.astro src/pages/forgot-password.astro src/pages/reset-password.astro src/components/organisms/ManageAccountForms.astro src/pages/profile.astro e2e/auth-core.spec.ts
git commit -m "feat(auth): migrate login and recovery flows to better-auth"
```

### Task 5: Rebuild security settings for Google linking and two-factor management

**Files:**
- Modify: `src/pages/security.astro`
- Modify: `src/pages/security-mfa-client.ts`
- Modify: `src/components/molecules/SecurityConnectedAccountsCard.astro`
- Modify: `src/components/molecules/SecurityMfaCard.astro`
- Modify: `src/components/organisms/MfaSetupModal.astro`
- Modify: `src/components/organisms/MfaConfirmModal.astro`
- Modify: `src/components/organisms/MfaBackupCodesModal.astro`
- Modify: `src/pages/dashboard.astro`
- Modify: `src/pages/settings/index.astro`
- Delete: `src/pages/auth/link-account.astro`
- Test: `e2e/security-auth.spec.ts`

**Step 1: Write the failing security E2E spec**

Create `e2e/security-auth.spec.ts` covering:

- authenticated user can start Google linking from security/settings
- Google unlink control is shown only when safe
- user can enable TOTP, confirm setup, view backup codes, and disable 2FA
- dashboard/banner state still reflects whether 2FA is enabled

**Step 2: Run test to verify it fails**

Run: `bun run test:e2e --grep "security auth"`

Expected: FAIL because the current UI still hits custom MFA and Google link endpoints.

**Step 3: Implement the security rewrite**

- Update `src/pages/security.astro` data loading to use the new auth/account state.
- Rewire `src/pages/security-mfa-client.ts` and the MFA modals to `better-auth` 2FA client methods.
- Update `src/components/molecules/SecurityConnectedAccountsCard.astro` to start the authenticated Google link flow and unlink through `better-auth`.
- Update `src/components/molecules/SecurityMfaCard.astro` copy and states only where the new flow requires it.
- Remove `src/pages/auth/link-account.astro`; linking now starts only from authenticated settings.
- Update `src/pages/dashboard.astro` and `src/pages/settings/index.astro` to read 2FA and account state from the new auth layer.

**Step 4: Run targeted verification**

Run: `bun run test:e2e --grep "security auth"`

Expected: PASS

Run: `bun run typecheck`

Expected: PASS for pages and components touched in Tasks 4-5.

**Step 5: Commit**

```bash
git add src/pages/security.astro src/pages/security-mfa-client.ts src/components/molecules/SecurityConnectedAccountsCard.astro src/components/molecules/SecurityMfaCard.astro src/components/organisms/MfaSetupModal.astro src/components/organisms/MfaConfirmModal.astro src/components/organisms/MfaBackupCodesModal.astro src/pages/dashboard.astro src/pages/settings/index.astro
git rm src/pages/auth/link-account.astro
git commit -m "feat(security): move linking and 2fa management to better-auth"
```

### Task 6: Remove legacy auth routes, services, and schema

**Files:**
- Delete: `src/lib/auth/lucia.ts`
- Delete: `src/lib/auth/lucia.d.ts`
- Delete: `src/lib/auth/lucia.test.ts`
- Delete: `src/lib/auth/oauth.ts`
- Delete: `src/lib/auth/session-cache.ts`
- Delete: `src/lib/auth/mfa-crypto.ts`
- Delete: `src/lib/auth/mfa-crypto.test.ts`
- Delete: `src/services/mfa.service.ts`
- Delete: `src/services/mfa.service.test.ts`
- Delete: `src/pages/api/auth/login/index.ts`
- Delete: `src/pages/api/auth/login/verify-mfa.ts`
- Delete: `src/pages/api/auth/logout.ts`
- Delete: `src/pages/api/auth/signup.ts`
- Delete: `src/pages/api/auth/forgot-password.ts`
- Delete: `src/pages/api/auth/resend-verification.ts`
- Delete: `src/pages/api/auth/verify-email.ts`
- Delete: `src/pages/api/auth/google/index.ts`
- Delete: `src/pages/api/auth/google/callback.ts`
- Delete: `src/pages/api/auth/google/link.ts`
- Delete: `src/pages/api/auth/google/unlink.ts`
- Delete: `src/pages/api/auth/mfa/status.ts`
- Delete: `src/pages/api/auth/mfa/setup.ts`
- Delete: `src/pages/api/auth/mfa/verify-setup.ts`
- Delete: `src/pages/api/auth/mfa/disable.ts`
- Delete: `src/pages/api/auth/mfa/regenerate-backup-codes.ts`
- Modify: `src/lib/csrf.ts`
- Modify: `src/services/index.ts`
- Modify: `src/db/schema/sqlite/index.ts`
- Modify: `src/db/schema/sqlite/relations.ts`
- Modify: `src/db/schema/sqlite/sessions.ts`
- Modify: `src/db/schema/sqlite/oauth-accounts.ts`
- Modify: `src/db/schema/sqlite/user-mfa.ts`
- Modify: `src/db/schema/sqlite/user-mfa-backup-codes.ts`
- Modify: `src/db/schema/sqlite/password-reset-tokens.ts`
- Modify: `src/db/schema/sqlite/email-verification-tokens.ts`
- Test: `src/services/api-key.service.cache.test.ts`

**Step 1: Write the failing cleanup regression test**

Add or update a focused regression test in `src/services/api-key.service.cache.test.ts` or another appropriate auth-adjacent test to confirm non-auth features still resolve the current authenticated user/session context after the auth rewrite.

**Step 2: Run test to verify it fails**

Run: `bun test src/services/api-key.service.cache.test.ts`

Expected: FAIL if any remaining code path still imports Lucia-specific auth/session types.

**Step 3: Delete the obsolete auth surface**

- Remove all Lucia-, Arctic-, and Oslo-specific route handlers and helpers.
- Remove old schema exports only after the new `better-auth` schema is active and consumers are migrated.
- Update `src/lib/csrf.ts` so auth route exemptions match the new catch-all route and any remaining non-auth custom endpoints.
- Trim `src/services/index.ts` exports to reflect the new auth surface.

Do not delete `src/services/email-verification.service.ts` or `src/services/password-reset.service.ts` until every remaining caller is audited. If a file still contains app-specific logic, split that logic out before removing the auth-specific pieces.

**Step 4: Run targeted verification**

Run: `bun test src/services/api-key.service.cache.test.ts`

Expected: PASS

Run: `bun run typecheck`

Expected: PASS

Run: `rg -n "lucia|arctic|@oslojs/otp|session-cache|pending_oauth_link|mfa-crypto" src package.json`

Expected: no matches except design/history docs that intentionally reference old architecture.

**Step 5: Commit**

```bash
git add src/lib/csrf.ts src/services/index.ts src/db/schema/sqlite/index.ts src/db/schema/sqlite/relations.ts src/db/schema/sqlite/sessions.ts src/db/schema/sqlite/oauth-accounts.ts src/db/schema/sqlite/user-mfa.ts src/db/schema/sqlite/user-mfa-backup-codes.ts src/db/schema/sqlite/password-reset-tokens.ts src/db/schema/sqlite/email-verification-tokens.ts src/services/api-key.service.cache.test.ts
git rm src/lib/auth/lucia.ts src/lib/auth/lucia.d.ts src/lib/auth/lucia.test.ts src/lib/auth/oauth.ts src/lib/auth/session-cache.ts src/lib/auth/mfa-crypto.ts src/lib/auth/mfa-crypto.test.ts src/services/mfa.service.ts src/services/mfa.service.test.ts src/pages/api/auth/login/index.ts src/pages/api/auth/login/verify-mfa.ts src/pages/api/auth/logout.ts src/pages/api/auth/signup.ts src/pages/api/auth/forgot-password.ts src/pages/api/auth/resend-verification.ts src/pages/api/auth/verify-email.ts src/pages/api/auth/google/index.ts src/pages/api/auth/google/callback.ts src/pages/api/auth/google/link.ts src/pages/api/auth/google/unlink.ts src/pages/api/auth/mfa/status.ts src/pages/api/auth/mfa/setup.ts src/pages/api/auth/mfa/verify-setup.ts src/pages/api/auth/mfa/disable.ts src/pages/api/auth/mfa/regenerate-backup-codes.ts
git commit -m "refactor(auth): remove legacy auth implementation"
```

### Task 7: Update documentation and run full verification

**Files:**
- Modify: `docs/architecture/003-api-authentication.md`
- Modify: `docs/architecture/011-oauth-sso-architecture.md`
- Modify: `docs/sso/google-setup.md`
- Modify: `docs/sites/src/content/docs/reference/api-overview.md`
- Modify: `docs/sites/src/content/docs/end-users/profile-security.md`
- Modify: `docs/sites/src/content/docs/developers/setup-and-deployment.md`
- Modify: `docs/sites/src/content/docs/changelog.md`
- Test: `docs/plans/2026-03-10-better-auth-migration-design.md`

**Step 1: Write the docs delta checklist**

Add a short checklist at the top of your working notes or commit scratchpad for:

- new env vars
- removed custom auth routes
- new Google linking behavior
- new 2FA flow ownership
- forced logout on deploy

**Step 2: Run docs and app verification before editing prose**

Run: `bun run typecheck`

Expected: PASS

Run: `bun run build`

Expected: PASS

Run: `bun test src/services/auth.service.test.ts src/middleware/auth.test.ts`

Expected: PASS

**Step 3: Update the docs**

- Rewrite auth architecture docs around `better-auth`.
- Remove references to Lucia, Arctic, custom pending-link cookies, and custom MFA crypto.
- Update end-user security docs so Google linking is described as an authenticated settings action.
- Update setup docs with the new env vars and auth integration notes.

**Step 4: Run final quality gates**

Run: `bun run lint:fix`

Expected: PASS

Run: `bun run stylelint:fix`

Expected: PASS

Run: `bun run format:fix`

Expected: PASS

Run: `bun run typecheck`

Expected: PASS

Run: `bun run build`

Expected: PASS

Run: `bun run test:e2e --grep "auth core|security auth"`

Expected: PASS

**Step 5: Commit**

```bash
git add docs/architecture/003-api-authentication.md docs/architecture/011-oauth-sso-architecture.md docs/sso/google-setup.md docs/sites/src/content/docs/reference/api-overview.md docs/sites/src/content/docs/end-users/profile-security.md docs/sites/src/content/docs/developers/setup-and-deployment.md docs/sites/src/content/docs/changelog.md
git commit -m "docs(auth): update docs for better-auth migration"
```
