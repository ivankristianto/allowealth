# Commands Reference

All available `bun run` commands for the project.

## Development

| Command                | Description                                                |
| ---------------------- | ---------------------------------------------------------- |
| `bun run dev`          | Start Astro dev server with hot reload                     |
| `bun run preview`      | Preview build locally (uses `.env`)                        |
| `bun run preview:prod` | Preview build with production env (uses `.env.production`) |
| `bun run storybook`    | Start Storybook on port 6006                               |

```bash
bun run dev              # http://localhost:4321
bun run storybook        # http://localhost:6006
```

## Build & Deploy

| Command                     | Description                                          |
| --------------------------- | ---------------------------------------------------- |
| `bun run build`             | Build for default target                             |
| `bun run build:node`        | Build for Node.js deployment                         |
| `bun run build:cloudflare`  | Build for Cloudflare Workers                         |
| `bun run build:vercel`      | Build for Vercel                                     |
| `bun run build:netlify`     | Build for Netlify                                    |
| `bun run build:analyze`     | Build and generate bundle stats at `dist/stats.html` |
| `bun run build-storybook`   | Build static Storybook site                          |
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

The `aw` CLI provides a unified interface for admin and operational commands. Use `--prod` to target production.

### Quick Reference

| Command                       | Description                        |
| ----------------------------- | ---------------------------------- |
| `bun run aw --help`           | Show all commands                  |
| `bun run aw <command> --help` | Show subcommand help               |
| `bun run aw --prod <command>` | Run against production environment |

### Workspace Management

| Command                                                                          | Description                            |
| -------------------------------------------------------------------------------- | -------------------------------------- |
| `bun run aw workspace create --name "Name" --email admin@example.com`            | Create workspace with admin invitation |
| `bun run aw workspace create-d1 --name "Name" --email admin@example.com`         | Create workspace on D1 (remote)        |
| `bun run aw workspace create-d1 --name "Name" --email admin@example.com --local` | Create workspace on D1 (local)         |
| `bun run aw workspace list`                                                      | List all workspaces                    |
| `bun run aw workspace delete --id <id>`                                          | Delete workspace (with confirmation)   |
| `bun run aw workspace delete --id <id> --force`                                  | Delete workspace (skip confirmation)   |

Production: `bun run aw --prod workspace list`

### Database

| Command                              | Description                                |
| ------------------------------------ | ------------------------------------------ |
| `bun run aw db migrate`              | Apply pending migrations (SQLite)          |
| `bun run aw --prod db migrate`       | Apply pending migrations (PostgreSQL)      |
| `bun run aw db migrate --d1`         | Auto-apply pending migrations to remote D1 |
| `bun run aw db migrate --d1 --local` | Auto-apply pending migrations to local D1  |
| `bun run aw db generate`             | Generate migration from schema changes     |
| `bun run aw db push`                 | Push schema directly (dev only)            |
| `bun run aw db studio`               | Open Drizzle Studio                        |
| `bun run aw db seed`                 | Seed with demo data                        |
| `bun run aw db reset`                | Delete + push + seed (dev only)            |
| `bun run aw db empty`                | Truncate all data                          |

### Admin & Security

| Command                                                                            | Description                   |
| ---------------------------------------------------------------------------------- | ----------------------------- |
| `bun run aw admin create-super-admin --email admin@example.com`                    | Promote user to super admin   |
| `bun run aw admin create-api-key --workspace-id <id> --user-id <id> --name "Name"` | Generate API key              |
| `bun run aw admin rotate-db-password [--ask] [--hyperdrive]`                       | Rotate DB password            |
| `bun run aw admin generate-email-key`                                              | Generate email encryption key |

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
