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
- `openssl` available on the host (for generating secrets — included by default on most Linux distributions and macOS)
- Google OAuth credentials for your domain
- Cloudflare Turnstile site and secret keys

The `bun run docker:start` helper additionally needs Bun and Node. If your host only has Docker (typical for a Dokploy VPS), use the **Manual setup** subsection below to generate secrets with `openssl` only.

## Recommended: pre-built image

Allowealth publishes a multi-arch container image to GitHub Container Registry on every release: [`ghcr.io/ivankristianto/allowealth:latest`](https://github.com/ivankristianto/allowealth/pkgs/container/allowealth). The repository ships a production Compose file (`docker/docker-compose.prod.yml`) that consumes this image, so you do not need to build anything locally.

If you would rather build the image from source, see [Build from source](#build-from-source) below.

## Quick start

```bash
# 1. Clone the repository (any commit on main; the image is versioned separately)
git clone https://github.com/ivankristianto/allowealth.git
cd allowealth

# 2. First run: create .env and generate secrets (exits after setup)
bun run docker:start

# 3. Edit .env with your OAuth/Turnstile values

# 4. Pull the latest published image and start the stack
docker compose -f docker/docker-compose.prod.yml pull
docker compose -f docker/docker-compose.prod.yml up -d
```

`bun run docker:start` is only used the first time to scaffold `.env` and generate `BETTER_AUTH_SECRET`, `EMAIL_ENCRYPTION_KEY`, `COOKIE_SIGNING_SECRET`, and `INSTALLER_SECRET`. After secrets are in place you run `docker compose` directly against the prod file.

The app runs at `http://localhost:3000` by default.

### Manual setup (no Bun required)

Use this path on a Docker-only host (e.g., a Dokploy VPS) where you do not want to install Bun or Node:

```bash
# 1. Fetch the prod compose file and env template directly from GitHub
mkdir allowealth && cd allowealth
curl -fsSL -o docker-compose.prod.yml \
  https://raw.githubusercontent.com/ivankristianto/allowealth/main/docker/docker-compose.prod.yml
curl -fsSL -o .env \
  https://raw.githubusercontent.com/ivankristianto/allowealth/main/docker/.env.example

# 2. Generate secrets with openssl
echo "BETTER_AUTH_SECRET=$(openssl rand -base64 48)"     >> .env
echo "EMAIL_ENCRYPTION_KEY=$(openssl rand -base64 32)"   >> .env
echo "COOKIE_SIGNING_SECRET=$(openssl rand -base64 48)"  >> .env
echo "INSTALLER_SECRET=$(openssl rand -base64 32 | tr -d '=+/' | cut -c1-32)" >> .env

# 3. Edit .env: replace any lingering placeholder lines for the four secrets
#    above, then fill in PUBLIC_URL, GOOGLE_CLIENT_*, TURNSTILE_*, REDIS_PASSWORD.

# 4. Pull and start (the compose file references ../.env by default; mirror that
#    layout or override `env_file:` in the compose file to point at ./.env)
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

Save the `INSTALLER_SECRET` value — you will need it on the first-run setup page.

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
docker compose -f docker/docker-compose.prod.yml stop app
docker run --rm \
  -v allowealth-data:/data \
  -v "$(pwd)":/backup \
  busybox sh -c 'tar czf /backup/allowealth-backup-$(date +%Y%m%d).tar.gz -C / data'
docker compose -f docker/docker-compose.prod.yml start app
```

Stop the app before backing up. SQLite uses WAL mode, so live backups can miss recent changes.

### Restore

```bash
docker compose -f docker/docker-compose.prod.yml stop app
docker run --rm \
  -v allowealth-data:/data \
  -v "$(pwd)":/backup \
  busybox tar xzf /backup/allowealth-backup-YYYYMMDD.tar.gz -C /
docker compose -f docker/docker-compose.prod.yml start app
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

The prod compose file tracks the `:latest` tag and has `pull_policy: always`, so updating is a two-step operation:

```bash
docker compose -f docker/docker-compose.prod.yml pull
docker compose -f docker/docker-compose.prod.yml up -d
```

No `git checkout` or rebuild is required — Compose fetches the new image from GHCR and recreates the `app` container. Migrations run automatically when the container starts.

### Pinning a specific version

To pin to a known-good release instead of tracking `:latest`, set `APP_IMAGE_TAG`. The variable is only honoured for that single shell invocation, so persistence depends on how you set it:

- **Per-invocation (not persisted)** — fine for one-off rollbacks; the next plain `docker compose pull` returns to `:latest`.

  ```bash
  APP_IMAGE_TAG=v0.29.8 docker compose -f docker/docker-compose.prod.yml pull
  APP_IMAGE_TAG=v0.29.8 docker compose -f docker/docker-compose.prod.yml up -d
  ```

- **Persistent via `.env`** — add `APP_IMAGE_TAG=v0.29.8` to the same `.env` file the app uses. Compose loads `.env` automatically and will keep using that tag until you change it.
- **Persistent via the compose file** — edit `docker/docker-compose.prod.yml` and replace `${APP_IMAGE_TAG:-latest}` with the version tag from the [container registry](https://github.com/ivankristianto/allowealth/pkgs/container/allowealth).

## Database management

### Run migrations manually

```bash
docker exec allowealth-app bun run src/db/migrate.ts
```

### Seed with demo data

The image ships pre-bundled maintenance scripts in `/app/dist/scripts/`. Seed writes demo workspaces, users, and transactions, so it is gated by `ALLOW_SEED=true` whenever `NODE_ENV=production` (which is the default for this image).

```bash
# Default: 6 months of transactions
docker exec -e ALLOW_SEED=true allowealth-app bun /app/dist/scripts/seed.js

# Custom options
docker exec -e ALLOW_SEED=true allowealth-app bun /app/dist/scripts/seed.js --months=12
docker exec -e ALLOW_SEED=true allowealth-app bun /app/dist/scripts/seed.js --stress
```

Seeding overwrites existing demo data — do not run it against a database with real user transactions.

### Empty the application tables

```bash
docker exec allowealth-app bun /app/dist/scripts/empty.js
```

This truncates the app's workspace/transaction/budget tables. It does **not** clear the Better Auth `user` and `session` tables, so existing admin accounts can still sign in; the installer flow at `/installer` does not reappear. Use the full reset below if you need a true factory state.

### Reset the database completely

To drop the on-disk SQLite file and start over (installer flow returns, all users wiped), stop the app, delete the volume, then restart so the entrypoint reapplies migrations:

```bash
docker compose -f docker/docker-compose.prod.yml down
docker volume rm allowealth-data
docker compose -f docker/docker-compose.prod.yml up -d
```

## Troubleshooting

### Container exits immediately

A migration failed or a required environment variable is missing. Check the logs:

```bash
docker compose -f docker/docker-compose.prod.yml logs app
```

To run migrations manually:

```bash
docker exec allowealth-app bun run src/db/migrate.ts
```

If the container has exited, restart it first:

```bash
docker compose -f docker/docker-compose.prod.yml up -d
```

### App unreachable on port 3000

Verify the container is running:

```bash
docker compose -f docker/docker-compose.prod.yml ps
docker compose -f docker/docker-compose.prod.yml logs app
```

If the container is healthy but unreachable, check your firewall rules and reverse proxy configuration.

## Build from source

If you need to run a fork, modify the runtime, or air-gap the deployment, use `docker/docker-compose.yml` instead of the prod file. This compose file builds the image locally from the working tree:

```bash
git clone https://github.com/ivankristianto/allowealth.git
cd allowealth
git checkout vX.Y.Z   # optional: pin to a release tag

bun run docker:start  # creates .env, generates secrets, exits

# Edit .env, then start the stack (builds the image locally)
bun run docker:start
```

Updates require rebuilding:

```bash
git fetch --tags
git checkout vX.Y.Z
docker compose -f docker/docker-compose.yml up -d --build
```

The two compose files share volume names (`allowealth-data`, `redis-data`), so you can switch between them without losing data.

## Next steps

- Review [Getting Started](/getting-started/) for first-run workflows and demo account credentials
- Follow [Setup and Deployment](/developers/setup-and-deployment/) for Cloudflare and Node deployment details
- Use [Deployment Guide](/admins/deployment-guide/) for rollout and rollback checks
- Keep [Commands Reference](/reference/commands/) nearby for CLI syntax
- Review [Database Management](/developers/database-management/) before planning backups
