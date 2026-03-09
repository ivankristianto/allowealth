# Remove PostgreSQL/Supabase/Hyperdrive Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove all PostgreSQL, Supabase, and Hyperdrive code; standardize on SQLite (local dev) and Cloudflare D1 (production).

**Architecture:** Delete the PostgreSQL driver, schema directory, and migration directory. Simplify `getDatabaseConfig()` to return SQLite or D1 config only. Remove dialect branching from services, middleware, CLI, and auth. Keep `--target` CLI system with `sqlite` and `d1` options.

**Tech Stack:** Drizzle ORM, bun:sqlite, Cloudflare D1, citty CLI

---

### Task 1: Delete PostgreSQL schema directory and migrations

**Files:**
- Delete: `src/db/schema/postgresql/` (entire directory)
- Delete: `drizzle/postgresql/` (entire directory)
- Delete: `src/db/drivers/postgres.ts`
- Delete: `src/db/drop-postgres.ts`

**Step 1: Delete the directories and files**

```bash
rm -rf src/db/schema/postgresql/
rm -rf drizzle/postgresql/
rm -f src/db/drivers/postgres.ts
rm -f src/db/drop-postgres.ts
```

**Step 2: Update schema index**

Modify `src/db/schema/index.ts` — remove PostgreSQL references from comments:

```typescript
/**
 * Schema exports
 *
 * Exports SQLite schema for type inference and runtime use.
 * Both SQLite (local dev) and D1 (production) use the same schema.
 */

export * from './sqlite';
```

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: delete PostgreSQL driver, schema directory, and migrations"
```

---

### Task 2: Simplify database config

**Files:**
- Modify: `src/db/config.ts`

**Step 1: Rewrite config.ts**

Remove `detectDialect()`, `isSupabaseUrl()`, `isTransactionPoolerUrl()`, Hyperdrive logic. Simplify `DatabaseDialect` and `DatabaseConfig`.

```typescript
import { getEnv } from '@/lib/env';
import { createLogger } from '@/lib/logger';

// Re-export setRuntimeEnv for middleware to use
export { setRuntimeEnv } from '@/lib/env';

const log = createLogger('database');

export type DatabaseDialect = 'sqlite';

export interface DatabaseConfig {
  dialect: DatabaseDialect;
  url: string;
  isD1: boolean;
}

/**
 * Get the DATABASE_URL from available sources
 *
 * Priority:
 * 1. Runtime env (Cloudflare Workers secrets)
 * 2. import.meta.env (build-time env vars)
 * 3. Fallback to SQLite dev database
 */
function getDatabaseUrl(): string {
  const url = getEnv('DATABASE_URL');

  if (url) {
    return url;
  }

  // Log warning if we're falling back to SQLite in a non-dev environment
  if (import.meta.env.PROD) {
    log.warn(
      'DATABASE_URL not found in runtime env or import.meta.env. ' +
        'Falling back to SQLite which will fail in Cloudflare Workers. ' +
        'Ensure DATABASE_URL secret is set via: wrangler secret put DATABASE_URL'
    );
  }

  return 'db/.dev.db';
}

export function getDatabaseConfig(): DatabaseConfig {
  const isD1 = getEnv('D1_ENABLED') === 'true';

  if (isD1) {
    return {
      dialect: 'sqlite',
      url: '',
      isD1,
    };
  }

  return {
    dialect: 'sqlite',
    url: getDatabaseUrl(),
    isD1: false,
  };
}
```

**Step 2: Verify typecheck fails (expected — consumers still import removed exports)**

```bash
bun run typecheck 2>&1 | head -40
```

Expected: Errors about missing `detectDialect`, `PostgresDatabase`, etc. These are fixed in subsequent tasks.

**Step 3: Commit**

```bash
git add src/db/config.ts
git commit -m "refactor: simplify database config to SQLite/D1 only"
```

---

### Task 3: Simplify database index

**Files:**
- Modify: `src/db/index.ts`

**Step 1: Rewrite index.ts**

Remove PostgreSQL imports, `getActiveSchema()` dialect branch, `PostgresDatabase` type, `resetPostgresClient()`, and PostgreSQL paths in `createDatabase()`/`closeDatabase()`/`runTransaction()`.

```typescript
/**
 * Database connection configuration
 *
 * Provides a database abstraction layer supporting SQLite and D1 dialects.
 *
 * SQLite:
 * - Uses bun:sqlite with drizzle-orm/bun-sqlite (local development)
 *
 * Cloudflare D1:
 * - Uses D1 binding with drizzle-orm/d1 (Cloudflare Workers)
 * - SQLite-compatible, no connection management needed
 *
 * The driver is selected automatically based on configuration:
 * - D1_ENABLED=true -> D1 binding (Cloudflare Workers)
 * - Otherwise -> SQLite
 *
 * @see https://bun.sh/docs/api/sqlite
 * @see https://developers.cloudflare.com/d1/
 */
import { createRequire } from 'node:module';
import { getDatabaseConfig } from './config';
import type { DatabaseDriver } from './driver';
import { createBunDriver } from './drivers/bun';
import { createD1Database, getD1Binding } from './drivers/d1';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';

// Import schema for type inference
import * as sqliteSchema from './schema/sqlite';

// Re-export schema
export * from './schema';

/**
 * Get the active schema based on current database dialect
 *
 * Returns the SQLite schema, used by both local SQLite and D1.
 */
export function getActiveSchema(): typeof sqliteSchema {
  return sqliteSchema;
}

// Re-export driver types for dependency injection
export type { DatabaseDriver, PreparedStatement, RunResult } from './driver';

// Re-export config utilities
export { getDatabaseConfig } from './config';
export type { DatabaseConfig, DatabaseDialect } from './config';

/**
 * Database type for type inference
 */
export type Database = BunSQLiteDatabase<typeof sqliteSchema>;

/**
 * Database interface for dependency injection
 */
export interface IDatabase {
  insert: (table: any) => {
    values: (values: any) => Promise<any> & {
      returning: (columns?: any) => Promise<any[]>;
      onConflictDoNothing: () => Promise<any>;
      onConflictDoUpdate: (config: any) => Promise<any>;
    };
  };
  query: {
    [key: string]: {
      findFirst: (config?: any) => Promise<any>;
      findMany: (config?: any) => Promise<any[]>;
    };
  };
  update: (table: any) => {
    set: (values: any) => {
      where: (condition: any) => Promise<any> & {
        returning: (columns?: any) => Promise<any[]>;
      };
      returning: (columns?: any) => Promise<any[]>;
    };
  };
  select: (columns: any) => {
    from: (table: any) => {
      where: (condition: any) => {
        groupBy: (column: any) => Promise<any[]>;
        orderBy: (config: any) => Promise<any[]>;
      };
      groupBy: (column: any) => {
        where: (condition: any) => Promise<any[]>;
      };
    };
  };
  delete: (table: any) => {
    where: (condition: any) => Promise<any>;
  };
  transaction: <T>(callback: (tx: any) => Promise<T>) => Promise<T>;
}

/**
 * Run an async callback.
 *
 * SQLite and D1 run the callback directly -- single-writer WAL mode ensures
 * sequential consistency. D1 does not support BEGIN/COMMIT/ROLLBACK.
 */
export async function runTransaction<T>(
  db: IDatabase,
  callback: (tx: IDatabase) => Promise<T>
): Promise<T> {
  return callback(db);
}

/**
 * Performance optimizations for SQLite
 */
const PRAGMA_STATEMENTS = [
  'PRAGMA journal_mode = WAL;',
  'PRAGMA synchronous = NORMAL;',
  'PRAGMA cache_size = -64000;',
  'PRAGMA foreign_keys = ON;',
];

function applyPragmas(driver: DatabaseDriver): void {
  PRAGMA_STATEMENTS.forEach((sql) => driver.exec(sql));
}

/**
 * Get a require function for loading npm packages at runtime
 */
function getRequire() {
  return createRequire(import.meta.url);
}

/**
 * Create the Drizzle database instance
 *
 * Automatically selects the correct driver:
 * - D1_ENABLED=true -> D1 binding via drizzle-orm/d1 (Cloudflare Workers)
 * - Otherwise -> bun:sqlite driver
 */
function createDatabase(): Database {
  const config = getDatabaseConfig();
  let driver: (DatabaseDriver & { _raw: unknown }) | null = null;

  try {
    // D1 path - Cloudflare Workers binding or CLI HTTP/local drivers
    if (config.isD1) {
      const d1Binding = getD1Binding();
      if (d1Binding) {
        return createD1Database(d1Binding, sqliteSchema) as unknown as Database;
      }

      const awTarget = process.env.AW_TARGET;
      if (awTarget === 'd1') {
        const dynamicRequire = getRequire();
        const { createD1HttpDatabase } = dynamicRequire('./drivers/d1-http');
        return createD1HttpDatabase(sqliteSchema) as unknown as Database;
      }

      if (awTarget === 'd1-local') {
        const localRequire = getRequire();
        const { findLocalD1Path } = localRequire('./drivers/d1-local');
        const localPath = findLocalD1Path(process.cwd());
        driver = createBunDriver(localPath);
        const { drizzle } = localRequire('drizzle-orm/bun-sqlite');
        return drizzle(driver._raw, { schema: sqliteSchema });
      }

      throw new Error(
        'D1_ENABLED is set but no D1 driver is available. ' +
          'Use --target d1 or --target d1-local, or run in Cloudflare Workers.'
      );
    }

    // SQLite path - uses bun:sqlite via Bun runtime
    driver = createBunDriver(config.url);
    const dynamicRequire = getRequire();
    const { drizzle } = dynamicRequire('drizzle-orm/bun-sqlite');

    applyPragmas(driver);
    return drizzle(driver._raw, { schema: sqliteSchema });
  } catch (error) {
    if (driver) {
      try {
        driver.close();
      } catch {
        // ignore cleanup errors
      }
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to create database connection (dialect: ${config.dialect}): ${message}`
    );
  }
}

let dbInstance: Database | null = null;
let isClosing = false;

export function getDb(): Database {
  if (isClosing) {
    throw new Error('Database is being closed. Cannot acquire new connection.');
  }

  if (!dbInstance) {
    dbInstance = createDatabase();
  }
  return dbInstance;
}

export function resetDb(): void {
  dbInstance = null;
}

/**
 * Prepare database for a new request (Cloudflare Workers)
 *
 * Discards stale connection references from previous requests.
 */
export function prepareForRequest(): void {
  dbInstance = null;
  isClosing = false;
}

/**
 * Close database connections
 *
 * For SQLite/D1, this resets the singleton. No connection pool to close.
 */
export async function closeDatabase(): Promise<void> {
  if (isClosing) return;
  isClosing = true;
  try {
    dbInstance = null;
  } finally {
    isClosing = false;
  }
}

export const db = new Proxy({} as Database, {
  get(_target, prop) {
    return getDb()[prop as keyof Database];
  },
  set(_target, prop, value) {
    (getDb() as any)[prop] = value;
    return true;
  },
  has(_target, prop) {
    return prop in getDb();
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Object.getOwnPropertyDescriptor(getDb(), prop);
  },
  ownKeys(_target) {
    return Reflect.ownKeys(getDb());
  },
  getPrototypeOf(_target) {
    return Object.getPrototypeOf(getDb());
  },
});
```

**Step 2: Commit**

```bash
git add src/db/index.ts
git commit -m "refactor: simplify db index -- remove PostgreSQL driver paths"
```

---

### Task 4: Simplify drizzle.config.ts

**Files:**
- Modify: `drizzle.config.ts`

**Step 1: Rewrite to single SQLite config**

```typescript
import type { Config } from 'drizzle-kit';

const url = process.env.DATABASE_URL || 'db/.dev.db';

/**
 * Drizzle Kit Configuration
 *
 * SQLite only -- used for local development migrations.
 * D1 production uses the same SQLite-compatible migrations.
 *
 * Usage:
 *   bun run db:generate
 *   bun run db:push
 */
export default {
  schema: './src/db/schema/sqlite',
  out: './drizzle/sqlite',
  dialect: 'sqlite',
  dbCredentials: {
    url,
  },
  verbose: true,
  strict: true,
} satisfies Config;
```

**Step 2: Commit**

```bash
git add drizzle.config.ts
git commit -m "refactor: simplify drizzle config to SQLite only"
```

---

### Task 5: Simplify empty.ts

**Files:**
- Modify: `src/db/empty.ts`

**Step 1: Remove PostgreSQL TRUNCATE path**

Remove the `if (config.dialect === 'postgresql')` branch (lines 58-82). Keep only the SQLite/D1 path. Update file header comment.

Replace lines 7-11:
```
 * Works for both SQLite and PostgreSQL.
 *
 * Usage:
 *   bun run db:empty                          # Uses default .env (SQLite)
 *   bun run aw --target postgres db empty     # Uses .env.production (PostgreSQL)
```
With:
```
 * Works for SQLite and D1.
 *
 * Usage:
 *   bun run db:empty                        # Uses default .env (SQLite)
 *   bun run aw --target d1 db empty         # Uses D1
```

Remove the entire `if (config.dialect === 'postgresql') { ... } else {` block and keep only the SQLite/D1 body (unwrap the else block).

Remove the `getDatabaseConfig` import and `config` variable if dialect is no longer checked. Keep `config` if `config.isD1` is still used.

**Step 2: Commit**

```bash
git add src/db/empty.ts
git commit -m "refactor: remove PostgreSQL TRUNCATE path from empty script"
```

---

### Task 6: Simplify auth adapter

**Files:**
- Modify: `src/lib/auth/lucia.ts`

**Step 1: Remove CloudflarePostgreSQLAdapter and PostgreSQL branch**

Delete the `CloudflarePostgreSQLAdapter` class (lines 31-119). Simplify `createAdapter()` to always return the SQLite adapter. Remove unused imports (`getDatabaseConfig`).

The simplified `createAdapter()`:

```typescript
function createAdapter() {
  return new DrizzleSQLiteAdapter(db, schema.sessions as any, schema.users);
}
```

Remove the `import { getDatabaseConfig } from '@/db/index';` line (keep the `db` import). Remove `import { eq, lte } from 'drizzle-orm';` (only used by the deleted class). Remove `import type { Adapter, DatabaseSession, DatabaseUser } from 'lucia';` (only used by deleted class).

**Step 2: Commit**

```bash
git add src/lib/auth/lucia.ts
git commit -m "refactor: remove PostgreSQL auth adapter"
```

---

### Task 7: Simplify services

**Files:**
- Modify: `src/services/transaction.service.ts`
- Modify: `src/services/report.service.ts`
- Modify: `src/services/auth.service.ts`
- Modify: `src/services/diagnostics.service.ts`

**Step 1: Simplify transaction.service.ts**

At line ~507-517, remove the `isPostgres` branch. Keep only SQLite expressions:

Replace:
```typescript
    const { dialect } = getDatabaseConfig();
    const isPostgres = dialect === 'postgresql';

    // Use dialect-appropriate date extraction
    // SQLite: transaction_date is stored as Unix epoch seconds, so 'unixepoch' modifier is required
    const monthExpr = isPostgres
      ? sql<number>`EXTRACT(MONTH FROM ${tx.transaction_date})::INTEGER`
      : sql<number>`CAST(strftime('%m', ${tx.transaction_date}, 'unixepoch') AS INTEGER)`;
    const yearExpr = isPostgres
      ? sql<number>`EXTRACT(YEAR FROM ${tx.transaction_date})::INTEGER`
      : sql<number>`CAST(strftime('%Y', ${tx.transaction_date}, 'unixepoch') AS INTEGER)`;
```

With:
```typescript
    // transaction_date is stored as Unix epoch seconds, so 'unixepoch' modifier is required
    const monthExpr = sql<number>`CAST(strftime('%m', ${tx.transaction_date}, 'unixepoch') AS INTEGER)`;
    const yearExpr = sql<number>`CAST(strftime('%Y', ${tx.transaction_date}, 'unixepoch') AS INTEGER)`;
```

Remove the `getDatabaseConfig` import if no longer used elsewhere in this file. Search the file for other usages first.

**Step 2: Simplify report.service.ts**

At line ~1085-1089, replace the `monthBucket` method:

Replace:
```typescript
  private monthBucket(column: any) {
    const { dialect } = getDatabaseConfig();
    return dialect === 'postgresql'
      ? sql<string>`to_char(${column}, 'YYYY-MM')`
      : sql<string>`strftime('%Y-%m', ${column}, 'unixepoch')`;
  }
```

With:
```typescript
  private monthBucket(column: any) {
    return sql<string>`strftime('%Y-%m', ${column}, 'unixepoch')`;
  }
```

Remove the `getDatabaseConfig` import if no longer used elsewhere in this file.

**Step 3: Clean up auth.service.ts**

At line ~451, remove the postgres.js-specific comment. Replace:
```typescript
    // Log full error details for diagnosis (postgres.js errors have code, severity, detail)
```
With:
```typescript
    // Log full error details for diagnosis
```

Keep the error field extraction -- `code`, `severity`, `detail` are general error properties.

**Step 4: Simplify diagnostics.service.ts**

In `getDatabaseInfo()`, remove the PostgreSQL-specific fields from the returned object:

Replace:
```typescript
    const info: DatabaseInfo = {
      dialect: config.dialect,
      url: sanitizedUrl,
      isConnected: false,
      isSupabase: config.isSupabase,
      isTransactionPooler: config.isTransactionPooler,
      isHyperdrive: config.isHyperdrive,
    };

    if (config.poolConfig) {
      info.connectionPoolConfig = config.poolConfig;
    }
```

With:
```typescript
    const info: DatabaseInfo = {
      dialect: config.dialect,
      url: sanitizedUrl,
      isConnected: false,
      isD1: config.isD1,
    };
```

**Step 5: Commit**

```bash
git add src/services/transaction.service.ts src/services/report.service.ts src/services/auth.service.ts src/services/diagnostics.service.ts
git commit -m "refactor: remove PostgreSQL dialect branches from services"
```

---

### Task 8: Simplify middleware

**Files:**
- Modify: `src/middleware/database.ts`
- Modify: `src/middleware/runtime-env.ts`

**Step 1: Simplify database middleware**

Replace the entire file with simplified version that handles SQLite/D1 only:

```typescript
/**
 * Database Lifecycle Middleware
 *
 * Resets per-request database singleton for Cloudflare Workers.
 * Must run after runtimeEnv and before any middleware that queries the database.
 */

import type { MiddlewareHandler } from 'astro';
import { prepareForRequest } from '@/db';

export const database: MiddlewareHandler = async (_context, next) => {
  prepareForRequest();
  return next();
};
```

**Step 2: Simplify runtime-env middleware**

Remove Hyperdrive binding handling:

```typescript
/**
 * Runtime Environment Middleware
 *
 * Sets runtime environment for Cloudflare Workers where secrets
 * are only available via request context, not at module load time.
 *
 * When D1 is configured, stores the binding for the D1 driver.
 *
 * Must run before any middleware that accesses environment variables.
 */

import type { MiddlewareHandler } from 'astro';
import { setRuntimeEnv } from '@/db/config';
import { setD1Binding } from '@/db/drivers/d1';

export const runtimeEnv: MiddlewareHandler = async (context, next) => {
  const runtime = (context.locals as any).runtime;
  if (runtime?.env) {
    const env = { ...runtime.env };

    // Check for D1 database binding (Cloudflare-native SQLite database)
    const d1Binding = runtime.env.DB;
    if (d1Binding) {
      env.D1_ENABLED = 'true';
      setD1Binding(d1Binding);
    } else {
      setD1Binding(null);
    }

    setRuntimeEnv(env);
  }
  try {
    return await next();
  } finally {
    setD1Binding(null);
  }
};
```

**Step 3: Commit**

```bash
git add src/middleware/database.ts src/middleware/runtime-env.ts
git commit -m "refactor: remove PostgreSQL/Hyperdrive from middleware"
```

---

### Task 9: Simplify CLI target system

**Files:**
- Modify: `src/cli/lib/target.ts`

**Step 1: Remove postgres from CliTarget**

```typescript
export type CliTarget = 'sqlite' | 'd1' | 'd1-local';

const VALID_TARGETS: CliTarget[] = ['sqlite', 'd1', 'd1-local'];
```

Update `targetArg` description:
```typescript
export const targetArg = {
  type: 'string' as const,
  alias: 't' as const,
  description: 'Database target: sqlite (default), d1, d1-local',
  default: 'sqlite',
};
```

In `resolveTarget()`, remove the `target === 'postgres'` condition from the `.env.production` loading:

Replace:
```typescript
  if (target === 'postgres' || target === 'd1') {
```

With:
```typescript
  if (target === 'd1') {
```

**Step 2: Commit**

```bash
git add src/cli/lib/target.ts
git commit -m "refactor: remove postgres from CLI target system"
```

---

### Task 10: Simplify CLI db commands

**Files:**
- Modify: `src/cli/commands/db.ts`

**Step 1: Remove PostgreSQL backup/restore paths**

In `backupToPath()` function, remove the `target === 'postgres'` branch (lines 180-187).

In the `backup` subcommand, remove the `--format` arg and the `pg-custom` format logic. Simplify `defaultExt`:

Replace:
```typescript
        const defaultExt =
          target === 'postgres' && formatArg === 'custom'
            ? 'dump'
            : target === 'sqlite'
              ? 'db'
              : 'sql';
```
With:
```typescript
        const defaultExt = target === 'sqlite' ? 'db' : 'sql';
```

Remove `formatArg` validation and the `format` arg.

In `validFormatsForTarget`, remove the `postgres` entry:
```typescript
        const validFormatsForTarget: Record<string, BackupFormat[]> = {
          sqlite: ['sql', 'sqlite-db'],
          d1: ['sql'],
          'd1-local': ['sql'],
        };
```

In the `restore` subcommand, remove the `target === 'postgres'` branch (lines 538-554).

In the `drop` subcommand, remove the `target === 'postgres'` branch (lines 378-379).

Remove the `getDatabaseUrl()` function (lines 169-175) -- only used by postgres backup/restore.

Remove `pg-custom` from the `BackupFormat` type. Remove `validateBackupFile`'s `pg-custom` branch (lines 91-93).

Remove the `backup` subcommand's `format` arg and `formatArg` validation.

Also remove the `backup` subcommand's `description` referencing postgres format.

**Step 2: Commit**

```bash
git add src/cli/commands/db.ts
git commit -m "refactor: remove PostgreSQL backup/restore/drop from db commands"
```

---

### Task 11: Delete rotate-db-password and update admin commands

**Files:**
- Delete: `src/cli/rotate-db-password.ts`
- Modify: `src/cli/commands/admin.ts`

**Step 1: Delete rotate-db-password script**

```bash
rm -f src/cli/rotate-db-password.ts
```

**Step 2: Remove rotate-db-password subcommand from admin.ts**

Delete the `'rotate-db-password'` subcommand definition (lines 99-114).

Remove the `import { exec } from '../lib/exec';` if no longer used (check other subcommands -- `generate-email-key` still uses it, so keep it).

**Step 3: Commit**

```bash
git add -A
git commit -m "refactor: delete rotate-db-password script and admin subcommand"
```

---

### Task 12: Simplify types and diagnostics

**Files:**
- Modify: `src/types/diagnostics.ts`
- Modify: `src/components/organisms/DiagnosticsDisplay.astro`
- Modify: `openapi/schemas/DatabaseInfo.yml`

**Step 1: Simplify DatabaseInfo type**

Replace:
```typescript
export interface DatabaseInfo {
  dialect: 'sqlite' | 'postgresql';
  url: string;
  isConnected: boolean;
  isSupabase: boolean;
  isTransactionPooler: boolean;
  isHyperdrive: boolean;
  connectionPoolConfig?: {
    max: number;
    idleTimeout: number;
  };
  queryMetrics?: {
    totalQueries: number;
    avgLatency: number;
    slowQueries: number;
  };
}
```

With:
```typescript
export interface DatabaseInfo {
  dialect: 'sqlite';
  url: string;
  isConnected: boolean;
  isD1: boolean;
  queryMetrics?: {
    totalQueries: number;
    avgLatency: number;
    slowQueries: number;
  };
}
```

**Step 2: Simplify DiagnosticsDisplay.astro**

In the Database card section, remove the Supabase features block (lines 242-254) and the connection pool config block (lines 256-266).

Change the dialect badge (line 207):
```astro
          <span class="badge badge-neutral">
            {data.database.isD1 ? 'D1' : data.database.dialect}
          </span>
```

**Step 3: Update OpenAPI schema**

Replace `openapi/schemas/DatabaseInfo.yml`:
```yaml
DatabaseInfo:
  type: object
  description: Database connection and configuration information
  properties:
    dialect:
      type: string
      enum: [sqlite]
      description: Database dialect
      example: sqlite
    url:
      type: string
      description: Database connection URL (sanitized, password masked)
      example: db/.dev.db
    isConnected:
      type: boolean
      description: Whether database connection is healthy
      example: true
    isD1:
      type: boolean
      description: Whether using Cloudflare D1
      example: false
    queryMetrics:
      type: object
      description: Query performance metrics
      properties:
        totalQueries:
          type: integer
          description: Total query count
          example: 1523
        avgLatency:
          type: number
          description: Average query latency in milliseconds
          example: 12.5
        slowQueries:
          type: integer
          description: Number of slow queries (>100ms)
          example: 3
  required: [dialect, url, isConnected, isD1]
```

**Step 4: Commit**

```bash
git add src/types/diagnostics.ts src/components/organisms/DiagnosticsDisplay.astro openapi/schemas/DatabaseInfo.yml
git commit -m "refactor: simplify diagnostics types and display for SQLite/D1"
```

---

### Task 13: Simplify logger

**Files:**
- Modify: `src/lib/logger.ts`

**Step 1: Update sensitive patterns**

At line 177, the regex already catches both `postgres` and `sqlite` URLs:
```
/(mysql|postgres|sqlite):\/\/[^:]+:[^@]+@[^/]+\/\w+/gi,
```

This is fine to keep -- it still sanitizes if someone accidentally logs a URL string. No change needed here.

Update the `@example` at line 149:
Replace `log.info('dialect=postgresql hyperdrive=true');` with `log.info('dialect=sqlite d1=true');`

**Step 2: Commit**

```bash
git add src/lib/logger.ts
git commit -m "refactor: update logger example to reflect SQLite/D1"
```

---

### Task 14: Run typecheck to verify all consumer fixes

**Step 1: Run typecheck**

```bash
bun run typecheck
```

Expected: Pass (0 errors). If errors remain, fix the specific imports/references.

**Step 2: No commit needed (verification only)**

---

### Task 15: Update tests -- config.test.ts

**Files:**
- Modify: `src/db/config.test.ts`

**Step 1: Rewrite test file**

Remove all PostgreSQL, Supabase, and Hyperdrive tests. Keep SQLite and D1 tests:

```typescript
import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { setTestEnv } from '@/lib/env';
import { getDatabaseConfig } from './config';

describe('getDatabaseConfig', () => {
  const originalEnv = process.env.DATABASE_URL;

  beforeEach(() => {
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.DATABASE_URL = originalEnv;
    } else {
      delete process.env.DATABASE_URL;
    }
  });

  test('returns sqlite config by default', () => {
    const config = getDatabaseConfig();
    expect(config.dialect).toBe('sqlite');
    expect(config.url).toBe('db/.dev.db');
    expect(config.isD1).toBe(false);
  });

  test('returns sqlite config with custom DATABASE_URL', () => {
    process.env.DATABASE_URL = '/custom/path.db';
    const config = getDatabaseConfig();
    expect(config.dialect).toBe('sqlite');
    expect(config.url).toBe('/custom/path.db');
  });
});

describe('D1 detection', () => {
  const originalEnv = process.env.DATABASE_URL;

  beforeEach(() => {
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    setTestEnv(null);
    if (originalEnv !== undefined) {
      process.env.DATABASE_URL = originalEnv;
    } else {
      delete process.env.DATABASE_URL;
    }
  });

  test('detects D1 when D1_ENABLED is set', () => {
    setTestEnv({ D1_ENABLED: 'true' });
    const config = getDatabaseConfig();
    expect(config.isD1).toBe(true);
    expect(config.dialect).toBe('sqlite');
  });

  test('D1 returns empty URL', () => {
    setTestEnv({ D1_ENABLED: 'true' });
    const config = getDatabaseConfig();
    expect(config.url).toBe('');
  });

  test('returns isD1 false when not set', () => {
    const config = getDatabaseConfig();
    expect(config.isD1).toBe(false);
  });
});
```

**Step 2: Run the test**

```bash
bun test src/db/config.test.ts
```

Expected: All tests pass.

**Step 3: Commit**

```bash
git add src/db/config.test.ts
git commit -m "test: simplify config tests for SQLite/D1 only"
```

---

### Task 16: Update tests -- target.test.ts

**Files:**
- Modify: `src/cli/lib/target.test.ts`

**Step 1: Remove postgres target test cases**

In `validateTarget` test, remove the postgres line:
```typescript
  it('accepts valid targets', () => {
    expect(validateTarget('sqlite')).toBe('sqlite');
    expect(validateTarget('d1')).toBe('d1');
    expect(validateTarget('d1-local')).toBe('d1-local');
  });
```

In `isD1` test, remove the `'returns false for postgres target'` test case (lines 63-66).

In `resolveTarget D1 env setup`, remove the `'does not set D1_ENABLED for postgres target'` test case (lines 150-158).

**Step 2: Run the test**

```bash
bun test src/cli/lib/target.test.ts
```

Expected: All tests pass.

**Step 3: Commit**

```bash
git add src/cli/lib/target.test.ts
git commit -m "test: remove postgres target test cases"
```

---

### Task 17: Update tests -- perf collector and logger

**Files:**
- Modify: `src/lib/perf/collector.test.ts`
- Modify: `src/lib/logger.test.ts`

**Step 1: Update perf collector test**

At line 126, change `'postgresql'` to `'sqlite'`:
```typescript
    test('includes dialect in output', () => {
      perf.setDialect('sqlite');
      const output = perf.toHtmlComment();
      expect(output).toContain('Dialect: sqlite');
    });
```

**Step 2: Keep logger test as-is**

The logger test at line 129-134 tests that `postgres://user:pass@host/db` gets redacted. This is a valid sanitization test -- the regex still exists in the logger to catch accidentally logged URLs. No change needed.

**Step 3: Run the tests**

```bash
bun test src/lib/perf/collector.test.ts src/lib/logger.test.ts
```

Expected: All tests pass.

**Step 4: Commit**

```bash
git add src/lib/perf/collector.test.ts src/lib/logger.test.ts
git commit -m "test: update perf collector dialect test"
```

---

### Task 18: Remove postgres dependency

**Files:**
- Modify: `package.json`

**Step 1: Remove the dependency**

```bash
bun remove postgres
```

**Step 2: Verify bun.lock updated**

```bash
bun install
```

**Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: remove postgres dependency"
```

---

### Task 19: Update wrangler.toml.example

**Files:**
- Modify: `wrangler.toml.example`

**Step 1: Rewrite to D1-only config**

Remove Hyperdrive section and PostgreSQL deployment option. Keep D1 as the only database option:

```toml
# Cloudflare Workers Configuration
# https://developers.cloudflare.com/workers/wrangler/configuration/
#
# SETUP: Copy this file to wrangler.toml and fill in your own values.
#   cp wrangler.toml.example wrangler.toml
#
# wrangler.toml is gitignored -- never commit it with real IDs or secrets.
#
# DATABASE: Cloudflare D1 (SQLite-compatible database at the edge)
#   1. Create DB:   wrangler d1 create allowealth-db
#   2. Set ID:      replace YOUR_D1_DATABASE_ID with the returned ID
#   3. Migrations:  for f in drizzle/sqlite/*.sql; do wrangler d1 execute allowealth-db --remote --file="$f"; done
#   4. Deploy:      bun run deploy:cloudflare

account_id = "YOUR_CLOUDFLARE_ACCOUNT_ID"
name = "allowealth"
main = "dist/_worker.js/index.js"
compatibility_date = "2026-02-01"
compatibility_flags = ["nodejs_compat", "disable_nodejs_process_v2"]

# Custom domain routes (must be top-level, before any [section] headers)
# https://developers.cloudflare.com/workers/configuration/routing/routes/
routes = [
  { pattern = "allowealth.io", custom_domain = true },
]

# Static assets configuration
# https://developers.cloudflare.com/workers/static-assets/
[assets]
directory = "./dist"
binding = "ASSETS"

# Environment variables (non-secret)
[vars]
NODE_ENV = "production"
PUBLIC_URL = "https://allowealth.io"
APP_MODE = "full"
SIGNUP_MODE = "invite_only"
CACHE_DRIVER = "upstash"
PERF_DEBUG = "true"
LOG_LEVEL = "warn"
EMAIL_MODE = "real"
EMAIL_PROVIDER = "resend"
EMAIL_SENDER_NAME = "Allowealth"
EMAIL_SENDER_ADDRESS = "noreply@allowealth.io"

# Secrets (set via CLI, not committed):
# wrangler secret put EMAIL_API_KEY
# wrangler secret put GOOGLE_CLIENT_ID
# wrangler secret put GOOGLE_CLIENT_SECRET

# -- Cloudflare D1 (SQLite at the edge) --
[[d1_databases]]
binding = "DB"
database_name = "allowealth-db"
database_id = "YOUR_D1_DATABASE_ID"  # wrangler d1 create allowealth-db

# Workers Logs -- captures all console.* output, auto-indexes JSON fields
# https://developers.cloudflare.com/workers/observability/logs/workers-logs/
[observability]
enabled = true
head_sampling_rate = 1
```

**Step 2: Commit**

```bash
git add wrangler.toml.example
git commit -m "docs: update wrangler.toml.example for D1-only deployment"
```

---

### Task 20: Update documentation -- architecture docs

**Files:**
- Rewrite: `docs/architecture/006-database-connection-architecture.md`
- Modify: `docs/architecture/007-database-migrations.md`
- Modify: `docs/architecture/004-database-schema.md`

**Step 1: Rewrite ADR 006**

Rewrite for the simplified SQLite/D1 connection architecture. Document:
- Local dev: bun:sqlite with WAL mode, PRAGMA optimizations
- Production: D1 binding via Cloudflare Workers
- CLI access: d1-http (remote REST API) and d1-local (wrangler state file)
- Per-request singleton reset in Workers
- No connection pooling needed (SQLite is file-based, D1 is edge-native)

**Step 2: Update ADR 007**

Remove all references to `drizzle/postgresql/`, PostgreSQL migration commands, and dual-dialect strategy. Keep SQLite migration workflow and D1 migration deployment.

**Step 3: Update ADR 004**

Remove `postgresql/` directory reference from schema structure. Update to reflect single SQLite schema used by both local dev and D1.

**Step 4: Commit**

```bash
git add docs/architecture/006-database-connection-architecture.md docs/architecture/007-database-migrations.md docs/architecture/004-database-schema.md
git commit -m "docs: update architecture docs for SQLite/D1 only"
```

---

### Task 21: Update documentation -- CLAUDE.md, COMMANDS.md, rules

**Files:**
- Modify: `.claude/CLAUDE.md`
- Modify: `COMMANDS.md`
- Modify: `.claude/rules/backend/database.md` (if it references dual-dialect)

**Step 1: Update .claude/CLAUDE.md**

- Tech stack: Replace `Drizzle ORM + SQLite (dev) / PostgreSQL+Hyperdrive or Cloudflare D1 (prod)` with `Drizzle ORM + SQLite (dev) / Cloudflare D1 (prod)`
- ADR table: Remove `006-database-connection-architecture.md` description about Hyperdrive; update for SQLite/D1. Remove "Dual SQLite/PostgreSQL support" from Schema Selection row. Remove "D1 or Hyperdrive" from Database (Workers) row.
- DB commands: Remove `db:generate:prod`, `db:migrate:prod` entries. Remove `--target postgres` references.
- Project structure: Remove `postgresql/` from schema directory listing.
- Replace `getActiveSchema()` usage note: "Use this when you need runtime schema selection" with simpler description.

**Step 2: Update COMMANDS.md**

Remove all `--target postgres` examples. Remove `rotate-db-password` command documentation. Remove `pg_dump`/`pg_restore` references.

**Step 3: Update .claude/rules/backend/database.md**

Remove dual-dialect references, PostgreSQL-specific patterns, and Hyperdrive/Supabase mentions. Keep SQLite and D1 patterns.

**Step 4: Commit**

```bash
git add .claude/CLAUDE.md COMMANDS.md .claude/rules/backend/database.md
git commit -m "docs: update project docs and rules for SQLite/D1 only"
```

---

### Task 22: Run full quality gates

**Step 1: Run all quality gates**

```bash
bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck
```

Expected: All pass.

**Step 2: Run tests**

```bash
bun run test
```

Expected: All pass.

**Step 3: Run build**

```bash
bun run build
```

Expected: Build succeeds.

**Step 4: Fix any issues found, commit fixes**

---

### Task 23: Final review and cleanup

**Step 1: Search for any remaining references**

```bash
grep -ri "postgres\|supabase\|hyperdrive" src/ --include="*.ts" --include="*.astro" | grep -v node_modules | grep -v ".test.ts"
```

Fix any remaining references found.

**Step 2: Verify the postgres package is gone**

```bash
grep "postgres" package.json
```

Expected: No matches.

**Step 3: Commit any final cleanup**

```bash
git add -A
git commit -m "chore: final cleanup of PostgreSQL/Supabase/Hyperdrive references"
```
