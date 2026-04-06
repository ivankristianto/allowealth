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

- [Docker Engine 24+](https://docs.docker.com/engine/install/)
- [Docker Compose v2](https://docs.docker.com/compose/install/)
- A machine that can build Docker images
- Google OAuth credentials for your domain
- Cloudflare Turnstile site and secret keys

## Quick start

```bash
# 1. Clone the repository at the release you want
git clone https://github.com/ivankristianto/allowealth.git
cd allowealth
git checkout vX.Y.Z  # Replace with your target version

# 2. First run: create .env and generate secrets (exits after setup)
bun run docker:start

# 3. Edit .env with your OAuth/Turnstile values
# Then start the containers:
bun run docker:start
```

The app runs at `http://localhost:3000` by default.

## First-run setup

When the app starts with an empty database, the installer guides you through creating the first workspace and admin account.

1. Open your `PUBLIC_URL` (e.g., `http://localhost:3000`)
2. The app redirects to `/installer` — fill in:
   - Workspace name
   - Admin full name, email, and password
   - Installer secret (if you set `INSTALLER_SECRET` in `.env`)
3. Submit the form to complete setup
4. Sign in with the admin credentials you created

The installer only appears when no users exist. After setup, `/installer` redirects to the login page.

## Environment variables

The following variables are required for production:

| Variable                    | Required | Description                                                |
| --------------------------- | -------- | ---------------------------------------------------------- |
| `PUBLIC_URL`                | Yes      | Origin users access (e.g., `https://finances.example.com`) |
| `BETTER_AUTH_SECRET`        | Yes      | Long random string for auth signing                        |
| `EMAIL_ENCRYPTION_KEY`      | Yes      | Base64 32-byte key for encrypted secrets                   |
| `COOKIE_SIGNING_SECRET`     | Yes      | Separate secret for cookie signing                         |
| `GOOGLE_CLIENT_ID`          | Yes      | Google OAuth client ID                                     |
| `GOOGLE_CLIENT_SECRET`      | Yes      | Google OAuth client secret                                 |
| `PUBLIC_TURNSTILE_SITE_KEY` | Yes      | Cloudflare Turnstile site key                              |
| `TURNSTILE_SECRET_KEY`      | Yes      | Cloudflare Turnstile secret key                            |

Optional variables:

| Variable          | Default                 | Description                                      |
| ----------------- | ----------------------- | ------------------------------------------------ |
| `DATABASE_URL`    | `/data/allowealth.db`   | SQLite path inside container                     |
| `SIGNUP_MODE`     | `invite_only`           | `invite_only` or `public` registration           |
| `EMAIL_MODE`      | `console`               | `console` logs emails, `real` sends via provider |
| `CACHE_DRIVER`    | `redis`                 | `redis`, `memory`, or `upstash`                  |
| `REDIS_PASSWORD`  | `changeme`              | Redis password (internal Docker network)         |
| `PUBLIC_SITE_URL` | `https://allowealth.io` | Marketing site URL                               |

See `docker/.env.example` for email provider and cache configuration options.

## Volume persistence

SQLite lives at `/data/allowealth.db` inside the container, backed by a named Docker volume (`allowealth-data`). The volume persists across container restarts and image updates.

### Backup

```bash
docker compose -f docker/docker-compose.yml stop app
docker run --rm \
  -v allowealth-data:/data \
  -v "$(pwd)":/backup \
  busybox sh -c 'tar czf /backup/allowealth-backup-$(date +%Y%m%d).tar.gz -C / data'
docker compose -f docker/docker-compose.yml start app
```

Stop the app before backing up. SQLite uses WAL mode, so live backups can miss recent changes.

### Restore

```bash
docker compose -f docker/docker-compose.yml stop app
docker run --rm \
  -v allowealth-data:/data \
  -v "$(pwd)":/backup \
  busybox tar xzf /backup/allowealth-backup-YYYYMMDD.tar.gz -C /
docker compose -f docker/docker-compose.yml start app
```

## Reverse proxy

Allowealth listens on port 3000 inside the container. Put it behind a reverse proxy for HTTPS.

### Nginx example

```nginx
server {
    listen 443 ssl;
    server_name finances.example.com;

    # SSL configuration here

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Caddy and Traefik work equally well. Set `PUBLIC_URL` to the final HTTPS origin your proxy serves.

## Updates

```bash
git fetch --tags
git checkout vX.Y.Z  # switch to target version
docker compose -f docker/docker-compose.yml up -d --build
```

Migrations run automatically when the container starts.

## Database management

### Run migrations manually

```bash
docker exec allowealth-app bun run src/db/migrate.ts
```

### Seed with demo data

```bash
# Default: 6 months of transactions
docker exec allowealth-app bun run src/db/seed/index.ts

# Custom options
docker exec allowealth-app bun run src/db/seed/index.ts --months=12
docker exec allowealth-app bun run src/db/seed/index.ts --stress
```

### Reset database

```bash
docker exec allowealth-app bun run src/db/setup.ts
```

## Troubleshooting

### Container exits immediately

A migration failed or a required environment variable is missing. Check the logs:

```bash
docker compose -f docker/docker-compose.yml logs app
```

To run migrations manually:

```bash
docker exec allowealth-app bun run src/db/migrate.ts
```

If the container has exited, restart it first:

```bash
docker compose -f docker/docker-compose.yml up -d
```

### App unreachable on port 3000

Verify the container is running:

```bash
docker compose -f docker/docker-compose.yml ps
docker compose -f docker/docker-compose.yml logs app
```

If the container is healthy but unreachable, check your firewall rules and reverse proxy configuration.

## Next steps

- Review [Getting Started](/getting-started/) for first-run workflows and demo account credentials
- Follow [Setup and Deployment](/developers/setup-and-deployment/) for Cloudflare and Node deployment details
- Use [Deployment Guide](/admins/deployment-guide/) for rollout and rollback checks
- Keep [Commands Reference](/reference/commands/) nearby for CLI syntax
- Review [Database Management](/developers/database-management/) before planning backups
