# Database Migrations

## Overview

This project uses Drizzle ORM with dual-dialect support:

- SQLite for local development (`drizzle/sqlite`)
- PostgreSQL for staging/production (`drizzle/postgresql`)

Every schema change must be represented in both dialect schema folders and both migration folders.

As of 2026-03-02, migration history was intentionally reset for MVP pre-release cleanup.
The current baseline is `0000_*.sql` per dialect, with fresh `meta/_journal.json` and
`meta/0000_snapshot.json`.

## Reset Cutover (2026-03-02)

This reset is destructive for environments that previously applied the old `0000`-`0006`
migration chain. Do not run the new baseline over an existing database without reset.

SQLite cutover:

1. Backup DB file if needed.
2. Remove existing DB files (`.db`, `-wal`, `-shm`) for the target environment.
3. Apply the new baseline with `bun run db:migrate` (or recreate with `bun run db:reset` in local dev).
4. Verify schema and seed state.

PostgreSQL cutover:

1. Backup database/schemas if needed.
2. Drop and recreate target schema/database (or provision a fresh DB).
3. Apply the new baseline with `DATABASE_URL=postgresql://... bun run db:migrate`.
4. Verify table/index presence and application startup.

## Directory Structure

```text
src/db/schema/
├── sqlite/
└── postgresql/

drizzle/
├── sqlite/
│   ├── 000N_*.sql
│   └── meta/
│       ├── _journal.json
│       └── 000N_snapshot.json
└── postgresql/
    ├── 000N_*.sql
    └── meta/
        ├── _journal.json
        └── 000N_snapshot.json
```

## Standard Commands

SQLite:

```bash
bun run db:generate
bun run db:migrate
```

PostgreSQL:

```bash
DATABASE_URL=postgresql://... bun run db:generate
DATABASE_URL=postgresql://... bun run db:migrate
```

## Normal Workflow

1. Edit both schema dialects in `src/db/schema/sqlite/*` and `src/db/schema/postgresql/*`.
2. Generate SQLite migration.
3. Generate PostgreSQL migration.
4. Apply SQLite migration locally.
5. Commit schema files plus both `drizzle/*` directories.

## Stale Snapshot Remediation (Drizzle Meta Drift)

Use this when `drizzle-kit generate` shows unrelated rename prompts (for example `asset_*` to `account_*`) or when a `drizzle/*/meta/000N_snapshot.json` file is missing while `_journal.json` references that index.

Symptoms:

- Interactive rename prompts for tables you did not touch.
- Missing `000N_snapshot.json` in `drizzle/<dialect>/meta`.
- Generated migration contains broad table rename/create/drop churn instead of intended deltas.

Remediation workflow:

1. Build a baseline snapshot from the last committed schema (not current uncommitted edits).

```bash
mkdir -p .tmp/base-schema

git archive --format=tar HEAD src/db/schema/sqlite src/db/schema/postgresql \
  | tar -xf - -C .tmp/base-schema

bunx drizzle-kit generate \
  --dialect sqlite \
  --schema ./.tmp/base-schema/src/db/schema/sqlite \
  --out ./.tmp/drizzle-sqlite-base

bunx drizzle-kit generate \
  --dialect postgresql \
  --schema ./.tmp/base-schema/src/db/schema/postgresql \
  --out ./.tmp/drizzle-pg-base
```

2. Restore missing snapshot index using baseline snapshot content.

- For a missing `000N_snapshot.json`:
  - copy `.tmp/drizzle-<dialect>-base/meta/0000_snapshot.json` to `drizzle/<dialect>/meta/000N_snapshot.json`
  - set `prevId` of `000N_snapshot.json` to the `id` from the previous snapshot in `drizzle/<dialect>/meta/`

3. Regenerate migrations normally.

```bash
bun run db:generate
DATABASE_URL=postgresql://... bun run db:generate
```

4. Verify generated SQL contains only intended changes.
5. Remove `.tmp/*` helpers before finishing.

Important:

- Do not rewrite or delete historical SQL migrations to fix meta drift.
- Treat meta repair as a forward-only correction to unblock deterministic diffs.

## Production Notes

- Local `drizzle-kit migrate` is for developer validation.
- For PostgreSQL production index rollout, use lock-safe concurrent DDL. See:
  - `docs/deployment/2026-03-01-db-index-rollout-runbook.md`
