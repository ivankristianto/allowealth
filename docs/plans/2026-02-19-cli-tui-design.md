# CLI Tool Design: `aw`

**Date:** 2026-02-19
**Status:** Approved

## Problem

70+ scripts in `package.json` with growing complexity. Every CLI tool duplicates a `:prod` variant (`--env-file=.env.production`). No discoverability without reading `COMMANDS.md`. D1 migrations require manually supplying files one by one.

## Solution

A single structured CLI entry point `aw` using [citty](https://github.com/unjs/citty) (UnJS) with subcommands, a global `--prod` flag, and auto-migration for D1.

## Scope

Admin/ops commands only. Dev commands (`bun run dev`, `bun run test`, `bun run lint:fix`, etc.) stay as `bun run` scripts.

## Command Tree

```
aw [--prod] <command> <subcommand> [options]

WORKSPACE
  aw workspace create      --name <name> --email <email> [--currency IDR] [--week-start monday] [--compact-numbers true]
  aw workspace create-d1   --name <name> --email <email> [--local] [--currency IDR] [--week-start monday] [--compact-numbers true]
  aw workspace list
  aw workspace delete      --id <workspace-id> [--force]

DATABASE
  aw db migrate            # drizzle-kit migrate (SQLite local, Postgres with --prod)
  aw db migrate --d1       # auto-apply pending SQLite migrations to remote D1
  aw db migrate --d1 --local  # auto-apply pending SQLite migrations to local D1
  aw db generate           # drizzle-kit generate (SQLite local, Postgres with --prod)
  aw db push               # drizzle-kit push (dev only)
  aw db studio             # drizzle-kit studio
  aw db seed               # run seed script
  aw db reset              # delete SQLite DB, push schema, seed (dev only)
  aw db empty              # truncate all data

ADMIN
  aw admin create-super-admin  --email <email>
  aw admin create-api-key      --workspace-id <id> --user-id <id> --name <name>
  aw admin rotate-db-password  [--ask] [--hyperdrive]
  aw admin generate-email-key

DEPLOY
  aw deploy cloudflare
  aw deploy vercel
  aw deploy netlify

MCP
  aw mcp start

RELEASE
  aw release

BACKFILL
  aw backfill email-verification
```

## Global `--prod` Flag

The root command defines a `--prod` boolean flag. In the root `setup()` hook, when `--prod` is true, load `.env.production` via `Bun.env` before any subcommand executes. Subcommands are environment-agnostic.

```ts
const main = defineCommand({
  meta: { name: "aw", version: "0.12.0", description: "Allowealth CLI" },
  args: {
    prod: {
      type: "boolean",
      description: "Use production environment (.env.production)",
    },
  },
  setup({ args }) {
    if (args.prod) {
      loadEnvFile(".env.production");
    }
  },
  subCommands: {
    workspace: () => import("./commands/workspace"),
    db: () => import("./commands/db"),
    admin: () => import("./commands/admin"),
    deploy: () => import("./commands/deploy"),
    mcp: () => import("./commands/mcp"),
    release: () => import("./commands/release"),
    backfill: () => import("./commands/backfill"),
  },
});
```

## File Structure

```
src/cli/
├── index.ts              # Entry point: defineCommand + runMain
├── commands/
│   ├── workspace.ts      # workspace subcommands (create, create-d1, list, delete)
│   ├── db.ts             # db subcommands (migrate, generate, push, studio, seed, reset, empty)
│   ├── admin.ts          # admin subcommands (create-super-admin, create-api-key, rotate-db-password, generate-email-key)
│   ├── deploy.ts         # deploy subcommands (cloudflare, vercel, netlify)
│   ├── mcp.ts            # mcp start
│   ├── release.ts        # release (delegates to scripts/release.ts)
│   └── backfill.ts       # backfill subcommands
└── lib/
    ├── env-loader.ts     # --prod flag handler: loads .env.production
    └── d1-migrate.ts     # D1 auto-migration logic
```

## D1 Auto-Migration

When `aw db migrate --d1` is run:

1. **Read journal** - Parse `drizzle/sqlite/meta/_journal.json` to get ordered list of migration entries (each has `idx`, `tag`, and a corresponding `.sql` file).
2. **Check tracking table** - Query D1 for a `__drizzle_migrations` table. Create it if it doesn't exist:
   ```sql
   CREATE TABLE IF NOT EXISTS __drizzle_migrations (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     tag TEXT NOT NULL UNIQUE,
     applied_at INTEGER NOT NULL DEFAULT (unixepoch())
   );
   ```
3. **Diff** - Compare journal entries against applied tags to find pending migrations.
4. **Apply** - For each pending migration in order:
   - Read the `.sql` file from `drizzle/sqlite/`
   - Split on `--> statement-breakpoint` markers
   - Execute each statement via `wrangler d1 execute <db-name> --command <sql>` (using `execFileSync` with argv array per project conventions)
   - Record the tag in `__drizzle_migrations`
5. **Report** - Print applied count and any errors.

The `--local` flag switches `wrangler d1 execute` between `--remote` and `--local`.

## Migration Strategy

### Phase 1: Build CLI alongside existing scripts

- Add `citty` dependency
- Create `src/cli/index.ts` and all command files
- Add `"aw": "bun run src/cli/index.ts"` to `package.json` scripts
- Existing `cli:*` scripts remain untouched

### Phase 2: Migrate logic

- Extract `main()` functions from existing standalone scripts into citty command `run()` handlers
- Shell out for simple wrappers (drizzle-kit, wrangler, astro build)
- Implement D1 auto-migration (new logic)

### Phase 3: Clean up

- Remove old standalone CLI scripts from `src/cli/` (the ones replaced by commands)
- Remove `:prod` variant scripts from `package.json`
- Update `COMMANDS.md` to document `aw` commands
- Keep `bun run` dev/test/lint scripts as-is

## Commands Detail

### Shell-out commands (thin wrappers)

These just run existing tools with the right env/flags:

| Command | Shells out to |
|---|---|
| `aw db generate` | `drizzle-kit generate` |
| `aw db migrate` (non-D1) | `drizzle-kit migrate` |
| `aw db push` | `drizzle-kit push` |
| `aw db studio` | `drizzle-kit studio` |
| `aw db seed` | `bun run src/db/seed.ts` |
| `aw db reset` | `rm -f db/.dev.db* && drizzle-kit push --force && bun run src/db/seed.ts` |
| `aw db empty` | `bun run src/db/empty.ts` |
| `aw deploy cloudflare` | `astro build && wrangler deploy` (with `DEPLOY_TARGET=cloudflare`) |
| `aw deploy vercel` | `astro build && vercel deploy --prod` (with `DEPLOY_TARGET=vercel`) |
| `aw deploy netlify` | `astro build && netlify deploy --prod` (with `DEPLOY_TARGET=netlify`) |
| `aw mcp start` | `bun run mcp-server/src/index.ts` |
| `aw release` | `bun run scripts/release.ts` |
| `aw backfill email-verification` | `bun run scripts/backfill-email-verification.ts` |

### Logic commands (extracted from existing scripts)

These move the `main()` logic from standalone scripts into citty command handlers:

| Command | Source script |
|---|---|
| `aw workspace create` | `src/cli/create-workspace.ts` |
| `aw workspace create-d1` | `src/cli/create-workspace-d1.ts` |
| `aw workspace list` | `src/cli/list-workspaces.ts` |
| `aw workspace delete` | `src/cli/delete-workspace.ts` |
| `aw admin create-super-admin` | `src/cli/create-super-admin.ts` |
| `aw admin create-api-key` | `src/cli/create-api-key.ts` |
| `aw admin rotate-db-password` | `src/cli/rotate-db-password.ts` |
| `aw admin generate-email-key` | `scripts/generate-email-key.ts` |

### New logic

| Command | Description |
|---|---|
| `aw db migrate --d1` | D1 auto-migration (journal-based, new implementation) |

## Dependencies

- `citty` (new) - CLI framework from UnJS

## package.json Changes

Add one script:
```json
{
  "aw": "bun run src/cli/index.ts"
}
```

After migration is complete, remove these scripts:
- All `cli:*` and `cli:*:prod` variants (14 scripts)
- `db:d1:migrate`, `db:d1:migrate:local`
- `backfill:email-verification`, `backfill:email-verification:prod`
- `mcp:start`, `mcp:start:prod`
- `db:generate:prod`, `db:migrate:prod`, `db:empty:prod`
- `cli:generate-email-key`

Remaining `bun run` scripts (kept): `dev`, `build`, `build:*`, `preview`, `preview:prod`, `storybook`, `build-storybook`, `lint`, `lint:fix`, `format`, `format:fix`, `stylelint`, `stylelint:fix`, `typecheck`, `test`, `test:*`, `db:generate`, `db:migrate`, `db:push`, `db:studio`, `db:seed`, `db:reset`, `db:empty`, `bundle:report`, `build:analyze`, `prepare`, `release`, `astro`.
