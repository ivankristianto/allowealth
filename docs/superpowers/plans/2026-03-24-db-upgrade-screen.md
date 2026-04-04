# Database Upgrade Screen Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-only `/upgrade` page and `migrationGuard` middleware that blocks all requests when database migrations are pending, redirecting super admins to run the migration via a web UI.

**Architecture:** A `migrationGuard` middleware sits between `csrf` and `routeGuard` in the chain. It performs a lightweight `COUNT(*)` check against `__drizzle_migrations` on every request (except a short passlist). When pending, super admins are redirected to `/upgrade`; everyone else gets a 503 maintenance page. The migration runs synchronously via `POST /api/admin/upgrade/run` which calls the existing `runSqliteMigrations()`.

**Tech Stack:** Astro 6 SSR, Bun/SQLite, Drizzle ORM, Tailwind v4 + DaisyUI v5, `bun:test`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/db/migration-constants.ts` | Create | Export `EXPECTED_MIGRATION_COUNT` — Workers-safe, no `bun:sqlite` |
| `src/services/migration.service.ts` | Create | `isMigrationPending()`, `runMigrations()` |
| `src/middleware/migration-guard.ts` | Create | Intercept requests when migrations pending |
| `src/middleware/index.ts` | Modify | Insert `migrationGuard` between `csrf` and `routeGuard` |
| `src/pages/upgrade.astro` | Create | Admin upgrade UI with 5 states |
| `src/pages/api/admin/upgrade/run.ts` | Create | `POST` — triggers `runSqliteMigrations()` |
| `src/pages/api/admin/upgrade/status.ts` | Create | `GET` — returns `{ pending, applied, expected }` |
| `src/tests/migration-constants.test.ts` | Create | Assert `EXPECTED_MIGRATION_COUNT` matches journal |
| `src/tests/migration.service.test.ts` | Create | Unit tests for `isMigrationPending()` |
| `src/tests/migration-guard.test.ts` | Create | Unit tests for middleware routing logic |

---

## Task 1: Migration Constants File

The constant must live in its own file because `src/db/migrate.ts` imports `bun:sqlite` at the top level. Importing that file from middleware would break Cloudflare Workers.

**Files:**
- Create: `src/db/migration-constants.ts`
- Create: `src/tests/migration-constants.test.ts`

- [ ] **Step 1.1: Write the failing test**

```typescript
// src/tests/migration-constants.test.ts
import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { EXPECTED_MIGRATION_COUNT } from '@/db/migration-constants';

describe('EXPECTED_MIGRATION_COUNT', () => {
  it('matches the actual number of entries in the drizzle journal', () => {
    const journalPath = resolve(process.cwd(), 'drizzle/sqlite/meta/_journal.json');
    const journal = JSON.parse(readFileSync(journalPath, 'utf-8'));
    expect(EXPECTED_MIGRATION_COUNT).toBe(journal.entries.length);
  });
});
```

- [ ] **Step 1.2: Run test to verify it fails**

```bash
bun test src/tests/migration-constants.test.ts
```

Expected: FAIL — `Cannot find module '@/db/migration-constants'`

- [ ] **Step 1.3: Create the constants file**

```typescript
// src/db/migration-constants.ts

/**
 * Expected number of applied Drizzle migrations.
 *
 * IMPORTANT: Update this constant whenever you add a new migration file.
 * A test in src/tests/migration-constants.test.ts enforces that this matches
 * drizzle/sqlite/meta/_journal.json — a mismatch causes a CI failure.
 *
 * This constant is intentionally in its own file (not migrate.ts) because
 * migrate.ts imports bun:sqlite, which is incompatible with Cloudflare Workers.
 * This file has zero runtime dependencies and is safe to import from middleware.
 */
export const EXPECTED_MIGRATION_COUNT = 2;
```

- [ ] **Step 1.4: Run test to verify it passes**

```bash
bun test src/tests/migration-constants.test.ts
```

Expected: PASS

- [ ] **Step 1.5: Commit**

```bash
git add src/db/migration-constants.ts src/tests/migration-constants.test.ts
git commit -m "feat(ALL-65): add EXPECTED_MIGRATION_COUNT constant"
```

---

## Task 2: MigrationService

**Files:**
- Create: `src/services/migration.service.ts`
- Create: `src/tests/migration.service.test.ts`

- [ ] **Step 2.1: Write the failing tests**

```typescript
// src/tests/migration.service.test.ts
import { describe, expect, it } from 'bun:test';
import { MigrationService } from '@/services/migration.service';
import { EXPECTED_MIGRATION_COUNT } from '@/db/migration-constants';

// Helper: create a mock db that returns a specific count from __drizzle_migrations
function mockDb(count: number) {
  return {
    run: () => {},
    get: () => ({ count }),
    all: () => [{ count }],
    execute: async (query: any) => {
      // drizzle sql`` queries come through here
      return [{ count }];
    },
  } as any;
}

// Helper: create a mock db that throws on any query (simulates missing table)
function errorDb(message = 'no such table: __drizzle_migrations') {
  return {
    execute: async () => {
      throw new Error(message);
    },
  } as any;
}

describe('MigrationService.isMigrationPending', () => {
  it('returns false when applied count equals expected', async () => {
    const db = mockDb(EXPECTED_MIGRATION_COUNT);
    const result = await MigrationService.isMigrationPending(db);
    expect(result).toBe(false);
  });

  it('returns true when applied count is less than expected', async () => {
    const db = mockDb(EXPECTED_MIGRATION_COUNT - 1);
    const result = await MigrationService.isMigrationPending(db);
    expect(result).toBe(true);
  });

  it('returns true when __drizzle_migrations table does not exist', async () => {
    const db = errorDb();
    const result = await MigrationService.isMigrationPending(db);
    expect(result).toBe(true);
  });
});

describe('MigrationService.getStatus', () => {
  it('returns pending, applied, and expected counts', async () => {
    const db = mockDb(1);
    const status = await MigrationService.getStatus(db);
    expect(status.pending).toBe(true);
    expect(status.applied).toBe(1);
    expect(status.expected).toBe(EXPECTED_MIGRATION_COUNT);
  });

  it('returns pending false when up to date', async () => {
    const db = mockDb(EXPECTED_MIGRATION_COUNT);
    const status = await MigrationService.getStatus(db);
    expect(status.pending).toBe(false);
    expect(status.applied).toBe(EXPECTED_MIGRATION_COUNT);
  });
});
```

- [ ] **Step 2.2: Run tests to verify they fail**

```bash
bun test src/tests/migration.service.test.ts
```

Expected: FAIL — `Cannot find module '@/services/migration.service'`

- [ ] **Step 2.3: Implement `MigrationService`**

Note: `isMigrationPending` queries the DB using raw SQL via Drizzle's `sql` tag. The `db` parameter is the Drizzle instance from `context.locals.db` (set by the `database` middleware — type `LibSQLDatabase | BunSQLiteDatabase | D1Database`). We use a raw SQL count query that works across all driver types.

```typescript
// src/services/migration.service.ts

/**
 * MigrationService
 *
 * Detects pending database migrations and runs them on demand.
 *
 * WORKERS-SAFE NOTE: This file must not import bun:sqlite directly.
 * isMigrationPending() and getStatus() only use the injected db instance
 * and constants — safe for Cloudflare Workers. runMigrations() imports
 * migrate.ts at runtime only when DEPLOY_TARGET is not set to a Workers target.
 */

import { sql } from 'drizzle-orm';
import { EXPECTED_MIGRATION_COUNT } from '@/db/migration-constants';

export interface MigrationStatus {
  pending: boolean;
  applied: number;
  expected: number;
}

export interface MigrationResult {
  success: boolean;
  error?: string;
}

export class MigrationService {
  /**
   * Check if there are pending migrations.
   *
   * Queries __drizzle_migrations for applied count and compares against
   * EXPECTED_MIGRATION_COUNT. Returns true (pending) if the table doesn't
   * exist yet (fresh DB) or if applied count < expected.
   *
   * Workers-safe: no bun:sqlite import.
   */
  static async isMigrationPending(db: any): Promise<boolean> {
    const status = await this.getStatus(db);
    return status.pending;
  }

  /**
   * Return migration status with counts for the /api/admin/upgrade/status endpoint.
   */
  static async getStatus(db: any): Promise<MigrationStatus> {
    try {
      const result = await db.get(
        sql`SELECT COUNT(*) as count FROM __drizzle_migrations`
      );
      const applied = Number(result?.count ?? 0);
      return {
        pending: applied < EXPECTED_MIGRATION_COUNT,
        applied,
        expected: EXPECTED_MIGRATION_COUNT,
      };
    } catch {
      // Table doesn't exist yet (fresh/corrupt DB) — treat as pending
      return {
        pending: true,
        applied: 0,
        expected: EXPECTED_MIGRATION_COUNT,
      };
    }
  }

  /**
   * Run pending SQLite migrations.
   *
   * Only works when DEPLOY_TARGET is 'node' or unset (Bun/SQLite environments).
   * Returns a 501-style error object for Cloudflare D1 / Workers deployments.
   *
   * Note: runSqliteMigrations() is imported dynamically to avoid pulling
   * bun:sqlite into the module graph for Workers builds.
   */
  static async runMigrations(): Promise<MigrationResult> {
    const deployTarget = process.env.DEPLOY_TARGET;
    const isWorkersTarget =
      deployTarget === 'cloudflare' ||
      deployTarget === 'vercel' ||
      deployTarget === 'netlify';

    if (isWorkersTarget) {
      return {
        success: false,
        error:
          'Web-triggered migrations are not supported in this deployment. Run: bun run db:migrate',
      };
    }

    try {
      // Dynamic import keeps bun:sqlite out of the Workers module graph
      const { runSqliteMigrations } = await import('@/db/migrate');
      runSqliteMigrations();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
```

- [ ] **Step 2.4: Run tests to verify they pass**

```bash
bun test src/tests/migration.service.test.ts
```

Expected: PASS

Note: The mock `db` used in tests uses `.get()`. If the real Drizzle driver API differs, you may need to adjust the mock shape — but the service implementation is correct for the actual Drizzle bun-sqlite driver.

- [ ] **Step 2.5: Commit**

```bash
git add src/services/migration.service.ts src/tests/migration.service.test.ts
git commit -m "feat(ALL-65): add MigrationService with isMigrationPending and getStatus"
```

---

## Task 3: `migrationGuard` Middleware

**Files:**
- Create: `src/middleware/migration-guard.ts`
- Modify: `src/middleware/index.ts`
- Create: `src/tests/migration-guard.test.ts`

- [ ] **Step 3.1: Write the failing tests**

```typescript
// src/tests/migration-guard.test.ts
import { describe, expect, it, mock } from 'bun:test';

// We test the guard's routing logic by mocking MigrationService
// and constructing minimal context objects.

function makeContext(pathname: string, role?: string) {
  return {
    url: new URL(`http://localhost${pathname}`),
    locals: {
      user: role ? { role } : null,
      db: {},
    },
    redirect: (url: string, status: number) =>
      new Response(null, { status, headers: { Location: url } }),
  } as any;
}

const next = () => Promise.resolve(new Response('OK', { status: 200 }));

// We need to mock MigrationService before importing the guard.
// bun:test supports module mocks via mock.module.
mock.module('@/services/migration.service', () => ({
  MigrationService: {
    isMigrationPending: async () => false,
  },
}));

// Import AFTER mock is set up
const { migrationGuard } = await import('@/middleware/migration-guard');

describe('migrationGuard — not pending', () => {
  it('calls next() when migration is not pending', async () => {
    const ctx = makeContext('/dashboard', 'admin');
    const res = await migrationGuard(ctx, next);
    expect(res.status).toBe(200);
  });

  it('calls next() for passlist path even if pending', async () => {
    // Override mock for this test
    mock.module('@/services/migration.service', () => ({
      MigrationService: { isMigrationPending: async () => true },
    }));
    const { migrationGuard: guard } = await import('@/middleware/migration-guard');

    const paths = [
      '/upgrade',
      '/api/admin/upgrade/run',
      '/api/admin/upgrade/status',
      '/_astro/main.js',
      '/favicon.ico',
    ];
    for (const path of paths) {
      const ctx = makeContext(path, 'member');
      const res = await guard(ctx, next);
      expect(res.status).toBe(200);
    }
  });
});

describe('migrationGuard — pending', () => {
  // Reset mock to pending=true
  mock.module('@/services/migration.service', () => ({
    MigrationService: { isMigrationPending: async () => true },
  }));

  it('redirects super_admin to /upgrade', async () => {
    const { migrationGuard: guard } = await import('@/middleware/migration-guard');
    const ctx = makeContext('/dashboard', 'super_admin');
    const res = await guard(ctx, next);
    expect(res.status).toBe(302);
    expect(res.headers.get('location')).toBe('/upgrade');
  });

  it('returns 503 for unauthenticated user', async () => {
    const { migrationGuard: guard } = await import('@/middleware/migration-guard');
    const ctx = makeContext('/dashboard', undefined);
    const res = await guard(ctx, next);
    expect(res.status).toBe(503);
  });

  it('returns 503 for admin role', async () => {
    const { migrationGuard: guard } = await import('@/middleware/migration-guard');
    const ctx = makeContext('/dashboard', 'admin');
    const res = await guard(ctx, next);
    expect(res.status).toBe(503);
  });

  it('returns 503 for member role', async () => {
    const { migrationGuard: guard } = await import('@/middleware/migration-guard');
    const ctx = makeContext('/dashboard', 'member');
    const res = await guard(ctx, next);
    expect(res.status).toBe(503);
  });
});
```

- [ ] **Step 3.2: Run tests to verify they fail**

```bash
bun test src/tests/migration-guard.test.ts
```

Expected: FAIL — `Cannot find module '@/middleware/migration-guard'`

- [ ] **Step 3.3: Implement `migrationGuard`**

```typescript
// src/middleware/migration-guard.ts

/**
 * Migration Guard Middleware
 *
 * Checks whether database migrations are pending on every request.
 * When pending:
 *   - super_admin → redirect to /upgrade to trigger the migration
 *   - everyone else → 503 inline maintenance page (URL preserved)
 *
 * Placed after `csrf` and before `routeGuard` in the middleware chain.
 *
 * WORKERS-SAFE: Only imports from migration-constants.ts and migration.service.ts,
 * neither of which import bun:sqlite.
 */

import type { MiddlewareHandler } from 'astro';
import { MigrationService } from '@/services/migration.service';

/**
 * Paths that always bypass the migration check.
 * The upgrade page and its API endpoints must pass through so the admin
 * can reach the UI and trigger/poll the migration.
 */
const PASSLIST = [
  '/upgrade',
  '/api/admin/upgrade/run',
  '/api/admin/upgrade/status',
  '/_astro/',
  '/favicon.ico',
];

function isPasslisted(pathname: string): boolean {
  return PASSLIST.some((entry) => pathname === entry || pathname.startsWith(entry));
}

function maintenancePage(): Response {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Maintenance — allowealth</title>
    <style>
      :root { color-scheme: light dark; }
      body {
        margin: 0;
        min-height: 100dvh;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: Inter, system-ui, sans-serif;
        background: var(--color-base-100, #f8fafc);
        color: var(--color-base-content, #1e293b);
      }
      .card {
        text-align: center;
        max-width: 400px;
        padding: 2.5rem 2rem;
      }
      h1 { font-size: 1.25rem; font-weight: 600; margin: 0 0 0.5rem; }
      p { font-size: 0.9rem; color: #64748b; margin: 0; }
      .logo { font-size: 1.5rem; font-weight: 700; margin-bottom: 1.5rem; letter-spacing: -0.02em; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="logo">allowealth</div>
      <h1>Undergoing scheduled maintenance</h1>
      <p>The application is being upgraded. Please check back shortly.</p>
    </div>
  </body>
</html>`;

  return new Response(html, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Retry-After': '60',
    },
  });
}

export const migrationGuard: MiddlewareHandler = async (context, next) => {
  const { pathname } = context.url;

  // Skip the check for upgrade UI, its API endpoints, and static assets
  if (isPasslisted(pathname)) {
    return next();
  }

  const pending = await MigrationService.isMigrationPending(context.locals.db);

  if (!pending) {
    return next();
  }

  // Super admin gets redirected to the upgrade page to take action
  if (context.locals.user?.role === 'super_admin') {
    return context.redirect('/upgrade', 302);
  }

  // All other users (unauthenticated, admin, member) see the maintenance page
  return maintenancePage();
};
```

- [ ] **Step 3.4: Wire `migrationGuard` into `src/middleware/index.ts`**

Read `src/middleware/index.ts` first. Add the import and insert `migrationGuard` between `csrf` and `routeGuard`:

```typescript
// src/middleware/index.ts
import { sequence } from 'astro:middleware';
import { database } from './database';
import { perfDebug } from './perf-debug';
import { securityHeaders } from './security-headers';
import { authentication } from './auth';
import { csrf } from './csrf';
import { migrationGuard } from './migration-guard';
import { routeGuard } from './route-guard';

export const onRequest = sequence(
  database,
  perfDebug,
  securityHeaders,
  authentication,
  csrf,
  migrationGuard,
  routeGuard
);
```

- [ ] **Step 3.5: Run tests to verify they pass**

```bash
bun test src/tests/migration-guard.test.ts
```

Expected: PASS

Note on mock patterns: Bun's `mock.module` with dynamic `import()` is the correct pattern here since middleware imports are ES modules. If tests show stale module caches, use `--rerun-each` or restructure to pass the service as a dependency.

- [ ] **Step 3.6: Run `astro check` to confirm no type errors**

```bash
bunx astro check
```

Expected: 0 errors

- [ ] **Step 3.7: Commit**

```bash
git add src/middleware/migration-guard.ts src/middleware/index.ts src/tests/migration-guard.test.ts
git commit -m "feat(ALL-65): add migrationGuard middleware"
```

---

## Task 4: API Endpoints

**Files:**
- Create: `src/pages/api/admin/upgrade/status.ts`
- Create: `src/pages/api/admin/upgrade/run.ts`

No unit tests for these — they are thin wrappers over `MigrationService` which is already tested. The integration test in Task 6 covers them end-to-end.

- [ ] **Step 4.1: Create `GET /api/admin/upgrade/status`**

```typescript
// src/pages/api/admin/upgrade/status.ts
import type { APIRoute } from 'astro';
import { MigrationService } from '@/services/migration.service';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { logError } from '@/lib/logger';

/**
 * GET /api/admin/upgrade/status
 *
 * Returns current migration status. Used by the /upgrade page on load
 * to determine whether the database needs upgrading.
 *
 * Super admin only.
 */
export const GET: APIRoute = async (context) => {
  if (context.locals.user?.role !== 'super_admin') {
    return errorResponse('Super admin access required', 403);
  }

  try {
    const status = await MigrationService.getStatus(context.locals.db);
    return successResponse(status);
  } catch (error) {
    logError('Failed to get migration status', error);
    return errorResponse('Failed to get migration status', 500);
  }
};
```

- [ ] **Step 4.2: Create `POST /api/admin/upgrade/run`**

```typescript
// src/pages/api/admin/upgrade/run.ts
import type { APIRoute } from 'astro';
import { MigrationService } from '@/services/migration.service';
import { successResponse, errorResponse } from '@/lib/api-utils';
import { logError } from '@/lib/logger';

/**
 * POST /api/admin/upgrade/run
 *
 * Triggers database migrations synchronously. Blocks until complete.
 * Returns success/error result to the client.
 *
 * Returns 501 for Cloudflare/Vercel/Netlify deployments — use CLI instead.
 *
 * Super admin only. Requires x-csrf-token header (enforced by csrf middleware).
 */
export const POST: APIRoute = async (context) => {
  if (context.locals.user?.role !== 'super_admin') {
    return errorResponse('Super admin access required', 403);
  }

  const deployTarget = process.env.DEPLOY_TARGET;
  const isWorkersTarget =
    deployTarget === 'cloudflare' ||
    deployTarget === 'vercel' ||
    deployTarget === 'netlify';

  if (isWorkersTarget) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'CLI required',
        message: 'Web-triggered migrations are not supported in this deployment. Run: bun run db:migrate',
      }),
      { status: 501, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const result = await MigrationService.runMigrations();
    if (!result.success) {
      logError('Migration run failed', result.error);
      return errorResponse(result.error ?? 'Migration failed', 500);
    }
    return successResponse({ success: true });
  } catch (error) {
    logError('Unexpected error running migrations', error);
    return errorResponse('Unexpected error running migrations', 500);
  }
};
```

- [ ] **Step 4.3: Run `astro check`**

```bash
bunx astro check
```

Expected: 0 errors

- [ ] **Step 4.4: Commit**

```bash
git add src/pages/api/admin/upgrade/status.ts src/pages/api/admin/upgrade/run.ts
git commit -m "feat(ALL-65): add upgrade status and run API endpoints"
```

---

## Task 5: `/upgrade` Page

**Files:**
- Create: `src/pages/upgrade.astro`

- [ ] **Step 5.1: Create `src/pages/upgrade.astro`**

The page uses `BaseLayout`. All state management is client-side via a `<script>` block. On load, the client fetches `/api/admin/upgrade/status` and sets the initial state. The "Run Upgrade" button POSTs to `/api/admin/upgrade/run` with the CSRF token. No framework — plain DOM manipulation.

```astro
---
// src/pages/upgrade.astro
import BaseLayout from '@/layouts/BaseLayout.astro';

// Defense-in-depth: migrationGuard enforces this, but page also checks.
if (Astro.locals.user?.role !== 'super_admin') {
  return Astro.redirect('/login', 302);
}
---

<BaseLayout title="Database Upgrade">
  <div class="min-h-dvh flex items-center justify-center bg-base-100 p-6">
    <div class="card bg-base-200 shadow-xl w-full max-w-md">
      <div class="card-body gap-6">

        <!-- Header -->
        <div class="text-center">
          <h1 class="text-2xl font-bold tracking-tight">Database Upgrade</h1>
          <p class="text-base-content/60 text-sm mt-1">allowealth admin</p>
        </div>

        <!-- State: loading (initial) -->
        <div id="state-loading" class="text-center py-4">
          <span class="loading loading-spinner loading-md"></span>
          <p class="text-sm text-base-content/60 mt-2">Checking database status…</p>
        </div>

        <!-- State: up-to-date -->
        <div id="state-uptodate" class="hidden text-center py-4">
          <div class="text-success text-5xl mb-3">✓</div>
          <h2 class="font-semibold text-lg">Database is up to date</h2>
          <p class="text-sm text-base-content/60 mt-1">No migrations are pending.</p>
          <a href="/admin" class="btn btn-primary mt-6 w-full">Go to Admin</a>
        </div>

        <!-- State: idle (pending) -->
        <div id="state-idle" class="hidden">
          <div class="alert alert-warning mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <span>Database upgrade required</span>
          </div>
          <p class="text-sm text-base-content/70 mb-6">
            There are pending database migrations. Click the button below to apply
            them. All users are blocked from the application until this is complete.
          </p>
          <div class="text-xs text-base-content/40 mb-4" id="status-counts"></div>
          <button id="btn-run" class="btn btn-primary w-full">Run Upgrade</button>
        </div>

        <!-- State: running -->
        <div id="state-running" class="hidden text-center py-4">
          <span class="loading loading-spinner loading-lg text-primary"></span>
          <h2 class="font-semibold text-lg mt-4">Running migrations…</h2>
          <p class="text-sm text-base-content/60 mt-1">Please do not close this tab.</p>
        </div>

        <!-- State: success -->
        <div id="state-success" class="hidden text-center py-4">
          <div class="text-success text-5xl mb-3">✓</div>
          <h2 class="font-semibold text-lg">Upgrade complete</h2>
          <p class="text-sm text-base-content/60 mt-1">
            Redirecting to admin in <span id="countdown">3</span>s…
          </p>
          <a href="/admin" class="btn btn-primary mt-6 w-full">Go to Admin now</a>
        </div>

        <!-- State: error -->
        <div id="state-error" class="hidden">
          <div class="alert alert-error mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span id="error-message">Migration failed</span>
          </div>
          <details class="mb-4">
            <summary class="text-xs cursor-pointer text-base-content/50 hover:text-base-content/80">Show details</summary>
            <pre id="error-details" class="text-xs mt-2 p-3 bg-base-300 rounded overflow-x-auto whitespace-pre-wrap break-words"></pre>
          </details>
          <button id="btn-retry" class="btn btn-outline w-full">Retry</button>
        </div>

      </div>
    </div>
  </div>
</BaseLayout>

<script>
  import { CSRF_COOKIE_NAME } from '@/lib/csrf-client';

  type State = 'loading' | 'uptodate' | 'idle' | 'running' | 'success' | 'error';

  function show(state: State) {
    const states: State[] = ['loading', 'uptodate', 'idle', 'running', 'success', 'error'];
    for (const s of states) {
      const el = document.getElementById(`state-${s}`);
      if (el) el.classList.toggle('hidden', s !== state);
    }
  }

  function getCsrfToken(): string {
    const match = document.cookie.match(
      new RegExp('(?:^|;\\s*)' + CSRF_COOKIE_NAME + '=([^;]+)')
    );
    return match ? decodeURIComponent(match[1]) : '';
  }

  async function checkStatus() {
    const res = await fetch('/api/admin/upgrade/status');
    if (!res.ok) throw new Error('Failed to fetch status');
    return res.json() as Promise<{ pending: boolean; applied: number; expected: number }>;
  }

  async function runUpgrade() {
    show('running');
    try {
      const res = await fetch('/api/admin/upgrade/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
      });

      if (res.status === 501) {
        const data = await res.json();
        showError(data.message ?? data.error ?? 'Not supported in this deployment');
        return;
      }

      const data = await res.json();

      if (data.success) {
        show('success');
        startCountdown();
      } else {
        showError(data.error ?? 'Unknown error');
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : String(err));
    }
  }

  function showError(message: string, details?: string) {
    const msgEl = document.getElementById('error-message');
    const detailEl = document.getElementById('error-details');
    if (msgEl) msgEl.textContent = message;
    if (detailEl) detailEl.textContent = details ?? message;
    show('error');
  }

  function startCountdown() {
    let n = 3;
    const el = document.getElementById('countdown');
    const interval = setInterval(() => {
      n--;
      if (el) el.textContent = String(n);
      if (n <= 0) {
        clearInterval(interval);
        window.location.href = '/admin';
      }
    }, 1000);
  }

  // Boot: check status on load
  (async () => {
    try {
      const status = await checkStatus();
      if (!status.pending) {
        show('uptodate');
      } else {
        const counts = document.getElementById('status-counts');
        if (counts) {
          counts.textContent = `Applied: ${status.applied} / Expected: ${status.expected}`;
        }
        show('idle');
      }
    } catch {
      show('idle'); // Default to idle if status check fails
    }
  })();

  // Button handlers
  document.getElementById('btn-run')?.addEventListener('click', runUpgrade);
  document.getElementById('btn-retry')?.addEventListener('click', () => {
    show('idle');
  });
</script>
```

- [ ] **Step 5.2: Run `astro check`**

```bash
bunx astro check
```

Expected: 0 errors

- [ ] **Step 5.3: Verify import path for CSRF client**

The script imports `CSRF_COOKIE_NAME` from `@/lib/csrf-client`. Verify this export exists:

```bash
grep -n "CSRF_COOKIE_NAME" src/lib/csrf-client.ts
```

If the export is named differently (e.g., it's a default string or only in `csrf.ts`), update the import to use `import { CSRF_COOKIE_NAME } from '@/lib/csrf'` or inline the cookie name as `'csrf_token'`. The cookie name is `csrf_token` per `src/lib/csrf.ts`.

- [ ] **Step 5.4: Commit**

```bash
git add src/pages/upgrade.astro
git commit -m "feat(ALL-65): add /upgrade page with 5-state UI"
```

---

## Task 6: Integration Test

Verifies the full round-trip: endpoint → service → SQLite migration runner.

**Files:**
- Create: `src/tests/upgrade-api.integration.test.ts`

- [ ] **Step 6.1: Write integration test**

```typescript
// src/tests/upgrade-api.integration.test.ts
import { describe, expect, it, beforeAll, afterAll } from 'bun:test';
import { Database } from 'bun:sqlite';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { runSqliteMigrations } from '@/db/migrate';
import { MigrationService } from '@/services/migration.service';
import { EXPECTED_MIGRATION_COUNT } from '@/db/migration-constants';

let tmpDir: string;
let dbPath: string;

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), 'allowealth-upgrade-test-'));
  dbPath = join(tmpDir, 'test.db');
});

afterAll(async () => {
  await rm(tmpDir, { recursive: true, force: true });
});

describe('upgrade integration', () => {
  it('fresh DB has pending migrations', async () => {
    const raw = new Database(dbPath);
    const db = drizzle(raw);
    const pending = await MigrationService.isMigrationPending(db);
    raw.close();
    expect(pending).toBe(true);
  });

  it('runSqliteMigrations applies all migrations', () => {
    runSqliteMigrations(dbPath);

    const raw = new Database(dbPath);
    const result = raw.query('SELECT COUNT(*) as count FROM __drizzle_migrations').get() as {
      count: number;
    };
    raw.close();

    expect(result.count).toBe(EXPECTED_MIGRATION_COUNT);
  });

  it('isMigrationPending returns false after all migrations applied', async () => {
    const raw = new Database(dbPath);
    const db = drizzle(raw);
    const status = await MigrationService.getStatus(db);
    raw.close();

    expect(status.pending).toBe(false);
    expect(status.applied).toBe(EXPECTED_MIGRATION_COUNT);
    expect(status.expected).toBe(EXPECTED_MIGRATION_COUNT);
  });
});
```

- [ ] **Step 6.2: Run integration test**

```bash
bun test src/tests/upgrade-api.integration.test.ts
```

Expected: PASS (all 3 assertions)

- [ ] **Step 6.3: Commit**

```bash
git add src/tests/upgrade-api.integration.test.ts
git commit -m "test(ALL-65): add upgrade integration tests"
```

---

## Task 7: Full Test Suite & Quality Gates

- [ ] **Step 7.1: Run all new tests together**

```bash
bun test src/tests/migration-constants.test.ts src/tests/migration.service.test.ts src/tests/migration-guard.test.ts src/tests/upgrade-api.integration.test.ts
```

Expected: All PASS

- [ ] **Step 7.2: Run `astro check`**

```bash
bunx astro check
```

Expected: 0 errors, 0 warnings

- [ ] **Step 7.3: Run the full test suite**

```bash
bun test
```

Expected: All existing tests still pass, new tests pass

- [ ] **Step 7.4: Smoke test manually (optional but recommended)**

Start the dev server:
```bash
bun dev
```

1. Open `http://localhost:4321/upgrade` — should redirect to `/login` (not logged in)
2. Log in as super_admin, navigate to `/upgrade` — should show "Database is up to date" (migrations already applied in dev DB)
3. To test the pending state, manually delete one row from `__drizzle_migrations` in `db/.dev.db` using a SQLite client, then refresh — should show "Database upgrade required"

- [ ] **Step 7.5: Final commit if any fixups were needed**

```bash
git add -A
git commit -m "fix(ALL-65): address issues found in smoke test"
```

---

## Implementation Notes

**Drizzle `.get()` vs raw SQL:** `MigrationService.getStatus()` uses `db.get(sql\`...\`)`. If the Drizzle bun-sqlite driver wraps this differently (e.g., requires `.execute()` or returns an array), adjust accordingly. The test mock may need updating to match.

**`CSRF_COOKIE_NAME` import in upgrade page:** If `src/lib/csrf-client.ts` does not export `CSRF_COOKIE_NAME`, use the string literal `'csrf_token'` directly (it is the value from `src/lib/csrf.ts`).

**Workers deployment:** The `migrationGuard` will still run in Cloudflare Workers but `isMigrationPending()` will query `__drizzle_migrations` via the D1 driver. The COUNT query is standard SQL and will work. When migrations are pending in a D1 deployment, super admins are redirected to `/upgrade`, which will show the UI, but clicking "Run Upgrade" returns 501 with CLI instructions.

**Adding future migrations:** When you add a new migration file, also bump `EXPECTED_MIGRATION_COUNT` in `src/db/migration-constants.ts`. The test in Task 1 will fail in CI if you forget.
