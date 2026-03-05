---
title: Database Management
description: Backup, restore, migrate, and maintain Allowealth databases across SQLite, PostgreSQL, and Cloudflare D1.
draft: false
head: []
sidebar:
  label: Database Management
  order: 2
audience:
  - developer
---

The `aw db` CLI commands manage all database backends: SQLite (local development), PostgreSQL (production), and Cloudflare D1 (production).

## Supported Targets

| Target     | Use Case                 | Configuration                       |
| ---------- | ------------------------ | ----------------------------------- |
| `sqlite`   | Local development        | `db/.dev.db`                        |
| `postgres` | Production PostgreSQL    | `DATABASE_URL` in `.env.production` |
| `d1`       | Production Cloudflare D1 | Auto-loads `.env.production`        |
| `d1-local` | Local D1 development     | Wrangler local emulation            |

## Migrations

### Generate Migration

Create a migration from schema changes:

```bash
bun run aw db generate
```

### Apply Migration

Apply pending migrations to the selected target:

```bash
# SQLite (default)
bun run aw db migrate

# PostgreSQL
bun run aw db migrate --target postgres

# Remote D1
bun run aw db migrate --target d1

# Local D1
bun run aw db migrate --target d1-local
```

## Schema Changes

### Quick Development (No Migration)

Push schema changes directly to SQLite:

```bash
bun run aw db push
```

Use this only in development. It bypasses migration tracking.

### Reset Database

Delete SQLite database, recreate schema, and seed data:

```bash
bun run aw db reset
```

This command works only with SQLite.

## Backup

Create timestamped backups for any target:

```bash
# SQLite
bun run aw db backup --target sqlite

# PostgreSQL (plain SQL)
bun run aw db backup --target postgres

# PostgreSQL (custom format for faster restores)
bun run aw db backup --target postgres --format custom

# Remote D1
bun run aw db backup --target d1

# Local D1
bun run aw db backup --target d1-local
```

**Output:** By default, backups save to `backups/<target>-<timestamp>.<ext>`.

**Custom path:**

```bash
bun run aw db backup --target sqlite --output /path/to/backup.db
```

## Restore

Restore validates backups and creates automatic pre-restore snapshots.

### Dry Run

Validate a backup without restoring:

```bash
bun run aw db restore --target postgres --source cloud --dry-run
```

This displays:

- Source and file path
- Size and timestamp
- Detected format
- Schema version (when available)

### Restore from Local Backup

```bash
# Interactive (requires confirmation)
bun run aw db restore --target sqlite

# Non-interactive (skips prompt)
bun run aw db restore --target sqlite --force

# Skip pre-restore backup
bun run aw db restore --target sqlite --force --no-backup

# Specific file
bun run aw db restore --target sqlite --file backups/sqlite-2026-03-04.sql
```

### Restore from Cloud Backup

```bash
bun run aw db restore --target postgres --source cloud
```

Cloud backups read from `backups/cloud/` by default. Change this:

```bash
bun run aw db restore --target postgres --source cloud --cloud-dir /path/to/cloud/backups
```

### Pre-Restore Backup

By default, restore creates a backup before applying changes. The automatic backup saves to `backups/pre-restore-<timestamp>.<ext>`.

Skip this safety measure:

```bash
bun run aw db restore --target sqlite --no-backup
```

## Data Seeding

### Seed with Demo Data

```bash
bun run aw db seed --target sqlite
```

### Add Benchmark Data

Add ~10,000 transactions for performance testing:

```bash
bun run aw db seed --target sqlite --benchmark
```

## Dangerous Operations

### Drop All Tables

Delete all tables and reset the database:

```bash
# SQLite
bun run aw db drop

# Remote D1
bun run aw db drop --target d1

# PostgreSQL
bun run aw db drop --target postgres
```

This command requires typing "yes" to confirm.

### Truncate Data

Delete all data while preserving the schema:

```bash
bun run aw db empty
```

## D1-Specific Operations

### Export D1 Database

The `backup` command uses `wrangler d1 export`:

```bash
bun run aw db backup --target d1
```

### Restore D1 Database

The `restore` command uses `wrangler d1 execute`:

```bash
bun run aw db restore --target d1 --file backups/d1-2026-03-04.sql
```

## PostgreSQL-Specific Operations

### Backup Format Options

**Plain SQL:**

```bash
bun run aw db backup --target postgres --format sql
```

Use this for smaller databases or when you need to edit the backup.

**Custom Format:**

```bash
bun run aw db backup --target postgres --format custom
```

Use this for faster restores and better compression.

### Restore Compressed Backups

The restore command detects gzip compression automatically:

```bash
bun run aw db restore --target postgres --file backups/postgres-2026-03-04.sql.gz
```

## Quality Checks

Before committing database changes, run these checks:

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

## See Also

- [COMMANDS.md](https://github.com/ivankristianto/allowealth/blob/main/COMMANDS.md) - Complete CLI reference
- [Database Migrations](/architecture/database-migrations/) - Migration workflow and patterns
- [Feature Workflow](/developers/feature-workflow/) - Implementation sequence for new features
