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
COPY package.json bun.lockb ./
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

RUN addgroup --system --gid 1001 allowealth \
 && adduser --system --uid 1001 --ingroup allowealth allowealth

COPY --from=build --chown=allowealth:allowealth /app/dist ./dist
COPY --from=build --chown=allowealth:allowealth /app/node_modules ./node_modules
COPY --from=build --chown=allowealth:allowealth /app/package.json ./package.json
COPY --from=build --chown=allowealth:allowealth /app/drizzle ./drizzle
COPY --from=build --chown=allowealth:allowealth /app/drizzle.config.ts ./drizzle.config.ts
COPY --chown=allowealth:allowealth docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh && mkdir -p /data && chown allowealth:allowealth /data

USER allowealth

ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=/data/allowealth.db

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/ > /dev/null || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
```

The slim runtime image includes only `dist/`, `node_modules/`, migration files (`drizzle/` + `drizzle.config.ts`), and the entrypoint script. Runs as non-root user `allowealth`. SQLite database lives at `/data/allowealth.db` — a named volume is mounted there by compose.

`HEALTHCHECK` uses `wget` (available in the slim image) to check the app root. No custom health endpoint needed.

### docker-entrypoint.sh

```sh
#!/bin/sh
set -e

echo "Running database migrations..."
bun run db:migrate

echo "Starting Allowealth..."
exec node ./dist/server/entry.mjs
```

Runs `drizzle-kit migrate` (which reads `DATABASE_URL` from env) before starting the server. If the migration fails, the container exits — visible immediately in `docker compose logs`.

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
    restart: unless-stopped

volumes:
  allowealth-data:
```

Users copy `.env.docker.example` → `.env` and fill in required values. No secrets are hardcoded in compose. The named volume `allowealth-data` persists the SQLite database across container restarts and updates.

### .env.docker.example

A trimmed version of `.env.example` with only the vars relevant to a Docker deployment. Required vars are uncommented and annotated; optional vars (Upstash, Turnstile, OAuth) are present but commented out.

Required:
- `PUBLIC_URL` — the origin users will access (e.g. `https://finances.example.com`)
- `BETTER_AUTH_SECRET` — long random string
- `DATABASE_URL=/data/allowealth.db` — pre-set to the container volume path

### .dockerignore

Excludes from build context: `node_modules/`, `.git/`, `db/`, `dist/`, `apps/`, `.env*`, `*.md`, test files, and other non-source artifacts.

---

## GitHub Actions — publish-docker.yml

**Trigger:** `push` to tags matching `v*.*.*`

**Steps:**

1. `actions/checkout@v4`
2. `docker/login-action` — login to `ghcr.io` using `${{ secrets.GITHUB_TOKEN }}` (no additional secrets needed)
3. `docker/setup-buildx-action` — enables BuildKit
4. `docker/metadata-action` — extracts tags: the semver tag (`v1.0.0`) and `latest`
5. `docker/build-push-action` — builds multi-stage image and pushes both tags

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
| Health check | `wget` on `/` | No custom endpoint needed; `wget` is available in slim image |
| Image registry | GHCR | Free, integrated with GitHub Actions, no extra secrets |
