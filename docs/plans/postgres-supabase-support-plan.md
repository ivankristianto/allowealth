# PostgreSQL/Supabase Support Plan

## Overview

Add PostgreSQL/Supabase support for staging and production while maintaining SQLite for local development. Remove all MySQL references.

**Database Strategy:**

- **Local Development:** SQLite (default) or PostgreSQL (optional)
- **Staging/Production:** Supabase (PostgreSQL)
- **Detection:** Auto-detect from `DATABASE_URL` format

---

## Phase 1: Dependencies & Configuration

### 1.1 Update package.json

**File:** `package.json`

```diff
  "dependencies": {
+   "postgres": "^3.4.4"
  },
  "devDependencies": {
-   "mysql2": "^3.16.0"
  }
```

### 1.2 Create Database Config Utility

**New File:** `src/db/config.ts`

```typescript
export type DatabaseDialect = 'sqlite' | 'postgresql';

export interface DatabaseConfig {
  dialect: DatabaseDialect;
  url: string;
  isSupabase: boolean;
  poolConfig?: { max: number; idleTimeout: number };
}

export function detectDialect(url: string): DatabaseDialect {
  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
    return 'postgresql';
  }
  return 'sqlite';
}

export function getDatabaseConfig(): DatabaseConfig {
  const url = process.env.DATABASE_URL || 'db/.dev.db';
  const dialect = detectDialect(url);
  return {
    dialect,
    url,
    isSupabase: dialect === 'postgresql' && url.includes('supabase'),
    poolConfig: dialect === 'postgresql' ? { max: 10, idleTimeout: 30 } : undefined,
  };
}
```

---

## Phase 2: Schema Reorganization

### 2.1 New Directory Structure

```
src/db/schema/
├── sqlite/              # SQLite-specific schemas (move existing files)
│   ├── index.ts
│   ├── base.ts
│   ├── users.ts
│   ├── sessions.ts
│   ├── categories.ts
│   ├── transactions.ts
│   ├── assets.ts
│   ├── asset-history.ts
│   ├── asset-snapshots.ts
│   ├── asset-snapshot-items.ts
│   ├── asset-update-reminders.ts
│   ├── budgets.ts
│   ├── exchange-rates.ts
│   ├── password-reset-tokens.ts
│   ├── user-settings.ts
│   ├── audit-logs.ts
│   └── relations.ts
├── postgresql/          # PostgreSQL-specific schemas (NEW)
│   ├── index.ts
│   ├── base.ts
│   ├── users.ts
│   └── ... (same structure)
└── index.ts             # Re-exports based on dialect
```

### 2.2 PostgreSQL Schema Conversion Pattern

**SQLite (`src/db/schema/sqlite/users.ts`):**

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sqliteTimestampNow } from './base';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  created_at: integer('created_at', { mode: 'timestamp' }).default(sqliteTimestampNow).notNull(),
});
```

**PostgreSQL (`src/db/schema/postgresql/users.ts`):**

```typescript
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});
```

**Key Conversions:**

| SQLite                              | PostgreSQL     |
| ----------------------------------- | -------------- |
| `sqliteTable`                       | `pgTable`      |
| `integer({ mode: 'timestamp' })`    | `timestamp()`  |
| `integer({ mode: 'boolean' })`      | `boolean()`    |
| `sqliteTimestampNow`                | `defaultNow()` |
| `integer().primaryKey()` (auto-inc) | `serial()`     |

### 2.3 Dynamic Schema Export

**File:** `src/db/schema/index.ts`

```typescript
import { getDatabaseConfig } from '../config';

const { dialect } = getDatabaseConfig();

// Conditional re-export
export * from dialect === 'postgresql' ? './postgresql' : './sqlite';
```

---

## Phase 3: PostgreSQL Driver

### 3.1 Create PostgreSQL Driver

**New File:** `src/db/drivers/postgres.ts`

```typescript
import postgres from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { getDatabaseConfig } from '../config';

let client: ReturnType<typeof postgres> | null = null;

export function createPostgresDriver(url: string) {
  const config = getDatabaseConfig();

  client = postgres(url, {
    max: config.poolConfig?.max ?? 10,
    idle_timeout: config.poolConfig?.idleTimeout ?? 30,
    ssl: config.isSupabase ? 'require' : false,
  });

  return client;
}

export function createPostgresDatabase<T extends Record<string, unknown>>(
  url: string,
  schema: T
): PostgresJsDatabase<T> {
  const client = createPostgresDriver(url);
  return drizzle(client, { schema });
}

export async function closePostgres(): Promise<void> {
  if (client) {
    await client.end();
    client = null;
  }
}
```

---

## Phase 4: Update Main Database Module

### 4.1 Update `src/db/index.ts`

```typescript
import { createRequire } from 'node:module';
import { getDatabaseConfig } from './config';
import { detectRuntime } from './driver';
import { createBunDriver } from './drivers/bun';
import { createNodeDriver } from './drivers/node';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

// Dynamic schema import based on dialect
const config = getDatabaseConfig();
const schema =
  config.dialect === 'postgresql'
    ? await import('./schema/postgresql')
    : await import('./schema/sqlite');

export * from './schema';

export type Database =
  | BunSQLiteDatabase<typeof schema>
  | BetterSQLite3Database<typeof schema>
  | PostgresJsDatabase<typeof schema>;

const SQLITE_PRAGMAS = [
  'PRAGMA journal_mode = WAL;',
  'PRAGMA synchronous = NORMAL;',
  'PRAGMA cache_size = -64000;',
  'PRAGMA foreign_keys = ON;',
];

function createDatabase(): Database {
  const { dialect, url } = getDatabaseConfig();

  if (dialect === 'postgresql') {
    const { createPostgresDatabase } = require('./drivers/postgres');
    return createPostgresDatabase(url, schema);
  }

  // SQLite path
  const runtime = detectRuntime();
  const driver = runtime === 'bun' ? createBunDriver(url) : createNodeDriver(url);
  SQLITE_PRAGMAS.forEach((sql) => driver.exec(sql));

  const dynamicRequire = runtime === 'bun' ? require : createRequire(import.meta.url);
  const { drizzle } =
    runtime === 'bun'
      ? dynamicRequire('drizzle-orm/bun-sqlite')
      : dynamicRequire('drizzle-orm/better-sqlite3');

  return drizzle(driver._raw, { schema });
}

let dbInstance: Database | null = null;

export function getDb(): Database {
  if (!dbInstance) dbInstance = createDatabase();
  return dbInstance;
}

export function resetDb(): void {
  dbInstance = null;
}

export const db = new Proxy({} as Database, {
  get: (_, prop) => getDb()[prop as keyof Database],
});
```

---

## Phase 5: Update Drizzle Config

### 5.1 Update `drizzle.config.ts`

```typescript
import type { Config } from 'drizzle-kit';

function detectDialect(): 'sqlite' | 'postgresql' {
  const url = process.env.DATABASE_URL || 'db/.dev.db';
  return url.startsWith('postgres') ? 'postgresql' : 'sqlite';
}

const dialect = detectDialect();

const config: Config =
  dialect === 'postgresql'
    ? {
        schema: './src/db/schema/postgresql',
        out: './drizzle/postgresql',
        dialect: 'postgresql',
        dbCredentials: { url: process.env.DATABASE_URL! },
      }
    : {
        schema: './src/db/schema/sqlite',
        out: './drizzle/sqlite',
        dialect: 'sqlite',
        dbCredentials: { url: process.env.DATABASE_URL || 'db/.dev.db' },
      };

export default { ...config, verbose: true, strict: true };
```

---

## Phase 6: Environment Variables

### 6.1 Update `.env.example`

```env
# Database Configuration
# Auto-detects type from URL format:
#
# SQLite (Development):
DATABASE_URL=db/.dev.db
#
# PostgreSQL (Local):
# DATABASE_URL=postgresql://user:password@localhost:5432/expenses
#
# Supabase (Staging/Production):
# DATABASE_URL=postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres
```

### 6.2 Update `.env`

Remove MySQL example, keep SQLite default.

---

## Phase 7: Update Seed Script

### 7.1 Update `src/db/seed.ts`

Make `VACUUM` conditional:

```typescript
import { getDatabaseConfig } from './config';

// In clearAllTables():
const { dialect } = getDatabaseConfig();
if (dialect === 'sqlite') {
  console.log('🧹 Vacuuming database...');
  db.run(sql`VACUUM`);
}
```

---

## Phase 8: Remove MySQL References

### Files to Update:

| File                                       | Action                                               |
| ------------------------------------------ | ---------------------------------------------------- |
| `package.json`                             | Remove `mysql2` dependency                           |
| `.env.example`                             | Remove MySQL connection example                      |
| `.env`                                     | Remove MySQL connection example                      |
| `AGENTS.md:149`                            | Change "MySQL (prod)" → "PostgreSQL/Supabase (prod)" |
| `docs/architecture/004-database-schema.md` | Replace MySQL refs with PostgreSQL                   |
| `specs/requirements-specification.md`      | Replace MySQL schema examples                        |
| `specs/execution-plan.md`                  | Replace MySQL setup with PostgreSQL/Supabase         |

---

## Phase 9: Migration Directory Structure

```
drizzle/
├── sqlite/              # SQLite migrations (existing)
│   ├── 0000_*.sql
│   └── meta/
└── postgresql/          # PostgreSQL migrations (NEW)
    ├── 0000_initial.sql
    └── meta/
```

---

## Implementation Order

1. Add `postgres` dependency, remove `mysql2`
2. Create `src/db/config.ts`
3. Move existing schema to `src/db/schema/sqlite/`
4. Create `src/db/schema/postgresql/` (convert all 14 tables)
5. Create `src/db/schema/index.ts` with dynamic export
6. Create `src/db/drivers/postgres.ts`
7. Update `src/db/index.ts`
8. Update `drizzle.config.ts`
9. Update `.env.example` and `.env`
10. Update `src/db/seed.ts`
11. Remove MySQL references from docs
12. Generate initial PostgreSQL migrations
13. Test with local PostgreSQL
14. Test with Supabase

---

## Verification

### Test SQLite (default):

```bash
DATABASE_URL=db/.dev.db bun run dev
# Should work as before
```

### Test PostgreSQL (local):

```bash
# Start local PostgreSQL
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=test postgres:16

# Run with PostgreSQL
DATABASE_URL=postgresql://postgres:test@localhost:5432/postgres bun run db:push
DATABASE_URL=postgresql://postgres:test@localhost:5432/postgres bun run db:seed
DATABASE_URL=postgresql://postgres:test@localhost:5432/postgres bun run dev
```

### Test Supabase:

```bash
# Use Supabase connection string
DATABASE_URL=postgresql://postgres.[ref]:[pass]@aws-0-[region].pooler.supabase.com:6543/postgres bun run dev
```

### Quality Gates:

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

---

## Files Changed Summary

| Action     | Files                                                                                                               |
| ---------- | ------------------------------------------------------------------------------------------------------------------- |
| **New**    | `src/db/config.ts`, `src/db/drivers/postgres.ts`, `src/db/schema/postgresql/*` (17 files), `src/db/schema/index.ts` |
| **Move**   | `src/db/schema/*.ts` → `src/db/schema/sqlite/*.ts`                                                                  |
| **Update** | `src/db/index.ts`, `drizzle.config.ts`, `src/db/seed.ts`, `.env.example`, `.env`, `package.json`                    |
| **Docs**   | `AGENTS.md`, `docs/architecture/004-database-schema.md`, `specs/*.md`                                               |
