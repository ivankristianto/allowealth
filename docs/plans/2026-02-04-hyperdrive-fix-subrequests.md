# Cloudflare Hyperdrive: Fix "Too many subrequests" Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate "Too many subrequests" error on Cloudflare Workers by adding Hyperdrive connection pooling, which provides local database connections that don't count as subrequests.

**Architecture:** Hyperdrive maintains persistent TCP+TLS connections to Supabase at the Cloudflare edge. Workers connect to a local proxy instead of opening remote TCP sockets. The runtime-env middleware detects the HYPERDRIVE binding and injects its connection string as DATABASE_URL. The database config detects Hyperdrive mode and adjusts postgres.js settings (no SSL needed, prepared statements enabled). Fully backward-compatible — falls back to direct postgres.js when Hyperdrive isn't configured.

**Tech Stack:** Cloudflare Hyperdrive, postgres.js, Drizzle ORM, Astro middleware

---

## Prerequisites (Manual — User Must Do)

Before implementing code changes, the user needs to:

1. **Have a Workers Paid plan** ($5/month) — Hyperdrive requires it
2. **Get the DIRECT Supabase connection string** (not the pooler URL):
   - Format: `postgresql://postgres.<project-ref>:<password>@db.<project-ref>.supabase.co:5432/postgres`
   - NOT the transaction pooler URL (port 6543) — Hyperdrive handles pooling itself
3. **Create the Hyperdrive config:**
   ```bash
   wrangler hyperdrive create expenses-db --connection-string="postgresql://postgres.<ref>:<pass>@db.<ref>.supabase.co:5432/postgres"
   ```
4. **Note the config ID** from the output (e.g., `a1b2c3d4e5f6...`)

---

### Task 1: Add Hyperdrive Binding to wrangler.toml

**Files:**

- Modify: `wrangler.toml`

**Step 1: Add Hyperdrive binding**

Add to the end of `wrangler.toml`:

```toml
# Hyperdrive connection pooling for PostgreSQL
# Eliminates per-request TCP/TLS overhead (fixes "Too many subrequests")
# Create config: wrangler hyperdrive create expenses-db --connection-string="<direct-supabase-url>"
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "<REPLACE_WITH_HYPERDRIVE_CONFIG_ID>"
```

**Step 2: Verify wrangler.toml is valid**

Run: `cd /Users/ivan/Works/AI/expenses && npx wrangler deploy --dry-run 2>&1 | head -20`
Expected: Should parse config (may warn about placeholder ID, that's OK)

---

### Task 2: Update Database Config to Detect Hyperdrive

**Files:**

- Modify: `src/db/config.ts`
- Test: `src/db/config.test.ts`

**Step 1: Write the failing tests**

Add to `src/db/config.test.ts`:

```typescript
import { setTestEnv } from '@/lib/env';

// Add after existing tests:
describe('Hyperdrive detection', () => {
  beforeEach(() => {
    delete process.env.DATABASE_URL;
  });

  afterEach(() => {
    setTestEnv(null);
  });

  test('detects Hyperdrive when HYPERDRIVE_ENABLED is set', () => {
    setTestEnv({
      DATABASE_URL: 'postgresql://user:pass@hyperdrive-local:5432/postgres',
      HYPERDRIVE_ENABLED: 'true',
    });
    const config = getDatabaseConfig();
    expect(config.dialect).toBe('postgresql');
    expect(config.isHyperdrive).toBe(true);
    expect(config.isSupabase).toBe(false);
    expect(config.isTransactionPooler).toBe(false);
  });

  test('Hyperdrive overrides Supabase detection', () => {
    setTestEnv({
      DATABASE_URL: 'postgresql://user:pass@pooler.supabase.com:6543/postgres',
      HYPERDRIVE_ENABLED: 'true',
    });
    const config = getDatabaseConfig();
    expect(config.isHyperdrive).toBe(true);
    expect(config.isSupabase).toBe(false);
    expect(config.isTransactionPooler).toBe(false);
  });

  test('returns isHyperdrive false when not set', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
    const config = getDatabaseConfig();
    expect(config.isHyperdrive).toBe(false);
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/ivan/Works/AI/expenses && bun test src/db/config.test.ts`
Expected: FAIL — `isHyperdrive` property doesn't exist on DatabaseConfig

**Step 3: Add isHyperdrive to DatabaseConfig and getDatabaseConfig**

In `src/db/config.ts`, add `isHyperdrive` to the interface:

```typescript
export interface DatabaseConfig {
  dialect: DatabaseDialect;
  url: string;
  isSupabase: boolean;
  isTransactionPooler: boolean;
  isHyperdrive: boolean;
  poolConfig?: { max: number; idleTimeout: number };
}
```

Update `getDatabaseConfig()`:

```typescript
export function getDatabaseConfig(): DatabaseConfig {
  const url = getDatabaseUrl();
  const dialect = detectDialect(url);
  const isHyperdrive = getEnv('HYPERDRIVE_ENABLED') === 'true';
  // Hyperdrive handles Supabase/pooler specifics — skip detection when active
  const isSupabase = !isHyperdrive && dialect === 'postgresql' && isSupabaseUrl(url);
  const isTransactionPooler =
    !isHyperdrive && dialect === 'postgresql' && isTransactionPoolerUrl(url);

  return {
    dialect,
    url,
    isSupabase,
    isTransactionPooler,
    isHyperdrive,
    poolConfig: dialect === 'postgresql' ? { max: 1, idleTimeout: 20 } : undefined,
  };
}
```

**Step 4: Run tests to verify they pass**

Run: `cd /Users/ivan/Works/AI/expenses && bun test src/db/config.test.ts`
Expected: ALL PASS

**Step 5: Commit**

```bash
git add src/db/config.ts src/db/config.test.ts
git commit -m "feat: add Hyperdrive detection to database config"
```

---

### Task 3: Update Runtime Env Middleware to Inject Hyperdrive Connection String

**Files:**

- Modify: `src/middleware/runtime-env.ts`

**Step 1: Update middleware to detect HYPERDRIVE binding**

Replace `src/middleware/runtime-env.ts`:

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
 * Must run before any middleware that accesses environment variables.
 */

import type { MiddlewareHandler } from 'astro';
import { setRuntimeEnv } from '@/db/config';

export const runtimeEnv: MiddlewareHandler = async (context, next) => {
  const runtime = (context.locals as any).runtime;
  if (runtime?.env) {
    const env = { ...runtime.env };

    // Hyperdrive provides a local connection that doesn't count as subrequests.
    // Its connectionString points to a local proxy — Hyperdrive handles
    // TCP/TLS to the origin database at the Cloudflare edge.
    const hyperdrive = runtime.env.HYPERDRIVE;
    if (hyperdrive?.connectionString) {
      env.DATABASE_URL = hyperdrive.connectionString;
      env.HYPERDRIVE_ENABLED = 'true';
    }

    setRuntimeEnv(env);
  }
  return next();
};
```

**Step 2: Verify typecheck passes**

Run: `cd /Users/ivan/Works/AI/expenses && bun run typecheck 2>&1 | tail -5`
Expected: No new errors (Hyperdrive binding is accessed via `any` cast)

**Step 3: Commit**

```bash
git add src/middleware/runtime-env.ts
git commit -m "feat: inject Hyperdrive connection string in runtime-env middleware"
```

---

### Task 4: Update PostgreSQL Driver for Hyperdrive Settings

**Files:**

- Modify: `src/db/drivers/postgres.ts`

**Step 1: Adjust SSL and prepare settings for Hyperdrive**

In `createPostgresDriver()`, update the postgres options:

```typescript
client = postgres(url, {
  max: config.poolConfig?.max ?? 1,
  idle_timeout: config.poolConfig?.idleTimeout ?? 20,
  // Hyperdrive handles SSL to origin — local connection is unencrypted.
  // Direct Supabase/production: require SSL.
  ssl: config.isHyperdrive ? false : getSslConfig(config.isSupabase),
  connect_timeout: 30,
  // Hyperdrive connects directly (not through PgBouncer), so prepared statements work.
  // Transaction pooler (PgBouncer): must disable prepared statements.
  prepare: config.isHyperdrive ? true : !config.isTransactionPooler,
  // Disable type catalog query to reduce overhead.
  fetch_types: false,
});
```

**Step 2: Verify typecheck**

Run: `cd /Users/ivan/Works/AI/expenses && bun run typecheck 2>&1 | tail -5`
Expected: No new errors

**Step 3: Commit**

```bash
git add src/db/drivers/postgres.ts
git commit -m "feat: adjust postgres.js SSL/prepare settings for Hyperdrive"
```

---

### Task 5: Update Database Middleware Diagnostics

**Files:**

- Modify: `src/middleware/database.ts`

**Step 1: Add Hyperdrive status to diagnostic log**

Update the log line in the `database` middleware:

```typescript
console.log(
  `[database] dialect=${config.dialect}` +
    ` url=${config.url ? config.url.replace(/\/\/.*@/, '//***@') : 'MISSING'}` +
    ` supabase=${config.isSupabase}` +
    ` hyperdrive=${config.isHyperdrive}`
);
```

**Step 2: Commit**

```bash
git add src/middleware/database.ts
git commit -m "feat: add Hyperdrive status to database middleware diagnostics"
```

---

### Task 6: Update wrangler.toml with Real Config ID and Deploy

**Files:**

- Modify: `wrangler.toml`

**Step 1: Replace placeholder with actual Hyperdrive config ID**

After running `wrangler hyperdrive create expenses-db --connection-string="<direct-url>"`,
replace `<REPLACE_WITH_HYPERDRIVE_CONFIG_ID>` with the actual ID.

**Step 2: Run quality gates**

```bash
cd /Users/ivan/Works/AI/expenses
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
bun test src/db/config.test.ts
```

Expected: All pass

**Step 3: Build and deploy**

```bash
bun run deploy:cloudflare
```

**Step 4: Verify the fix**

Test POST `/api/auth/login` and check logs:

- Should see: `[database] dialect=postgresql url=//***@... hyperdrive=true`
- Should see: `[database] Total fetch subrequests: 0` (or low count)
- Should NOT see: `Too many subrequests` error
- Login should succeed

**Step 5: Final commit with config ID**

```bash
git add wrangler.toml
git commit -m "feat: add Hyperdrive config for production database connection pooling"
```

---

## Rollback Plan

If Hyperdrive causes issues:

1. **Remove** the `[[hyperdrive]]` section from `wrangler.toml`
2. **Ensure** `DATABASE_URL` secret is still set: `wrangler secret put DATABASE_URL`
3. **Deploy**: `bun run deploy:cloudflare`

The code changes are backward-compatible — without the HYPERDRIVE binding, the middleware skips injection and falls back to the original `DATABASE_URL` secret with direct postgres.js TCP connection.

---

## Architecture Summary

```
Before (broken):
  Worker → TCP connect → TLS handshake → PgBouncer → Supabase
           ↑ Many subrequests (TCP + SSL round-trips)

After (Hyperdrive):
  Worker → local proxy (0 subrequests) → Hyperdrive edge pool → Supabase
           ↑ No subrequests               ↑ Persistent connections
```

**Key behavior changes with Hyperdrive:**
| Setting | Before (direct) | After (Hyperdrive) |
|---------|-----------------|-------------------|
| SSL | `'require'` | `false` (Hyperdrive handles it) |
| Prepared statements | `false` (PgBouncer) | `true` (direct connection) |
| Connection target | Supabase pooler:6543 | Local Hyperdrive proxy |
| Subrequests per query | 10-50+ (TCP/TLS) | 0 (local) |
