# Docker Self-Host Design

**Issue:** ALL-53
**Date:** 2026-03-15
**Status:** Approved

## Summary

Add official Docker support for privacy-focused users who want to self-host Allowealth on their own VPS. Delivers a `Dockerfile`, `docker-compose.yml`, a GitHub Actions workflow that publishes to GHCR on version tags, and documentation updates.

## Scope

**In scope:**

- Multi-stage `Dockerfile` using `oven/bun` base image
- `docker-compose.yml` — app container + named SQLite volume only (no reverse proxy)
- `.env.docker.example` — env template for Docker deployments
- `.dockerignore`
- `docker-entrypoint.sh` — runs migrations then starts the server
- `.github/workflows/publish-docker.yml` — publishes to `ghcr.io/ivankristianto/allowealth` on `v*.*.*` tags
- Documentation update to `apps/docs/src/content/docs/self-host.md`

**Out of scope:** Kubernetes, Helm, Postgres/MySQL, multi-arch images, reverse proxy service in compose.

---

## Architecture

### Dockerfile (multi-stage)

Three stages:

**Stage 1 — `deps`**

```dockerfile
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY patches/ ./patches/
RUN bun install --frozen-lockfile
```

Installs all dependencies. Isolated so that source changes do not invalidate the dependency cache layer.

**Stage 2 — `build`**

```dockerfile
FROM oven/bun:1 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build:node
```

Runs `DEPLOY_TARGET=node astro build`, which uses the `@astrojs/node` adapter in standalone mode and produces a self-contained `dist/server/entry.mjs`.

**Stage 3 — `runtime`**

```dockerfile
FROM oven/bun:1-slim AS runtime
WORKDIR /app

# Use the non-root user provided by the official Bun image
USER bun

COPY --from=build --chown=bun:bun /app/dist ./dist
COPY --from=build --chown=bun:bun /app/node_modules ./node_modules
COPY --from=build --chown=bun:bun /app/package.json ./package.json
COPY --from=build --chown=bun:bun /app/drizzle ./drizzle
COPY --from=build --chown=bun:bun /app/drizzle.config.ts ./drizzle.config.ts
COPY --chown=bun:bun docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh && mkdir -p /data && chown bun:bun /data

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=/data/allowealth.db

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --spider http://localhost:3000/ || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
```

The slim runtime image includes only `dist/`, `node_modules/`, migration files (`drizzle/` + `drizzle.config.ts`), and the entrypoint script. Runs as the Bun image's built-in non-root user `bun`. SQLite database lives at `/data/allowealth.db` — a named volume is mounted there by compose.

`HEALTHCHECK` uses `wget` (available in the slim image) to check the app root. No custom health endpoint needed.

### docker-entrypoint.sh

```sh
#!/bin/sh
set -e

echo "Running database migrations..."
bunx drizzle-kit migrate

echo "Starting Allowealth..."
exec bun ./dist/server/entry.mjs
```

The server must run under **Bun** (not Node) because the SQLite driver uses `bun:sqlite`, which is a Bun-native module that Node.js cannot load. `bunx drizzle-kit migrate` is used instead of `bun run db:migrate` to avoid relying on the Bun script runner reading `package.json`, and it reads `DATABASE_URL` from env via `drizzle.config.ts`. If the migration fails, the container exits — visible immediately in `docker compose logs`.

**Recovery from a restart loop:** If a migration fails and the container loops, stop and inspect with:
```sh
docker compose stop app
docker compose run --rm app bunx drizzle-kit migrate
```

### docker-compose.yml

```yaml
services:
  app:
    image: ghcr.io/ivankristianto/allowealth:latest
    ports:
      - "3000:3000"
    volumes:
      - allowealth-data:/data
    env_file: .env
    environment:
      HOST: "0.0.0.0"
    restart: unless-stopped

volumes:
  allowealth-data:
```

`HOST=0.0.0.0` is set explicitly so the Astro node standalone server binds on all interfaces regardless of how the image was built (the build host's `DEV_HOST` env var must not leak into Docker networking).

Users copy `.env.docker.example` → `.env` and fill in required values. No secrets are hardcoded in compose. The named volume `allowealth-data` persists the SQLite database across container restarts and updates.

### .env.docker.example

A trimmed version of `.env.example` with only the vars relevant to a Docker deployment. Required vars are uncommented and annotated; optional vars (Upstash, Turnstile, OAuth) are present but commented out.

Required (uncommented, annotated):
- `PUBLIC_URL` — the origin users will access (e.g. `https://finances.example.com`)
- `BETTER_AUTH_SECRET` — long random string
- `DATABASE_URL=/data/allowealth.db` — pre-set to the container volume path
- `EMAIL_ENCRYPTION_KEY` — base64-encoded 32-byte key for encrypted secrets (throws if missing when encryption is used)
- `COOKIE_SIGNING_SECRET` — dedicated cookie-signing secret
- `SIGNUP_MODE=invite_only` — controls open vs invite-only registration
- `EMAIL_MODE=console` — default to console so emails don't fail on first run; users switch to `real` when email provider is configured
- `CACHE_DRIVER=memory` — prevents Upstash Redis connection attempts when not configured
- `PUBLIC_SITE_URL=https://allowealth.io` — used for marketing/legal links within the app

Optional (present but commented out): Upstash Redis, Turnstile, Google OAuth, Resend/SendGrid email.

### .dockerignore

Excludes from build context: `node_modules/`, `.git/`, `db/`, `dist/`, `apps/docs/`, `apps/site/`, `.env*`, `*.md`, test files, and other non-source artifacts.

**Important:** `apps/mcp/` must NOT be excluded — it is imported by `astro.config.ts` as `@mcp-server` and is required at build time. Only `apps/docs` and `apps/site` (documentation and marketing site) can be safely excluded. The `patches/` directory must also not be excluded — Bun applies it during `bun install`.

---

## GitHub Actions — publish-docker.yml

**Trigger:** `push` to tags matching `v*.*.*`

**Steps:**

1. `actions/checkout@v4`
2. `docker/login-action` — login to `ghcr.io` using `${{ secrets.GITHUB_TOKEN }}` (no additional secrets needed)
3. `docker/setup-buildx-action` — enables BuildKit
4. `docker/metadata-action` — extracts tags: the semver tag (`v1.0.0`) and `latest`
5. `docker/build-push-action` — builds multi-stage image and pushes both tags; sets `platforms: linux/amd64` explicitly

No new repository secrets required. `GITHUB_TOKEN` has write permission to packages in the same repository by default (requires `packages: write` permission in the workflow).

Image path: `ghcr.io/ivankristianto/allowealth:v1.0.0` and `ghcr.io/ivankristianto/allowealth:latest`

---

## Documentation

Update `apps/docs/src/content/docs/self-host.md` — add a **Docker** section with these subsections:

1. **Prerequisites** — Docker Engine 24+, Docker Compose v2
2. **Quick start** — four commands: pull image, copy env, fill in required vars, `docker compose up -d`
3. **Environment variables** — table of required vs optional vars with descriptions
4. **Volume persistence** — explanation of the named volume, backup command (`docker run --rm --volumes-from ... tar cz /data > backup.tar.gz`)
5. **Reverse proxy** — minimal Nginx `proxy_pass` snippet; note Caddy and Traefik work equally well
6. **Updates** — `docker compose pull && docker compose up -d`
7. **Troubleshooting** — restart loop recovery for migration failures; note that the Docker section must not reference `scripts/setup.sh` (that is for Bun/git self-host only)

The existing Bun/git self-host content stays in place above the new Docker section.

---

## File Checklist

| File | Action |
|------|--------|
| `Dockerfile` | Create |
| `docker-entrypoint.sh` | Create |
| `docker-compose.yml` | Create |
| `.env.docker.example` | Create |
| `.dockerignore` | Create |
| `.github/workflows/publish-docker.yml` | Create |
| `apps/docs/src/content/docs/self-host.md` | Update |

---

## Trade-offs and Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Reverse proxy in compose | No | Self-hosters have existing preferences; keeps compose minimal |
| DB migrations | Auto on start | Better UX for single-SQLite deployments; failure is visible immediately |
| Image architecture | amd64 only | Simplicity for initial release; arm64 can be added later via QEMU in Buildx |
| Base image | `oven/bun:1` / `oven/bun:1-slim` | Official, maintained, matches dev runtime |
| User | Non-root `allowealth` | Security best practice |
| Health check | `wget --spider` on `/` | No custom endpoint needed; `wget` is available in slim image. The root URL returns HTTP 302 to login — `wget --spider` follows and returns 200, but this is fragile if routing changes. Acceptable for initial release. |
| Server runtime | Bun (not Node) | `bun:sqlite` is Bun-native; Node.js cannot load it via `createRequire` |
| Image registry | GHCR | Free, integrated with GitHub Actions, no extra secrets |
