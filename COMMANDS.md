# Commands Reference

All available `bun run` commands for the project.

## Development

| Command                | Description                                                |
| ---------------------- | ---------------------------------------------------------- |
| `bun run dev`          | Start Astro dev server with hot reload                     |
| `bun run preview`      | Preview build locally (uses `.env`)                        |
| `bun run preview:prod` | Preview build with production env (uses `.env.production`) |

```bash
bun run dev              # http://localhost:4321
```

## Docs Site (Starlight)

| Command                | Description                            |
| ---------------------- | -------------------------------------- |
| `bun run docs:dev`     | Start Starlight docs site dev server   |
| `bun run docs:build`   | Build static Starlight docs site       |
| `bun run docs:preview` | Preview built docs site locally        |
| `bun run docs:check`   | Run Astro type/content checks for docs |

```bash
bun run docs:dev           # Start docs site dev server
bun run docs:build         # Build docs site
bun run docs:check         # Validate docs site
```

### Docs Deployment

| Command                                                  | Description                             |
| -------------------------------------------------------- | --------------------------------------- |
| `bun run docs:build`                                     | Build docs output before deployment     |
| `bunx wrangler deploy --config docs/sites/wrangler.toml` | Deploy docs worker/assets to Cloudflare |

```bash
bun run docs:build
bunx wrangler deploy --config docs/sites/wrangler.toml
```

### Docs Domain Go-Live Checklist (Manual)

1. Attach `docs.allowealth.io` as a custom domain to `allowealth-docs` in Cloudflare.
2. Verify the DNS record exists and is proxied in Cloudflare DNS.
3. Verify the SSL/TLS status is active.
4. Run smoke check:

```bash
curl -I https://docs.allowealth.io
```

Expected: `HTTP/2 200` (or `301`/`302` redirect followed by `200`).

## Build & Deploy

| Command                     | Description                                          |
| --------------------------- | ---------------------------------------------------- |
| `bun run build`             | Build for default target                             |
| `bun run build:node`        | Build for Node.js deployment                         |
| `bun run build:cloudflare`  | Build for Cloudflare Workers                         |
| `bun run build:vercel`      | Build for Vercel                                     |
| `bun run build:netlify`     | Build for Netlify                                    |
| `bun run build:analyze`     | Build and generate bundle stats at `dist/stats.html` |
| `bun run bundle:report`     | Build and run bundle size analysis                   |
| `bun run deploy:cloudflare` | Build and deploy to Cloudflare Workers               |
| `bun run deploy:vercel`     | Build and deploy to Vercel                           |
| `bun run deploy:netlify`    | Build and deploy to Netlify                          |

```bash
bun run build                # Default build
bun run deploy:cloudflare    # Build + deploy to Workers
```

## Quality Gates

| Command                 | Description                                    |
| ----------------------- | ---------------------------------------------- |
| `bun run lint`          | Check ESLint errors                            |
| `bun run lint:fix`      | Auto-fix ESLint errors                         |
| `bun run format`        | Check Prettier formatting                      |
| `bun run format:fix`    | Auto-fix Prettier formatting                   |
| `bun run stylelint`     | Check CSS with Stylelint                       |
| `bun run stylelint:fix` | Auto-fix CSS issues                            |
| `bun run typecheck`     | Run TypeScript type checking via `astro check` |

```bash
# Run all quality gates (required before committing)
bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck
```

## Database (SQLite - Development)

| Command               | Description                                            |
| --------------------- | ------------------------------------------------------ |
| `bun run db:generate` | Generate SQLite migration from schema changes          |
| `bun run db:migrate`  | Apply pending SQLite migrations                        |
| `bun run db:push`     | Push schema directly to SQLite (no migration tracking) |
| `bun run db:studio`   | Open Drizzle Studio (visual DB browser)                |
| `bun run db:seed`     | Seed database with demo data                           |
| `bun run db:reset`    | Delete SQLite DB, push schema, and seed                |
| `bun run db:empty`    | Truncate all data (preserve schema)                    |

```bash
# Full dev reset
bun run db:reset

# After schema changes
bun run db:generate          # Generate migration
bun run db:migrate           # Apply migration

# Quick iteration (no migration tracking)
bun run db:push
```

See `docs/architecture/007-database-migrations.md` for full migration workflow.

## Allowealth CLI (`aw`)

The `aw` CLI provides a unified interface for admin and operational commands. Use `--target` (`-t`) on subcommands to select the database backend.

### Target Values

| Target     | Database               | Env loading                  | Auth                                                                                                               |
| ---------- | ---------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `sqlite`   | Local SQLite (default) | None                         | N/A                                                                                                                |
| `d1`       | Remote Cloudflare D1   | Auto-loads `.env.production` | `CLOUDFLARE_TOKEN` in `.env.production` (maps to `CLOUDFLARE_API_TOKEN` for wrangler; requires D1 Edit permission) |
| `d1-local` | Local D1 emulation     | None                         | Opens wrangler local SQLite                                                                                        |
| `postgres` | PostgreSQL             | Auto-loads `.env.production` | Connection string from env                                                                                         |

### Quick Reference

| Command                             | Description              |
| ----------------------------------- | ------------------------ |
| `bun run aw --help`                 | Show all commands        |
| `bun run aw <command> --help`       | Show subcommand help     |
| `bun run aw --target d1 db migrate` | Target before subcommand |
| `bun run aw db migrate --target d1` | Target after subcommand  |

### Global CLI Options

- `--target`, `-t`: Select backend target (`sqlite`, `d1`, `d1-local`, `postgres`) on leaf subcommands.
- `--json`: Return machine-readable JSON output instead of formatted text.
- `--yes`, `-y`: Skip confirmation prompts for destructive CRUD and alias operations (`delete`, `rm`).
  - Some destructive commands use command-specific confirmations instead. Examples: `workspace delete --force` or the typed confirmation in `aw db drop`.

### Workspace Management

| Command                                                                                 | Description                          |
| --------------------------------------------------------------------------------------- | ------------------------------------ |
| `bun run aw workspace create --name "Name" --email admin@example.com`                   | Create workspace (SQLite)            |
| `bun run aw workspace create --target postgres --name "Name" --email admin@example.com` | Create workspace (PostgreSQL)        |
| `bun run aw workspace create --target d1 --name "Name" --email admin@example.com`       | Create workspace on D1 (remote)      |
| `bun run aw workspace create --target d1-local --name "Name" --email admin@example.com` | Create workspace on D1 (local)       |
| `bun run aw workspace list`                                                             | List all workspaces with user counts |
| `bun run aw workspace delete --id <id>`                                                 | Delete workspace and all its data    |
| `bun run aw workspace delete --id <id> --force`                                         | Delete workspace (skip confirmation) |
| `bun run aw workspace invite --workspace-id <id> --email <email>`                       | Invite member to workspace           |
| `bun run aw workspace members list --workspace-id <id>`                                 | List all workspace members           |
| `bun run aw workspace members remove --workspace-id <id> --user-id <id>`                | Remove member from workspace         |

### Resource Commands

| Command                                          | Description                                           |
| ------------------------------------------------ | ----------------------------------------------------- |
| `bun run aw transactions create`                 | Create transaction                                    |
| `bun run aw transactions get --id <id>`          | Get transaction by ID                                 |
| `bun run aw transactions list`                   | List transactions                                     |
| `bun run aw transactions update --id <id>`       | Update transaction                                    |
| `bun run aw transactions delete --id <id>`       | Delete transaction                                    |
| `bun run aw accounts create`                     | Create account                                        |
| `bun run aw accounts get --id <id>`              | Get account by ID                                     |
| `bun run aw accounts list`                       | List accounts                                         |
| `bun run aw accounts update --id <id>`           | Update account                                        |
| `bun run aw accounts delete --id <id>`           | Deactivate account                                    |
| `bun run aw budgets create`                      | Create budget                                         |
| `bun run aw budgets get --id <id>`               | Get budget by ID                                      |
| `bun run aw budgets list --month <m> --year <y>` | List budgets for month/year                           |
| `bun run aw budgets update --id <id>`            | Update budget                                         |
| `bun run aw budgets delete --id <id>`            | Delete budget                                         |
| `bun run aw categories create`                   | Create budget category                                |
| `bun run aw categories get --id <id>`            | Get budget category by ID                             |
| `bun run aw categories list`                     | List budget categories                                |
| `bun run aw categories update --id <id>`         | Update budget category                                |
| `bun run aw categories delete --id <id>`         | Delete budget category                                |
| `bun run aw account-categories create`           | Create account category                               |
| `bun run aw account-categories get --id <id>`    | Get account category by ID                            |
| `bun run aw account-categories list`             | List account categories                               |
| `bun run aw account-categories update --id <id>` | Update account category                               |
| `bun run aw account-categories delete --id <id>` | Delete account category                               |
| `bun run aw recurring generate`                  | Generate pending occurrences for all active templates |

### Alias Commands

Aliases provide shorter commands that map to resource operations.

**Transactions (`tx`):**

| Alias                     | Maps to               | Description           |
| ------------------------- | --------------------- | --------------------- |
| `bun run aw tx add`       | `transactions create` | Create transaction    |
| `bun run aw tx show --id` | `transactions get`    | Get transaction by ID |
| `bun run aw tx ls`        | `transactions list`   | List transactions     |
| `bun run aw tx edit --id` | `transactions update` | Update transaction    |
| `bun run aw tx rm --id`   | `transactions delete` | Delete transaction    |

**Accounts (`acc`):**

| Alias                      | Maps to           | Description        |
| -------------------------- | ----------------- | ------------------ |
| `bun run aw acc add`       | `accounts create` | Create account     |
| `bun run aw acc show --id` | `accounts get`    | Get account by ID  |
| `bun run aw acc ls`        | `accounts list`   | List accounts      |
| `bun run aw acc edit --id` | `accounts update` | Update account     |
| `bun run aw acc rm --id`   | `accounts delete` | Deactivate account |

**Budgets (`bdg`):**

| Alias                      | Maps to          | Description      |
| -------------------------- | ---------------- | ---------------- |
| `bun run aw bdg set`       | `budgets create` | Create budget    |
| `bun run aw bdg show --id` | `budgets get`    | Get budget by ID |
| `bun run aw bdg ls`        | `budgets list`   | List budgets     |
| `bun run aw bdg edit --id` | `budgets update` | Update budget    |
| `bun run aw bdg rm --id`   | `budgets delete` | Delete budget    |

### Database

| Command                                   | Description                                  |
| ----------------------------------------- | -------------------------------------------- |
| `bun run aw db migrate`                   | Apply pending migrations (SQLite)            |
| `bun run aw db migrate --target postgres` | Apply pending migrations (PostgreSQL)        |
| `bun run aw db migrate --target d1`       | Apply pending migrations to remote D1        |
| `bun run aw db migrate --target d1-local` | Apply pending migrations to local D1         |
| `bun run aw db generate`                  | Generate migration from schema changes       |
| `bun run aw db push`                      | Push schema directly (dev only)              |
| `bun run aw db studio`                    | Open Drizzle Studio                          |
| `bun run aw db seed`                      | Seed with demo data                          |
| `bun run aw db seed --benchmark`          | Seed with ~10k transactions for perf testing |
| `bun run aw db reset`                     | Delete SQLite DB, push schema, and seed      |
| `bun run aw db empty`                     | Truncate all data (preserve schema)          |
| `bun run aw db drop`                      | ⚠️ Delete all tables and reset DB            |

#### Database Drop Command

The `aw db drop` command drops all tables and clears migrations.

```bash
# Drop local SQLite database
bun run aw db drop

# Drop remote D1 database (production)
bun run aw db drop -t d1

# Drop local D1 database
bun run aw db drop -t d1-local

# Drop PostgreSQL database
bun run aw db drop -t postgres
```

**What it does:**

- **D1**: Drops all user tables (excludes reserved system tables like `_cf_*` and `__drizzle_migrations`), then truncates the migrations table
- **SQLite**: Deletes the `.dev.db` file
- **PostgreSQL**: Drops all tables with CASCADE

After running, use `aw db migrate` to recreate the schema from the first migration.

### Admin & Security

| Command                                                                            | Description                                                                                                            |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `bun run aw admin create-super-admin --email admin@example.com`                    | Promote user to super admin                                                                                            |
| `bun run aw admin create-api-key --workspace-id <id> --user-id <id> --name "Name"` | Generate API key                                                                                                       |
| `bun run aw admin rotate-db-password [--ask] [--hyperdrive]`                       | Rotate Supabase DB password; use `--ask` to prompt for password, `--hyperdrive` to update Cloudflare Hyperdrive config |
| `bun run aw admin generate-email-key`                                              | Generate encryption key for email functionality                                                                        |

### Deploy

| Command                        | Description                            |
| ------------------------------ | -------------------------------------- |
| `bun run aw deploy cloudflare` | Build and deploy to Cloudflare Workers |
| `bun run aw deploy vercel`     | Build and deploy to Vercel             |
| `bun run aw deploy netlify`    | Build and deploy to Netlify            |

### Other

| Command                | Description         |
| ---------------------- | ------------------- |
| `bun run aw mcp start` | Start MCP server    |
| `bun run aw release`   | Interactive release |

## Testing

### Unit Tests

| Command                 | Description                    |
| ----------------------- | ------------------------------ |
| `bun run test`          | Run all unit tests             |
| `bun run test:watch`    | Run tests in watch mode        |
| `bun run test:coverage` | Run tests with coverage report |

```bash
bun run test                 # All tests
bun run test:watch           # Watch mode
```

### E2E Tests (Playwright)

| Command                     | Description                       |
| --------------------------- | --------------------------------- |
| `bun run test:e2e:setup`    | Install Playwright browsers       |
| `bun run test:e2e`          | Run all E2E tests headless        |
| `bun run test:e2e:ui`       | Open Playwright UI mode           |
| `bun run test:e2e:headed`   | Run E2E tests in visible browser  |
| `bun run test:e2e:debug`    | Run E2E tests in debug mode       |
| `bun run test:e2e:report`   | Open HTML test report             |
| `bun run test:e2e:critical` | Run only tests tagged `@critical` |

```bash
bun run test:e2e:setup       # First time only
bun run test:e2e             # Run all E2E tests
bun run test:e2e:critical    # Smoke tests only
```

## Release

| Command           | Description                                               |
| ----------------- | --------------------------------------------------------- |
| `bun run release` | Interactive release script (bump version, tag, changelog) |

```bash
bun run release
```
