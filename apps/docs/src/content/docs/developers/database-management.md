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

Delete the SQLite file that `DATABASE_URL` points at, recreate the schema, and seed demo data:

```bash
bun run aw db reset --yes
```

This command works only with the `sqlite` target.

### Wipe guard

Every command that deletes a whole database (`aw db seed`, `reset`, `empty`, `drop`, `restore`, `aw demo reset`, and the `db:seed`, `db:reset`, `db:empty` and `docker:seed` scripts) runs the same check first:

- It prints the absolute path of the database it is about to change.
- It refuses without `--yes`.
- It refuses when the database holds users whose email is not `@example.com`, unless `--force` is also given. That is how it tells real data from seed data.

`aw db seed` and `aw db reset` create the super admin only with `--with-super-admin`. It gets a random password, printed once.

## Backup

Back up the database that `DATABASE_URL` points at:

```bash
bun run aw db backup
```

The backup uses `VACUUM INTO`, so it is consistent even while the server is running and includes writes still in the WAL. By default it saves to `backups/sqlite-<timestamp>.db` (gitignored), with file mode `0600`.

Use a custom path when needed:

```bash
bun run aw db backup --target sqlite --output /path/to/backup.db
```

## Restore

Restore checks the backup with `PRAGMA integrity_check`, writes it to a temp file next to the target, removes the target's stale `-wal` and `-shm` files and renames the temp file into place. A `.sql` dump is loaded into a fresh database, never into the populated one. Unless you pass `--no-backup`, it first saves a `pre-restore-<timestamp>.db` backup.

Stop the app server before restoring. Restore uses the wipe guard, so it needs `--yes`, plus `--force` when the target holds real users.

### Dry run

Validate a backup without restoring it:

```bash
bun run aw db restore --dry-run
```

### Restore from local backup

```bash
# Restore the latest backup over a database that holds real users
bun run aw db restore --yes --force

# Skip pre-restore backup
bun run aw db restore --yes --force --no-backup

# Restore a specific file
bun run aw db restore --file backups/sqlite-2026-03-04.sql --yes --force
```

### Restore from cloud backup

```bash
bun run aw db restore --source cloud --yes --force
```

Cloud backups read from `backups/cloud/` by default. Override the location if needed:

```bash
bun run aw db restore --source cloud --cloud-dir /path/to/cloud/backups
```

## Data seeding

### Seed demo data

Seeding clears the database first, so it needs `--yes`:

```bash
bun run aw db seed --yes
```

### Control data volume

```bash
# Seed 6 months of history
bun run aw db seed --yes --months=6

# Seed 12 months + 5,000 extra transactions
bun run aw db seed --yes --months=12 --transactions=5000
```

### Add benchmark data

```bash
bun run aw db seed --yes --benchmark
```

### Add stress-test data

```bash
bun run aw db seed --yes --stress
```

## Dangerous operations

### Drop all tables

Delete the SQLite file that `DATABASE_URL` points at, with its `-wal` and `-shm` files:

```bash
bun run aw db drop --yes
```

### Empty data but keep schema

```bash
bun run aw db empty --yes
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
