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

## Docker

Run Allowealth as a Docker container for a self-contained deployment with automatic SQLite persistence.

### Prerequisites

- [Docker Engine 24+](https://docs.docker.com/engine/install/)
- [Docker Compose v2](https://docs.docker.com/compose/install/) (`docker compose` — note: no hyphen)
- Google OAuth credentials for your production domain
- Cloudflare Turnstile site and secret keys for your production domain

### Quick start

```bash
# 1. Pick one released version and use it for the image, compose file, and env template
export ALLOWEALTH_VERSION=v0.22.3

# 2. Pull that exact image
docker pull ghcr.io/ivankristianto/allowealth:${ALLOWEALTH_VERSION}

# 3. Get the matching docker-compose.yml
curl -o docker-compose.yml https://raw.githubusercontent.com/ivankristianto/allowealth/${ALLOWEALTH_VERSION}/docker-compose.yml
# or: clone/download the repository and copy docker-compose.yml from the repository root

# 4. Get the matching environment template
curl -o .env https://raw.githubusercontent.com/ivankristianto/allowealth/${ALLOWEALTH_VERSION}/.env.docker.example
# or: copy the .env.docker.example file from the repository root

# 5. Edit .env — keep ALLOWEALTH_VERSION pinned there, then set every required production value:
#   PUBLIC_URL=https://your-domain.com
#   BETTER_AUTH_SECRET=<long-random-string>
#   EMAIL_ENCRYPTION_KEY=<base64-32-bytes>
#   COOKIE_SIGNING_SECRET=<long-random-string>
#   GOOGLE_CLIENT_ID=<google-oauth-client-id>
#   GOOGLE_CLIENT_SECRET=<google-oauth-client-secret>
#   PUBLIC_TURNSTILE_SITE_KEY=<cloudflare-turnstile-site-key>
#   TURNSTILE_SECRET_KEY=<cloudflare-turnstile-secret-key>

# 6. Start the container
docker compose up -d
```

The container runs database migrations automatically on every start. Check logs with `docker compose logs -f app`.
Keep `ALLOWEALTH_VERSION` in `.env` until you intentionally upgrade. That way, later `docker compose pull` runs stay pinned to the same release.

### Environment variables

For the current Docker production flow, Google OAuth and Cloudflare Turnstile are required at startup. Prepare those values before you bring the container up.

The table below marks the values you should treat as required for a production Docker deployment. Some are validated at startup, and others are required when the app encrypts stored secrets or signs cookies.

| Variable                    | Required | Default                 | Description                                                          |
| --------------------------- | -------- | ----------------------- | -------------------------------------------------------------------- |
| `PUBLIC_URL`                | Yes      | —                       | Origin users access, for example `https://finances.example.com`      |
| `BETTER_AUTH_SECRET`        | Yes      | —                       | Long random string for auth signing                                  |
| `DATABASE_URL`              | No       | `/data/allowealth.db`   | SQLite path inside the container if you want to override the default |
| `EMAIL_ENCRYPTION_KEY`      | Yes      | —                       | Base64 32-byte key for encrypted secrets                             |
| `COOKIE_SIGNING_SECRET`     | Yes      | —                       | Separate secret for cookie signing                                   |
| `GOOGLE_CLIENT_ID`          | Yes      | —                       | Google OAuth client ID for `<PUBLIC_URL>/api/auth/callback/google`   |
| `GOOGLE_CLIENT_SECRET`      | Yes      | —                       | Google OAuth client secret for the same callback                     |
| `PUBLIC_TURNSTILE_SITE_KEY` | Yes      | —                       | Cloudflare Turnstile site key used on sign-in and sign-up forms      |
| `TURNSTILE_SECRET_KEY`      | Yes      | —                       | Cloudflare Turnstile secret key used for server-side verification    |
| `SIGNUP_MODE`               | No       | `invite_only`           | `invite_only` or `public` registration                               |
| `EMAIL_MODE`                | No       | `console`               | `console` logs emails, `real` sends through a provider               |
| `CACHE_DRIVER`              | No       | `memory`                | `memory` or `upstash`                                                |
| `PUBLIC_SITE_URL`           | No       | `https://allowealth.io` | Marketing site URL linked from within the app                        |

See `.env.docker.example` for the full list, including email provider and cache settings.

### Volume persistence

SQLite lives at `/data/allowealth.db` inside the container, backed by a named Docker volume (`allowealth-data`). The volume persists across container restarts and image updates.

**Backup:**

```bash
docker compose stop app
docker run --rm \
  -v allowealth-data:/data \
  -v "$(pwd)":/backup \
  busybox sh -c 'tar czf /backup/allowealth-backup-$(date +%Y%m%d).tar.gz -C / data'
docker compose start app
```

Stop the app before creating the tar archive. Allowealth uses SQLite WAL mode, so a live tar backup can miss the latest database state.

**Restore:**

```bash
docker compose stop app
docker run --rm \
  -v allowealth-data:/data \
  -v "$(pwd)":/backup \
  busybox tar xzf /backup/allowealth-backup-YYYYMMDD.tar.gz -C /
docker compose start app
```

### Reverse proxy

Allowealth listens on port 3000 inside the container. Put it behind your preferred reverse proxy so users reach it over HTTPS.

**Nginx example:**

```nginx
server {
    listen 443 ssl;
    server_name finances.example.com;

    # SSL config here (certbot, Let's Encrypt, etc.)

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Caddy and Traefik work equally well. Set `PUBLIC_URL` to the final HTTPS origin that your proxy serves.

### Updates

```bash
vi .env  # update ALLOWEALTH_VERSION when you want to move to a newer release
docker compose pull
docker compose up -d
```

Migrations run automatically when the new container starts.

### Troubleshooting

**Container exits immediately after start**

A migration failed or a required environment variable is missing. Check the logs:

```bash
docker compose logs app
```

To run migrations manually and inspect the output:

```bash
docker compose stop app
docker compose run --rm --entrypoint bunx app drizzle-kit migrate
```

Fix the issue, then restart:

```bash
docker compose up -d
```

**App is not reachable on port 3000**

Verify the container is running and the port is bound:

```bash
docker compose ps
docker compose logs app
```

If the container is healthy but unreachable, check your firewall rules and confirm your reverse proxy points to the correct port.
