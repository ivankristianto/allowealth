# Workspace Isolation Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make workspace data isolation enforceable by default across service, API, schema, and CI layers so missing query filters cannot leak data.

**Architecture:** Introduce a typed tenant context and tenant-scope guardrails in the service layer, then enforce isolation in PostgreSQL with RLS and in both dialects with composite workspace foreign keys where practical. Add static query-scope checks and dual-workspace regression tests so future changes fail fast in CI. Keep explicit global/auth/admin query paths in a documented allowlist.

**Tech Stack:** TypeScript (strict), Astro middleware/API routes, Drizzle ORM, SQLite + PostgreSQL dual schema/migrations, Bun test, Playwright, structured CI scripts.

## Preconditions

- Worktree: `/Users/ivan/.config/superpowers/worktrees/expenses/workspace-isolation-hardening-plan`
- Branch: `codex/workspace-isolation-hardening-plan`
- Use `@superpowers:test-driven-development` for each code task.
- Use `@superpowers:systematic-debugging` for every failing test/fence.
- Use `@superpowers:verification-before-completion` before any completion claim.

## Global Constraints

- Keep implementation order aligned with constitution: UI (no-op validation) -> Service -> API -> CLI -> Seeder.
- No `any`-based bypasses for tenant checks.
- All schema changes require dual migrations:
  - `bun run db:generate`
  - `bun run db:generate:prod`
  - `bun run db:migrate`
- If scripts are added/changed, update `COMMANDS.md`.
- Run `bun run build` after bug-fix/hardening changes.

---

### Task 1: Establish Isolation Contract + Allowlist (UI no-op + design doc)

**Files:**

- Create: `docs/security/workspace-isolation-contract.md`
- Modify: `docs/plans/2026-02-12-workspace-isolation-hardening.md`

**Step 1: Write failing policy assertions as checklist**

Document explicit invariants:

```md
- Tenant table reads/writes MUST include workspace_id guard OR derive from already workspace-validated parent.
- Global/auth/system queries MUST be listed in allowlist with reason + owner.
- New DB query paths MUST fail CI if not classified.
```

**Step 2: Run doc lint sanity**

Run: `bun run lint docs/security/workspace-isolation-contract.md` (or full lint if no doc-only lint)
Expected: lint passes.

**Step 3: Add current exclusions (auth/global/admin/system)**

Include concrete entries for:

- auth/session/token flows
- exchange rates
- CLI admin scripts
- seed/backfill utilities

**Step 4: Verify consistency with constitution/security rules**

Run: `rg -n "workspace" docs/security/workspace-isolation-contract.md docs/constitution.md`
Expected: terminology is aligned.

**Step 5: Commit**

```bash
git add docs/security/workspace-isolation-contract.md docs/plans/2026-02-12-workspace-isolation-hardening.md
git commit -m "docs: define workspace isolation contract and explicit exclusion allowlist"
```

---

### Task 2: Add Tenant Context Primitives (Service-first foundation)

**Files:**

- Create: `src/lib/tenant/context.ts`
- Create: `src/lib/tenant/scope.ts`
- Create: `src/lib/tenant/allowlist.ts`
- Create: `src/lib/tenant/context.test.ts`
- Create: `src/lib/tenant/scope.test.ts`
- Modify: `src/lib/api-utils.ts`

**Step 1: Write failing tests for tenant context normalization**

```ts
expect(() => requireTenantContext({ userId: '', workspaceId: 'w1' })).toThrow();
expect(requireTenantContext({ userId: 'u1', workspaceId: 'w1' })).toEqual({
  userId: 'u1',
  workspaceId: 'w1',
  role: 'member',
});
```

**Step 2: Run tests to confirm failures**

Run: `bun test src/lib/tenant/context.test.ts src/lib/tenant/scope.test.ts`
Expected: FAIL (missing implementation).

**Step 3: Implement minimal tenant primitives**

Implement APIs:

- `type TenantContext = { userId: string; workspaceId: string; role: 'admin' | 'member' }`
- `requireTenantContext(input)`
- `assertWorkspace(expected, actual)`
- `isAllowlistedGlobalQuery(queryId)`

**Step 4: Wire API auth helper to return `TenantContext`**

Add thin mapping in `src/lib/api-utils.ts` so services can consume a consistent type.

**Step 5: Re-run tests and commit**

```bash
bun test src/lib/tenant/context.test.ts src/lib/tenant/scope.test.ts
git add src/lib/tenant/context.ts src/lib/tenant/scope.ts src/lib/tenant/allowlist.ts src/lib/tenant/context.test.ts src/lib/tenant/scope.test.ts src/lib/api-utils.ts
git commit -m "feat: add tenant context and workspace scope primitives"
```

---

### Task 3: Refactor High-Risk Services to Explicit Workspace Scope

**Files:**

- Modify: `src/services/workspace-invitation.service.ts`
- Modify: `src/services/user.service.ts`
- Modify: `src/services/workspace.service.ts`
- Modify: `src/pages/api/workspace/invitations.ts`
- Modify: `src/pages/api/workspace/members.ts`
- Modify: `src/pages/api/workspace/settings.ts`
- Create: `src/services/workspace-invitation.service.test.ts`
- Create: `src/services/workspace.service.test.ts`

**Step 1: Add failing tests proving cross-workspace access is rejected**

Examples:

```ts
await expect(service.cancel({ workspaceId: 'ws-a' }, invitationFromWsB)).rejects.toMatchObject({
  code: 'INVITATION_NOT_FOUND',
});
await expect(userService.softDeleteInWorkspace('user-b', 'ws-a')).rejects.toMatchObject({
  code: 'USER_NOT_FOUND',
});
```

**Step 2: Run targeted service tests**

Run: `bun test src/services/workspace-invitation.service.test.ts src/services/workspace.service.test.ts src/services/user.service.test.ts`
Expected: FAIL before refactor.

**Step 3: Implement scoped service signatures**

Refactor patterns:

- `findById(id)` -> `findById(id, workspaceId)` for invitation ops used by workspace APIs
- `cancel(id)` -> `cancel(id, workspaceId)`
- user mutation helpers include workspace boundary checks internally
- keep intentionally global methods only when required; mark with allowlist IDs/comments.

**Step 4: Update API callers to new signatures**

Adjust workspace routes to pass `auth.workspaceId` consistently.

**Step 5: Re-run tests and commit**

```bash
bun test src/services/workspace-invitation.service.test.ts src/services/workspace.service.test.ts src/services/user.service.test.ts src/__tests__/api
git add src/services/workspace-invitation.service.ts src/services/user.service.ts src/services/workspace.service.ts src/pages/api/workspace/invitations.ts src/pages/api/workspace/members.ts src/pages/api/workspace/settings.ts src/services/workspace-invitation.service.test.ts src/services/workspace.service.test.ts
git commit -m "refactor: enforce workspace-scoped service APIs for invitation user workspace flows"
```

---

### Task 4: Service Query Guard Instrumentation (Prevent future unsafe queries)

**Files:**

- Create: `src/lib/tenant/query-guard.ts`
- Create: `src/lib/tenant/query-guard.test.ts`
- Modify: `src/services/transaction.service.ts`
- Modify: `src/services/budget.service.ts`
- Modify: `src/services/asset.service.ts`
- Modify: `src/services/report.service.ts`
- Modify: `src/services/dashboard.service.ts`

**Step 1: Add failing tests for query guard helper**

```ts
expect(() => assertScopedQuery('transactions.findMany', { workspaceId: undefined })).toThrow();
expect(assertScopedQuery('transactions.findMany', { workspaceId: 'ws-1' })).toBeUndefined();
```

**Step 2: Run helper tests to fail first**

Run: `bun test src/lib/tenant/query-guard.test.ts`
Expected: FAIL.

**Step 3: Implement guard helper and apply to high-volume services**

Apply precondition checks at service entry points (before query execution):

- `findAll`, `count`, `getHistory`, report aggregations, dashboard aggregations.

**Step 4: Ensure allowlisted global queries remain explicit**

Tag global queries with named constants (e.g., `ALLOWLIST_QUERY_IDS.AUTH_VALIDATE_API_KEY`) and inline reason comments.

**Step 5: Re-run tests and commit**

```bash
bun test src/lib/tenant/query-guard.test.ts src/services/transaction.service.test.ts src/services/budget.service.test.ts src/services/__tests__
git add src/lib/tenant/query-guard.ts src/lib/tenant/query-guard.test.ts src/services/transaction.service.ts src/services/budget.service.ts src/services/asset.service.ts src/services/report.service.ts src/services/dashboard.service.ts
 git commit -m "feat: add query guardrails and apply to high-volume tenant services"
```

---

### Task 5: Add Static CI Scope Checker (Blocking)

**Files:**

- Create: `scripts/check-workspace-scope.ts`
- Create: `scripts/__tests__/check-workspace-scope.test.ts`
- Modify: `package.json`
- Modify: `COMMANDS.md`
- Modify: `.github/workflows/*` (relevant CI workflow)

**Step 1: Write failing tests for checker behavior**

Cases:

- flags tenant-table query without workspace predicate
- allows query with workspace predicate
- allows allowlisted global query IDs

**Step 2: Run checker tests to fail**

Run: `bun test scripts/__tests__/check-workspace-scope.test.ts`
Expected: FAIL.

**Step 3: Implement checker**

Checker output format:

```text
[workspace-scope] FAIL src/services/foo.ts:123 missing workspace scope for transactions query
```

**Step 4: Wire script into package + CI**

- `package.json`: add `"audit:workspace-scope": "bun run scripts/check-workspace-scope.ts"`
- add CI step before typecheck/build
- document command in `COMMANDS.md`

**Step 5: Re-run and commit**

```bash
bun test scripts/__tests__/check-workspace-scope.test.ts
bun run audit:workspace-scope
git add scripts/check-workspace-scope.ts scripts/__tests__/check-workspace-scope.test.ts package.json COMMANDS.md .github/workflows
git commit -m "build: add blocking workspace scope audit in CI"
```

---

### Task 6: PostgreSQL RLS Enforcement (Production DB layer)

**Files:**

- Create: `drizzle/postgresql/*` (generated migration)
- Modify: `src/middleware/database.ts`
- Modify: `src/db/drivers/postgres.ts`
- Create: `src/lib/db/tenant-session.ts`
- Create: `src/lib/db/tenant-session.test.ts`
- Modify: `docs/architecture/007-database-migrations.md`

**Step 1: Add failing integration test for tenant session variable application**

```ts
expect(await applyTenantSession(client, { workspaceId: 'ws-1' })).toBe(true);
```

**Step 2: Run test to fail**

Run: `bun test src/lib/db/tenant-session.test.ts`
Expected: FAIL.

**Step 3: Implement per-request session setup**

- add helper that executes `set_config('app.workspace_id', <workspaceId>, true)` for authenticated requests
- set anonymous marker for unauthenticated request handling
- ensure this runs after auth context is available and before tenant table queries.

**Step 4: Add PostgreSQL RLS policies via migration**

For tenant tables, create policy:

```sql
USING (workspace_id = current_setting('app.workspace_id', true))
WITH CHECK (workspace_id = current_setting('app.workspace_id', true))
```

Apply only where table has `workspace_id`.

**Step 5: Validate and commit**

```bash
bun run db:generate:prod
bun run db:migrate
bun test src/lib/db/tenant-session.test.ts
 git add src/middleware/database.ts src/db/drivers/postgres.ts src/lib/db/tenant-session.ts src/lib/db/tenant-session.test.ts drizzle/postgresql docs/architecture/007-database-migrations.md
 git commit -m "feat: enforce postgres tenant isolation with per-request session context and RLS"
```

---

### Task 7: Composite Workspace Foreign Keys (Schema hardening both dialects)

**Files:**

- Modify: `src/db/schema/sqlite/transactions.ts`
- Modify: `src/db/schema/sqlite/budgets.ts`
- Modify: `src/db/schema/sqlite/assets.ts`
- Modify: `src/db/schema/sqlite/asset-categories.ts`
- Modify: `src/db/schema/sqlite/audit-logs.ts`
- Modify: `src/db/schema/postgresql/transactions.ts`
- Modify: `src/db/schema/postgresql/budgets.ts`
- Modify: `src/db/schema/postgresql/assets.ts`
- Modify: `src/db/schema/postgresql/asset-categories.ts`
- Modify: `src/db/schema/postgresql/audit-logs.ts`
- Generated: `drizzle/sqlite/*`, `drizzle/postgresql/*`

**Step 1: Write failing schema-level integrity tests**

Create/modify tests to assert cross-workspace references are rejected.

**Step 2: Run tests to fail**

Run: `bun test src/db/index.integration.test.ts`
Expected: FAIL before constraints.

**Step 3: Implement composite FKs**

Use `foreignKey` definitions (workspace_id + referenced_id) where applicable so child rows cannot reference parent rows from another workspace.

**Step 4: Generate and apply dual migrations**

Run:

```bash
bun run db:generate
bun run db:generate:prod
bun run db:migrate
```

**Step 5: Re-test and commit**

```bash
bun test src/db/index.integration.test.ts
 git add src/db/schema/sqlite src/db/schema/postgresql drizzle/sqlite drizzle/postgresql
 git commit -m "feat: enforce cross-table tenant integrity with composite workspace foreign keys"
```

---

### Task 8: API Regression Suite for Cross-Workspace Access

**Files:**

- Create: `src/__tests__/api/workspace-isolation.test.ts`
- Modify: `src/services/test-helpers/*` (as needed)
- Modify: `src/__tests__/mocks/*` (as needed)

**Step 1: Add failing dual-workspace API tests**

Scenarios:

- workspace A cannot fetch/update/delete workspace B transactions/assets/budgets/categories
- workspace invitation cancellation for foreign workspace returns 404
- user member removal cannot target foreign workspace user

**Step 2: Run API tests to fail first**

Run: `bun test src/__tests__/api/workspace-isolation.test.ts`
Expected: FAIL before all protections are wired.

**Step 3: Implement missing route-level checks only where needed**

Patch API routes to use service methods that enforce workspace boundary consistently.

**Step 4: Re-run tests**

Run: `bun test src/__tests__/api/workspace-isolation.test.ts src/__tests__/api`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/__tests__/api/workspace-isolation.test.ts src/pages/api src/services/test-helpers src/__tests__/mocks
git commit -m "test: add dual-workspace API isolation regression coverage"
```

---

### Task 9: CLI/Admin/System Path Hardening + Explicit Global Allowlist

**Files:**

- Modify: `src/cli/list-workspaces.ts`
- Modify: `src/cli/delete-workspace.ts`
- Modify: `src/cli/create-workspace.ts`
- Modify: `src/cli/create-api-key.ts`
- Modify: `scripts/backfill-email-verification.ts`
- Modify: `src/db/seed.ts`
- Modify: `docs/security/workspace-isolation-contract.md`

**Step 1: Add failing tests/static checks for unclassified globals**

Ensure checker fails when global queries are not tagged/allowlisted.

**Step 2: Run checker and observe fail**

Run: `bun run audit:workspace-scope`
Expected: FAIL for untagged global paths.

**Step 3: Tag and document intentional global operations**

Add explicit query IDs/comments (e.g., `GLOBAL_QUERY_ADMIN_LIST_WORKSPACES`) and include in allowlist doc.

**Step 4: Re-run checker**

Run: `bun run audit:workspace-scope`
Expected: PASS with only declared exceptions.

**Step 5: Commit**

```bash
git add src/cli src/db/seed.ts scripts/backfill-email-verification.ts docs/security/workspace-isolation-contract.md
 git commit -m "chore: classify and document intentional global admin/system query paths"
```

---

### Task 10: Documentation + OpenAPI + Command Surface Consistency

**Files:**

- Modify: `COMMANDS.md`
- Modify: `docs/architecture/010-mcp-server-architecture.md` (if MCP auth behavior updated)
- Modify: `openapi/*` only if endpoint behavior/status changes
- Modify: `README.md` (security section)

**Step 1: Identify doc deltas from implemented behavior**

Run: `rg -n "workspace isolation|tenant|api key|invitation" COMMANDS.md docs README.md openapi`

**Step 2: Update command docs for new scripts**

Add `audit:workspace-scope` usage and expected failure output.

**Step 3: Update architecture/security docs**

Document service-scope requirements, RLS policy expectations, and allowlist process.

**Step 4: Validate OpenAPI impact**

If no endpoint contracts changed, add note in plan PR: "OpenAPI unchanged (no contract delta)".

**Step 5: Commit**

```bash
git add COMMANDS.md docs README.md openapi
 git commit -m "docs: document workspace isolation enforcement and operational commands"
```

---

### Task 11: Final Verification Gates (Blocking)

**Files:**

- Modify only if failures demand fixes

**Step 1: Bun import compatibility check**

Run:

```bash
grep -r "bun:" src/ --exclude-dir=node_modules || echo "No bun: imports found"
```

Expected: no forbidden middleware-imported `bun:` usage.

**Step 2: Run quality fences**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

Expected: all pass.

**Step 3: Run isolation checks + targeted tests**

```bash
bun run audit:workspace-scope
bun test src/__tests__/api/workspace-isolation.test.ts
bun test src/services src/lib/tenant src/lib/db/tenant-session.test.ts
```

Expected: pass.

**Step 4: Build verification**

Run: `bun run build`
Expected: build succeeds.

**Step 5: Commit verification fixes (if any)**

```bash
git add -A
 git commit -m "chore: finalize workspace isolation hardening verification fixes"
```

---

### Task 12: Delivery and Review Artifacts

**Files:**

- Create: `docs/reports/workspace-isolation-hardening-report.md`

**Step 1: Generate final report from test/check outputs**

Include:

- scope checker result
- dual-workspace API regression summary
- allowlist entries
- RLS + migration status

**Step 2: Confirm no hidden exclusions**

Run: `bun run audit:workspace-scope -- --strict`
Expected: PASS.

**Step 3: Add residual risks and follow-ups**

Examples: legacy auth-global tables, CLI bypass role control, migration rollback plan.

**Step 4: Review changed files**

Run: `git diff --name-only main...HEAD`
Expected: only intended files.

**Step 5: Commit**

```bash
git add docs/reports/workspace-isolation-hardening-report.md
 git commit -m "docs: add workspace isolation hardening report and residual risk summary"
```

---

## Verification Bundle (run before merge)

```bash
grep -r "bun:" src/ --exclude-dir=node_modules || echo "No bun: imports found"
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
bun run audit:workspace-scope
bun test src/__tests__/api/workspace-isolation.test.ts
bun test
bun run build
```

## Expected Deliverables

- Typed tenant context + query guard primitives.
- Refactored workspace/user/invitation service APIs with workspace boundary at service layer.
- Blocking static scope checker + CI integration.
- PostgreSQL RLS policies tied to request tenant context.
- Composite workspace FKs and dual migrations for SQLite + PostgreSQL.
- Dual-workspace regression tests preventing future leaks.
- Updated command/docs + explicit global query allowlist.
