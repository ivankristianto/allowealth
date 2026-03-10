# Database Migrations

## Overview

This project uses Drizzle ORM with a single SQLite-compatible migration strategy:

- `drizzle/sqlite` for local development and canonical migration history
- Cloudflare D1 in production using the same SQLite migration files

Every schema change is represented once, in the SQLite schema and SQLite migration directory.

As of 2026-03-10, migration history was intentionally reset again to collapse the SQLite chain back to a single baseline. The active baseline starts at `0000_*.sql`.

## Reset Cutover (2026-03-10)

This reset is destructive for environments that previously applied the old migration chain. Do not run the new baseline over an existing database without reset.

### SQLite cutover

1. Backup the database file if needed.
2. Remove existing DB files (`.db`, `-wal`, `-shm`) for the target environment.
3. Apply the new baseline with `bun run db:migrate` or recreate locally with `bun run db:reset`.
4. Verify schema and seed state.

### D1 cutover

1. Backup the D1 database if needed.
2. Create a fresh D1 database or clear the existing one intentionally.
3. Apply each file from `drizzle/sqlite/` with `wrangler d1 execute`.
4. Verify table creation and application startup.

## Directory Structure

```text
src/db/schema/
└── sqlite/

drizzle/
└── sqlite/
    ├── 000N_*.sql
    └── meta/
        ├── _journal.json
        └── 000N_snapshot.json
```

## Standard Commands

```bash
bun run db:generate
bun run db:migrate
bun run db:push
```

For D1 deployment:

```bash
for f in drizzle/sqlite/*.sql; do
  wrangler d1 execute allowealth-db --remote --file="$f"
done
```

## Normal Workflow

1. Edit the schema in `src/db/schema/sqlite/*`.
2. Generate a SQLite migration with `bun run db:generate`.
3. Apply the migration locally with `bun run db:migrate`.
4. Verify behavior in the app and CLI.
5. Commit schema files and the `drizzle/sqlite` migration changes together.

## Stale Snapshot Remediation (Drizzle Meta Drift)

Use this when `drizzle-kit generate` shows unrelated rename prompts or when a `drizzle/sqlite/meta/000N_snapshot.json` file is missing while `_journal.json` references that index.

Symptoms:

- interactive rename prompts for tables you did not touch
- missing `000N_snapshot.json` in `drizzle/sqlite/meta`
- generated migration contains broad rename or recreate churn instead of the intended delta

Remediation workflow:

1. Build a baseline snapshot from the last committed SQLite schema.

```bash
mkdir -p .tmp/base-schema

git archive --format=tar HEAD src/db/schema/sqlite \
  | tar -xf - -C .tmp/base-schema

bunx drizzle-kit generate \
  --dialect sqlite \
  --schema ./.tmp/base-schema/src/db/schema/sqlite \
  --out ./.tmp/drizzle-sqlite-base
```

2. Restore the missing snapshot index using the generated baseline snapshot content.
3. Regenerate migrations normally with `bun run db:generate`.
4. Verify the generated SQL contains only the intended changes.
5. Remove `.tmp/*` helpers before finishing.

Important:

- Do not rewrite or delete historical SQL migrations to fix meta drift.
- Treat meta repair as a forward-only correction to unblock deterministic diffs.

## Production Notes

- Local `drizzle-kit migrate` is for developer validation.
- Production D1 rollout uses Wrangler D1 execution against the same SQLite SQL files.
- `db:push` remains a local-development shortcut, not a production migration workflow.
