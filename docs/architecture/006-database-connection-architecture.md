# Database Connection Architecture

> **ADR-006** | Created: 2026-02-04 | Updated: 2026-03-09

## Overview

This document describes how Allowealth connects to the database across local development, Cloudflare Workers, and CLI workflows after removing PostgreSQL, Supabase, and Hyperdrive support.

## Decision

Allowealth now uses a single SQLite-compatible schema everywhere:

- **Local development:** Bun SQLite via `bun:sqlite`
- **Production on Cloudflare Workers:** Cloudflare D1 via the `DB` binding
- **CLI access to D1:** Wrangler-backed local D1 or remote D1 HTTP access

This removes dialect switching, connection pooling, and PostgreSQL-specific runtime branches.

## Why

The application runs in environments with different database access mechanisms:

- Bun can open a local SQLite file directly.
- Cloudflare Workers access D1 through a binding on each request.
- CLI commands sometimes need local D1 state and sometimes need remote D1 access.

Using one SQLite-compatible schema across all of them keeps runtime behavior consistent and cuts maintenance overhead.

## Runtime Model

### Local development

Local development uses `bun:sqlite` with Drizzle ORM.

- Database file: `db/.dev.db`
- SQLite WAL mode enabled
- SQLite PRAGMA tuning applied at startup
- No external database service required

### Cloudflare Workers production

Production uses Cloudflare D1.

- The `runtimeEnv` middleware reads the `DB` binding from the Worker request context.
- The middleware sets `D1_ENABLED=true` and stores the D1 binding for the current request.
- The database layer creates a D1-backed Drizzle instance when the binding is present.

### CLI access

The CLI supports three database targets:

- `sqlite` for the local Bun SQLite file
- `d1` for remote Cloudflare D1 access
- `d1-local` for Wrangler-managed local D1 state

## Key Files

- `src/db/config.ts` — returns SQLite/D1-only database config
- `src/db/index.ts` — lazy database creation and shared schema access
- `src/db/drivers/bun.ts` — Bun SQLite driver
- `src/db/drivers/d1.ts` — Cloudflare D1 binding support
- `src/db/drivers/d1-http.ts` — remote D1 CLI access
- `src/db/drivers/d1-local.ts` — local D1 CLI access
- `src/middleware/runtime-env.ts` — injects runtime env and D1 binding
- `src/middleware/database.ts` — resets per-request DB state

## Configuration

### DatabaseConfig

```ts
interface DatabaseConfig {
  dialect: 'sqlite';
  url: string;
  isD1: boolean;
}
```

Rules:

- `D1_ENABLED=true` means D1 is active.
- D1 does not use a URL, so `url` is an empty string in D1 mode.
- Otherwise the app uses `DATABASE_URL` or falls back to `db/.dev.db`.

## Request Lifecycle

### Middleware order

```ts
export const onRequest = sequence(
  runtimeEnv,
  database,
  perfDebug,
  securityHeaders,
  authentication,
  csrf,
  routeGuard
);
```

### Per-request behavior

In Workers, runtime bindings are request-scoped. The database layer must reset cached state before request work begins.

Flow:

1. `runtimeEnv` reads the Worker runtime env.
2. If `runtime.env.DB` exists, it stores the D1 binding and sets `D1_ENABLED=true`.
3. `database` calls `prepareForRequest()`.
4. The first DB access lazily creates the correct Drizzle instance for the active environment.
5. The request finishes and middleware clears the stored D1 binding.

## Lazy Initialization

The database instance is created on first use through the exported proxy from `src/db/index.ts`.

This keeps module load safe in Workers and ensures the correct per-request binding is used.

## Transactions

`runTransaction()` now runs the callback directly for both SQLite and D1.

Why:

- SQLite local development is single-writer and file-based.
- D1 does not support raw `BEGIN`/`COMMIT`/`ROLLBACK` SQL in the same way as PostgreSQL adapters.

The helper preserves one API across both environments without dialect branching.

## Environment Resolution

Database configuration is resolved in this order:

1. test overrides via `setTestEnv()`
2. runtime env via `setRuntimeEnv()`
3. process env
4. import-time env
5. fallback to `db/.dev.db`

## Operational Notes

### Local development

```bash
bun run db:generate
bun run db:migrate
bun run db:push
```

### Cloudflare D1 deployment

```bash
wrangler d1 create allowealth-db
for f in drizzle/sqlite/*.sql; do
  wrangler d1 execute allowealth-db --remote --file="$f"
done
bun run deploy:cloudflare
```

## Consequences

Benefits:

- one schema directory
- one migration directory
- fewer runtime branches
- less auth, service, and CLI complexity

Trade-offs:

- PostgreSQL-only features are no longer available
- production and local environments now share SQLite-compatible constraints

## Related

- `004-database-schema.md` — schema structure
- `007-database-migrations.md` — migration workflow
- `src/db/index.ts` — runtime database entry point
