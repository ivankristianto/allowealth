---
title: Database Management
description: Backup, restore, migrate, and maintain Allowealth databases across SQLite and Cloudflare D1.
draft: false
head: []
sidebar:
  label: Database Management
  order: 2
audience:
  - developer
---

The `aw db` CLI commands manage the supported Allowealth database targets:

- `sqlite` for local development
- `d1` for remote Cloudflare D1
- `d1-local` for Wrangler-managed local D1 state

## Supported Targets

| Target     | Use Case             | Configuration                |
| ---------- | -------------------- | ---------------------------- |
| `sqlite`   | Local development    | `db/.dev.db`                 |
| `d1`       | Remote Cloudflare D1 | `.env.production` + Wrangler |
| `d1-local` | Local D1 emulation   | Wrangler local state         |

## Migrations

### Generate a migration

Create a migration from schema changes:

```bash
bun run aw db generate
```

### Apply migrations

Apply pending migrations to the selected target:

```bash
# SQLite (default)
bun run aw db migrate

# Remote D1
bun run aw db migrate --target d1

# Local D1
bun run aw db migrate --target d1-local
```

## Schema changes

### Quick development workflow

Push schema changes directly to SQLite:

```bash
bun run aw db push
```

Use this only in development. It bypasses migration tracking.

### Reset local SQLite

Delete the local SQLite database, recreate the schema, and seed demo data:

```bash
bun run aw db reset
```

This command works only with the `sqlite` target.

## Backup

Create timestamped backups for any supported target:

```bash
# SQLite
bun run aw db backup --target sqlite

# Remote D1
bun run aw db backup --target d1

# Local D1
bun run aw db backup --target d1-local
```

By default, backups save to `backups/<target>-<timestamp>.<ext>`.

Use a custom path when needed:

```bash
bun run aw db backup --target sqlite --output /path/to/backup.db
```

## Restore

Restore validates backups before applying changes and creates a safety backup unless you opt out.

### Dry run

Validate a backup without restoring it:

```bash
bun run aw db restore --target d1 --source cloud --dry-run
```

### Restore from local backup

```bash
# Interactive (requires confirmation)
bun run aw db restore --target sqlite

# Non-interactive
bun run aw db restore --target sqlite --force

# Skip pre-restore backup
bun run aw db restore --target sqlite --force --no-backup

# Restore a specific file
bun run aw db restore --target sqlite --file backups/sqlite-2026-03-04.sql
```

### Restore from cloud backup

```bash
bun run aw db restore --target d1 --source cloud
```

Cloud backups read from `backups/cloud/` by default. Override the location if needed:

```bash
bun run aw db restore --target d1 --source cloud --cloud-dir /path/to/cloud/backups
```

## Data seeding

### Seed demo data

```bash
bun run aw db seed --target sqlite
```

### Control data volume

```bash
# Seed 6 months of history
bun run aw db seed --target sqlite --months=6

# Seed 12 months + 5,000 extra transactions
bun run aw db seed --target sqlite --months=12 --transactions=5000
```

### Add benchmark data

```bash
bun run aw db seed --target sqlite --benchmark
```

### Add stress-test data

```bash
bun run aw db seed --target sqlite --stress
```

## Dangerous operations

### Drop all tables

Delete all tables and reset the selected database:

```bash
# SQLite
bun run aw db drop

# Remote D1
bun run aw db drop --target d1

# Local D1
bun run aw db drop --target d1-local
```

This command requires typed confirmation.

### Empty data but keep schema

```bash
bun run aw db empty
```

## D1-specific operations

### Export a D1 database

The backup command uses `wrangler d1 export` for D1 targets:

```bash
bun run aw db backup --target d1
```

### Restore a D1 database

The restore command uses `wrangler d1 execute`:

```bash
bun run aw db restore --target d1 --file backups/d1-2026-03-04.sql
```

## Quality checks

Before committing database changes, run:

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

## See also

- [COMMANDS.md](https://github.com/ivankristianto/allowealth/blob/main/COMMANDS.md) - Complete CLI reference
- [Database Migrations](/architecture/database-migrations/) - Migration workflow and patterns
- [Feature Workflow](/developers/feature-workflow/) - Implementation sequence for new features
