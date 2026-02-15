# Database Migrations

## Overview

This project uses **Drizzle ORM** with dual database support:

- **SQLite** for local development
- **PostgreSQL/Supabase** for production

Both dialects have separate schema files and migration directories. Schema changes must be migrated for **both** dialects.

## Directory Structure

```
src/db/schema/
├── sqlite/          # SQLite schema definitions
└── postgresql/      # PostgreSQL schema definitions

drizzle/
├── sqlite/          # SQLite migration files
│   ├── 0000_*.sql
│   ├── meta/
│   │   ├── _journal.json
│   │   └── 0000_snapshot.json
└── postgresql/      # PostgreSQL migration files
    ├── 0000_*.sql
    ├── meta/
    │   ├── _journal.json
    │   └── 0000_snapshot.json
```

## Configuration

`drizzle.config.ts` auto-detects the dialect from `DATABASE_URL`:

- URLs starting with `postgres://` or `postgresql://` → PostgreSQL dialect, `drizzle/postgresql/` output
- Everything else → SQLite dialect, `drizzle/sqlite/` output

## Commands

| Command                    | Description                                       |
| -------------------------- | ------------------------------------------------- |
| `bun run db:generate`      | Generate SQLite migration from schema changes     |
| `bun run db:generate:prod` | Generate PostgreSQL migration from schema changes |
| `bun run db:migrate`       | Apply pending SQLite migrations                   |
| `bun run db:migrate:prod`  | Apply pending PostgreSQL migrations               |
| `bun run db:push`          | Push SQLite schema directly (no migration files)  |
| `bun run db:reset`         | Reset SQLite: delete DB file, push schema, seed   |
| `bun run db:empty`         | Truncate all SQLite data (preserve schema)        |
| `bun run db:empty:prod`    | Truncate all PostgreSQL data (preserve schema)    |

## Workflows

### Daily Development (SQLite)

```bash
# After modifying src/db/schema/sqlite/*.ts:
bun run db:generate        # Generate migration
bun run db:migrate         # Apply migration

# Or for quick iteration:
bun run db:push            # Push schema directly (no migration tracking)

# Full reset:
bun run db:reset           # Delete DB + push + seed
```

### Schema Changes (Both Dialects)

When modifying the database schema, you **must** update both dialects:

```bash
# 1. Edit both schema files
#    src/db/schema/sqlite/<table>.ts
#    src/db/schema/postgresql/<table>.ts

# 2. Generate migrations for both
bun run db:generate          # SQLite migration
bun run db:generate:prod     # PostgreSQL migration

# 3. Apply locally
bun run db:migrate           # Apply SQLite migration

# 4. Commit both migration directories
git add drizzle/sqlite/ drizzle/postgresql/

# 5. Deploy: migrations are applied to production
bun run db:migrate:prod      # Apply PostgreSQL migration
```

### Production Migration (PostgreSQL/Supabase)

```bash
# Apply pending migrations
bun run db:migrate:prod

# Verify migration state
bun --env-file=.env.production -e "
const postgres = (await import('postgres')).default;
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });
const rows = await sql\`SELECT * FROM drizzle.__drizzle_migrations ORDER BY id\`;
console.table(rows);
await sql.end();
"
```

### Initial PostgreSQL Setup (New Supabase Project)

When connecting to a brand new (empty) Supabase database:

```bash
# 1. Set DATABASE_URL in .env.production
# 2. Generate migration (if drizzle/postgresql/ doesn't exist)
bun run db:generate:prod

# 3. Apply migration
bun run db:migrate:prod
```

### Baseline Migration (Existing Database Without Migration Tracking)

If the database was previously set up via `db:push` (no migration tracking), you need to create a baseline:

```bash
# 1. Generate migration (captures current schema)
bun run db:generate:prod

# 2. Mark it as already applied (since tables already exist)
bun --env-file=.env.production -e "
const crypto = await import('crypto');
const fs = await import('fs');
const postgres = (await import('postgres')).default;
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

// Read the migration file and compute its SHA256 hash
const migrationFile = fs.readdirSync('drizzle/postgresql').find(f => f.endsWith('.sql'));
const content = fs.readFileSync('drizzle/postgresql/' + migrationFile, 'utf8');
const hash = crypto.createHash('sha256').update(content).digest('hex');

// Read the journal for the timestamp
const journal = JSON.parse(fs.readFileSync('drizzle/postgresql/meta/_journal.json', 'utf8'));
const createdAt = journal.entries[0].when;

// Create drizzle schema and migrations table
await sql\`CREATE SCHEMA IF NOT EXISTS drizzle\`;
await sql\`CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
  id SERIAL PRIMARY KEY, hash TEXT NOT NULL, created_at BIGINT
)\`;
await sql\`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (\${hash}, \${createdAt})\`;

console.log('Baseline migration recorded:', { hash, createdAt, file: migrationFile });
await sql.end();
"

# 3. Verify: should say "migrations applied successfully" with nothing to apply
bun run db:migrate:prod
```

### Production Database Reset

**WARNING: This destroys all data. Use only for staging/development Supabase instances.**

```bash
# 1. Drop all tables and drizzle tracking
bun --env-file=.env.production -e "
const postgres = (await import('postgres')).default;
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });
const tables = await sql\`SELECT tablename FROM pg_tables WHERE schemaname = 'public'\`;
for (const t of tables) {
  await sql.unsafe('DROP TABLE IF EXISTS public.\"' + t.tablename + '\" CASCADE');
  console.log('Dropped:', t.tablename);
}
await sql\`DROP SCHEMA IF EXISTS drizzle CASCADE\`;
console.log('Dropped drizzle schema');
await sql.end();
"

# 2. Remove old migration files and regenerate
rm -rf drizzle/postgresql
bun run db:generate:prod

# 3. Apply fresh migration
bun run db:migrate:prod
```

## Known Issues

### drizzle-kit `db:push` crashes on Supabase

`db:push` with Supabase throws `TypeError: Cannot read properties of undefined (reading 'replace')`. This is a [known drizzle-kit bug](https://github.com/drizzle-team/drizzle-orm/issues/3766) where foreign key constraints are misclassified as check constraints during introspection.

**Workaround:** Use `db:generate` + `db:migrate` instead of `db:push` for PostgreSQL.

### `import.meta` warnings during drizzle-kit commands

Drizzle-kit runs config in CJS mode, producing `"import.meta" is not available` warnings. These are harmless — the config falls back to `process.env.DATABASE_URL` which works correctly when using `bun --env-file=.env.production`.

### Seed script timestamp incompatibility

The seed script passes Unix integer timestamps, but PostgreSQL `timestamp` columns expect Date objects or strings. The seed script currently only works reliably with SQLite. For PostgreSQL, use the CLI tools to create workspaces and users:

```bash
bun run cli:create-workspace:prod
```

### Production Migration (Cloudflare D1)

D1 uses the SQLite schema and migrations. Apply migrations via wrangler CLI:

```bash
# Apply single migration file
wrangler d1 execute allowealth-db --remote --file=./drizzle/sqlite/0000_xxx.sql

# Apply all SQLite migrations in order
for file in drizzle/sqlite/*.sql; do
  wrangler d1 execute allowealth-db --remote --file="$file"
done

# Local testing with D1
wrangler d1 execute allowealth-db --local --file=./drizzle/sqlite/0000_xxx.sql
```

**D1 Migration Notes:**

- D1 is SQLite-compatible, so existing SQLite migrations work without modification
- Use `--local` flag for local development with D1
- Use `--remote` flag for production D1 database
- When using `wrangler d1 execute`, Wrangler may use its own `d1_migrations` table for tracking, or no automatic tracking at all
- For Drizzle's `__drizzle_migrations` tracking table, use Drizzle's `migrate()` API or `drizzle-kit migrate` instead of raw `wrangler d1 execute`
- The batch migration loop shown above does not have built-in idempotency safeguards - track applied migrations manually or use Drizzle's migrator
