# Database Performance Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate high-risk query bottlenecks, harden indexes, and standardize DB access patterns so the app remains fast and maintainable at 10GB+/10-year dataset scale.

**Architecture:** Optimize read paths first (reports, transactions, recurring, history endpoints) using set-based SQL and bounded queries. Then harden write paths (bulk ops and cache invalidation). Finally, apply dual-dialect index migrations with explicit PostgreSQL rollout safety (create-first, drop-later, lock-safe strategy) and transition verification.

**Tech Stack:** Drizzle ORM, SQLite + PostgreSQL dual schema/migrations, Astro API routes, Bun test, CacheManager tags.

**Revised:** 2026-03-01 (code-review findings addressed: dual-dialect SQL correctness, missing hotspot coverage, migration safety, atomicity, transition tests)

---

## Phase 0: Safety + Baseline

### Task 1: Add fail-first performance regression tests for known hotspots

**Files:**

- Create: `src/services/__tests__/report-trend-query-optimization.test.ts`
- Create: `src/services/__tests__/transaction-summary-aggregation.test.ts`
- Create: `src/services/__tests__/recurring-stats-aggregation.test.ts`
- Modify: `src/services/test-helpers/mocks.ts`

**Step 1: Write failing test for report trend query count**

```ts
it('uses one grouped trend query instead of per-month query loop', async () => {
  const db = createMockDatabaseWithQueryCounter();
  const service = new ReportService(db as any);
  await service.getYearlyReport('ws-1', '2026', 'IDR');
  expect(db.counter('report.trend.aggregate')).toBe(1);
});
```

**Step 2: Write failing test for transaction month summary aggregate path**

```ts
it('builds summary from SQL aggregate and does not call findAll(limit=10000)', async () => {
  // assert no call to transactionService.findAll for summary path
});
```

**Step 3: Write failing test for recurring stats aggregate path**

```ts
it('computes recurring stats via aggregate queries, not full-row findMany loads', async () => {
  // assert bounded query usage and no full pending rows for simple counts
});
```

**Step 4: Run tests to verify failure**

Run:

```bash
bun test src/services/__tests__/report-trend-query-optimization.test.ts
bun test src/services/__tests__/transaction-summary-aggregation.test.ts
bun test src/services/__tests__/recurring-stats-aggregation.test.ts
```

Expected: FAIL

**Step 5: Commit**

```bash
git add src/services/__tests__/report-trend-query-optimization.test.ts src/services/__tests__/transaction-summary-aggregation.test.ts src/services/__tests__/recurring-stats-aggregation.test.ts src/services/test-helpers/mocks.ts
git commit -m "test(perf): add fail-first regression tests for key query hotspots"
```

### Task 2: Add transition contract tests (API behavior parity)

**Files:**

- Create: `src/services/__tests__/transaction-summary-sign-parity.test.ts`
- Create: `src/services/__tests__/category-drilldown-contract.test.ts`

**Step 1: Add sign-parity tests for month summary**

Cover current semantics explicitly:

- expenses are returned as positive spend values
- income remains positive
- expense count unchanged

**Step 2: Add contract tests for category drilldown pagination response**

Require response to include:

- `transactions`
- `total`
- `limit`
- `offset`
- `hasMore`

**Step 3: Run tests to verify failure**

Run:

```bash
bun test src/services/__tests__/transaction-summary-sign-parity.test.ts
bun test src/services/__tests__/category-drilldown-contract.test.ts
```

Expected: FAIL

**Step 4: Commit**

```bash
git add src/services/__tests__/transaction-summary-sign-parity.test.ts src/services/__tests__/category-drilldown-contract.test.ts
git commit -m "test(api): add transition contract tests for summary parity and drilldown pagination"
```

---

## Phase 1: Read Path Optimizations (Pre-Launch Critical)

### Task 3: Replace report trend N+1 loops with dual-dialect grouped SQL

**Files:**

- Modify: `src/services/report.service.ts`
- Test: `src/services/__tests__/report-trend-query-optimization.test.ts`
- Test: `src/services/report.service.test.ts`

**Step 1: Add dialect-safe month bucket helper**

```ts
private monthBucket(column: any) {
  const { dialect } = getDatabaseConfig();
  return dialect === 'postgresql'
    ? sql<string>`to_char(${column}, 'YYYY-MM')`
    : sql<string>`strftime('%Y-%m', ${column})`;
}
```

**Step 2: Implement grouped trend aggregation using `monthBucket()`**

Use one query for whole range with conditional aggregation.

**Step 3: Replace existing loop-based `getTrendData()` and `getYearlyTrendData()`**

**Step 4: Run tests**

Run:

```bash
bun test src/services/__tests__/report-trend-query-optimization.test.ts
bun test src/services/report.service.test.ts
bun run typecheck
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/services/report.service.ts src/services/__tests__/report-trend-query-optimization.test.ts src/services/report.service.test.ts
git commit -m "perf(report): replace trend N+1 loops with dual-dialect grouped aggregation"
```

### Task 4: Optimize monthly recurring breakdown on reports endpoint

**Files:**

- Modify: `src/services/report.service.ts`
- Modify: `src/pages/api/reports/index.ts`
- Create: `src/services/__tests__/report-recurring-breakdown-optimization.test.ts`

**Step 1: Add failing test for recurring breakdown query amplification**

Assert no full materialization of all monthly expense rows for simple totals.

**Step 2: Replace in-memory recurring breakdown with set-based SQL strategy**

Use grouped/conditional SQL to compute:

- recurring total
- one-time total
- recurring by category

**Step 3: Run tests**

Run:

```bash
bun test src/services/__tests__/report-recurring-breakdown-optimization.test.ts
bun test src/services/report.service.test.ts
```

Expected: PASS

**Step 4: Commit**

```bash
git add src/services/report.service.ts src/pages/api/reports/index.ts src/services/__tests__/report-recurring-breakdown-optimization.test.ts
git commit -m "perf(report): optimize recurring breakdown with set-based aggregation"
```

### Task 5: Bound category drilldown and add explicit pagination contract

**Files:**

- Modify: `src/services/report.service.ts`
- Modify: `src/pages/api/reports/category-drilldown.ts`
- Test: `src/services/__tests__/category-drilldown-contract.test.ts`

**Step 1: Add `limit` and `offset` params to service method**

Default `limit=100`, `offset=0`, clamp `limit <= 500`.

**Step 2: Guard empty `txIds` before `inArray`**

```ts
const txIds = rows.map((r) => r.id);
const changedIds = txIds.length === 0 ? [] : await fetchChangedIds(txIds);
```

**Step 3: Return contract fields (`total`, `limit`, `offset`, `hasMore`) from API route**

**Step 4: Run tests**

Run:

```bash
bun test src/services/__tests__/category-drilldown-contract.test.ts
bun test src/services/report.service.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/services/report.service.ts src/pages/api/reports/category-drilldown.ts src/services/__tests__/category-drilldown-contract.test.ts
git commit -m "perf(report): paginate drilldown with explicit response contract"
```

### Task 6: Replace `/api/transactions` 10k summary fetch with SQL aggregate

**Files:**

- Modify: `src/services/transaction.service.ts`
- Modify: `src/pages/api/transactions/index.ts`
- Test: `src/services/__tests__/transaction-summary-aggregation.test.ts`
- Test: `src/services/__tests__/transaction-summary-sign-parity.test.ts`

**Step 1: Implement `TransactionService.getMonthSummary()` using SQL conditional aggregation**

**Step 2: Replace `findAll(limit=MAX_MONTH_TRANSACTIONS)` summary path in API route**

**Step 3: Run parity and aggregation tests**

Run:

```bash
bun test src/services/__tests__/transaction-summary-aggregation.test.ts
bun test src/services/__tests__/transaction-summary-sign-parity.test.ts
bun test src/services/transaction.service.test.ts
bun run typecheck
```

Expected: PASS

**Step 4: Commit**

```bash
git add src/services/transaction.service.ts src/pages/api/transactions/index.ts src/services/__tests__/transaction-summary-aggregation.test.ts src/services/__tests__/transaction-summary-sign-parity.test.ts
git commit -m "perf(transactions): compute month summary via SQL with parity guarantees"
```

### Task 7: Optimize recurring template list/detail fan-out paths

**Files:**

- Modify: `src/services/recurring-template.service.ts`
- Modify: `src/pages/api/recurring/[id]/index.ts`
- Modify: `src/pages/api/recurring/occurrences/index.ts`
- Create: `src/services/__tests__/recurring-template-fanout-optimization.test.ts`

**Step 1: Add failing tests for list/detail occurrence fan-out**

Cover:

- `findAll` does not hydrate unbounded occurrences per template
- `findById` avoids duplicate occurrence fetch in route layer

**Step 2: Refactor service to fetch bounded/latest occurrence metadata per template**

**Step 3: Remove duplicate reads in detail API route**

**Step 4: Run tests**

Run:

```bash
bun test src/services/__tests__/recurring-template-fanout-optimization.test.ts
bun test src/services/recurring-template.service.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/services/recurring-template.service.ts src/pages/api/recurring/[id]/index.ts src/pages/api/recurring/occurrences/index.ts src/services/__tests__/recurring-template-fanout-optimization.test.ts
git commit -m "perf(recurring): reduce list/detail occurrence fan-out and duplicate reads"
```

### Task 8: Recurring stats endpoint parity (JSON + HTML)

**Files:**

- Modify: `src/services/recurring-occurrence.service.ts`
- Modify: `src/pages/api/recurring/stats.ts`
- Test: `src/services/__tests__/recurring-stats-aggregation.test.ts`

**Step 1: Ensure both JSON and HTML paths use optimized aggregate-backed data**

**Step 2: Remove any fallback path that computes stats from unbounded `findPending` rows**

**Step 3: Run tests**

Run:

```bash
bun test src/services/__tests__/recurring-stats-aggregation.test.ts
bun test src/services/recurring-occurrence.service.test.ts
```

Expected: PASS

**Step 4: Commit**

```bash
git add src/services/recurring-occurrence.service.ts src/pages/api/recurring/stats.ts src/services/__tests__/recurring-stats-aggregation.test.ts
git commit -m "perf(recurring): align html/json stats paths to aggregate-based query flow"
```

### Task 9: Optimize history endpoints (transaction history + account history bounds)

**Files:**

- Modify: `src/services/transaction.service.ts`
- Modify: `src/pages/api/transactions/[id]/history.ts`
- Modify: `src/services/account.service.ts`
- Modify: `src/pages/api/accounts/[id]/history.ts`
- Create: `src/services/__tests__/history-endpoints-bounds.test.ts`

**Step 1: Replace workspace-wide category/account map loads in transaction history path with targeted lookups**

**Step 2: Enforce bounded defaults for account history endpoint (`limit` default + max clamp)**

**Step 3: Add tests for bounded behavior and query-shape expectations**

**Step 4: Run tests**

Run:

```bash
bun test src/services/__tests__/history-endpoints-bounds.test.ts
bun test src/services/transaction.service.test.ts
bun test src/services/account.service.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/services/transaction.service.ts src/pages/api/transactions/[id]/history.ts src/services/account.service.ts src/pages/api/accounts/[id]/history.ts src/services/__tests__/history-endpoints-bounds.test.ts
git commit -m "perf(history): bound account history and remove transaction history over-fetch"
```

---

## Phase 2: Write Path + Abstraction

### Task 10: Refactor transaction filter builder and bulk invalidation strategy

**Files:**

- Modify: `src/services/transaction.service.ts`
- Create: `src/services/__tests__/transaction-filter-builder.test.ts`
- Create: `src/services/__tests__/transaction-bulk-invalidation.test.ts`

**Step 1: Extract shared filter condition builder used by `findAll` and `count`**

**Step 2: Add `updateInternal/deleteInternal` with `skipInvalidate` for bulk flows**

**Step 3: Perform one final invalidation per bulk operation**

**Step 4: Run tests**

Run:

```bash
bun test src/services/__tests__/transaction-filter-builder.test.ts
bun test src/services/__tests__/transaction-bulk-invalidation.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/services/transaction.service.ts src/services/__tests__/transaction-filter-builder.test.ts src/services/__tests__/transaction-bulk-invalidation.test.ts
git commit -m "refactor(transactions): unify filters and collapse bulk invalidations"
```

### Task 11: Centralize API key cache validation/invalidation in service layer

**Files:**

- Modify: `src/services/api-key.service.ts`
- Modify: `src/pages/api/mcp.ts`
- Modify: `src/pages/api/user/api-keys.ts`
- Create: `src/services/api-key.service.cache.test.ts`

**Step 1: Add `validateCached()` to `ApiKeyService`**

**Step 2: Move revocation cache invalidation into `ApiKeyService.revoke()`**

**Step 3: Remove route-local duplicated cache logic**

**Step 4: Run tests**

Run:

```bash
bun test src/services/api-key.service.cache.test.ts
bun run typecheck
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/services/api-key.service.ts src/pages/api/mcp.ts src/pages/api/user/api-keys.ts src/services/api-key.service.cache.test.ts
git commit -m "refactor(auth): centralize API key cache contract in service"
```

### Task 12: Standardize cache-aside and invalidation policy in atomic waves

**Files:**

- Create: `src/lib/cache/invalidate.ts`
- Modify Wave A: `src/services/category.service.ts`, `src/services/account-category.service.ts`, `src/services/account.service.ts`
- Modify Wave B: `src/services/transaction.service.ts`, `src/services/dashboard.service.ts`
- Modify Wave C: `src/services/recurring-template.service.ts`, `src/services/recurring-occurrence.service.ts`, `src/services/user-meta.service.ts`

**Step 1: Add shared `invalidateTags(tags, policy)` helper**

**Step 2: Wave A migration + tests**

Run:

```bash
bun test src/services/category.service.test.ts src/services/account-category.service.test.ts src/services/account.service.test.ts
```

Expected: PASS

Commit Wave A.

**Step 3: Wave B migration + tests**

Run:

```bash
bun test src/services/transaction.service.test.ts src/services/dashboard.service.test.ts
```

Expected: PASS

Commit Wave B.

**Step 4: Wave C migration + tests**

Run:

```bash
bun test src/services/recurring-template.service.test.ts src/services/recurring-occurrence.service.test.ts src/services/user-meta.service.test.ts
```

Expected: PASS

Commit Wave C.

---

## Phase 3: Schema + Index Hardening (Pre-Launch Critical)

### Task 13: Index rollout Wave A (create new indexes only)

**Files:**

- Modify: `src/db/schema/sqlite/transactions.ts`
- Modify: `src/db/schema/postgresql/transactions.ts`
- Modify: `src/db/schema/sqlite/workspace-invitations.ts`
- Modify: `src/db/schema/postgresql/workspace-invitations.ts`
- Modify: `src/db/schema/sqlite/api-keys.ts`
- Modify: `src/db/schema/postgresql/api-keys.ts`
- Modify: `src/db/schema/sqlite/recurring-occurrences.ts`
- Modify: `src/db/schema/postgresql/recurring-occurrences.ts`

**Step 1: Add new indexes only (do not remove existing indexes yet)**

Add:

- `(workspace_id, transaction_date)`
- `(workspace_id, account_id, transaction_date)`
- `(workspace_id, to_account_id, transaction_date)`
- `(workspace_id, accepted_at, expires_at, created_at)` for invitations
- `(key_prefix, deleted_at)` and `(workspace_id, user_id, deleted_at)` for API keys
- `(workspace_id, status, due_date)` for recurring occurrences

**Step 2: Generate SQLite migration**

Run: `bun run db:generate`

**Step 3: Generate PostgreSQL migration (dialect selected via production DB URL)**

Run: `bun --env-file=.env.production bun run db:generate`

**Step 4: Apply SQLite migration locally**

Run: `bun run db:migrate`

**Step 5: Commit**

```bash
git add src/db/schema/sqlite src/db/schema/postgresql drizzle/sqlite drizzle/postgresql
git commit -m "perf(db): wave A add composite indexes for hot read paths"
```

### Task 14: Index rollout Wave A production-safe apply + verification

**Files:**

- Create: `docs/deployment/2026-03-01-db-index-rollout-runbook.md`

**Step 1: Add lock-safe PostgreSQL rollout runbook**

Include:

- create-before-drop order
- `CREATE INDEX CONCURRENTLY IF NOT EXISTS ...` production commands
- staging-first and maintenance-window rules
- rollback (`DROP INDEX CONCURRENTLY IF EXISTS ...`)

**Step 2: Apply to PostgreSQL staging and verify**

Run (staging DB URL):

```bash
bun --env-file=.env.production bun run db:migrate
```

Then verify top queries with `EXPLAIN (ANALYZE, BUFFERS)`.

**Step 3: Commit runbook**

```bash
git add docs/deployment/2026-03-01-db-index-rollout-runbook.md
git commit -m "docs(db): add lock-safe PostgreSQL index rollout and rollback runbook"
```

### Task 15: Index rollout Wave B (remove redundant indexes after observation window)

**Files:**

- Modify: `src/db/schema/sqlite/password-reset-tokens.ts`
- Modify: `src/db/schema/postgresql/password-reset-tokens.ts`
- Modify: `src/db/schema/sqlite/user-mfa.ts`
- Modify: `src/db/schema/postgresql/user-mfa.ts`
- Modify: `src/db/schema/sqlite/recurring-occurrences.ts`
- Modify: `src/db/schema/postgresql/recurring-occurrences.ts`

**Step 1: Remove redundant indexes only after Wave A is stable**

Remove:

- `password_reset_tokens_token_idx`
- `user_mfa_user_id_idx`
- `recurring_occurrences_transaction_id_idx`

**Step 2: Generate dual migrations**

Run:

```bash
bun run db:generate
bun --env-file=.env.production bun run db:generate
```

**Step 3: Apply locally + stage verification**

Run:

```bash
bun run db:migrate
bun --env-file=.env.production bun run db:migrate
```

**Step 4: Commit**

```bash
git add src/db/schema/sqlite src/db/schema/postgresql drizzle/sqlite drizzle/postgresql
git commit -m "perf(db): wave B remove redundant indexes after stability window"
```

### Task 16: Add support indexes for audit/history/reminders

**Files:**

- Modify: `src/db/schema/sqlite/audit-logs.ts`
- Modify: `src/db/schema/postgresql/audit-logs.ts`
- Modify: `src/db/schema/sqlite/account-history.ts`
- Modify: `src/db/schema/sqlite/account-update-reminders.ts`
- Modify: `src/db/schema/postgresql/account-update-reminders.ts`

**Step 1: Add indexes**

Add:

- `audit_logs(workspace_id, created_at)`
- SQLite `account_history(recorded_at)`
- `account_update_reminders(next_reminder)`

**Step 2: Generate dual migrations + apply local**

Run:

```bash
bun run db:generate
bun --env-file=.env.production bun run db:generate
bun run db:migrate
```

**Step 3: Run targeted tests (actual test files)**

Run:

```bash
bun test src/services/account.service.test.ts src/services/transaction.service.test.ts src/services/super-admin.service.ts
```

Expected: PASS

**Step 4: Commit**

```bash
git add src/db/schema/sqlite src/db/schema/postgresql drizzle/sqlite drizzle/postgresql
git commit -m "perf(db): add audit/history/reminder support indexes"
```

---

## Phase 4: Docs, Hygiene, and Final Verification

### Task 17: Migration metadata and cache ADR consistency docs

**Files:**

- Modify: `docs/architecture/007-database-migrations.md`
- Modify: `docs/architecture/008-cache-abstraction.md`

**Step 1: Document stale snapshot remediation process**

Add explicit workflow for stale `drizzle/*/meta/*_snapshot.json` drift.

**Step 2: Align cache ADR interface with current `CacheDriver` (`invalidateByTags`, no stale methods)**

**Step 3: Run targeted docs formatting check**

Run:

```bash
bunx prettier --check docs/architecture/007-database-migrations.md docs/architecture/008-cache-abstraction.md docs/plans/2026-03-01-db-performance-hardening.md
```

Expected: PASS

**Step 4: Commit**

```bash
git add docs/architecture/007-database-migrations.md docs/architecture/008-cache-abstraction.md docs/plans/2026-03-01-db-performance-hardening.md
git commit -m "docs(db): align migration and cache architecture docs with implementation"
```

### Task 18: Full release verification gates (single final task)

**Step 1: Run full quality gates**

Run:

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
bun run test
bun run build
```

Expected: PASS

**Step 2: Capture launch verification evidence**

Store query and migration verification in `docs/tests/artifacts/2026-03-01-db-perf/`.

**Step 3: Final commit (if needed for evidence/docs only)**

```bash
git add docs/tests/artifacts/2026-03-01-db-perf
git commit -m "chore(release): add DB performance hardening verification artifacts"
```

---

## Release Sequencing

### Launch-blocking

1. Task 1-9
2. Task 10-11
3. Task 13-14
4. Task 16
5. Task 18

### Post-launch (shortly after)

1. Task 12 (cache standardization waves if deferred)
2. Task 15 (redundant index removal after observation)
3. Task 17

---

## Optional Scale Track (>10GB sustained growth)

1. Partition PostgreSQL `transactions`, `audit_logs`, `account_history` by time.
2. Migrate PostgreSQL money columns to numeric (or minor units) to reduce cast-heavy paths.
3. Add continuous query observability (`pg_stat_statements`, alerting on p95/p99 query latency).
4. Add CI check that runs representative `EXPLAIN (ANALYZE, BUFFERS)` snapshots for top endpoints.
