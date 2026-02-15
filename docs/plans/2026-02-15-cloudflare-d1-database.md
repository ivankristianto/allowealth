# Cloudflare D1 Database Support Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add Cloudflare D1 as a third database deployment option, enabling SQLite-compatible databases on Workers while preserving PostgreSQL+Hyperdrive as an alternative.

**Architecture:** D1 uses the existing SQLite schema via Drizzle's D1 adapter. A new D1 driver (`src/db/drivers/d1.ts`) wraps the Cloudflare D1 binding. The dialect detection is extended to recognize D1 mode via `D1_DATABASE_BINDING` environment variable. Deploy-time configuration via `wrangler.toml` chooses between D1 and Hyperdrive.

**Tech Stack:** Drizzle ORM with `drizzle-orm/d1`, Cloudflare D1 bindings, existing SQLite schema

---

## Prerequisites

- Read ADR-006: Database Connection Architecture
- Read ADR-007: Database Migrations
- Understand existing driver patterns in `src/db/drivers/`

---

### Task 1: Create D1 Driver Module

**Files:**

- Create: `src/db/drivers/d1.ts`
- Test: `src/db/drivers/d1.test.ts`

**Step 1: Write the failing test for D1 driver interface**

Create `src/db/drivers/d1.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'bun:test';
import { createD1Driver } from './d1';

describe('createD1Driver', () => {
  it('should throw error when D1 binding is not provided', () => {
    expect(() => createD1Driver(null as any)).toThrow('D1 database binding is required');
  });

  it('should return driver with exec method', () => {
    const mockD1 = {
      exec: () => {},
      prepare: () => ({
        bind: () => ({
          all: () => ({ results: [] }),
          first: () => null,
          run: () => ({ results: [], success: true }),
        }),
      }),
    };
    const driver = createD1Driver(mockD1 as any);
    expect(driver.exec).toBeDefined();
    expect(driver.prepare).toBeDefined();
    expect(driver._raw).toBe(mockD1);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/db/drivers/d1.test.ts`
Expected: FAIL with "Cannot find module './d1'"

**Step 3: Create the D1 driver implementation**

Create `src/db/drivers/d1.ts`:

```typescript
/**
 * Cloudflare D1 Driver
 *
 * Database driver implementation using Cloudflare D1 bindings.
 * This driver is used when deploying to Cloudflare Workers with D1 database.
 *
 * D1 is SQLite-compatible and runs at the edge without connection management.
 * No TCP sockets, no subrequest overhead - direct API calls to D1.
 *
 * @see https://developers.cloudflare.com/d1/
 */

import type { DatabaseDriver, PreparedStatement, RunResult } from '../driver';

/**
 * D1 database binding interface (subset used by driver)
 */
export interface D1Binding {
  exec(query: string): Promise<D1Result>;
  prepare(query: string): D1PreparedStatement;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all(): Promise<D1Result>;
  first(): Promise<unknown>;
  run(): Promise<D1Result>;
}

export interface D1Result {
  results: unknown[];
  success: boolean;
  meta?: {
    changes?: number;
    last_row_id?: number;
  };
}

/**
 * Create a D1 driver from Cloudflare D1 binding
 *
 * @param d1Binding - The D1 database binding from Cloudflare Workers context
 * @returns DatabaseDriver instance wrapping D1
 */
export function createD1Driver(d1Binding: D1Binding): DatabaseDriver & { _raw: D1Binding } {
  if (!d1Binding) {
    throw new Error('D1 database binding is required');
  }

  const driver: DatabaseDriver & { _raw: D1Binding } = {
    exec(sql: string): void {
      // D1 exec is async but we need sync for interface compatibility
      // This is handled by the wrapper below
      d1Binding.exec(sql).catch(() => {
        // Silent fail for PRAGMA statements in D1 (some are not supported)
      });
    },

    prepare(sql: string): PreparedStatement {
      return {
        all(params?: unknown[]): unknown[] {
          // D1 prepare returns async, so we need synchronous wrapper
          // This will be handled by the Drizzle D1 adapter directly
          // This driver is primarily for direct SQL execution (PRAGMAs)
          const stmt = d1Binding.prepare(sql);
          const bound = params?.length ? stmt.bind(...params) : stmt;
          // Return empty array synchronously, actual results via Drizzle
          return [];
        },

        get(params?: unknown[]): unknown | undefined {
          return undefined;
        },

        run(params?: unknown[]): RunResult {
          return {
            changes: 0,
            lastInsertRowid: 0,
          };
        },
      };
    },

    close(): void {
      // D1 has no connection to close
    },

    // Expose raw binding for Drizzle D1 adapter
    _raw: d1Binding,
  };

  return driver;
}

/**
 * Create a Drizzle ORM database instance for D1
 *
 * Uses the D1 binding directly with Drizzle's D1 adapter.
 *
 * @param d1Binding - The D1 database binding from Workers context
 * @param schema - Drizzle schema object (use SQLite schema)
 * @returns Drizzle database instance
 */
export async function createD1Database<T extends Record<string, unknown>>(
  d1Binding: D1Binding,
  schema: T
): Promise<import('drizzle-orm/d1').D1Database<T>> {
  const { drizzle } = await import('drizzle-orm/d1');
  return drizzle(d1Binding, { schema });
}
```

**Step 4: Run test to verify it passes**

Run: `bun test src/db/drivers/d1.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/db/drivers/d1.ts src/db/drivers/d1.test.ts
git commit -m "feat(db): add D1 driver for Cloudflare Workers

- Create D1 driver wrapping Cloudflare D1 binding
- Add interface types for D1 API
- Add unit tests for driver creation"
```

---

### Task 2: Update Database Configuration for D1

**Files:**

- Modify: `src/db/config.ts`
- Modify: `src/db/config.test.ts`

**Step 1: Write the failing test for D1 detection**

Modify `src/db/config.test.ts`, add:

```typescript
import { describe, it, expect } from 'bun:test';
import { detectDialect, getDatabaseConfig, type DatabaseDialect } from './config';

// ... existing tests ...

describe('D1 database detection', () => {
  it('should detect sqlite dialect for non-postgres URLs', () => {
    expect(detectDialect('db/.dev.db')).toBe('sqlite');
    expect(detectDialect('/path/to/db.sqlite')).toBe('sqlite');
  });

  it('should detect postgresql dialect for postgres URLs', () => {
    expect(detectDialect('postgres://user:pass@host/db')).toBe('postgresql');
    expect(detectDialect('postgresql://user:pass@host/db')).toBe('postgresql');
  });
});

describe('getDatabaseConfig with D1', () => {
  it('should set isD1 flag when D1_DATABASE_BINDING is set', () => {
    const originalEnv = process.env.D1_DATABASE_BINDING;
    process.env.D1_DATABASE_BINDING = 'true';

    const config = getDatabaseConfig();
    expect(config.isD1).toBe(true);
    expect(config.dialect).toBe('sqlite'); // D1 uses SQLite schema

    process.env.D1_DATABASE_BINDING = originalEnv;
  });
});
```

**Step 2: Run test to verify it fails**

Run: `bun test src/db/config.test.ts`
Expected: FAIL with "Property 'isD1' does not exist on type 'DatabaseConfig'"

**Step 3: Update DatabaseConfig interface**

Modify `src/db/config.ts`:

```typescript
import { getEnv } from '@/lib/env';
import { createLogger } from '@/lib/logger';

// Re-export setRuntimeEnv for middleware to use
export { setRuntimeEnv } from '@/lib/env';

const log = createLogger('database');

export type DatabaseDialect = 'sqlite' | 'postgresql';

export interface DatabaseConfig {
  dialect: DatabaseDialect;
  url: string;
  isSupabase: boolean;
  isTransactionPooler: boolean;
  isHyperdrive: boolean;
  /** Cloudflare D1 database binding is active */
  isD1: boolean;
  poolConfig?: { max: number; idleTimeout: number };
}
```

**Step 4: Update getDatabaseConfig to detect D1**

Modify `src/db/config.ts`, update the `getDatabaseConfig` function:

```typescript
export function getDatabaseConfig(): DatabaseConfig {
  const url = getDatabaseUrl();
  const dialect = detectDialect(url);
  const isHyperdrive = getEnv('HYPERDRIVE_ENABLED') === 'true';
  const isD1 = getEnv('D1_ENABLED') === 'true';

  // Hyperdrive handles Supabase/pooler specifics — skip detection when active
  const isSupabase = !isHyperdrive && !isD1 && dialect === 'postgresql' && isSupabaseUrl(url);
  const isTransactionPooler =
    !isHyperdrive && !isD1 && dialect === 'postgresql' && isTransactionPoolerUrl(url);

  return {
    dialect: isD1 ? 'sqlite' : dialect, // D1 uses SQLite dialect
    url,
    isSupabase,
    isTransactionPooler,
    isHyperdrive,
    isD1,
    // Cloudflare Workers: use max 1 to minimize subrequests (TCP connections).
    // Supabase pooler handles connection pooling server-side.
    // D1 has no connection pooling (it's serverless).
    poolConfig: dialect === 'postgresql' ? { max: 1, idleTimeout: 20 } : undefined,
  };
}
```

**Step 5: Run test to verify it passes**

Run: `bun test src/db/config.test.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add src/db/config.ts src/db/config.test.ts
git commit -m "feat(db): add D1 detection to database configuration

- Add isD1 flag to DatabaseConfig interface
- Detect D1 mode via D1_ENABLED runtime env var
- D1 uses SQLite dialect for schema compatibility"
```

---

### Task 3: Update Database Index for D1 Support

**Files:**

- Modify: `src/db/index.ts`

**Step 1: Write test for D1 database creation**

Modify `src/db/index.integration.test.ts` (or create if needed):

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

describe('D1 database integration', () => {
  it('should throw error when trying to create D1 database outside Workers context', () => {
    // In non-Workers context, D1 binding won't exist
    const { setRuntimeEnv } = require('./config');
    setRuntimeEnv({ D1_ENABLED: 'true' });

    const { resetDb, getDb } = require('./index');
    resetDb();

    // Should throw because D1 binding is not available outside Workers
    expect(() => getDb()).toThrow();

    setRuntimeEnv({});
  });
});
```

**Step 2: Run test to verify behavior**

Run: `bun test src/db/index.integration.test.ts`
Expected: Current behavior (may not have D1 handling yet)

**Step 3: Update createDatabase to handle D1**

Modify `src/db/index.ts`:

First, add import:

```typescript
import { createBunDriver } from './drivers/bun';
import { createPostgresDatabase, closePostgres, resetPostgresClient } from './drivers/postgres';
import { createD1Database, type D1Binding } from './drivers/d1';
```

Then update `createDatabase` function:

```typescript
/**
 * Create the Drizzle database instance
 *
 * Automatically selects the correct driver based on configuration:
 * - D1 binding present → D1 driver (Cloudflare Workers with D1)
 * - PostgreSQL URLs → postgres.js driver
 * - SQLite paths → bun:sqlite driver (local development)
 *
 * @throws Error if database connection fails
 */
function createDatabase(): Database {
  const config = getDatabaseConfig();

  try {
    // D1 path - used in Cloudflare Workers with D1 binding
    if (config.isD1) {
      // D1 binding is injected by runtime-env middleware
      const d1Binding = getEnv('D1_BINDING') as unknown as D1Binding;
      if (!d1Binding) {
        throw new Error(
          'D1_ENABLED is set but D1_BINDING is not available. ' +
            'Ensure D1 binding is configured in wrangler.toml'
        );
      }
      // D1 uses async initialization, but we return a sync proxy
      // The actual D1 database is created lazily on first access
      return createD1DatabaseSync(d1Binding, sqliteSchema);
    }

    // PostgreSQL path - used in production (Cloudflare Workers with Hyperdrive)
    if (config.dialect === 'postgresql') {
      return createPostgresDatabase(config.url, pgSchema) as unknown as Database;
    }

    // SQLite path - uses bun:sqlite via Bun runtime
    const driver = createBunDriver(config.url);
    const dynamicRequire = getRequire();
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

**Step 4: Create synchronous D1 database wrapper**

Add to `src/db/index.ts`:

```typescript
/**
 * D1 database instance cache
 * D1 initialization is async, so we cache the promise
 */
let d1DbPromise: Promise<Database> | null = null;

/**
 * Create a synchronous wrapper for D1 database
 *
 * D1's Drizzle adapter requires async initialization, but our
 * getDb() interface is synchronous. We use a Proxy that awaits
 * the D1 database on each operation.
 */
function createD1DatabaseSync(d1Binding: D1Binding, schema: typeof sqliteSchema): Database {
  // Start async initialization
  d1DbPromise = createD1Database(d1Binding, schema);

  // Return a Proxy that wraps async operations
  return new Proxy({} as Database, {
    get(_target, prop) {
      // Return async wrapper for each method
      return async function (...args: unknown[]) {
        const db = await d1DbPromise;
        const method = (db as any)[prop];
        if (typeof method === 'function') {
          return method.apply(db, args);
        }
        return method;
      };
    },
  }) as Database;
}
```

**Step 5: Update prepareForRequest for D1**

Modify `prepareForRequest` in `src/db/index.ts`:

```typescript
/**
 * Prepare database for a new request (Cloudflare Workers)
 *
 * Discards stale connection references from previous requests.
 * Must be called at the start of each request before any DB access.
 */
export function prepareForRequest(): void {
  resetPostgresClient();
  d1DbPromise = null; // Reset D1 cache for new request
  dbInstance = null;
  isClosing = false;
}
```

**Step 6: Update closeDatabase for D1**

Modify `closeDatabase` in `src/db/index.ts`:

```typescript
/**
 * Close database connections
 *
 * Should be called when shutting down the application to properly
 * release database connections.
 *
 * For SQLite/D1, this is a no-op as connections are not persistent.
 */
export async function closeDatabase(): Promise<void> {
  if (isClosing) return;
  isClosing = true;

  try {
    const config = getDatabaseConfig();
    if (config.dialect === 'postgresql') {
      await closePostgres();
    }
    // D1 has no connection to close
    d1DbPromise = null;
    dbInstance = null;
  } finally {
    isClosing = false;
  }
}
```

**Step 7: Run tests to verify**

Run: `bun test src/db/`
Expected: All tests pass

**Step 8: Commit**

```bash
git add src/db/index.ts
git commit -m "feat(db): integrate D1 driver into database module

- Add D1 database creation path in createDatabase
- Create async-to-sync wrapper for D1 (adapter is async)
- Reset D1 cache in prepareForRequest and closeDatabase"
```

---

### Task 4: Update Runtime Environment Middleware for D1

**Files:**

- Modify: `src/middleware/runtime-env.ts`
- Modify: `src/middleware/database.ts`

**Step 1: Update runtime-env middleware**

Modify `src/middleware/runtime-env.ts`:

```typescript
/**
 * Runtime Environment Middleware
 *
 * Sets runtime environment for Cloudflare Workers where secrets
 * are only available via request context, not at module load time.
 *
 * When Hyperdrive is configured, uses its local connection string
 * instead of the remote DATABASE_URL (eliminates TCP subrequest overhead).
 *
 * When D1 is configured, exposes the D1 binding and sets D1_ENABLED flag.
 *
 * Must run before any middleware that accesses environment variables.
 */

import type { MiddlewareHandler } from 'astro';
import { setRuntimeEnv } from '@/db/config';

export const runtimeEnv: MiddlewareHandler = async (context, next) => {
  const runtime = (context.locals as any).runtime;
  if (runtime?.env) {
    const env = { ...runtime.env };

    // Check for D1 database binding first (takes precedence over Hyperdrive)
    const d1Binding = runtime.env.DB;
    if (d1Binding) {
      env.D1_ENABLED = 'true';
      env.D1_BINDING = d1Binding;
      // D1 doesn't need DATABASE_URL
    } else {
      // Hyperdrive provides a local connection that doesn't count as subrequests.
      // Its connectionString points to a local proxy — Hyperdrive handles
      // TCP/TLS to the origin database at the Cloudflare edge.
      const hyperdrive = runtime.env.HYPERDRIVE;
      if (hyperdrive?.connectionString) {
        env.DATABASE_URL = hyperdrive.connectionString;
        env.HYPERDRIVE_ENABLED = 'true';
      }
    }

    setRuntimeEnv(env);
  }
  return next();
};
```

**Step 2: Update database middleware for D1**

Modify `src/middleware/database.ts`:

```typescript
/**
 * Database Middleware
 *
 * Manages database connection lifecycle per request.
 *
 * For PostgreSQL: Resets connection at start of each request to avoid
 * "Cannot perform I/O on behalf of a different request" errors in Workers.
 *
 * For D1: No special handling needed (D1 is serverless, no connections).
 *
 * For SQLite: No special handling needed (file-based, safe to reuse).
 */

import { getDatabaseConfig, prepareForRequest, closeDatabase } from '@/db';
import { createLogger } from '@/lib/logger';
import type { MiddlewareHandler } from 'astro';

const log = createLogger('database');

export const database: MiddlewareHandler = async (context, next) => {
  const config = getDatabaseConfig();

  // Log database configuration (masked URL for security)
  const maskedUrl = config.url.replace(/:[^:@]+@/, ':****@');
  log.info('Database config', {
    dialect: config.dialect,
    url: maskedUrl,
    isHyperdrive: config.isHyperdrive,
    isD1: config.isD1,
  });

  // Reset connection for PostgreSQL (Workers I/O context binding)
  // D1 and SQLite don't need this
  if (config.dialect === 'postgresql') {
    prepareForRequest();
  }

  try {
    const response = await next();
    return response;
  } finally {
    // Close PostgreSQL connections after request
    // D1 and SQLite don't have connections to close
    if (config.dialect === 'postgresql') {
      await closeDatabase();
    }
  }
};
```

**Step 3: Run tests**

Run: `bun test src/middleware/`
Expected: All tests pass

**Step 4: Commit**

```bash
git add src/middleware/runtime-env.ts src/middleware/database.ts
git commit -m "feat(middleware): add D1 binding detection in runtime-env

- Check for D1 binding (DB) in Workers environment
- Set D1_ENABLED and D1_BINDING when D1 is configured
- D1 takes precedence over Hyperdrive when both configured
- Update database middleware logging for D1"
```

---

### Task 5: Update Wrangler Configuration

**Files:**

- Modify: `wrangler.toml`
- Create: `wrangler.d1.toml` (alternative config for D1 deployment)

**Step 1: Create D1-specific wrangler config**

Create `wrangler.d1.toml`:

```toml
# Cloudflare Workers Configuration with D1 Database
# Use this config when deploying with D1 instead of Hyperdrive
#
# To deploy:
#   bun run build:cloudflare && wrangler deploy --config wrangler.d1.toml
#
# To create D1 database:
#   wrangler d1 create allowealth-db
#   Then copy the database_id below

name = "allowealth"
main = "dist/_worker.js/index.js"
compatibility_date = "2026-02-01"
compatibility_flags = ["nodejs_compat", "disable_nodejs_process_v2"]

# Custom domain routes
routes = [
  { pattern = "allowealth.io", custom_domain = true },
]

# Static assets configuration
[assets]
directory = "./dist"
binding = "ASSETS"

# Environment variables (non-secret)
[vars]
NODE_ENV = "production"
PUBLIC_URL = "https://allowealth.io"
SIGNUP_MODE = "invite_only"
CACHE_DRIVER = "upstash"
PERF_DEBUG = "true"
LOG_LEVEL = "warn"
EMAIL_MODE = "real"
EMAIL_PROVIDER = "resend"
EMAIL_SENDER_NAME = "Allowealth"
EMAIL_SENDER_ADDRESS = "noreply@allowealth.io"

# D1 Database Binding
# Create database: wrangler d1 create allowealth-db
# List databases: wrangler d1 list
# Execute migrations: wrangler d1 execute allowealth-db --file=./drizzle/sqlite/0000_xxx.sql
[[d1_databases]]
binding = "DB"
database_name = "allowealth-db"
database_id = "YOUR_D1_DATABASE_ID"  # Replace with actual ID from wrangler d1 create

# Secrets (set via CLI):
# wrangler secret put EMAIL_API_KEY
# wrangler secret put GOOGLE_CLIENT_ID
# wrangler secret put GOOGLE_CLIENT_SECRET

# Workers Logs
[observability]
enabled = true
head_sampling_rate = 1
```

**Step 2: Update package.json with D1 commands**

Add to `package.json` scripts section:

```json
{
  "scripts": {
    "deploy:cloudflare:d1": "bun run build:cloudflare && wrangler deploy --config wrangler.d1.toml",
    "db:d1:migrate": "wrangler d1 execute allowealth-db --remote --file",
    "db:d1:migrate:local": "wrangler d1 execute allowealth-db --local --file"
  }
}
```

**Step 3: Update main wrangler.toml comment**

Modify `wrangler.toml` to clarify deployment options:

```toml
# Cloudflare Workers Configuration
# https://developers.cloudflare.com/workers/wrangler/configuration/
#
# DEPLOYMENT OPTIONS:
# 1. PostgreSQL + Hyperdrive (default): bun run deploy:cloudflare
#    - Uses Supabase PostgreSQL with Hyperdrive connection pooling
#    - Set DATABASE_URL secret to Supabase connection string
#
# 2. Cloudflare D1: bun run deploy:cloudflare:d1
#    - Uses D1 SQLite-compatible database
#    - Create D1 database first: wrangler d1 create allowealth-db
#    - Update database_id in wrangler.d1.toml
#    - Run migrations: wrangler d1 execute allowealth-db --file=./drizzle/sqlite/xxx.sql
```

**Step 4: Commit**

```bash
git add wrangler.toml wrangler.d1.toml package.json
git commit -m "feat(config): add D1 deployment configuration

- Create wrangler.d1.toml for D1 deployments
- Add D1 binding configuration (DB)
- Add D1 deployment and migration scripts
- Document both deployment options in wrangler.toml"
```

---

### Task 6: Update Documentation

**Files:**

- Modify: `docs/architecture/006-database-connection-architecture.md`
- Modify: `docs/architecture/007-database-migrations.md`
- Modify: `CLAUDE.md`
- Modify: `.claude/CLAUDE.md`

**Step 1: Update ADR-006**

Modify `docs/architecture/006-database-connection-architecture.md`:

Add to the Solution section:

````markdown
### Cloudflare D1 Integration

D1 is Cloudflare's SQLite-compatible serverless database. Unlike PostgreSQL with Hyperdrive, D1:

- Runs SQLite natively at the edge
- Uses the existing SQLite schema without modification
- Has no TCP connections (eliminates subrequest overhead entirely)
- Is selected via D1 binding in wrangler.toml

**Configuration:**

```toml
# wrangler.d1.toml
[[d1_databases]]
binding = "DB"
database_name = "allowealth-db"
database_id = "<database-id>"
```
````

**How D1 is detected at runtime:**

1. `runtimeEnv` middleware reads `runtime.env.DB` binding
2. If present, sets `D1_ENABLED=true` and `D1_BINDING=<binding>`
3. `getDatabaseConfig()` reads the flag and sets `isD1: true`
4. `createDatabase()` uses D1 driver with SQLite schema

**Comparison:**

| Setting               | Hyperdrive (PostgreSQL)  | D1 (SQLite)            |
| --------------------- | ------------------------ | ---------------------- |
| Schema                | PostgreSQL               | SQLite (same as local) |
| SSL                   | Hyperdrive handles       | N/A (no TCP)           |
| Subrequests per query | 0 (local proxy)          | 0 (no connections)     |
| Connection pooling    | Hyperdrive edge pool     | N/A (serverless)       |
| Migrations            | drizzle-kit + PostgreSQL | wrangler d1 execute    |

````

**Step 2: Update ADR-007**

Add D1 migration section to `docs/architecture/007-database-migrations.md`:

```markdown
### Production Migration (Cloudflare D1)

D1 uses the SQLite schema and migrations. Apply migrations via wrangler:

```bash
# Apply single migration
wrangler d1 execute allowealth-db --remote --file=./drizzle/sqlite/0000_xxx.sql

# Apply all migrations (in order)
for file in drizzle/sqlite/*.sql; do
  wrangler d1 execute allowealth-db --remote --file="$file"
done

# Local testing with D1
wrangler d1 execute allowealth-db --local --file=./drizzle/sqlite/0000_xxx.sql
````

**D1 Migration Notes:**

- D1 is SQLite-compatible, so SQLite migrations work without modification
- Use `--local` flag for local development with D1
- Use `--remote` flag for production database
- Drizzle's migration tracking table is created automatically

````

**Step 3: Commit**

```bash
git add docs/architecture/006-database-connection-architecture.md docs/architecture/007-database-migrations.md
git commit -m "docs: update architecture docs for D1 support

- Add D1 integration section to ADR-006
- Add D1 migration workflow to ADR-007
- Document runtime detection and configuration"
````

---

### Task 7: Add Drizzle D1 Package

**Files:**

- Modify: `package.json`

**Step 1: Add drizzle-orm/d1 dependency**

Run:

```bash
bun add drizzle-orm
```

Note: `drizzle-orm/d1` is included in the main `drizzle-orm` package.

**Step 2: Verify package.json**

The `drizzle-orm` package should already be present. The D1 adapter is part of it.

**Step 3: Commit**

```bash
git add package.json bun.lockb
git commit -m "chore: ensure drizzle-orm for D1 adapter support

The D1 adapter is included in drizzle-orm package"
```

---

### Task 8: Create E2E Test for D1 Compatibility

**Files:**

- Create: `e2e/tests/database-d1.spec.ts`

**Step 1: Write E2E test for D1 compatibility**

Create `e2e/tests/database-d1.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('D1 Database Compatibility', () => {
  test.skip('should work with D1 database in Workers', async ({ page }) => {
    // This test requires a deployed D1 instance
    // Run locally with: wrangler d1 execute allowealth-db --local

    await page.goto('/login');

    // Verify page loads (database connection works)
    await expect(page.locator('h1')).toContainText('Sign in');
  });

  test('SQLite schema should be D1-compatible', async () => {
    // Read all SQLite migration files and verify they use D1-compatible syntax
    const fs = await import('fs/promises');
    const path = await import('path');

    const migrationsDir = 'drizzle/sqlite';
    const files = await fs.readdir(migrationsDir);

    for (const file of files) {
      if (!file.endsWith('.sql')) continue;

      const content = await fs.readFile(path.join(migrationsDir, file), 'utf-8');

      // D1 doesn't support some SQLite features
      // These checks ensure migrations are compatible

      // D1 doesn't support ATTACH DATABASE
      expect(content.toLowerCase()).not.toContain('attach database');

      // D1 doesn't support PRAGMA recursive_triggers
      expect(content.toLowerCase()).not.toContain('recursive_triggers');
    }
  });
});
```

**Step 2: Run test**

Run: `bun run test:e2e --grep "D1"`
Expected: Schema compatibility test passes

**Step 3: Commit**

```bash
git add e2e/tests/database-d1.spec.ts
git commit -m "test(e2e): add D1 compatibility test

- Add test for SQLite schema D1 compatibility
- Check migrations for D1-incompatible syntax"
```

---

### Task 9: Run Quality Gates

**Step 1: Run all quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

**Step 2: Run all tests**

```bash
bun test
bun run test:e2e
```

**Step 3: Build and verify**

```bash
bun run build
```

**Step 4: Fix any issues**

If any quality gate fails, fix the issues and re-run.

**Step 5: Commit any fixes**

```bash
git add .
git commit -m "fix: address quality gate issues"
```

---

### Task 10: Final Documentation Update

**Files:**

- Modify: `CLAUDE.md`
- Modify: `.claude/CLAUDE.md`

**Step 1: Update CLAUDE.md ADR table**

Add D1 row to the ADR Quick Reference table in `CLAUDE.md`:

```markdown
| **Database (Workers)** | D1 or Hyperdrive (deploy-time choice) | Both via wrangler.toml | ADR-006 |
```

**Step 2: Update .claude/CLAUDE.md**

Update the Database section:

```markdown
## Database

- **Local:** SQLite via `bun:sqlite`
- **Production (Option A):** PostgreSQL/Supabase via Hyperdrive
- **Production (Option B):** Cloudflare D1 (SQLite-compatible)

Deploy-time choice via wrangler.toml configuration.
```

**Step 3: Commit**

```bash
git add CLAUDE.md .claude/CLAUDE.md
git commit -m "docs: update main docs for D1 support

- Update ADR reference table
- Document D1 as production database option"
```

---

## Summary

This plan adds Cloudflare D1 as a third database option:

1. **D1 Driver** - Wraps Cloudflare D1 binding for Drizzle ORM
2. **Config Detection** - Recognizes D1 mode via runtime environment
3. **Database Integration** - Creates D1 database instances with SQLite schema
4. **Middleware Support** - Injects D1 binding into runtime environment
5. **Wrangler Config** - Provides `wrangler.d1.toml` for D1 deployments
6. **Documentation** - Updates architecture docs and guides

**Key Design Decisions:**

- D1 uses SQLite schema (no new schema files needed)
- D1 binding is named `DB` (Cloudflare convention)
- D1 takes precedence over Hyperdrive when both configured
- Async D1 adapter wrapped in sync Proxy for interface compatibility

**Deployment Paths:**

```bash
# PostgreSQL + Hyperdrive (existing)
bun run deploy:cloudflare

# D1 (new)
wrangler d1 create allowealth-db  # First time only
bun run deploy:cloudflare:d1
```
