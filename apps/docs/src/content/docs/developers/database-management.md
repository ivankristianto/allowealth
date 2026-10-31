---
title: Database Management
description: Backup, restore, migrate, and maintain the Allowealth SQLite database.
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

## Supported Targets

| Target   | Use Case          | Configuration |
| -------- | ----------------- | ------------- |
| `sqlite` | Local development | `db/.dev.db`  |

## Migrations

### Generate a migration

Create a migration from schema changes:

```bash
bun run aw db generate
```

### Apply migrations

Apply pending migrations to the selected target:

```bash
bun run aw db migrate
```

## Schema changes

### Reset local SQLite

Delete the local SQLite database, recreate the schema, and seed demo data:

```bash
bun run aw db reset
```

This command works only with the `sqlite` target.

## Backup

Create timestamped backups for any supported target:

```bash
bun run aw db backup --target sqlite
```

By default, backups save to `backups/sqlite-<timestamp>.db`.

Use a custom path when needed:

```bash
bun run aw db backup --target sqlite --output /path/to/backup.db
```

## Restore

Restore validates backups before applying changes and creates a safety backup unless you opt out.

### Dry run

Validate a backup without restoring it:

```bash
bun run aw db restore --dry-run
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
bun run aw db restore --source cloud
```

Cloud backups read from `backups/cloud/` by default. Override the location if needed:

```bash
bun run aw db restore --source cloud --cloud-dir /path/to/cloud/backups
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
bun run aw db drop
```

This command requires typed confirmation.

### Empty data but keep schema

```bash
bun run aw db empty
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
