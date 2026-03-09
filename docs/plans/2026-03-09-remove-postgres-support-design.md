# Remove PostgreSQL, Supabase, and Hyperdrive Support

**Issue:** #302
**Date:** 2026-03-09
**Status:** Approved

## Goal

Remove all PostgreSQL, Supabase, and Hyperdrive code from the codebase. Standardize on SQLite (local dev) and Cloudflare D1 (production).

## Decisions

| Question | Decision |
|----------|----------|
| Abstraction simplification | Moderate — collapse `getActiveSchema()` to SQLite, keep SQLite/D1 driver distinction |
| CLI target system | Keep `--target` with `sqlite` and `d1` only |
| `rotate-db-password.ts` | Delete entirely |
| ADR 006 | Rewrite for SQLite/D1 architecture |
| Execution strategy | Single PR with logical commits |

## What Changes

### Delete

- `src/db/drivers/postgres.ts` — PostgreSQL driver
- `src/db/drop-postgres.ts` — PostgreSQL table drop script
- `src/db/schema/postgresql/` — 27 PostgreSQL schema files
- `drizzle/postgresql/` — PostgreSQL migrations and snapshots
- `src/cli/rotate-db-password.ts` — Supabase password rotation script

### Simplify

**Database core (`src/db/`)**

- `config.ts`: Remove `detectDialect()`, `isSupabaseUrl()`, `isTransactionPoolerUrl()`, and Hyperdrive logic. `getDatabaseConfig()` returns SQLite or D1 config only.
- `index.ts`: Remove PostgreSQL imports, PostgreSQL branch in `createDatabase()`, `resetPostgresClient()`, and PostgreSQL cleanup in `closeDatabase()`. `getActiveSchema()` returns SQLite schema always.
- `empty.ts`: Remove PostgreSQL `TRUNCATE ... CASCADE` path.
- `DatabaseDialect` type becomes `'sqlite' | 'd1'`.

**Drizzle config**

- `drizzle.config.ts`: Remove PostgreSQL config path. Single SQLite config remains.

**Auth**

- `src/lib/auth/lucia.ts`: Delete `CloudflarePostgreSQLAdapter`. `createAdapter()` always uses SQLite adapter.

**Services**

- `transaction.service.ts`: Remove `isPostgres` dialect branch for date extraction.
- `report.service.ts`: Remove `dialect === 'postgresql'` branch (`to_char()` vs `strftime()`).
- `auth.service.ts`: Remove postgres.js error comment.

**Middleware**

- `database.ts`: Remove PostgreSQL diagnostic logging and conditional cleanup path.
- `runtime-env.ts`: Remove Hyperdrive binding references.

**CLI**

- `src/cli/commands/db.ts`: Remove `pg_dump`/`pg_restore`/`psql` paths and PostgreSQL backup format detection.
- `src/cli/commands/admin.ts`: Remove `rotate-db-password` subcommand registration.
- `src/cli/lib/target.ts`: Remove `'postgres'` from `CliTarget` and `VALID_TARGETS`.

**Types and diagnostics**

- `src/types/diagnostics.ts`: Remove `isSupabase`, `isTransactionPooler`, `isHyperdrive`, `connectionPoolConfig`.
- `DiagnosticsDisplay.astro`: Remove Hyperdrive/Supabase display sections.

**Logging**

- `src/lib/logger.ts`: Remove postgres:// URL sanitization pattern.

**OpenAPI**

- `openapi/schemas/DatabaseInfo.yml`: Remove PostgreSQL-specific fields.

**Dependencies**

- `package.json`: Remove `postgres` dependency.

### Update Documentation

- **Rewrite** `docs/architecture/006-database-connection-architecture.md` for SQLite/D1.
- **Update** `docs/architecture/007-database-migrations.md`: Remove PostgreSQL migration references.
- **Update** `docs/architecture/004-database-schema.md`: Remove postgresql/ directory references.
- **Update** `.claude/CLAUDE.md`: Remove PostgreSQL+Hyperdrive from tech stack, directory structure, ADR table, and db commands.
- **Update** `COMMANDS.md`: Remove all `--target postgres` examples.
- **Update** `wrangler.toml.example`: Remove Hyperdrive configuration.
- **Update** `.claude/rules/backend/database.md`: Remove dual-dialect references.

### Update Tests

- `src/db/config.test.ts`: Remove PostgreSQL dialect detection, Supabase, and Hyperdrive tests.
- `src/cli/lib/target.test.ts`: Remove postgres target tests.
- `src/lib/perf/collector.test.ts`: Remove `'postgresql'` dialect test case.
- `src/lib/logger.test.ts`: Remove PostgreSQL URL sanitization test.

## Commit Plan

| # | Scope | Description |
|---|-------|-------------|
| 1 | Core removal | Delete driver, schema dir, migrations dir; simplify config and db index |
| 2 | Consumer cleanup | Services, auth adapter, middleware, diagnostics |
| 3 | CLI cleanup | Delete rotate-db-password, simplify db commands and target system |
| 4 | Types and API | Diagnostics types, OpenAPI schemas, logging |
| 5 | Docs | Architecture docs, CLAUDE.md, COMMANDS.md, rules |
| 6 | Tests | Update all test files |
| 7 | Dependencies | Remove `postgres` from package.json, run `bun install` |

## Risk Mitigation

- Run `bun run typecheck` after each commit to catch broken imports.
- Run `bun run test` after test updates to verify no regressions.
- Run full quality gates before PR.

## Out of Scope

- D1 support (remains primary production target)
- SQLite local development support
- New database dialect additions
