# Remove better-sqlite3 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove `better-sqlite3` dependency and standardize local SQLite access on `bun:sqlite`, keeping Cloudflare Workers PostgreSQL production path unchanged.

**Architecture:** Simplify the dual-driver SQLite layer to Bun-only. Replace the single Playwright Node.js consumer (`e2e/helpers/email-verification.ts`) with a Bun subprocess pattern. Update all docs/rules that reference better-sqlite3.

**Tech Stack:** Bun, bun:sqlite, drizzle-orm/bun-sqlite, Playwright (E2E), Astro 5

---

### Task 1: Create Bun-based E2E database query script

The E2E email verification helper currently uses `better-sqlite3` directly because Playwright runs in Node.js. We replace it with a Bun subprocess that executes queries via `bun:sqlite`.

**Files:**

- Create: `e2e/helpers/db-query.ts`

**Step 1: Create the Bun DB query script**

Create `e2e/helpers/db-query.ts`:

```typescript
/**
 * Bun-based E2E Database Query Helper
 *
 * This script runs under Bun (not Node.js) and provides direct SQLite
 * access for Playwright E2E tests via subprocess invocation.
 *
 * Usage: bun run e2e/helpers/db-query.ts <db-path> <query-type> <param>
 *
 * Query types:
 *   get-token <email>        - Get latest verification token for user
 *   expire-token <email>     - Mark verification tokens as expired
 *   is-verified <email>      - Check if user email is verified
 *   workspace-status <email> - Get workspace status for user
 */
import { Database } from 'bun:sqlite';

const [dbPath, queryType, param] = process.argv.slice(2);

if (!dbPath || !queryType || !param) {
  console.error('Usage: bun run e2e/helpers/db-query.ts <db-path> <query-type> <param>');
  process.exit(1);
}

const email = param.toLowerCase();

switch (queryType) {
  case 'get-token': {
    const db = new Database(dbPath, { readonly: true });
    try {
      const row = db
        .prepare(
          `SELECT evt.token
           FROM email_verification_tokens evt
           JOIN users u ON evt.user_id = u.id
           WHERE u.email = ?
           ORDER BY evt.created_at DESC
           LIMIT 1`
        )
        .get(email) as { token: string } | null;
      console.log(JSON.stringify({ token: row?.token ?? null }));
    } finally {
      db.close();
    }
    break;
  }

  case 'expire-token': {
    const db = new Database(dbPath);
    try {
      const pastTime = Math.floor((Date.now() - 25 * 60 * 60 * 1000) / 1000);
      db.prepare(
        `UPDATE email_verification_tokens
         SET expires_at = ?
         WHERE user_id IN (SELECT id FROM users WHERE email = ?)`
      ).run(pastTime, email);
      console.log(JSON.stringify({ success: true }));
    } finally {
      db.close();
    }
    break;
  }

  case 'is-verified': {
    const db = new Database(dbPath, { readonly: true });
    try {
      const row = db.prepare('SELECT email_verified_at FROM users WHERE email = ?').get(email) as {
        email_verified_at: number | null;
      } | null;
      console.log(JSON.stringify({ verified: row?.email_verified_at != null }));
    } finally {
      db.close();
    }
    break;
  }

  case 'workspace-status': {
    const db = new Database(dbPath, { readonly: true });
    try {
      const row = db
        .prepare(
          `SELECT w.status
           FROM workspaces w
           JOIN users u ON u.workspace_id = w.id
           WHERE u.email = ?`
        )
        .get(email) as { status: string } | null;
      console.log(JSON.stringify({ status: row?.status ?? null }));
    } finally {
      db.close();
    }
    break;
  }

  default:
    console.error(`Unknown query type: ${queryType}`);
    process.exit(1);
}
```

**Step 2: Verify the script runs**

Run: `bun run e2e/helpers/db-query.ts db/.dev.db get-token test@example.com`
Expected: JSON output like `{"token":null}` (no error)

**Step 3: Commit**

```bash
git add e2e/helpers/db-query.ts
git commit -m "feat(e2e): add Bun-based DB query helper for Playwright tests"
```

---

### Task 2: Refactor E2E email verification helper to use Bun subprocess

Replace direct `better-sqlite3` import with calls to the Bun subprocess script.

**Files:**

- Modify: `e2e/helpers/email-verification.ts` (entire file)

**Step 1: Rewrite email-verification.ts**

Replace the entire contents of `e2e/helpers/email-verification.ts` with:

```typescript
/**
 * Email Verification E2E Test Helpers
 *
 * Provides database access to the E2E test database via a Bun subprocess.
 * Playwright runs in Node.js, so we shell out to Bun for SQLite access.
 */

import { execSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../..');
const E2E_DB_PATH = path.join(PROJECT_ROOT, 'db', '.e2e.db');
const DB_QUERY_SCRIPT = path.join(__dirname, 'db-query.ts');

/**
 * Run a database query via Bun subprocess
 */
function runDbQuery(queryType: string, email: string): string {
  return execSync(`bun run "${DB_QUERY_SCRIPT}" "${E2E_DB_PATH}" ${queryType} "${email}"`, {
    encoding: 'utf-8',
    cwd: PROJECT_ROOT,
  }).trim();
}

/**
 * Get the latest verification token for a user by email
 * @param email - User email address
 * @returns Verification token string or null
 */
export function getVerificationToken(email: string): string | null {
  const result = JSON.parse(runDbQuery('get-token', email));
  return result.token ?? null;
}

/**
 * Mark a verification token as expired (for testing expired token flow)
 * @param email - User email address
 */
export function expireVerificationToken(email: string): void {
  runDbQuery('expire-token', email);
}

/**
 * Check if a user is email-verified
 * @param email - User email address
 * @returns True if email is verified
 */
export function isUserVerified(email: string): boolean {
  const result = JSON.parse(runDbQuery('is-verified', email));
  return result.verified;
}

/**
 * Check workspace status for a user
 * @param email - User email address
 * @returns Workspace status or null
 */
export function getWorkspaceStatus(email: string): string | null {
  const result = JSON.parse(runDbQuery('workspace-status', email));
  return result.status ?? null;
}
```

**Step 2: Verify the helper works by running E2E email verification test**

Run: `bunx playwright test --config=e2e/playwright.config.ts -g "email" --headed` (or a quick smoke test)
Expected: Tests pass with the new subprocess-based helper

**Step 3: Commit**

```bash
git add e2e/helpers/email-verification.ts
git commit -m "refactor(e2e): replace better-sqlite3 with Bun subprocess in email verification helper"
```

---

### Task 3: Simplify DB driver layer — remove Node.js fallback

Remove the `better-sqlite3` Node.js driver, runtime detection, and simplify `src/db/index.ts` to always use `bun:sqlite`.

**Files:**

- Delete: `src/db/drivers/node.ts`
- Modify: `src/db/driver.ts:104-128` (remove `Runtime` type and `detectRuntime()`)
- Modify: `src/db/index.ts:1-270` (simplify imports, remove branching)

**Step 1: Delete the Node.js driver**

Delete `src/db/drivers/node.ts`.

**Step 2: Simplify `src/db/driver.ts`**

Remove lines 104-128 (the `Runtime` type and `detectRuntime()` function). Update the module doc comment (lines 1-13) to remove better-sqlite3 references.

The file should become:

```typescript
/**
 * Database Driver Interface
 *
 * Interface for the SQLite database driver using Bun's native bun:sqlite.
 *
 * @see https://bun.sh/docs/api/sqlite
 */

/**
 * Database driver interface for bun:sqlite
 */
export interface DatabaseDriver {
  exec(sql: string): void;
  prepare(sql: string): PreparedStatement;
  close(): void;
  open?(): void;
  tableExists?(tableName: string): boolean;
  /** @internal Raw SQLite connection for passing to drizzle() */
  _raw: unknown;
}

/**
 * Prepared statement interface
 */
export interface PreparedStatement {
  all(params?: unknown[]): unknown[];
  get(params?: unknown[]): unknown | undefined;
  run(params?: unknown[]): RunResult;
  finalize?(): void;
}

/**
 * Result from executing a prepared statement with run()
 */
export interface RunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}
```

**Step 3: Simplify `src/db/index.ts`**

Make these specific changes to `src/db/index.ts`:

**a) Update module doc comment (lines 1-22):** Remove the better-sqlite3 reference from the SQLite section. Change:

```text
 * SQLite:
 * - In Bun runtime: Uses bun:sqlite with drizzle-orm/bun-sqlite
 * - In Node.js runtime: Uses better-sqlite3 with drizzle-orm/better-sqlite3
```

to:

```text
 * SQLite:
 * - Uses bun:sqlite with drizzle-orm/bun-sqlite (local development)
```

Remove the `@see` line for better-sqlite3.

**b) Update imports (lines 23-30):** Replace:

```typescript
import { createRequire } from 'node:module';
import { getDatabaseConfig } from './config';
import { detectRuntime, type DatabaseDriver } from './driver';
import { createPostgresDatabase, closePostgres, resetPostgresClient } from './drivers/postgres';
import { createNodeDriver } from './drivers/node';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
```

with:

```typescript
import { createRequire } from 'node:module';
import { getDatabaseConfig } from './config';
import type { DatabaseDriver } from './driver';
import { createPostgresDatabase, closePostgres, resetPostgresClient } from './drivers/postgres';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
```

Note: Keep `createRequire` — the Bun driver (`drivers/bun.ts`) is still loaded via `dynamicRequire` because Vite/Astro bundling needs `createRequire` for `bun:sqlite` and `drizzle-orm/bun-sqlite`.

**c) Simplify Database type (lines 71-73):** Replace:

```typescript
export type Database =
  | BunSQLiteDatabase<typeof sqliteSchema>
  | BetterSQLite3Database<typeof sqliteSchema>;
```

with:

```typescript
export type Database = BunSQLiteDatabase<typeof sqliteSchema>;
```

**d) Update `runTransaction` doc comment (lines 165-174):** Replace:

```typescript
/**
 * Run an async callback transactionally across dialects.
 *
 * - **PostgreSQL**: Uses a real database transaction (BEGIN/COMMIT/ROLLBACK).
 * - **SQLite (better-sqlite3)**: Runs the callback directly against `db` without
 *   a transaction wrapper because better-sqlite3 is synchronous and rejects async
 *   callbacks with "Transaction function cannot return a promise". SQLite's WAL mode
 *   with single-writer guarantees sequential writes within a single connection are
 *   effectively atomic for server request scope.
 *
 * @param db - Database instance
 * @param callback - Async function receiving a transaction-capable db handle
 * @returns The callback's return value
 */
```

with:

```typescript
/**
 * Run an async callback transactionally across dialects.
 *
 * - **PostgreSQL**: Uses a real database transaction (BEGIN/COMMIT/ROLLBACK).
 * - **SQLite**: Runs the callback directly against `db` without a transaction
 *   wrapper. SQLite's WAL mode with single-writer guarantees sequential writes
 *   within a single connection are effectively atomic for server request scope.
 *
 * @param db - Database instance
 * @param callback - Async function receiving a transaction-capable db handle
 * @returns The callback's return value
 */
```

**e) Simplify `createDatabase()` (lines 220-270):** Replace the entire function with:

```typescript
/**
 * Create the Drizzle database instance
 *
 * Automatically selects the correct driver based on DATABASE_URL:
 * - PostgreSQL URLs → postgres.js driver
 * - SQLite paths → bun:sqlite driver
 *
 * Note: SQLite driver is loaded via createRequire to work with Vite/Astro bundling.
 * For edge environments (Cloudflare Workers), only PostgreSQL is supported.
 *
 * @throws Error if database connection fails
 */
function createDatabase(): Database {
  const config = getDatabaseConfig();

  try {
    // PostgreSQL path - used in production (Cloudflare Workers)
    if (config.dialect === 'postgresql') {
      return createPostgresDatabase(config.url, pgSchema) as unknown as Database;
    }

    // SQLite path - uses bun:sqlite via Bun runtime
    // For edge environments (Cloudflare Workers), configure DATABASE_URL to use PostgreSQL
    const dynamicRequire = getRequire();
    const { createBunDriver } = dynamicRequire('./drivers/bun');
    const driver: DatabaseDriver & { _raw: unknown } = createBunDriver(config.url);
    const { drizzle } = dynamicRequire('drizzle-orm/bun-sqlite');

    applyPragmas(driver);
    return drizzle(driver._raw, { schema: sqliteSchema });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to create database connection (dialect: ${config.dialect}): ${message}`
    );
  }
}
```

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

**Step 5: Run unit tests**

Run: `bun run test`
Expected: All pass (integration test may have failures — we fix those in Task 4)

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor(db): remove better-sqlite3 Node.js fallback, use bun:sqlite only"
```

---

### Task 4: Update integration tests

Remove test scenarios that were testing the now-deleted Node.js fallback path.

**Files:**

- Modify: `src/db/index.integration.test.ts`

**Step 1: Simplify the integration test file**

Remove these sections from `src/db/index.integration.test.ts`:

1. Remove the `detectRuntime()` helper function (lines 67-76) — it's local to the test and tested the old dual-runtime concept
2. Remove the `importInNodeContext()` helper function (lines 82-100)
3. Remove the `simulateMiddlewareImport()` helper function (lines 107-117)
4. Remove the `describe('Runtime Detection', ...)` block (lines 260-271)
5. Remove the `describe('Module Import in Node.js Context', ...)` block (lines 273-333)
6. Rename `describe('Module Import in Bun Context', ...)` to `describe('Module Import', ...)` and keep the tests inside it (lines 335-369)
7. Remove the `runtime` variable from the top-level describe (line 234)
8. Remove the `console.log` about runtime from `beforeAll` (line 238)

Keep all the CRUD, caching, schema, error handling, and type safety tests intact.

**Step 2: Run integration tests**

Run: `bun test src/db/index.integration.test.ts`
Expected: All remaining tests pass

**Step 3: Commit**

```bash
git add src/db/index.integration.test.ts
git commit -m "test(db): remove Node.js fallback test scenarios from integration tests"
```

---

### Task 5: Remove better-sqlite3 packages and astro.config reference

**Files:**

- Modify: `package.json:104` (remove `@types/better-sqlite3`)
- Modify: `package.json:108` (remove `better-sqlite3`)
- Modify: `astro.config.ts:150-151` (remove SSR external entry)

**Step 1: Remove from package.json**

Remove these two lines from `devDependencies` in `package.json`:

```
    "@types/better-sqlite3": "^7.6.13",
```

and:

```
    "better-sqlite3": "^12.6.2",
```

**Step 2: Remove from astro.config.ts SSR externals**

In `astro.config.ts`, remove lines 150-151:

```typescript
        // SQLite drivers - not needed in Cloudflare (uses PostgreSQL)
        'better-sqlite3',
```

**Step 3: Reinstall dependencies**

Run: `bun install`
Expected: Lockfile updated, `better-sqlite3` and `@types/better-sqlite3` removed

**Step 4: Run typecheck**

Run: `bun run typecheck`
Expected: 0 errors

**Step 5: Run Cloudflare build**

Run: `bun run build:cloudflare`
Expected: Build succeeds (Workers path unchanged — uses PostgreSQL, not SQLite)

**Step 6: Commit**

```bash
git add package.json bun.lock astro.config.ts
git commit -m "chore: remove better-sqlite3 and @types/better-sqlite3 dependencies"
```

---

### Task 6: Update service comments referencing better-sqlite3

**Files:**

- Modify: `src/services/asset.service.ts:87` (comment)
- Modify: `src/services/asset.service.ts:296` (comment)

**Step 1: Update comments in asset.service.ts**

At line 87, change:

```typescript
   * better-sqlite3 with Drizzle doesn't support async transaction callbacks.
```

to:

```typescript
   * SQLite with Drizzle doesn't support async transaction callbacks.
```

At line 296, make the same change:

```typescript
   * better-sqlite3 with Drizzle doesn't support async transaction callbacks.
```

to:

```typescript
   * SQLite with Drizzle doesn't support async transaction callbacks.
```

**Step 2: Commit**

```bash
git add src/services/asset.service.ts
git commit -m "docs: update asset service comments to remove better-sqlite3 references"
```

---

### Task 7: Update documentation and rules

Update all docs/rules that reference `better-sqlite3`.

**Files:**

- Modify: `.claude/CLAUDE.md:33` (ADR table row)
- Modify: `.claude/rules/workflow.md:46` (forbidden import rule)
- Modify: `.claude/rules/backend/database.md:70-91` (transaction section)
- Modify: `.claude/rules/backend/deployment.md:18,36` (forbidden + code example)
- Modify: `.claude/rules/learned-patterns.md:44-45` (transaction patterns)
- Modify: `.claude/memory/MEMORY.md:23` (local DB reference)
- Modify: `docs/architecture/006-database-connection-architecture.md:13,28,37`
- Modify: `docs/constitution.md:46`

**Step 1: Update `.claude/CLAUDE.md`**

At line 33, change the Database row in the ADR table from:

```
| **Database**            | `better-sqlite3` (shared code)           | `bun:sqlite` (middleware)                      | `rules/workflow.md`               |
```

to:

```
| **Database**            | `bun:sqlite` (local dev)                 | Direct SQLite in middleware                    | `rules/workflow.md`               |
```

**Step 2: Update `.claude/rules/workflow.md`**

At line 46, change:

```
- `bun:sqlite` → Use `better-sqlite3` or database abstraction layer
```

to:

```
- `bun:sqlite` → Only use in non-middleware code paths (API routes, CLI, services)
```

**Step 3: Update `.claude/rules/backend/database.md`**

Replace the "### better-sqlite3 (Local Dev)" section (lines 70-91) with a simplified SQLite transaction section:

````markdown
### SQLite (Local Dev)

SQLite with Drizzle uses `bun:sqlite`. Async transaction callbacks are not supported by the SQLite driver — use `runTransaction()` from `@/db` which handles dialect differences automatically.

```typescript
// ✅ Correct: Use runTransaction() for cross-dialect compatibility
import { runTransaction } from '@/db';

await runTransaction(db, async (tx) => {
  await tx.insert(budgets).values({ ... });
  await tx.update(categories).set({ ... });
});
```
````

**Rules:**

- ✅ **Use `runTransaction()` for transactions** - handles SQLite/PostgreSQL differences
- ✅ **Wrap multi-step DB operations in transactions** - ensures atomicity

```

**Step 4: Update `.claude/rules/backend/deployment.md`**

At line 18, change:

```

- ❌ `bun:sqlite` → Use `better-sqlite3` or database abstraction layer

```

to:

```

- ❌ `bun:sqlite` → Only use in API routes, CLI, or non-middleware contexts

````

At lines 35-36, change the code example:

```typescript
// ✅ Middleware: Workers-compatible imports only
import Database from 'better-sqlite3'; // Works in both runtimes
````

to:

```typescript
// ✅ Middleware: Workers-compatible imports only (no SQLite drivers)
// Database middleware skips SQLite lifecycle management
```

**Step 5: Update `.claude/rules/learned-patterns.md`**

At lines 44-45, change:

```
- ✅ **Use sync callbacks with better-sqlite3 transactions** - `db.transaction((tx) => { /* sync code */ })`
- ❌ **Use `async/await` in better-sqlite3 transactions** - driver is synchronous, throws "cannot return a promise"
```

to:

```
- ✅ **Use `runTransaction()` for cross-dialect transactions** - handles SQLite/PostgreSQL differences
- ❌ **Use raw `db.transaction()` with async callbacks on SQLite** - driver is synchronous, use `runTransaction()` instead
```

**Step 6: Update `.claude/memory/MEMORY.md`**

At line 23, change:

```
- Local: SQLite via `better-sqlite3`
```

to:

```
- Local: SQLite via `bun:sqlite`
```

**Step 7: Update `docs/architecture/006-database-connection-architecture.md`**

At line 13, change:

```
- **Local development (Bun):** SQLite via `bun:sqlite` or `better-sqlite3`
```

to:

```
- **Local development (Bun):** SQLite via `bun:sqlite`
```

At line 28, change:

```
anything else (file path)     →  SQLite (bun:sqlite or better-sqlite3 + Drizzle)
```

to:

```
anything else (file path)     →  SQLite (bun:sqlite + Drizzle)
```

At line 37, remove:

```
- `src/db/drivers/node.ts` — better-sqlite3 driver (Node.js fallback)
```

**Step 8: Update `docs/constitution.md`**

At line 46, change:

```
- `bun:sqlite` → Use `better-sqlite3` or database abstraction layer
```

to:

```
- `bun:sqlite` → Only use in API routes, CLI, or non-middleware contexts
```

**Step 9: Commit**

```bash
git add .claude/ docs/
git commit -m "docs: update all references from better-sqlite3 to bun:sqlite"
```

---

### Task 8: Final verification

Run all quality gates and verify no better-sqlite3 references remain.

**Files:** None (verification only)

**Step 1: Check for remaining references**

Run: `rg -n "better-sqlite3" src e2e scripts package.json`
Expected: No results (only design doc in `docs/plans/` may contain references, which is acceptable)

**Step 2: Run full quality gates**

Run: `bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck`
Expected: All pass

**Step 3: Run unit tests**

Run: `bun run test`
Expected: All pass

**Step 4: Run Cloudflare Workers build**

Run: `bun run build:cloudflare`
Expected: Build succeeds

**Step 5: Run standard build**

Run: `bun run build`
Expected: Build succeeds

**Step 6: Final commit if quality gates auto-fixed anything**

```bash
git add -A
git commit -m "chore: quality gate auto-fixes after better-sqlite3 removal"
```

(Skip if nothing changed.)
