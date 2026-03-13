---
title: Self-Host Allowealth
description: Run Allowealth on infrastructure you control.
draft: false
head: []
sidebar:
  label: Self-Host
  order: 2
audience:
  - admin
  - developer
---

Self-host Allowealth when you want full control over data, updates, and deployment.

## Who self-hosting is for

- Teams comfortable managing their own runtime, secrets, and backups
- Organizations that need private networking, custom domains, or data residency controls
- Developers who want to evaluate or extend Allowealth before rolling it out

## Prerequisites

- Bun 1.x
- Git access to the Allowealth repository
- A deployment target you control, such as a VPS or Cloudflare account
- Required environment values: `PUBLIC_URL`, `BETTER_AUTH_SECRET`, and any auth provider secrets you plan to enable

## Quick Start

Start locally first. It is the fastest way to confirm auth, seeded data, and core workflows before you deploy.

From the repository root:

```bash
cp .env.example .env
./scripts/setup.sh
bun run dev
```

Open `http://localhost:4321` and confirm the app loads.

## Environment and deployment notes

- Set `PUBLIC_URL` to the final origin before you invite real users or enable OAuth.
- Replace `BETTER_AUTH_SECRET` with a long random value in every non-local environment.
- Start with SQLite for a single-host pilot. Use Cloudflare D1 when you deploy to Cloudflare Workers.
- Cloudflare Workers is the primary documented production target. Node builds are also available for self-managed servers.

See [Setup and Deployment](/developers/setup-and-deployment/) for target-specific commands and production details.

## First login and first checks

If you used the seeded local setup, sign in with the demo account from [Getting Started](/getting-started/).

After first login, check these basics:

1. The dashboard loads without errors.
2. You can create a transaction and see budgets update.
3. Reports show the new data.
4. Backups, secrets, and domain settings are in place before you share access.

For a clean production environment, create the first workspace and admin user before opening the app to others:

```bash
bun run aw workspace create --target <environment> --name "My Family" --email admin@example.com
```

## Next steps

- Follow [Setup and Deployment](/developers/setup-and-deployment/) for Cloudflare and Node deployment details
- Use [Deployment Guide](/admins/deployment-guide/) for rollout and rollback checks
- Keep [Commands Reference](/reference/commands/) nearby for exact CLI syntax
- Review [Database Management](/developers/database-management/) before you plan backups or restores
