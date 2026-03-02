# Database Migrations

## Overview

This project uses Drizzle ORM with dual-dialect support:

- SQLite for local development (`drizzle/sqlite`)
- PostgreSQL for staging/production (`drizzle/postgresql`)

Every schema change must be represented in both dialect schema folders and both migration folders.

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
bun --env-file=.env.production run db:generate
bun --env-file=.env.production run db:migrate
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

- Example for missing `0003_snapshot.json`:
  - copy `.tmp/drizzle-<dialect>-base/meta/0000_snapshot.json` to `drizzle/<dialect>/meta/0003_snapshot.json`
  - set `prevId` of `0003_snapshot.json` to the `id` value from `drizzle/<dialect>/meta/0002_snapshot.json`

3. Regenerate migrations normally.

```bash
bun run db:generate
bun --env-file=.env.production run db:generate
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
