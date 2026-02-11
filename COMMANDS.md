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

## Database (PostgreSQL/Supabase - Production)

| Command                    | Description                                       |
| -------------------------- | ------------------------------------------------- |
| `bun run db:generate:prod` | Generate PostgreSQL migration from schema changes |
| `bun run db:migrate:prod`  | Apply pending PostgreSQL migrations               |
| `bun run db:empty:prod`    | Truncate all production data (5s safety delay)    |

```bash
# Initial setup (fresh Supabase)
bun run db:generate:prod     # Generate initial migration
bun run db:migrate:prod      # Apply to Supabase

# After schema changes (always do both dialects)
bun run db:generate          # SQLite migration
bun run db:generate:prod     # PostgreSQL migration
bun run db:migrate           # Apply locally
bun run db:migrate:prod      # Apply to production
```

See `docs/architecture/007-database-migrations.md` for full migration workflow.

## CLI Tools

All CLI tools have `:prod` variants that use `.env.production` for the database connection.

### Workspace Management

| Command                             | Description                                             |
| ----------------------------------- | ------------------------------------------------------- |
| `bun run cli:create-workspace`      | Create workspace with admin user and default categories |
| `bun run cli:create-workspace:prod` | Same, against production DB                             |
| `bun run cli:list-workspaces`       | List all workspaces with user counts                    |
| `bun run cli:list-workspaces:prod`  | Same, against production DB                             |
| `bun run cli:delete-workspace`      | Delete a workspace and all its data                     |
| `bun run cli:delete-workspace:prod` | Same, against production DB                             |

```bash
# Create a new workspace interactively
bun run cli:create-workspace:prod

# With arguments
bun run cli:create-workspace:prod -- --name "My Family" --email admin@example.com

# List workspaces
bun run cli:list-workspaces:prod
```

### API Keys

| Command                           | Description                      |
| --------------------------------- | -------------------------------- |
| `bun run cli:create-api-key`      | Generate API key for a workspace |
| `bun run cli:create-api-key:prod` | Same, against production DB      |

```bash
bun run cli:create-api-key:prod
```

### Security & Configuration

| Command                          | Description                                                          |
| -------------------------------- | -------------------------------------------------------------------- |
| `bun run cli:rotate-db-password` | Update Supabase DB password in `.env.production` and test connection |
| `bun run cli:generate-email-key` | Generate encryption key for email functionality                      |

```bash
# After rotating password in Supabase dashboard:
# 1. Update password in .env.production
# 2. Run to update all URLs and verify connection
bun run cli:rotate-db-password

# Or enter password interactively
bun run cli:rotate-db-password -- --ask

# Also update Cloudflare Hyperdrive
bun run cli:rotate-db-password -- --ask --hyperdrive
```

### Email Verification

```bash
# Backfill existing users as verified (run once after deployment)
bun run backfill:email-verification           # Local/dev
bun run backfill:email-verification:prod      # Production
```

Marks all existing users' emails as verified and activates all workspaces.
Run this once after deploying the email verification feature.

## MCP Server

| Command                  | Description                                   |
| ------------------------ | --------------------------------------------- |
| `bun run mcp:start`      | Start MCP server for AI assistant integration |
| `bun run mcp:start:prod` | Same, with production env                     |

```bash
bun run mcp:start:prod
```

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
