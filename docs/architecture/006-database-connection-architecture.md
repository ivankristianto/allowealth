# Database Connection Architecture

> **ADR-006** | Created: 2026-02-04

## Overview

This document describes how the application connects to databases across different runtimes, how Cloudflare Hyperdrive eliminates subrequest overhead in Workers, and how the middleware chain manages per-request connection lifecycles.

## Problem

The application runs on multiple runtimes with different database requirements:

- **Local development (Bun):** SQLite via `bun:sqlite` or `better-sqlite3`
- **Production (Cloudflare Workers):** PostgreSQL via `postgres.js` to Supabase

In Cloudflare Workers, connecting to PostgreSQL directly caused **"Too many subrequests"** errors because each TCP socket operation (connect, TLS handshake, protocol messages) counts as a subrequest. A single database query could consume 10-50+ subrequests, exceeding Workers' limit.

Additionally, Workers bind I/O objects (TCP sockets) to the request context that created them. Reusing a connection from a previous request throws: _"Cannot perform I/O on behalf of a different request"_.

## Solution

### Dual-Dialect Driver Selection

The database dialect is detected from `DATABASE_URL` format:

```
postgres:// or postgresql://  →  PostgreSQL (postgres.js + Drizzle)
anything else (file path)     →  SQLite (bun:sqlite or better-sqlite3 + Drizzle)
```

**Key files:**

- `src/db/config.ts` — Dialect detection, Supabase/Hyperdrive flags
- `src/db/index.ts` — Singleton management, lazy initialization via Proxy
- `src/db/drivers/postgres.ts` — postgres.js client with SSL/prepare settings
- `src/db/drivers/bun.ts` — bun:sqlite driver (local dev)
- `src/db/drivers/node.ts` — better-sqlite3 driver (Node.js fallback)

### Cloudflare Hyperdrive Integration

Hyperdrive is Cloudflare's edge connection pooling service that maintains persistent TCP+TLS connections to the database at the Cloudflare edge. Workers connect to a local proxy instead of opening remote TCP sockets.

```
Before (broken):
  Worker → TCP connect → TLS handshake → PgBouncer → Supabase
           ↑ Many subrequests (TCP + SSL round-trips)

After (Hyperdrive):
  Worker → local proxy (0 subrequests) → Hyperdrive edge pool → Supabase
           ↑ No subrequests               ↑ Persistent connections
```

**Configuration:**

```toml
# wrangler.toml
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "<config-id>"
```

**How Hyperdrive is detected at runtime:**

1. `runtimeEnv` middleware reads `runtime.env.HYPERDRIVE` binding
2. If present, injects `hyperdrive.connectionString` as `DATABASE_URL`
3. Sets `HYPERDRIVE_ENABLED=true` in runtime env
4. `getDatabaseConfig()` reads the flag and sets `isHyperdrive: true`

**What changes with Hyperdrive active:**

| Setting               | Direct Connection    | Hyperdrive                      |
| --------------------- | -------------------- | ------------------------------- |
| SSL                   | `'require'`          | `false` (Hyperdrive handles it) |
| Prepared statements   | `false` (PgBouncer)  | `true` (direct connection)      |
| Connection target     | Supabase pooler:6543 | Local Hyperdrive proxy          |
| Subrequests per query | 10-50+ (TCP/TLS)     | 0 (local)                       |

### DatabaseConfig Interface

```typescript
interface DatabaseConfig {
  dialect: 'sqlite' | 'postgresql';
  url: string;
  isSupabase: boolean; // Supabase domain detected
  isTransactionPooler: boolean; // Port 6543 (PgBouncer)
  isHyperdrive: boolean; // Hyperdrive binding active
  poolConfig?: { max: number; idleTimeout: number };
}
```

When `isHyperdrive` is true, `isSupabase` and `isTransactionPooler` are forced to `false` because Hyperdrive handles those concerns transparently.

## Request Lifecycle

### Middleware Chain

```typescript
// src/middleware/index.ts
export const onRequest = sequence(
  runtimeEnv, // 1. Inject Workers secrets + Hyperdrive URL
  database, // 2. Reset connection, manage lifecycle
  perfDebug, // 3. Performance instrumentation
  securityHeaders, // 4. CSP, HSTS, etc.
  authentication, // 5. Session validation
  csrf, // 6. CSRF token verification
  routeGuard // 7. Route access control
);
```

### Database Middleware Detail

The `database` middleware (`src/middleware/database.ts`) manages the per-request connection lifecycle:

```
Request Start
  │
  ├─ getDatabaseConfig()          → Read dialect, flags
  ├─ Log diagnostic info          → dialect, URL (masked), hyperdrive status
  ├─ Wrap globalThis.fetch        → Count subrequests for debugging
  │
  ├─ If SQLite: skip lifecycle management (file-based, safe to reuse)
  │
  ├─ If PostgreSQL:
  │   ├─ prepareForRequest()      → Reset postgres client singleton
  │   │                             (discards stale I/O context reference)
  │   ├─ await next()             → Route handler runs, DB accessed lazily
  │   └─ finally:
  │       ├─ Log subrequest count
  │       ├─ Restore original fetch
  │       └─ closeDatabase()      → End postgres connection
  │
  └─ Response sent
```

### Lazy Initialization

The database instance is not created at module import time. Instead, `src/db/index.ts` exports a Proxy that calls `getDb()` on first property access:

```typescript
export const db = new Proxy({} as Database, {
  get(_target, prop) {
    return getDb()[prop as keyof Database];
  },
});
```

This ensures the connection is created in the correct Workers request context, not at module load time when secrets are unavailable.

## Environment Variable Resolution

Database URL is resolved with this priority chain (via `src/lib/env.ts`):

1. **Test overrides** — `setTestEnv()` for unit tests
2. **Runtime env** — `setRuntimeEnv()` from Workers middleware (secrets + Hyperdrive)
3. **process.env** — Standard environment variables
4. **import.meta.env** — Astro/Vite build-time variables
5. **Fallback** — `db/.dev.db` (SQLite for local development)

## Rollback

If Hyperdrive causes issues in production:

1. Remove the `[[hyperdrive]]` section from `wrangler.toml`
2. Ensure `DATABASE_URL` secret is set: `wrangler secret put DATABASE_URL`
3. Deploy: `bun run deploy:cloudflare`

The code is backward-compatible — without the HYPERDRIVE binding, the middleware skips injection and falls back to direct postgres.js TCP connection.

## Related

- **ADR-004** (`004-database-schema.md`) — Schema design and table definitions
- **ADR-003** (`003-api-authentication.md`) — How middleware sets `context.locals.user`
- **Plan** (`docs/plans/2026-02-04-hyperdrive-fix-subrequests.md`) — Original implementation plan
