# ALL-71 Phase A Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Phase A security remediations for MCP auth, MCP endpoint abuse controls, CSV export formula hardening, and DEV reset endpoint restrictions.

**Architecture:** Keep the patch surgical and local to existing modules. Use DB-first MCP token validation plus transactional user soft-delete + token revocation for correctness. Add a dedicated MCP limiter path with shared Upstash counters in production and in-memory fallback in local dev/test.

**Tech Stack:** Astro 6 API routes, Bun test, Drizzle ORM (SQLite/D1), Better Auth MCP tables, Upstash Redis (`@upstash/redis`), existing rate-limit and cache utilities.

---

## File Structure

**Create:**
- `src/lib/csv/sanitize-cell-for-csv.ts` - shared CSV cell sanitizer for formula-injection protection.
- `src/lib/csv/sanitize-cell-for-csv.test.ts` - unit tests for CSV sanitization semantics.
- `src/lib/mcp-rate-limit.ts` - MCP-specific rate limiter abstraction (shared production counter + local fallback).
- `src/lib/mcp-rate-limit.test.ts` - unit tests for key generation, threshold logic, and fallback behavior.
- `src/services/mcp-token-revocation.service.ts` - transactional MCP token revocation for user soft-delete paths.
- `src/services/mcp-token-revocation.service.test.ts` - revocation service behavior tests.
- `src/__tests__/api/mcp.test.ts` - API route tests for `/api/mcp` auth/rate-limit/payload bounds.
- `src/__tests__/api/auth/e2e-reset-rate-limits.test.ts` - API route tests for host allowlist + DEV gate.
- `src/__tests__/api/admin/users/deactivate.test.ts` - regression tests for admin deactivation path + MCP token revocation wiring.

**Modify:**
- `src/services/transaction.service.ts` - apply shared CSV sanitizer in `exportToCSV()`.
- `src/services/budget.service.ts` - apply shared CSV sanitizer in `exportToCSV()`.
- `src/services/budget.service.test.ts` - add formula-injection coverage for export output.
- `src/services/transaction.service.test.ts` - add export CSV tests (or create focused export test file if absent).
- `src/lib/mcp-auth.ts` - remove cache-first accept path and enforce DB-first validation including `deleted_at`.
- `src/lib/mcp-auth.test.ts` - update tests for DB-first behavior and deactivated-user rejection.
- `src/services/user.service.ts` - call MCP token revocation service in `softDelete()` transaction flow.
- `src/services/super-admin.service.ts` - call the same MCP token revocation service in `deactivateUser()`.
- `src/pages/api/mcp.ts` - add request-size guard and MCP rate-limit guard before JSON parse/dispatch.
- `src/pages/api/workspace/members.ts` - ensure soft-delete path remains aligned with revocation-on-delete behavior.
- `src/pages/api/admin/users/[id]/deactivate.ts` - ensure deactivation path stays aligned with service-level revocation behavior.
- `src/pages/api/auth/e2e-reset-rate-limits.ts` - add hostname normalization and local host allowlist.
- `src/services/user.service.test.ts` - add soft-delete + revocation integration coverage.

**Test Targets:**
- `src/lib/csv/sanitize-cell-for-csv.test.ts`
- `src/services/budget.service.test.ts`
- `src/services/transaction.service.test.ts` (or focused export test file)
- `src/lib/mcp-auth.test.ts`
- `src/services/mcp-token-revocation.service.test.ts`
- `src/lib/mcp-rate-limit.test.ts`
- `src/__tests__/api/mcp.test.ts`
- `src/__tests__/api/auth/e2e-reset-rate-limits.test.ts`
- `src/__tests__/api/admin/users/deactivate.test.ts`

---

### Task 1: Add Shared CSV Sanitizer Utility

**Files:**
- Create: `src/lib/csv/sanitize-cell-for-csv.ts`
- Create: `src/lib/csv/sanitize-cell-for-csv.test.ts`

- [ ] **Step 1: Write failing sanitizer tests**

```ts
expect(sanitizeCellForCsv('=2+2')).toBe("'=2+2");
expect(sanitizeCellForCsv(' +SUM(A1:A2)')).toBe("' +SUM(A1:A2)");
expect(sanitizeCellForCsv('-100')).toBe("'-100");
expect(sanitizeCellForCsv('normal text')).toBe('normal text');
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun test src/lib/csv/sanitize-cell-for-csv.test.ts`
Expected: FAIL because sanitizer module does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export function sanitizeCellForCsv(value: unknown): string {
  // stringify, inspect first non-whitespace char, prefix `'` for = + - @
}
```

- [ ] **Step 4: Run test to verify pass**

Run: `bun test src/lib/csv/sanitize-cell-for-csv.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/csv/sanitize-cell-for-csv.ts src/lib/csv/sanitize-cell-for-csv.test.ts
git commit -m "feat(csv): add shared formula-injection sanitizer"
```

### Task 2: Wire Sanitizer Into Budget Export

**Files:**
- Modify: `src/services/budget.service.ts`
- Modify: `src/services/budget.service.test.ts`

- [ ] **Step 1: Write failing budget export tests for dangerous prefixes**

```ts
expect(csv).toContain("'=@cmd");
expect(csv).toContain("'-123");
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun test src/services/budget.service.test.ts`
Expected: FAIL on new assertions.

- [ ] **Step 3: Write minimal implementation in `BudgetService.exportToCSV()`**

```ts
row.map((cell) => sanitizeCellForCsv(cell))
```

- [ ] **Step 4: Run test to verify pass**

Run: `bun test src/services/budget.service.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/budget.service.ts src/services/budget.service.test.ts
git commit -m "fix(budget-csv): neutralize spreadsheet formula prefixes"
```

### Task 3: Wire Sanitizer Into Transaction Export

**Files:**
- Modify: `src/services/transaction.service.ts`
- Modify: `src/services/transaction.service.test.ts` (or create focused export test file if this suite has no export coverage)

- [ ] **Step 1: Write failing transaction export tests for dangerous prefixes**

```ts
expect(csv).toContain("'=HYPERLINK(");
expect(csv).toContain("'@SUM(A1)");
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun test src/services/transaction.service.test.ts`
Expected: FAIL on new export assertions.

- [ ] **Step 3: Write minimal implementation in `TransactionService.exportToCSV()`**

```ts
row.map((cell) => sanitizeCellForCsv(cell))
```

- [ ] **Step 4: Run test to verify pass**

Run: `bun test src/services/transaction.service.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/transaction.service.ts src/services/transaction.service.test.ts
git commit -m "fix(transaction-csv): harden export against formula injection"
```

### Task 4: Make MCP Token Validation DB-First And Deactivation-Aware

**Files:**
- Modify: `src/lib/mcp-auth.ts`
- Modify: `src/lib/mcp-auth.test.ts`

- [ ] **Step 1: Write failing tests for DB-first semantics and deleted users**

```ts
expect(await validateMcpToken('token', deps)).toBeNull(); // deleted_at set
expect(mockDb.query.oauthAccessToken.findFirst).toHaveBeenCalled(); // no cache-only bypass
```

- [ ] **Step 2: Run test to verify failure**

Run: `bun test src/lib/mcp-auth.test.ts`
Expected: FAIL on new assertions.

- [ ] **Step 3: Write minimal implementation in `validateMcpToken()`**

```ts
// remove cache-only accept path
// enforce DB lookup with users.deleted_at IS NULL
```

- [ ] **Step 4: Run test to verify pass**

Run: `bun test src/lib/mcp-auth.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/mcp-auth.ts src/lib/mcp-auth.test.ts
git commit -m "fix(mcp-auth): enforce db-first validation and deleted-user denial"
```

### Task 5: Add Shared MCP Token Revocation Service And Use It In Soft-Delete Paths

**Files:**
- Create: `src/services/mcp-token-revocation.service.ts`
- Create: `src/services/mcp-token-revocation.service.test.ts`
- Create: `src/__tests__/api/admin/users/deactivate.test.ts`
- Modify: `src/services/user.service.ts`
- Modify: `src/services/super-admin.service.ts`
- Modify: `src/services/user.service.test.ts`

- [ ] **Step 1: Write failing tests for transactional revocation behavior**

```ts
// deleting tokens and setting deleted_at happen in one transaction
// token deletion failure rolls back soft delete
// bulk token revocation invalidates per-token tags and MCP_TOKENS
// admin deactivation route exercises same revocation behavior end-to-end
```

- [ ] **Step 2: Run tests to verify failure**

Run: `bun test src/services/mcp-token-revocation.service.test.ts src/services/user.service.test.ts src/__tests__/api/admin/users/deactivate.test.ts`
Expected: FAIL due missing service/integration.

- [ ] **Step 3: Write minimal implementation and integration**

```ts
await db.transaction(async (tx) => {
  // set users.deleted_at
  // delete oauthAccessToken rows by userId
});
// Import revocation service directly from './mcp-token-revocation.service' in service modules (avoid '@/services' import cycles)
// after commit: invalidate `mcp-token:<tokenId>` tags + `MCP_TOKENS` tag in best-effort try/catch logging
```

- [ ] **Step 4: Run tests to verify pass**

Run: `bun test src/services/mcp-token-revocation.service.test.ts src/services/user.service.test.ts src/__tests__/api/admin/users/deactivate.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/mcp-token-revocation.service.ts src/services/mcp-token-revocation.service.test.ts src/services/user.service.ts src/services/super-admin.service.ts src/services/user.service.test.ts src/__tests__/api/admin/users/deactivate.test.ts
git commit -m "feat(security): revoke mcp tokens on user soft-delete paths"
```

### Task 6: Harden `/api/mcp` With Rate Limit And Body Size Guard

**Files:**
- Create: `src/lib/mcp-rate-limit.ts`
- Create: `src/lib/mcp-rate-limit.test.ts`
- Modify: `src/pages/api/mcp.ts`
- Create: `src/__tests__/api/mcp.test.ts`

- [ ] **Step 1: Write failing tests for MCP guard behavior**

```ts
expect(response.status).toBe(429); // after 60 requests
expect(response.headers.get('X-RateLimit-Limit')).toBeTruthy();
expect(response.headers.get('X-RateLimit-Remaining')).toBeTruthy();
expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy();
expect(response.headers.get('Retry-After')).toBeTruthy();
expect(response.status).toBe(413); // oversized body
expect(response.status).toBe(413); // oversized stream without content-length
```

- [ ] **Step 2: Run tests to verify failure**

Run: `bun test src/lib/mcp-rate-limit.test.ts src/__tests__/api/mcp.test.ts`
Expected: FAIL until limiter and guards are implemented.

- [ ] **Step 3: Write minimal implementation in limiter + route**

```ts
// guard order: auth header -> body size limit -> token validate -> rate limit -> JSON parse -> dispatch
// enforce 64 KB cutoff with Content-Length fast-fail plus stream-read hard cap when header is absent/unreliable
```

- [ ] **Step 4: Run tests to verify pass**

Run: `bun test src/lib/mcp-rate-limit.test.ts src/__tests__/api/mcp.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/mcp-rate-limit.ts src/lib/mcp-rate-limit.test.ts src/pages/api/mcp.ts src/__tests__/api/mcp.test.ts
git commit -m "feat(mcp): add strict rate limiting and payload bounds"
```

### Task 7: Lock Down DEV Reset Endpoint Host Allowlist

**Files:**
- Modify: `src/pages/api/auth/e2e-reset-rate-limits.ts`
- Create: `src/__tests__/api/auth/e2e-reset-rate-limits.test.ts`

- [ ] **Step 1: Write failing tests for host normalization and env gate**

```ts
expect(await POST(localhostCtx)).toHaveProperty('status', 200);
expect(await POST(ipv6Ctx)).toHaveProperty('status', 200);
expect(await POST(dotLocalCtx)).toHaveProperty('status', 200);
expect(await POST(remoteCtx)).toHaveProperty('status', 403);
expect(await POST(nonDevCtx)).toHaveProperty('status', 404);
```

- [ ] **Step 2: Run tests to verify failure**

Run: `bun test src/__tests__/api/auth/e2e-reset-rate-limits.test.ts`
Expected: FAIL before host guard exists.

- [ ] **Step 3: Write minimal implementation for hostname normalization + allowlist**

```ts
const host = normalizeHost(new URL(context.request.url).hostname);
```

- [ ] **Step 4: Run tests to verify pass**

Run: `bun test src/__tests__/api/auth/e2e-reset-rate-limits.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/api/auth/e2e-reset-rate-limits.ts src/__tests__/api/auth/e2e-reset-rate-limits.test.ts
git commit -m "fix(dev-security): restrict reset-rate-limits endpoint to local hosts"
```

### Task 8: Final Verification And Quality Gates

**Files:**
- Modify: any touched files from tasks 1-7

- [ ] **Step 1: Run focused regression suite**

Run:

```bash
bun test src/lib/csv/sanitize-cell-for-csv.test.ts \
  src/services/budget.service.test.ts \
  src/services/transaction.service.test.ts \
  src/lib/mcp-auth.test.ts \
  src/services/mcp-token-revocation.service.test.ts \
  src/lib/mcp-rate-limit.test.ts \
  src/__tests__/api/mcp.test.ts \
  src/__tests__/api/auth/e2e-reset-rate-limits.test.ts \
  src/__tests__/api/admin/users/deactivate.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run required quality gates**

Run:

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
bun run build
```

Expected: all commands pass with no blocking errors.

- [ ] **Step 3: Commit verification fixes (if any)**

```bash
git add <adjusted-files>
git commit -m "chore: finalize ALL-71 phase A verification fixes"
```

