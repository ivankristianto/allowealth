# Commands Reference

All available `bun run` commands for the project.

## Development

| Command                | Description                                                                       |
| ---------------------- | --------------------------------------------------------------------------------- |
| `bun run dev`          | Start Astro dev server with hot reload                                            |
| `bun run preview`      | Preview build locally (uses `.env`)                                               |
| `bun run preview:prod` | Preview build with production env (uses `.env.production`)                        |
| `bun run docker:start` | Start the Docker app stack from local build (first run creates `.env` then exits) |
| `bun run docker:seed`  | Seed a Docker demo database (needs `--yes`; see Docker Database Commands)         |
| `bun run docker:stop`  | Stop the Docker app stack (Allowealth + Redis)                                    |

Two compose files are shipped under `docker/`:

| File                      | Image source                               | When to use                                         |
| ------------------------- | ------------------------------------------ | --------------------------------------------------- |
| `docker-compose.yml`      | Built locally from the working tree        | Forks, source modifications, air-gapped builds      |
| `docker-compose.prod.yml` | `ghcr.io/ivankristianto/allowealth:latest` | Self-hosting (recommended); updates via `pull`/`up` |

`bun run docker:start` and `bun run docker:stop` operate on the build file. For the prod file, run `docker compose -f docker/docker-compose.prod.yml <command>` directly.

```bash
bun run dev              # http://localhost:4321
bun run docker:start     # First run: creates .env + secrets then exits; rerun to build + start
bun run docker:seed -- --yes --force  # Wipe the app volume and seed demo data
bun run docker:stop      # Stop the Docker app stack
```

**First-time Docker setup:**

```bash
bun run docker:start     # Creates .env with auto-generated secrets, then exits
# Save INSTALLER_SECRET printed in the terminal (needed for first-run setup if set in .env)
# Edit .env with OAuth/Turnstile values, then run again:
bun run docker:start     # Builds and starts the Docker stack
docker compose -f docker/docker-compose.yml logs -f app  # Watch startup
# Visit http://localhost:3000 to complete first-run setup
```

**Production self-host (pre-built image):**

```bash
# After `bun run docker:start` has scaffolded .env and you've filled in OAuth/Turnstile values,
# switch to the published image instead of building locally:
docker compose -f docker/docker-compose.prod.yml pull
docker compose -f docker/docker-compose.prod.yml up -d

# Updates (no rebuild, no git checkout):
docker compose -f docker/docker-compose.prod.yml pull
docker compose -f docker/docker-compose.prod.yml up -d

# Pin a specific image tag:
APP_IMAGE_TAG=v0.29.8 docker compose -f docker/docker-compose.prod.yml up -d
```

See `apps/docs/src/content/docs/self-host.md` (or the [Self-Host docs](https://docs.allowealth.io/self-host/)) for the full production runbook.

### Docker Container Commands

Once the Docker stack is running, you can run database operations inside the container:

| Command                                                | Description                                                    |
| ------------------------------------------------------ | -------------------------------------------------------------- |
| `docker exec allowealth-app bun run src/db/migrate.ts` | Apply pending SQLite migrations                                |
| `bun run docker:seed -- --yes`                         | Seed demo data into a Docker volume (see guard below)          |
| `docker compose -f docker/docker-compose.yml down -v`  | Reset database from scratch (removes `allowealth-data` volume) |

```bash
# Run migrations manually
docker exec allowealth-app bun run src/db/migrate.ts

# Reset database from scratch (delete persisted SQLite volume)
docker compose -f docker/docker-compose.yml down -v
bun run docker:start

# Seed demo data into the app volume (default: --months=6)
bun run docker:seed -- --yes --force

# Seed another volume that already has the schema (an app container has started on it once)
SEED_VOLUME=allowealth-demo bun run docker:seed -- --yes

# Seed with custom options
bun run docker:seed -- --yes --force --months=12
bun run docker:seed -- --yes --force --stress
```

`docker:seed` wipes `/data/allowealth.db` before seeding. It refuses without `--yes`, and refuses the live `allowealth-data` volume unless `--force` is also given. Inside the container the seeder runs the same wipe guard as `aw db seed`.

Note: Migrations run automatically on every container start via the entrypoint script.
Note: The runtime image ships pre-bundled maintenance scripts at `/app/dist/scripts/seed.js` and `/app/dist/scripts/empty.js`, built by `bun run build:scripts` during the image build. `bun run docker:seed` invokes the seed bundle directly — no source tree is bind-mounted. To seed manually against a running container:

```bash
# Both wipe the live app database, so they need --yes, plus --force when it holds real users
docker exec -e ALLOW_SEED=true allowealth-app bun /app/dist/scripts/seed.js --yes --months=6
docker exec allowealth-app bun /app/dist/scripts/empty.js --yes
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

## Landing Page (Marketing Site)

| Command                   | Description                        |
| ------------------------- | ---------------------------------- |
| `bun run landing:dev`     | Start landing page dev server      |
| `bun run landing:build`   | Build static landing page          |
| `bun run landing:preview` | Preview built landing page locally |
| `bun run landing:check`   | Run Astro type/content checks      |

```bash
bun run landing:dev         # Start landing page dev server
bun run landing:build       # Build landing page
bun run landing:check       # Validate landing page
```

### Landing Page Deployment

| Command                  | Description                  |
| ------------------------ | ---------------------------- |
| `bun run landing:build`  | Build landing page output    |
| `bun run landing:deploy` | Deploy landing page to Pages |

```bash
bun run landing:build
bun run landing:deploy
```

### Docs Deployment

| Command               | Description                         |
| --------------------- | ----------------------------------- |
| `bun run docs:build`  | Build docs output before deployment |
| `bun run docs:deploy` | Build and deploy docs to Pages      |

```bash
bun run docs:deploy
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

### Landing Page Domain Go-Live Checklist (Manual)

1. Attach `allowealth.io` as a custom domain to `allowealth-site` in Cloudflare.
2. Verify the DNS record exists and is proxied in Cloudflare DNS.
3. Verify the SSL/TLS status is active.
4. Run smoke check:

```bash
curl -I https://allowealth.io
```

Expected: `HTTP/2 200` (or `301`/`302` redirect followed by `200`).

## Build & Deploy

The SSR app builds with the `@astrojs/node` adapter (`mode: 'standalone'`).

| Command                 | Description                                                       |
| ----------------------- | ----------------------------------------------------------------- |
| `bun run build`         | Build the app                                                     |
| `bun run build:analyze` | Build and generate bundle stats at `dist/stats.html`              |
| `bun run bundle:report` | Build, print gzipped JS per page, exit 1 if a page is over 250 kB |

```bash
bun run build
```

The built server is started with the Node adapter's standalone entry point.
Docker helpers are available via `bun run docker:start` / `bun run docker:stop`.

Cloudflare Pages deployment for the docs and landing sites is covered above
under "Landing Page Deployment" and "Docs Deployment".

## Quality Gates

| Command                 | Description                                                        |
| ----------------------- | ------------------------------------------------------------------ |
| `bun run lint`          | Check ESLint with minimal output (warnings + errors)               |
| `bun run lint:fix`      | Auto-fix ESLint with minimal output (warnings + errors)            |
| `bun run format`        | Check Prettier by listing only unformatted file paths              |
| `bun run format:fix`    | Auto-fix Prettier with error-only logs                             |
| `bun run stylelint`     | Check CSS with Stylelint (quiet + compact formatter)               |
| `bun run stylelint:fix` | Auto-fix CSS issues (quiet + compact formatter)                    |
| `bun run typecheck`     | Run `astro check` and show hints/warnings/errors (fails on errors) |
| `bun run prepare`       | Install the husky git hooks (runs automatically on `bun install`)  |

```bash
# Run all quality gates (required before committing)
bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck
```

## Database (SQLite - Development)

| Command                  | Description                                       |
| ------------------------ | ------------------------------------------------- |
| `bun run db:generate`    | Generate SQLite migration from schema changes     |
| `bun run db:migrate`     | Apply pending SQLite migrations                   |
| `bun run db:studio`      | Open Drizzle Studio (visual DB browser)           |
| `bun run db:seed --yes`  | Wipe and seed demo data (3 months default)        |
| `bun run db:seed:stress` | Seed 5 years of family stress-test data (`--yes`) |
| `bun run db:reset --yes` | Same as `aw db reset --yes`                       |
| `bun run db:empty --yes` | Truncate all data (preserve schema)               |

Every command that wipes data refuses to run without `--yes`, and refuses a database that holds users outside `@example.com` unless `--force` is also given. See [Wipe guard](#wipe-guard).

```bash
# Full dev reset
bun run db:reset --yes

# After schema changes
bun run db:generate          # Generate migration
bun run db:migrate           # Apply migration

# Seed with custom options
bun run db:seed --yes              # Default: 3 months of data
bun run db:seed --yes --months=6   # Seed 6 months of transactions
bun run db:seed --yes --months=12 --transactions=5000  # 12 months + 5k extra
```

See `docs/architecture/007-database-migrations.md` for full migration workflow.

## Allowealth CLI (`aw`)

The `aw` CLI provides a unified interface for admin and operational commands.

### Target Values

| Target   | Database               | Env loading | Auth / config |
| -------- | ---------------------- | ----------- | ------------- |
| `sqlite` | Local SQLite (default) | None        | N/A           |

### Quick Reference

| Command                       | Description          |
| ----------------------------- | -------------------- |
| `bun run aw --help`           | Show all commands    |
| `bun run aw <command> --help` | Show subcommand help |
| `bun run aw db migrate`       | Apply migrations     |

### Global CLI Options

- `--target`, `-t`: Select backend target (`sqlite` is the only value).
- `--json`: Return machine-readable JSON output instead of formatted text.
- `--yes`, `-y`: Skip confirmation prompts for destructive CRUD and alias operations (`delete`, `rm`).
  - Some destructive commands use command-specific confirmations instead. Example: `workspace delete --force`.
  - Commands that wipe a whole database (`db seed`, `db reset`, `db empty`, `db drop`, `db restore`, `demo reset`) take only the long `--yes` form and also check the data. See [Wipe guard](#wipe-guard).

### Workspace Management

| Command                                                                  | Description                          |
| ------------------------------------------------------------------------ | ------------------------------------ |
| `bun run aw workspace create --name "Name" --email admin@example.com`    | Create workspace (SQLite)            |
| `bun run aw workspace list`                                              | List all workspaces with user counts |
| `bun run aw workspace delete --id <id>`                                  | Delete workspace and all its data    |
| `bun run aw workspace delete --id <id> --force`                          | Delete workspace (skip confirmation) |
| `bun run aw workspace invite --workspace-id <id> --email <email>`        | Invite member to workspace           |
| `bun run aw workspace members list --workspace-id <id>`                  | List all workspace members           |
| `bun run aw workspace members remove --workspace-id <id> --user-id <id>` | Remove member from workspace         |

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

| Command                                        | Description                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| `bun run aw db migrate`                        | Apply pending migrations (SQLite)                                   |
| `bun run aw db generate`                       | Generate migration from schema changes                              |
| `bun run aw db studio`                         | Open Drizzle Studio                                                 |
| `bun run aw db docs`                           | Regenerate `docs/architecture/database-schema.html` schema diagrams |
| `bun run aw db seed --yes`                     | Wipe and seed with demo data (3 months default)                     |
| `bun run aw db seed --yes --months=6`          | Seed with 6 months of transaction data                              |
| `bun run aw db seed --yes --transactions=5000` | Add 5,000 extra transactions                                        |
| `bun run aw db seed --yes --benchmark`         | Seed with ~10k transactions (12 months)                             |
| `bun run aw db seed --yes --stress`            | Seed with 5-year family stress-test dataset                         |
| `bun run aw db seed --yes --with-super-admin`  | Also seed `superadmin@example.com` with a random password           |
| `bun run aw db seed-oauth-clients`             | Seed MCP OAuth clients for Connected Apps                           |
| `bun run aw db reset --yes`                    | Delete the `DATABASE_URL` file, apply migrations, and seed          |
| `bun run aw db empty --yes`                    | Truncate all data (preserve schema)                                 |
| `bun run aw db drop --yes`                     | ⚠️ Delete the `DATABASE_URL` SQLite file                            |
| `bun run aw db backup`                         | Write a consistent copy of the `DATABASE_URL` database              |
| `bun run aw db restore --yes`                  | Replace the `DATABASE_URL` database from a local/cloud backup       |
| `bun run aw db prune audit-logs`               | Delete audit log entries older than 30 days                         |

#### Wipe guard

`aw db seed`, `aw db reset`, `aw db empty`, `aw db drop`, `aw db restore`, `aw demo reset` and the `db:seed`, `db:reset`, `db:empty` and `docker:seed` scripts all destroy the data in the database that `DATABASE_URL` points at. They share one guard (`src/db/wipe-guard.ts`):

- It prints the resolved absolute database path in every prompt and refusal.
- It refuses without `--yes`.
- It refuses when the database holds users whose email is not `@example.com` (the seed domain), unless `--force` is also given.
- It refuses when it cannot read the file, unless `--force` is given.

A public demo where visitors sign up will hold non-demo users, so refreshing it needs `--yes --force`.

The seeder no longer creates a super admin by default. Pass `--with-super-admin` to `aw db seed` or `aw db reset` to create `superadmin@example.com` with a random password, printed once. On a real install, promote an existing user with `aw admin create-super-admin` instead.

#### Database Drop Command

The `aw db drop` command deletes the SQLite file `DATABASE_URL` points at, with its `-wal` and `-shm` files.

```bash
bun run aw db drop --yes
```

After running, use `aw db migrate` to recreate the schema from the first migration.

#### Database Backup & Restore

```bash
# SQLite backup into backups/ (gitignored)
bun run aw db backup

# Validate the latest backup without restoring
bun run aw db restore --dry-run

# Restore SQLite from file (stop the app server first)
bun run aw db restore --file backups/sqlite-2026-03-04T16-30-00.db --yes --force
```

- **Backup** reads the `DATABASE_URL` database and writes it with `VACUUM INTO`, so writes still in the WAL are included. The file is created with mode `0600`.
- **Restore** checks the backup with `PRAGMA integrity_check` and builds a temp file next to the target. A `.sql` dump is loaded into a fresh database, never into the populated one. It then deletes the target's stale `-wal` and `-shm` and renames the temp file into place.
- **Flags:** restore uses the wipe guard. `--yes` confirms. `--force` is needed when the target holds real users, which is the usual case. Unless `--no-backup` is given, it first writes a `pre-restore-*.db` backup.

**Backup format by target:**

| Target   | Default Format | Valid Formats |
| -------- | -------------- | ------------- |
| `sqlite` | `.db`          | `.db`, `.sql` |

#### Audit Log Pruning

The `aw db prune audit-logs` command deletes audit log entries older than a configurable retention period to prevent unlimited database growth.

```bash
# Preview entries to be deleted (no changes made)
bun run aw db prune audit-logs --dry-run

# Delete entries older than the default 30 days (with confirmation prompt)
bun run aw db prune audit-logs

# Delete entries older than 90 days
bun run aw db prune audit-logs --days 90

# Delete without confirmation prompt
bun run aw db prune audit-logs --force

# Use AUDIT_LOG_RETENTION_DAYS env var to set the default retention period
AUDIT_LOG_RETENTION_DAYS=60 bun run aw db prune audit-logs
```

**Options:**

| Flag        | Description                                                                       | Default                          |
| ----------- | --------------------------------------------------------------------------------- | -------------------------------- |
| `--days`    | Retention period in days. Minimum 1. Overrides `AUDIT_LOG_RETENTION_DAYS` env var | `AUDIT_LOG_RETENTION_DAYS` or 30 |
| `--dry-run` | Preview deletions without executing                                               | `false`                          |
| `--force`   | Skip confirmation prompt                                                          | `false`                          |

**Behavior:**

- Applies to all workspaces (no workspace filter)
- Shows count of entries to be deleted before confirming
- `--dry-run` prints the count but makes no changes

### Demo

| Command                       | Description                                    |
| ----------------------------- | ---------------------------------------------- |
| `bun run aw demo --help`      | Show demo environment commands                 |
| `bun run aw demo reset --yes` | Empty and reseed the local SQLite demo dataset |

`DEMO_MODE` controls the UI. `aw demo reset` refreshes the data.

```bash
# Enable the demo experience locally
echo 'DEMO_MODE=true' >> .env

# Refresh demo data in the local SQLite database
bun run aw demo reset --yes

# A public demo with visitor sign-ups holds non-demo users, so it also needs --force
bun run aw demo reset --yes --force
```

When `DEMO_MODE=true`, the app shows a warning banner on every page and disables member invitations, profile editing, password changes, MFA controls, and active session management.

### CSV Backfill

Loads monthly household-finance CSV pairs into the app over the REST API. All
month-specific knowledge lives in a config file inside the data directory,
never in the repository.

| Command                                                     | Description                                       |
| ----------------------------------------------------------- | ------------------------------------------------- |
| `bun run aw backfill scaffold --from Jan --to Dec`          | Emit a config skeleton from a CSV range           |
| `bun run aw backfill setup`                                 | Reconcile categories with the config (idempotent) |
| `bun run aw backfill setup --create-user --email <address>` | Create the second household member (rate limited) |
| `bun run aw backfill run --month Jan --dry-run`             | Build and verify one month's plan; write nothing  |
| `bun run aw backfill run --from Jan --to Dec`               | Load a month range, in order                      |
| `bun run aw backfill run --month Jan --force`               | Purge and reload a month already loaded           |
| `bun run aw backfill verify --month Jan`                    | Audit a loaded month against its CSVs (read-only) |

Flags: `--dir` (data directory, default `$AW_BACKFILL_DIR`), `--month` / `--from`
/ `--to` (`Jan`, `1`, or `2099-01`), `--year`, `--force`, `--dry-run`.

Environment:

- `AW_BACKFILL_DIR` — the data directory holding the CSVs and `.aw-backfill/` state.
- `AW_BACKFILL_BASE_URL` — app base URL (default `http://localhost:4321`).
- `AW_BACKFILL_EMAIL`, `AW_BACKFILL_PASSWORD` — credentials for the loading user.
- `AW_BACKFILL_SECONDARY_PASSWORD` — required by `setup --create-user`.

There is no password flag on any subcommand: a secret must not land in shell history.

Accounts are created by the loading member and then moved to the owner named in
the config's `accounts` roster, so `setup --create-user` must have run before a
range with two owners is loaded.

### Admin & Security

| Command                                                         | Description                                     |
| --------------------------------------------------------------- | ----------------------------------------------- |
| `bun run aw admin create-super-admin --email admin@example.com` | Promote user to super admin                     |
| `bun run aw admin generate-email-key`                           | Generate encryption key for email functionality |

### Other

| Command                | Description         |
| ---------------------- | ------------------- |
| `bun run aw mcp start` | Start MCP server    |
| `bun run aw release`   | Interactive release |

To connect an MCP client, first seed the OAuth clients with `bun run aw db seed-oauth-clients`. Then sign in to Allowealth, open **Security → Connected Apps**, click **Connect** for your client, approve the request, and copy the one-time `ALLOWEALTH_ACCESS_TOKEN`.

## Testing

### Unit Tests

| Command                 | Description                                       |
| ----------------------- | ------------------------------------------------- |
| `bun run test`          | Run unit tests with dots reporter (failures only) |
| `bun run tests`         | Alias for `bun run test`                          |
| `bun run test:watch`    | Run tests in watch mode                           |
| `bun run test:coverage` | Run tests with coverage report                    |

```bash
bun run test                 # Dots output, failures only
bun run tests                # Alias for bun run test
bun run test:watch           # Watch mode
```

### E2E Tests (Playwright)

| Command                   | Description                                                        |
| ------------------------- | ------------------------------------------------------------------ |
| `bun run test:e2e:setup`  | Install Playwright browsers                                        |
| `bun run test:e2e`        | Run all E2E tests headless                                         |
| `bun run test:e2e:ui`     | Open Playwright UI mode                                            |
| `bun run test:e2e:headed` | Run E2E tests in visible browser                                   |
| `bun run test:e2e:debug`  | Run E2E tests in debug mode                                        |
| `bun run test:e2e:report` | Open HTML test report                                              |
| `bun run snapshot:html`   | Capture normalized HTML per route into `.snapshots/$SNAPSHOT_DIR/` |

```bash
bun run test:e2e:setup       # First time only
bun run test:e2e             # Run all E2E tests
SNAPSHOT_DIR=before bun run snapshot:html   # HTML snapshots for whitespace diffs (dev server on 4320, db/.e2e.db)
```

## Release

| Command           | Description                                               |
| ----------------- | --------------------------------------------------------- |
| `bun run release` | Interactive release script (bump version, tag, changelog) |

```bash
bun run release
```
