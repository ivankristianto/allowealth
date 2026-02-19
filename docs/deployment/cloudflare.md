# Deploying to Cloudflare Workers

Allowealth runs on Cloudflare Workers at the edge. Two database options are available — choose one based on your needs.

| Option                      | Database               | Config File     | Deploy Command              | Best For                           |
| --------------------------- | ---------------------- | --------------- | --------------------------- | ---------------------------------- |
| **Hyperdrive + PostgreSQL** | Supabase PostgreSQL    | `wrangler.toml` | `bun run deploy:cloudflare` | Full SQL, existing PostgreSQL data |
| **D1**                      | Cloudflare D1 (SQLite) | `wrangler.toml` | `bun run deploy:cloudflare` | Zero-config, edge-native SQLite    |

Both options use the same application code — the database driver is selected at runtime based on environment bindings.

## Prerequisites

- [Bun](https://bun.sh) installed locally
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (`bun add -d wrangler`)
- Cloudflare account with Workers enabled
- Custom domain configured in Cloudflare DNS (optional)

```bash
# Authenticate with Cloudflare
wrangler login
```

---

## Option A: Hyperdrive + PostgreSQL

Uses Supabase PostgreSQL with Cloudflare Hyperdrive for connection pooling. Hyperdrive maintains persistent TCP/TLS connections at the edge, eliminating per-request connection overhead.

```
Worker  →  local proxy (0 subrequests)  →  Hyperdrive edge pool  →  Supabase PostgreSQL
```

### 1. Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings > Database > Connection string > URI**
3. Copy the **direct connection** string (port 5432, not the pooler on 6543)

> Hyperdrive handles connection pooling — use the direct connection, not the Supabase transaction pooler.

### 2. Create Hyperdrive Configuration

```bash
wrangler hyperdrive create allowealth-db \
  --connection-string="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

Copy the returned config ID and update `wrangler.toml`:

```toml
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "<your-config-id>"
```

### 3. Set Secrets

Secrets are stored encrypted in Cloudflare and injected at runtime:

```bash
wrangler secret put DATABASE_URL          # Supabase direct connection string
wrangler secret put EMAIL_API_KEY         # Resend API key (for email)
wrangler secret put GOOGLE_CLIENT_ID      # OAuth (if using Google SSO)
wrangler secret put GOOGLE_CLIENT_SECRET  # OAuth (if using Google SSO)
```

### 4. Run Database Migrations

```bash
# Generate PostgreSQL migration (if not already done)
bun run db:generate:prod

# Apply migration to Supabase
bun run db:migrate:prod
```

See [ADR-007: Database Migrations](../architecture/007-database-migrations.md) for detailed migration workflows.

### 5. Deploy

```bash
bun run deploy:cloudflare
```

This runs `bun run build:cloudflare && wrangler deploy`, which:

1. Builds the Astro app with the `@astrojs/cloudflare` adapter
2. Deploys the built `_worker.js` bundle to Workers

### 6. Create First Workspace

```bash
bun run cli:create-workspace:prod -- \
  --name "My Family" \
  --email admin@example.com \
  --currency IDR
```

Follow the CLI output to get the invitation link.

---

## Option B: Cloudflare D1

Uses Cloudflare D1, a serverless SQLite-compatible database running at the edge. No external database service needed.

```
Worker  →  D1 binding (in-process)  →  SQLite at the edge
```

### 1. Create D1 Database

```bash
wrangler d1 create allowealth-db
```

Copy the returned `database_id` and update `wrangler.toml` (uncomment the `[[d1_databases]]` section at the bottom):

```toml
[[d1_databases]]
binding = "DB"
database_name = "allowealth-db"
database_id = "<your-database-id>"
```

Also comment out `[[hyperdrive]]` in `wrangler.toml` when using D1.

### 2. Set Secrets

D1 does not need `DATABASE_URL`. Set only the application secrets:

```bash
wrangler secret put EMAIL_API_KEY
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
```

### 3. Run Database Migrations

D1 uses the SQLite schema and migration files:

```bash
# Apply all SQLite migrations to the remote D1 database
for file in drizzle/sqlite/*.sql; do
  wrangler d1 execute allowealth-db --remote --file="$file"
done
```

Or apply a specific migration:

```bash
bun run db:d1:migrate -- ./drizzle/sqlite/0000_xxx.sql
```

For local D1 testing:

```bash
bun run db:d1:migrate:local -- ./drizzle/sqlite/0000_xxx.sql
```

### 4. Deploy

```bash
bun run deploy:cloudflare
```

### 5. Create First Workspace

After deploying, use the production CLI to set up your workspace. The CLI connects to D1 via the Supabase-compatible interface or you can use `wrangler d1 execute` to run SQL directly:

```bash
# Create workspace via wrangler
wrangler d1 execute allowealth-db --remote --command="SELECT 1"
```

> Note: The CLI tools (`cli:create-workspace:prod`) currently target PostgreSQL via `DATABASE_URL`. For D1, workspace creation is handled through the deployed application's signup flow or direct SQL.

---

## Environment Variables

### Non-Secret Variables

Defined in `wrangler.toml` under `[vars]`:

| Variable               | Default                 | Description                                 |
| ---------------------- | ----------------------- | ------------------------------------------- |
| `NODE_ENV`             | `production`            | Runtime environment                         |
| `PUBLIC_URL`           | `https://allowealth.io` | Application URL (used in emails, redirects) |
| `SIGNUP_MODE`          | `invite_only`           | `invite_only` or `public`                   |
| `CACHE_DRIVER`         | `upstash`               | Cache backend (`upstash` or `memory`)       |
| `PERF_DEBUG`           | `true`                  | Enable performance instrumentation logging  |
| `LOG_LEVEL`            | `warn`                  | Minimum log level                           |
| `EMAIL_MODE`           | `real`                  | `real` or `console` (dev)                   |
| `EMAIL_PROVIDER`       | `resend`                | Email service provider                      |
| `EMAIL_SENDER_NAME`    | `Allowealth`            | From name in emails                         |
| `EMAIL_SENDER_ADDRESS` | `noreply@allowealth.io` | From address in emails                      |

### Secrets

Set via `wrangler secret put <NAME>`:

| Secret                 | Required        | Used By                      |
| ---------------------- | --------------- | ---------------------------- |
| `DATABASE_URL`         | Hyperdrive only | PostgreSQL connection string |
| `EMAIL_API_KEY`        | Yes             | Resend API key               |
| `GOOGLE_CLIENT_ID`     | If using SSO    | Google OAuth client          |
| `GOOGLE_CLIENT_SECRET` | If using SSO    | Google OAuth secret          |

---

## CI/CD with GitHub Actions

The project includes a GitHub Actions workflow at `.github/workflows/deploy-cloudflare.yml`.

### Triggers

- Push to `release` branch
- Version tags (`v*.*.*`)
- Manual dispatch from GitHub UI

### Required GitHub Secrets

| Secret                  | Description                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Wrangler deploy token ([create here](https://dash.cloudflare.com/profile/api-tokens)) |
| `CLOUDFLARE_ACCOUNT_ID` | Your Cloudflare account ID                                                            |

### Manual Deployment

```bash
# Tag-based deploy
git tag v1.2.0
git push origin v1.2.0

# Branch-based deploy
git push origin main:release
```

### Workflow Overview

1. Checkout code
2. Install Bun + dependencies
3. Build for Cloudflare Workers (`bun run build:cloudflare`)
4. Deploy via `wrangler-action@v3`
5. Output deployment summary with version metadata

---

## Custom Domain

The `wrangler.toml` routes configuration binds the Worker to a custom domain:

```toml
routes = [
  { pattern = "allowealth.io", custom_domain = true },
]
```

To use your own domain:

1. Add the domain to your Cloudflare account
2. Update the `pattern` in `wrangler.toml`
3. Deploy — Cloudflare automatically provisions DNS and SSL

> Custom Domain routes must use bare domain names only. Wildcards (`/*`) and paths are not supported.

---

## Monitoring

### Workers Logs

Workers Logs are enabled in `wrangler.toml`:

```toml
[observability]
enabled = true
head_sampling_rate = 1  # 100% sampling
```

View logs in the [Cloudflare dashboard](https://dash.cloudflare.com) under **Workers & Pages > your worker > Logs**, or via CLI:

```bash
wrangler tail
```

### Diagnostic Logging

The database middleware logs connection details per request:

```
dialect=sqlite url=<D1> supabase=false hyperdrive=false d1=true
```

For Hyperdrive:

```
dialect=postgresql url=postgresql://***@proxy supabase=false hyperdrive=true d1=false
total fetch subrequests: 0
```

---

## Architecture Overview

### Middleware Chain

The middleware stack runs in order on every request:

```
1. runtimeEnv        → Inject Workers secrets, detect D1/Hyperdrive bindings
2. database          → Reset DB connection per request, manage lifecycle
3. perfDebug         → Performance instrumentation
4. securityHeaders   → CSP, HSTS, etc.
5. authentication    → Session validation (Lucia Auth)
6. csrf              → CSRF token verification
7. routeGuard        → Route access control
```

### Database Driver Selection

The database driver is selected automatically at runtime:

```
D1 binding present (env.DB)         →  D1 driver (drizzle-orm/d1)
DATABASE_URL starts with postgres:// →  PostgreSQL driver (postgres.js)
Otherwise                            →  SQLite driver (bun:sqlite, dev only)
```

### Key Runtime Behaviors

- **Per-request state reset**: `prepareForRequest()` discards stale I/O references at the start of each request
- **Lazy initialization**: The database connection is created on first access, not at module load time
- **Connection lifecycle**: PostgreSQL connections are opened and closed per request. D1 has no connection lifecycle (serverless binding)
- **Environment resolution**: Runtime secrets are injected via middleware, not `import.meta.env` (which is build-time only on Workers)

---

## Troubleshooting

### "Too many subrequests"

**Cause**: Direct PostgreSQL connections consume TCP subrequests in Workers.
**Fix**: Enable Hyperdrive. Each query via Hyperdrive uses 0 subrequests.

### "Cannot perform I/O on behalf of a different request"

**Cause**: Reusing a database connection from a previous Workers request.
**Fix**: The `database` middleware calls `prepareForRequest()` to reset connections. Verify middleware order in `src/middleware/index.ts`.

### "D1_ENABLED is set but D1 binding is not available"

**Cause**: D1 binding `DB` not configured in wrangler config.
**Fix**: Uncomment the `[[d1_databases]]` section in `wrangler.toml` and set the correct `database_id`.

### Build fails with native addon errors

**Cause**: Dependencies like `@node-rs/argon2` use native addons incompatible with Workers.
**Fix**: The project uses Web Crypto API (PBKDF2-SHA256) instead of native password hashing. Check for accidental native addon imports.

### `import.meta.env.DATABASE_URL` is undefined

**Cause**: `import.meta.env` only contains build-time values on Workers.
**Fix**: Use `getEnv('DATABASE_URL')` which reads from the runtime environment set by middleware.

---

## Rollback

### Hyperdrive Issues

If Hyperdrive causes problems:

1. Remove the `[[hyperdrive]]` section from `wrangler.toml`
2. Set `DATABASE_URL` secret: `wrangler secret put DATABASE_URL`
3. Redeploy: `bun run deploy:cloudflare`

The application falls back to direct postgres.js TCP connections automatically.

### D1 to Hyperdrive Migration

To switch from D1 to Hyperdrive + PostgreSQL:

1. In `wrangler.toml`: comment out `[[d1_databases]]`, uncomment `[[hyperdrive]]`
2. Set up Supabase and Hyperdrive (follow Option A above)
3. Export data from D1 and import into PostgreSQL
4. Deploy: `bun run deploy:cloudflare`

### Reverting a Deployment

```bash
# List recent deployments
wrangler deployments list

# Roll back to a specific deployment
wrangler rollback <deployment-id>
```

---

## Related Documentation

- [ADR-006: Database Connection Architecture](../architecture/006-database-connection-architecture.md)
- [ADR-007: Database Migrations](../architecture/007-database-migrations.md)
- [Deployment Rules](../../.claude/rules/backend/deployment.md)
- [Commands Reference](../../COMMANDS.md)
