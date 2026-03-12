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

At minimum, set these auth-related values in your local `.env` before testing sign-in:

```bash
PUBLIC_URL=http://localhost:4321
BETTER_AUTH_SECRET=replace-with-a-random-secret
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### 2. Start Application and Docs

```bash
bun run dev
bun run docs:dev
```

- **App:** Runs the Astro server from the project root.
- **Docs:** Runs the Starlight server from `apps/docs`.

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

Use Cloudflare D1 for the production database. It runs SQLite-compatible storage at the edge and matches the local schema.

##### 1. Configure D1

1. Create the D1 database:

```bash
wrangler d1 create allowealth-db
```

2. Copy `wrangler.toml.example` to `wrangler.toml` and add your database ID:

```toml
[[d1_databases]]
binding = "DB"
database_name = "allowealth-db"
database_id = "<your-database-id>"
```

##### 2. Set secrets

D1 does not use `DATABASE_URL`. Set the application secrets instead:

```bash
wrangler secret put EMAIL_API_KEY
wrangler secret put BETTER_AUTH_SECRET
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put PUBLIC_URL
```

##### 3. Migrate and deploy

Apply SQLite migrations to the remote D1 database, then deploy:

```bash
for file in drizzle/sqlite/*.sql; do
  wrangler d1 execute allowealth-db --remote --file="$file"
done

bun run deploy:cloudflare
```

After the Better Auth migration, the first deployment forces a one-time logout because legacy sessions are not preserved.

##### 4. Create the first workspace

Use the CLI against remote D1:

```bash
bun run aw workspace create --target d1 --name "My Family" --email admin@example.com
```

### Other Targets (Build Adapters)

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

- **"Cannot perform I/O on behalf of a different request":** The `database` middleware must call `prepareForRequest()` to reset connections per request.
- **"D1_ENABLED is set but D1 binding is not available":** Uncomment the `[[d1_databases]]` section in `wrangler.toml` and verify the database ID.
- **`import.meta.env.DATABASE_URL` is undefined:** Use `getEnv('DATABASE_URL')` to read from the runtime environment instead of the build-time environment.
- **Google OAuth callback fails:** Verify Google is configured with `/api/auth/callback/google` and that `PUBLIC_URL` matches the deployed origin exactly.

## Related Documentation

- [Feature Workflow](/developers/feature-workflow/)
- [Commands Reference](/reference/commands/)
- [Database Migrations Architecture](/reference/architecture/)
