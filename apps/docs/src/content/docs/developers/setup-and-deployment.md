---
title: Setup and Deployment
description: Set up Allowealth locally and deploy it as a self-hosted Bun server.
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

Allowealth builds a standalone server with the `@astrojs/node` adapter and runs
on Bun against SQLite.

### Building

```bash
bun run build
```

#### 1. Provision the database

Point `DATABASE_URL` at a file on a persistent volume and apply migrations:

```bash
DATABASE_URL=/var/lib/allowealth/app.db bun run db:migrate
```

#### 2. Set secrets

Provide the application secrets through the process environment:

```bash
DATABASE_URL=/var/lib/allowealth/app.db
BETTER_AUTH_SECRET=...
EMAIL_API_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
PUBLIC_URL=https://your-app.example.com
```

#### 3. Start the server

```bash
bun run ./dist/server/entry.mjs
```

Docker helpers are available via `bun run docker:start` and `bun run docker:stop`.

#### 4. Create the first workspace

```bash
bun run aw workspace create --name "My Family" --email admin@example.com
```

## Static Sites on Cloudflare Pages

The marketing site (`apps/site`) and this documentation site (`apps/docs`) deploy
to Cloudflare Pages, each with its own `wrangler.toml`:

```bash
bun run landing:deploy
bun run docs:deploy
```

The `deploy-site.yml` and `deploy-docs-site.yml` workflows deploy them on pushes
that touch `apps/site/**` or `apps/docs/**`. Set `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` in your GitHub repository secrets.

To use a custom domain, add it to your Cloudflare account and set the `routes`
pattern in the relevant `wrangler.toml`:

```toml
routes = [
  { pattern = "allowealth.io", custom_domain = true },
]
```

## Troubleshooting

- **`import.meta.env.DATABASE_URL` is undefined:** Use `getEnv('DATABASE_URL')` to read from the runtime environment instead of the build-time environment.
- **Google OAuth callback fails:** Verify Google is configured with `/api/auth/callback/google` and that `PUBLIC_URL` matches the deployed origin exactly.

## Related Documentation

- [Feature Workflow](/developers/feature-workflow/)
- [Commands Reference](/reference/commands/)
- [Database Migrations Architecture](/reference/architecture/)
