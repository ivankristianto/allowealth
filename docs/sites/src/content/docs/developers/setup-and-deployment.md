---
title: Setup and Deployment
description: Set up Allowealth locally and deploy it to Cloudflare Workers.
draft: false
head: []
sidebar:
  label: Setup & Deployment
  order: 1
audience:
  - developer
---

Set up Allowealth locally and deploy it to production.

## Local Development

Set up your local environment to run the application and documentation.

### Prerequisites

- [Bun](https://bun.sh)
- Git
- Optional: Playwright dependencies for end-to-end tests

### 1. Install and Bootstrap

```bash
cp .env.example .env
./scripts/setup.sh
```

### 2. Start Application and Docs

```bash
bun run dev
bun run docs:dev
```

- **App:** Runs the Astro server from the project root.
- **Docs:** Runs the Starlight server from `docs/sites`.

### 3. Run Quality Gates

Always run quality gates before you push code.

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

### 4. Verify Tests

```bash
bun run test
bun run test:e2e
```

:::note
If you edit only documentation, run `bun run docs:check` and `bun run docs:build` to verify your changes.
:::

## Deployment

Allowealth supports multiple deployment targets. Use the `DEPLOY_TARGET` environment variable to select the appropriate Astro adapter at build time.

### Cloudflare Workers

Allowealth runs on Cloudflare Workers at the edge using the `@astrojs/cloudflare` adapter.

Choose a database option for Cloudflare:

| Option                      | Database               | Best For                                                |
| --------------------------- | ---------------------- | ------------------------------------------------------- |
| **Hyperdrive + PostgreSQL** | Supabase PostgreSQL    | Full SQL, existing PostgreSQL data (production default) |
| **D1**                      | Cloudflare D1 (SQLite) | Zero-config, edge-native SQLite                         |

#### Option A: Hyperdrive + PostgreSQL

Use Supabase PostgreSQL with Cloudflare Hyperdrive to pool connections at the edge.

##### 1. Configure Supabase and Hyperdrive

1. Create a [Supabase](https://supabase.com) project.
2. Copy the **direct connection** string (port 5432) from **Settings > Database > Connection string > URI**.
3. Create a Hyperdrive configuration:

```bash
wrangler hyperdrive create allowealth-db \
  --connection-string="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

4. Add the returned configuration ID to `wrangler.toml`:

```toml
[[hyperdrive]]
binding = "HYPERDRIVE"
id = "<your-config-id>"
```

##### 2. Set Secrets

Store encrypted secrets in Cloudflare:

```bash
wrangler secret put DATABASE_URL          # Supabase direct connection string
wrangler secret put EMAIL_API_KEY         # Resend API key
wrangler secret put GOOGLE_CLIENT_ID      # Optional: OAuth client ID
wrangler secret put GOOGLE_CLIENT_SECRET  # Optional: OAuth client secret
```

##### 3. Migrate and Deploy

Generate and apply PostgreSQL migrations, then deploy:

```bash
bun run db:generate:prod
bun run db:migrate:prod
bun run deploy:cloudflare
```

##### 4. Create First Workspace

Use the CLI to create your initial workspace and get an invitation link:

```bash
bun run cli:create-workspace:prod -- --name "My Family" --email admin@example.com --currency IDR
```

#### Option B: Cloudflare D1

Use Cloudflare D1 for a serverless SQLite database running entirely at the edge.

##### 1. Configure D1

1. Create the D1 database:

```bash
wrangler d1 create allowealth-db
```

2. Uncomment the `[[d1_databases]]` section in `wrangler.toml` and add your database ID. Comment out the `[[hyperdrive]]` section.

```toml
[[d1_databases]]
binding = "DB"
database_name = "allowealth-db"
database_id = "<your-database-id>"
```

##### 2. Set Secrets

D1 does not use `DATABASE_URL`. Set only the application secrets:

```bash
wrangler secret put EMAIL_API_KEY
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
```

##### 3. Migrate and Deploy

Apply SQLite migrations to the remote D1 database, then deploy:

```bash
for file in drizzle/sqlite/*.sql; do
  wrangler d1 execute allowealth-db --remote --file="$file"
done

bun run deploy:cloudflare
```

### Other Targets (Coming Soon)

- **Vercel:** Support for Vercel Serverless Functions.
- **Netlify:** Support for Netlify Functions.
- **Node.js (Docker/VPS):** Standalone server deployment.

## CI/CD and Custom Domains (Cloudflare)

The GitHub Actions workflow (`.github/workflows/deploy-cloudflare.yml`) deploys automatically when you push to the `release` branch or create version tags. Set `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in your GitHub repository secrets.

To use a custom domain, add it to your Cloudflare account and update the `routes` pattern in `wrangler.toml`:

```toml
routes = [
  { pattern = "allowealth.io", custom_domain = true },
]
```

## Troubleshooting

- **"Too many subrequests":** Direct PostgreSQL connections consume TCP subrequests. Enable Hyperdrive to fix this.
- **"Cannot perform I/O on behalf of a different request":** The `database` middleware must call `prepareForRequest()` to reset connections per request.
- **"D1_ENABLED is set but D1 binding is not available":** Uncomment the `[[d1_databases]]` section in `wrangler.toml` and verify the database ID.
- **`import.meta.env.DATABASE_URL` is undefined:** Use `getEnv('DATABASE_URL')` to read from the runtime environment instead of the build-time environment.

## Related Documentation

- [Feature Workflow](/developers/feature-workflow/)
- [Commands Reference](/reference/commands/)
- [Database Migrations Architecture](/reference/architecture/)
