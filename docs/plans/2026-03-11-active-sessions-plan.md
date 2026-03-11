# Active Sessions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an Active Sessions section to the Security page so users can view all active sessions, see full IP and a simple device label, revoke one non-current session, and revoke all other sessions.

**Architecture:** Keep Better Auth as the session source of truth and add a thin app-owned service that wraps session listing and revoke actions for the authenticated user. Render the feature on the existing Security page with the same server-rendered partial refresh pattern used by API keys, including confirmation modals and toast feedback.

**Tech Stack:** Astro 5, TypeScript, Bun, Better Auth, Drizzle ORM, Valibot

---

### Task 1: Add a service that normalizes Better Auth sessions

**Files:**
- Create: `src/services/session-management.service.ts`
- Create: `src/services/session-management.service.test.ts`
- Modify: `src/services/index.ts`
- Modify: `src/lib/auth/types.ts`

**Step 1: Write the failing service tests**

Create `src/services/session-management.service.test.ts` with tests for:

- `listForUser` returns the current session first
- non-current sessions are sorted after the current session
- missing `userAgent` maps to `Unknown device`
- missing `ipAddress` maps to `Unknown IP`
- `revokeSession` rejects the current session ID
- `revokeOtherSessions` preserves the current session

Use fake Better Auth session records with `id`, `userId`, `ipAddress`, `userAgent`, `createdAt`, and `updatedAt`.

**Step 2: Run the tests to verify they fail**

Run: `bun test src/services/session-management.service.test.ts`

Expected: FAIL because the service does not exist yet.

**Step 3: Write the minimal service implementation**

- Create `src/services/session-management.service.ts`.
- Add a UI-facing type to `src/lib/auth/types.ts` for normalized session rows.
- Implement a small parser that converts raw `userAgent` strings into `Browser on OS` labels with safe fallbacks.
- Implement methods for:
  - listing sessions for the authenticated user
  - revoking one non-current session
  - revoking all other sessions
- Export the service from `src/services/index.ts`.

Keep the service thin. It should normalize Better Auth data and enforce the product rules, not reimplement session storage.

**Step 4: Run the tests to verify they pass**

Run: `bun test src/services/session-management.service.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/services/session-management.service.ts src/services/session-management.service.test.ts src/services/index.ts src/lib/auth/types.ts
git commit -m "feat(security): add active session service"
```

### Task 2: Add authenticated API routes for session list and revoke actions

**Files:**
- Create: `src/pages/api/user/sessions.ts`
- Test: `src/__tests__/api/user/sessions.test.ts`
- Check: `src/lib/api-utils.ts`

**Step 1: Write the failing route tests**

Create `src/__tests__/api/user/sessions.test.ts` to cover:

- unauthenticated `GET /api/user/sessions` returns `401`
- authenticated `GET /api/user/sessions` returns normalized sessions
- authenticated `DELETE /api/user/sessions` revokes one non-current session
- authenticated `DELETE /api/user/sessions` rejects current-session revoke with `400`
- authenticated `POST /api/user/sessions/revoke-others` style behavior or an equivalent action route revokes all other sessions

Choose one route shape and keep it consistent with existing `/api/user/*` endpoints.

**Step 2: Run the tests to verify they fail**

Run: `bun test src/__tests__/api/user/sessions.test.ts`

Expected: FAIL because the routes do not exist yet.

**Step 3: Implement the routes**

- Create `src/pages/api/user/sessions.ts`.
- Use middleware-backed auth from `getAuthenticatedUser(context)` or the request locals shape already used in `/api/user/api-keys`.
- Validate request bodies with Valibot.
- Delegate listing and revoke operations to the new session-management service.
- Return structured success and error responses suitable for toast messaging.
- If the route also supports `?_render=html`, wire it to the sessions list partial created in Task 3.

Prefer one route file unless the action shape clearly requires a second route. Do not add a CLI or new schema.

**Step 4: Run the tests to verify they pass**

Run: `bun test src/__tests__/api/user/sessions.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/pages/api/user/sessions.ts src/__tests__/api/user/sessions.test.ts
git commit -m "feat(security): add active session api routes"
```

### Task 3: Build the Security page UI for active sessions

**Files:**
- Create: `src/components/molecules/SecuritySessionsCard.astro`
- Create: `src/components/partials/SecuritySessionsListPartial.astro`
- Modify: `src/pages/security.astro`
- Test: `src/pages/security.astro` coverage or a focused component test if the repo already uses one for Security cards

**Step 1: Write the failing render test**

Add focused coverage that asserts:

- the Active Sessions card renders on `/security`
- the current session row shows a badge and no `Revoke` button
- another session row shows device label, IP address, and `Revoke`
- the empty state appears when only the current session exists

Use the same testing style already used for security or page rendering in this repo.

**Step 2: Run the test to verify it fails**

Run: `bun test src/pages/security.test.ts`

Expected: FAIL because the card does not exist yet.

If `src/pages/security.test.ts` is not the local pattern, create the closest equivalent and update the command to that exact file.

**Step 3: Implement the UI**

- Create `src/components/partials/SecuritySessionsListPartial.astro` to render the rows and empty state.
- Create `src/components/molecules/SecuritySessionsCard.astro` using the same card, modal, and toast conventions as `src/components/molecules/SecurityApiKeysCard.astro`.
- Modify `src/pages/security.astro` to fetch normalized sessions and render the new card.
- Place the card near the other account-protection controls.

Match the existing security page behavior:

- server-rendered fragments for refreshes
- confirmation modal before destructive actions
- toast feedback on success and failure

**Step 4: Run the render test to verify it passes**

Run: `bun test src/pages/security.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/components/molecules/SecuritySessionsCard.astro src/components/partials/SecuritySessionsListPartial.astro src/pages/security.astro src/pages/security.test.ts
git commit -m "feat(security): add active sessions card"
```

### Task 4: Verify end-to-end behavior and polish edge cases

**Files:**
- Modify: `docs/tests/2026-03-10-better-auth-migration-test-plan.md` or create a new focused test plan if that is the current QA pattern
- Modify: any files from Tasks 1-3 only if verification reveals a real defect

**Step 1: Add the manual QA scenario**

Document a focused browser QA flow for:

- viewing the current session
- viewing another active session
- revoking one other session
- revoking all other sessions
- confirming the current session remains active

If the Better Auth migration test plan is still the living QA artifact, append the scenario there. Otherwise create a new dated test plan in `docs/tests/`.

**Step 2: Run the focused automated checks**

Run: `bun test src/services/session-management.service.test.ts`

Expected: PASS

Run: `bun test src/__tests__/api/user/sessions.test.ts`

Expected: PASS

Run: `bun test src/pages/security.test.ts`

Expected: PASS

**Step 3: Run quality gates**

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

**Step 4: Run manual QA**

Use two signed-in browser contexts and confirm:

- each session appears with full IP and simple device label
- the current session is labeled and protected from revoke
- revoking one other session updates the list and keeps the current session alive
- revoking all other sessions leaves only the current session

**Step 5: Commit**

```bash
git add docs/tests/2026-03-10-better-auth-migration-test-plan.md docs/tests/*.md src/services/session-management.service.ts src/services/session-management.service.test.ts src/pages/api/user/sessions.ts src/__tests__/api/user/sessions.test.ts src/components/molecules/SecuritySessionsCard.astro src/components/partials/SecuritySessionsListPartial.astro src/pages/security.astro
git commit -m "test(security): verify active session management"
```
