# Invitation-Only Signup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make signup invitation-only, bootstrap first admin via CLI invitation email, and preserve a future switch for public signup.

**Architecture:** Reuse the existing `workspace_invitations` table and invitation signup flow (`/signup?token=...`). Remove active no-token signup path from UI/API, and make `cli:create-workspace` generate an admin invitation instead of creating a password-based admin user directly.

**Tech Stack:** TypeScript, Astro 5 API/routes, Bun test runner (`bun:test`), Drizzle ORM, OpenAPI 3.1.

### Task 1: Add failing tests for invitation-only enforcement

**Files:**

- Modify: `src/__tests__/api/auth/signup-turnstile.test.ts`
- Modify: `src/services/workspace-invitation.service.test.ts` (if missing, create under `src/services/`)

**Step 1: Write failing tests**

- Add assertions that `src/pages/api/auth/signup.ts` rejects signup without token.
- Add assertion that invitation email link path is `/signup?token=` (not `/invite?token=`).

**Step 2: Run tests to verify RED**

- Run: `bun test src/__tests__/api/auth/signup-turnstile.test.ts`
- Run: `bun test src/services/workspace-invitation.service.test.ts`
- Expected: fail on new assertions.

### Task 2: Enforce invitation-only signup in API and page

**Files:**

- Modify: `src/pages/api/auth/signup.ts`
- Modify: `src/pages/signup.astro`
- Modify: `src/pages/register.astro` (only if copy/comments require sync)

**Step 1: Implement minimal code (GREEN)**

- In API signup endpoint, require `token` query param and return 400 when absent.
- Keep token-based registration path and existing invitation validation.
- In signup page, render invitation-required state when no token, no registration form.

**Step 2: Run targeted tests**

- Run: `bun test src/__tests__/api/auth/signup-turnstile.test.ts`
- Expected: pass.

### Task 3: Convert workspace bootstrap CLI to invitation flow

**Files:**

- Modify: `src/cli/create-workspace.ts`
- Modify: `src/services/workspace-invitation.service.ts`

**Step 1: Write/extend failing tests (RED)**

- Ensure invitation URL uses `/signup?token=`.
- Ensure service handles `invited_by_user_id` being `null` for bootstrap invite emails.

**Step 2: Implement minimal code (GREEN)**

- CLI:
  - require admin email
  - remove password prompt/hash/user insertion
  - create admin invitation for new workspace
  - print fallback link in CLI output
- Invitation service:
  - use `/signup?token=...`
  - fallback inviter name when inviter user not found

**Step 3: Run targeted tests**

- Run: `bun test src/services/workspace-invitation.service.test.ts`
- Expected: pass.

### Task 4: Update contract docs

**Files:**

- Modify: `openapi/paths/auth.yml`
- Modify: `COMMANDS.md`

**Step 1: Update API docs**

- Document that signup now requires invitation token and no longer supports public workspace creation in current mode.

**Step 2: Update CLI docs**

- Update `cli:create-workspace` behavior and examples to invitation bootstrap.

### Task 5: Verify end-to-end quality gates

**Files:**

- N/A (validation only)

**Step 1: Run project checks**

- `bun run build`
- `bun run lint:fix`
- `bun run stylelint:fix`
- `bun run format:fix`
- `bun run typecheck`

**Step 2: Run relevant tests**

- `bun test src/__tests__/api/auth/signup-turnstile.test.ts`
- `bun test src/services/workspace-invitation.service.test.ts`

**Step 3: Sanity check changed flows**

- Confirm `/signup` (no token) shows invitation-required state.
- Confirm `/signup?token=...` still renders invitation flow.
