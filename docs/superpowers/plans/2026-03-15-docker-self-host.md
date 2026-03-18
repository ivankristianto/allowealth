# Docker Self-Host Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Docker image publishing and docker-compose setup so privacy-focused users can self-host Allowealth on their own VPS with a single `docker compose up -d`.

**Architecture:** Multi-stage Dockerfile (`deps` → `build` → `runtime`) using `oven/bun:1`; server runs under Bun (not Node) because the SQLite driver uses `bun:sqlite`; entrypoint auto-runs `drizzle-kit migrate` before starting the server; GitHub Actions publishes to GHCR on `v*.*.*` tags.

**Tech Stack:** Docker / Docker Compose v2, Bun 1.x, `@astrojs/node` standalone adapter, `drizzle-kit migrate`, GitHub Actions, GHCR (`ghcr.io`).

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `.dockerignore` | Create | Exclude non-essential files from build context |
| `docker-entrypoint.sh` | Create | Run migrations then start Bun server |
| `Dockerfile` | Create | Multi-stage build: deps → build → slim runtime |
| `docker-compose.yml` | Create | App service + named SQLite volume |
| `.env.docker.example` | Create | Docker-ready env template with safe defaults |
| `.github/workflows/publish-docker.yml` | Create | Build and push image to GHCR on version tags |
| `apps/docs/src/content/docs/self-host.md` | Modify | Add Docker section (quick start, env, volumes, proxy, updates, troubleshooting) |

---

## Chunk 1: Docker Files

### Task 1: Create `.dockerignore`

**Files:**
- Create: `.dockerignore`

- [ ] **Step 1: Create `.dockerignore`**

```
# Dependencies (rebuilt during image build)
node_modules/

# Git history
.git/
.gitignore

# Local database files
db/

# Previous build output
dist/

# Documentation and marketing apps (not needed at build time)
apps/docs/
apps/site/

# NOTE: apps/mcp/ must NOT be excluded — imported by astro.config.ts as @mcp-server
# NOTE: patches/ must NOT be excluded — Bun applies patches during bun install

# Environment files (injected at runtime via docker-compose env_file)
.env
.env.*
!.env.docker.example

# Editor and OS files
.DS_Store
*.swp
*.swo
.vscode/
.idea/

# Test files
playwright-report/
test-results/
e2e/

# Misc
*.md
!README.md
```

- [ ] **Step 2: Verify the file looks correct**

```bash
cat .dockerignore
```

Expected: file contents printed without error.

- [ ] **Step 3: Commit**

```bash
git add .dockerignore
git commit -m "chore: add .dockerignore for Docker build context (ALL-53)"
```

---

### Task 2: Create `docker-entrypoint.sh`

**Files:**
- Create: `docker-entrypoint.sh`

- [ ] **Step 1: Create `docker-entrypoint.sh`**

```sh
#!/bin/sh
set -e

echo "Running database migrations..."
bunx drizzle-kit migrate

echo "Starting Allowealth..."
exec bun ./dist/server/entry.mjs
```

**Why `exec bun` not `node`:** The SQLite driver uses `bun:sqlite` (a Bun-native module). Node.js cannot load it via `createRequire` — the server would crash on the first DB request.

**Why `bunx drizzle-kit migrate` not `bun run db:migrate`:** Avoids relying on `package.json` script resolution; invokes drizzle-kit directly. Reads `DATABASE_URL` from env via `drizzle.config.ts`.

- [ ] **Step 2: Make it executable**

```bash
chmod +x docker-entrypoint.sh
```

- [ ] **Step 3: Verify permissions**

```bash
ls -la docker-entrypoint.sh
```

Expected: `-rwxr-xr-x` permissions.

- [ ] **Step 4: Commit**

```bash
git add docker-entrypoint.sh
git commit -m "chore: add docker-entrypoint.sh with auto-migration (ALL-53)"
```

---

### Task 3: Create `Dockerfile`

**Files:**
- Create: `Dockerfile`

- [ ] **Step 1: Create `Dockerfile`**

```dockerfile
# syntax=docker/dockerfile:1

# ─── Stage 1: Install dependencies ──────────────────────────────────────────
FROM oven/bun:1 AS deps
WORKDIR /app

COPY package.json bun.lock ./
# patches/ is applied automatically by bun install (patchedDependencies in package.json)
COPY patches/ ./patches/
RUN bun install --frozen-lockfile

# ─── Stage 2: Build ──────────────────────────────────────────────────────────
FROM oven/bun:1 AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the Node.js standalone server
RUN bun run build:node

# ─── Stage 3: Runtime ────────────────────────────────────────────────────────
FROM oven/bun:1-slim AS runtime
WORKDIR /app

# Use the non-root user provided by the official Bun image
USER bun

# Copy only what is needed to run the server
COPY --from=build --chown=bun:bun /app/dist ./dist
COPY --from=build --chown=bun:bun /app/node_modules ./node_modules
COPY --from=build --chown=bun:bun /app/package.json ./package.json

# Copy migration files (drizzle-kit migrate reads these at runtime)
COPY --from=build --chown=bun:bun /app/drizzle ./drizzle
COPY --from=build --chown=bun:bun /app/drizzle.config.ts ./drizzle.config.ts

# Copy entrypoint script
COPY --chown=bun:bun docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create the SQLite data directory (volume is mounted here by docker-compose)
# chown here sets the image layer ownership; Docker preserves this into named volumes on first init
RUN mkdir -p /data && chown bun:bun /data

# Runtime defaults (overridden via env_file or environment in docker-compose)
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=/data/allowealth.db

EXPOSE 3000

# Health check: wget follows the 302 redirect to the login page (returns 200)
# --spider mode avoids downloading the full response body
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --spider -q http://localhost:3000/ || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
```

- [ ] **Step 2: Validate Dockerfile syntax with hadolint (if available) or just review manually**

```bash
# If hadolint is installed:
hadolint Dockerfile
# If not, review the file:
cat Dockerfile
```

Expected: no fatal errors. Hadolint may warn about `latest` tag pinning — this is acceptable for the base image.

- [ ] **Step 3: Commit**

```bash
git add Dockerfile
git commit -m "feat(docker): add multi-stage Dockerfile (ALL-53)"
```

---

### Task 4: Create `docker-compose.yml`

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
# Allowealth Docker Compose — self-hosted deployment
# Usage:
#   cp .env.docker.example .env
#   # Edit .env — set PUBLIC_URL and BETTER_AUTH_SECRET at minimum
#   docker compose up -d
#
# To update:
#   docker compose pull && docker compose up -d

services:
  app:
    image: ghcr.io/ivankristianto/allowealth:latest
    ports:
      - "3000:3000"
    volumes:
      - allowealth-data:/data
    env_file: .env
    environment:
      # Ensure the standalone server binds on all interfaces inside the container
      # (overrides any DEV_HOST that may have been baked in at build time)
      HOST: "0.0.0.0"
    restart: unless-stopped

volumes:
  allowealth-data:
    # Named volume persists the SQLite database at /data/allowealth.db across
    # container restarts and image updates.
```

- [ ] **Step 2: Validate compose syntax**

```bash
docker compose config
```

Expected: rendered compose config printed to stdout with no errors. (Requires Docker to be installed locally — skip if unavailable and proceed to commit.)

- [ ] **Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "feat(docker): add docker-compose.yml with persistent SQLite volume (ALL-53)"
```

---

### Task 5: Create `.env.docker.example`

**Files:**
- Create: `.env.docker.example`

- [ ] **Step 1: Create `.env.docker.example`**

```bash
# Allowealth — Docker environment template
#
# Usage:
#   cp .env.docker.example .env
#   # Fill in required values, then:
#   docker compose up -d
#
# Required vars are uncommented. Optional vars are commented out.
# ─────────────────────────────────────────────────────────────────────────────

NODE_ENV=production

# ─── Required ────────────────────────────────────────────────────────────────

# Public URL of the application (used in email links, OAuth callbacks, etc.)
# Must match the domain your reverse proxy serves — include the scheme and port if non-standard.
# Example: https://finances.example.com
PUBLIC_URL=https://finances.example.com

# Auth secret — generate a long random string:
#   openssl rand -base64 48
BETTER_AUTH_SECRET=change-this-to-a-long-random-string

# SQLite database path inside the container (matches the named volume mount at /data)
DATABASE_URL=/data/allowealth.db

# Encryption key for sensitive data (TOTP secrets, email credentials stored in DB)
# Generate:  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
EMAIL_ENCRYPTION_KEY=

# Cookie-signing secret (separate from auth secret for defence-in-depth)
# Generate:  openssl rand -base64 48
COOKIE_SIGNING_SECRET=

# ─── App behaviour ───────────────────────────────────────────────────────────

# invite_only = new accounts require an invitation token
# public      = open registration
SIGNUP_MODE=invite_only

# Public marketing/legal site URL (linked from within the app)
PUBLIC_SITE_URL=https://allowealth.io

# ─── Email ───────────────────────────────────────────────────────────────────

# console = log emails to docker compose logs (good for first-run testing)
# real    = send via configured provider (set EMAIL_PROVIDER and EMAIL_API_KEY)
EMAIL_MODE=console

# Email provider: resend | sendgrid
# EMAIL_PROVIDER=resend
# EMAIL_API_KEY=
# EMAIL_SENDER_NAME=Allowealth
# EMAIL_SENDER_ADDRESS=noreply@example.com

# ─── Cache ───────────────────────────────────────────────────────────────────

# memory  = in-process cache (resets on restart, fine for single-container)
# upstash = Redis via Upstash (set UPSTASH_REDIS_REST_URL and TOKEN for persistence)
CACHE_DRIVER=memory

# UPSTASH_REDIS_REST_URL=
# UPSTASH_REDIS_REST_TOKEN=

# ─── Performance ─────────────────────────────────────────────────────────────

# Set to true to expose Server-Timing headers in browser DevTools
PERF_DEBUG=false

# ─── OAuth (optional) ────────────────────────────────────────────────────────

# Google OAuth — redirect URI: <PUBLIC_URL>/api/auth/callback/google
# GOOGLE_CLIENT_ID=
# GOOGLE_CLIENT_SECRET=

# ─── Bot protection (optional) ───────────────────────────────────────────────

# Cloudflare Turnstile — https://dash.cloudflare.com/?to=/:account/turnstile
# PUBLIC_TURNSTILE_SITE_KEY=
# TURNSTILE_SECRET_KEY=
```

- [ ] **Step 2: Verify the file has all required vars**

```bash
grep -E "^[A-Z_]+=" .env.docker.example | grep -v "^#"
```

Expected output should include at minimum: `NODE_ENV`, `PUBLIC_URL`, `BETTER_AUTH_SECRET`, `DATABASE_URL`, `SIGNUP_MODE`, `PUBLIC_SITE_URL`, `EMAIL_MODE`, `CACHE_DRIVER`, `PERF_DEBUG`.

- [ ] **Step 3: Commit**

```bash
git add .env.docker.example
git commit -m "chore: add .env.docker.example with Docker-ready defaults (ALL-53)"
```

---

## Chunk 2: GitHub Actions + Documentation

### Task 6: Create `.github/workflows/publish-docker.yml`

**Files:**
- Create: `.github/workflows/publish-docker.yml`

- [ ] **Step 1: Create `.github/workflows/publish-docker.yml`**

```yaml
name: Publish Docker Image

on:
  push:
    # Trigger on version tags: v1.0.0, v1.2.3, etc.
    tags:
      - 'v*.*.*'

  # Allow manual dispatch from the GitHub UI (useful for re-publishing a tag)
  workflow_dispatch:

jobs:
  build-and-push:
    name: Build and Push to GHCR
    runs-on: ubuntu-latest

    permissions:
      contents: read
      # Required to push packages to ghcr.io
      packages: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Log in to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.repository_owner }}
          # GITHUB_TOKEN is automatically provided — no extra secrets needed
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Extract Docker metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ghcr.io/${{ github.repository_owner }}/allowealth
          tags: |
            # Tag with the exact version including v prefix: ghcr.io/ivankristianto/allowealth:v1.0.0
            # pattern={{version}} strips the v; pattern=v{{version}} preserves it
            type=semver,pattern=v{{version}}
            # Also tag as latest
            type=raw,value=latest

      - name: Build and push Docker image
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          # amd64 only for initial release; add linux/arm64 later via QEMU
          platforms: linux/amd64
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          # Use GitHub Actions cache to speed up layer rebuilds
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Deployment Summary
        run: |
          echo "## Docker Image Published" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "**Tags:**" >> $GITHUB_STEP_SUMMARY
          echo '```' >> $GITHUB_STEP_SUMMARY
          echo "${{ steps.meta.outputs.tags }}" >> $GITHUB_STEP_SUMMARY
          echo '```' >> $GITHUB_STEP_SUMMARY
          echo "**Platforms:** linux/amd64" >> $GITHUB_STEP_SUMMARY
          echo "**Trigger:** ${{ github.event_name }} — ${{ github.ref }}" >> $GITHUB_STEP_SUMMARY
```

- [ ] **Step 2: Validate YAML syntax**

Push to GitHub — the workflow parser catches YAML syntax errors on `git push`. Alternatively, use `yamllint` if installed locally:

```bash
yamllint .github/workflows/publish-docker.yml
```

- [ ] **Step 3: Confirm the workflow uses correct action versions**

Check that these action versions exist on GitHub:
- `actions/checkout@v4` ✓ (widely used)
- `docker/login-action@v3` ✓
- `docker/setup-buildx-action@v3` ✓
- `docker/metadata-action@v5` ✓
- `docker/build-push-action@v6` ✓

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/publish-docker.yml
git commit -m "ci: add GitHub Actions workflow to publish Docker image to GHCR (ALL-53)"
```

---

### Task 7: Update `apps/docs/src/content/docs/self-host.md`

**Files:**
- Modify: `apps/docs/src/content/docs/self-host.md`

- [ ] **Step 1: Read the current file before editing**

```bash
cat apps/docs/src/content/docs/self-host.md
```

- [ ] **Step 2: Append the Docker section to the end of the file**

Add the following block after the existing "Next steps" section:

```markdown
## Docker

Run Allowealth as a Docker container for a self-contained deployment with automatic SQLite persistence.

### Prerequisites

- [Docker Engine 24+](https://docs.docker.com/engine/install/)
- [Docker Compose v2](https://docs.docker.com/compose/install/) (`docker compose` — note: no hyphen)

### Quick start

```bash
# 1. Pull the latest image
docker pull ghcr.io/ivankristianto/allowealth:latest

# 2. Create your environment file
curl -o .env https://raw.githubusercontent.com/ivankristianto/allowealth/main/.env.docker.example
# or: copy the .env.docker.example file from the repository root

# 3. Edit .env — set at minimum:
#   PUBLIC_URL=https://your-domain.com
#   BETTER_AUTH_SECRET=<long-random-string>
#   EMAIL_ENCRYPTION_KEY=<base64-32-bytes>
#   COOKIE_SIGNING_SECRET=<long-random-string>

# 4. Start the container
docker compose up -d
```

The container runs database migrations automatically on every start. Check logs with `docker compose logs -f app`.

### Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PUBLIC_URL` | Yes | — | Origin users access (e.g. `https://finances.example.com`) |
| `BETTER_AUTH_SECRET` | Yes | — | Long random string for auth signing |
| `DATABASE_URL` | Yes | `/data/allowealth.db` | SQLite path inside container (pre-set in template) |
| `EMAIL_ENCRYPTION_KEY` | Yes | — | Base64 32-byte key for encrypted secrets |
| `COOKIE_SIGNING_SECRET` | Yes | — | Separate secret for cookie signing |
| `SIGNUP_MODE` | No | `invite_only` | `invite_only` or `public` registration |
| `EMAIL_MODE` | No | `console` | `console` (logs) or `real` (sends via provider) |
| `CACHE_DRIVER` | No | `memory` | `memory` or `upstash` |
| `PUBLIC_SITE_URL` | No | `https://allowealth.io` | Marketing site URL linked from within the app |

See `.env.docker.example` for the full list including optional OAuth and email provider settings.

### Volume persistence

SQLite lives at `/data/allowealth.db` inside the container, backed by a named Docker volume (`allowealth-data`). The volume persists across container restarts and image updates.

**Backup:**

```bash
docker run --rm \
  --volumes-from $(docker compose ps -q app) \
  -v $(pwd):/backup \
  busybox tar czf /backup/allowealth-backup-$(date +%Y%m%d).tar.gz /data
```

**Restore:**

```bash
docker compose stop app
docker run --rm \
  --volumes-from $(docker compose ps -q app) \
  -v $(pwd):/backup \
  busybox tar xzf /backup/allowealth-backup-YYYYMMDD.tar.gz -C /
docker compose start app
```

### Reverse proxy

Allowealth listens on port 3000 inside the container. Map it through your preferred reverse proxy for HTTPS.

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

Caddy and Traefik work equally well. Set `PUBLIC_URL` to the final HTTPS origin.

### Updates

```bash
docker compose pull
docker compose up -d
```

Migrations run automatically when the new container starts.

### Troubleshooting

**Container exits immediately after start**

A migration failed. Check the logs:

```bash
docker compose logs app
```

To run migrations manually and inspect the output:

```bash
docker compose stop app
docker compose run --rm app bunx drizzle-kit migrate
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

If the container is healthy but unreachable, check your firewall rules and that your reverse proxy is pointing to the correct port.
```

- [ ] **Step 3: Run the Astro docs check**

```bash
bun run docs:check
```

Expected: 0 errors, 0 warnings.

- [ ] **Step 4: Commit**

```bash
git add apps/docs/src/content/docs/self-host.md
git commit -m "docs: add Docker self-hosting guide to self-host.md (ALL-53)"
```

---

## Final Quality Gate

- [ ] **Step 1: Run full quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

Expected: all pass with no blocking errors.

- [ ] **Step 2: Verify all files are present**

```bash
ls -la Dockerfile docker-entrypoint.sh docker-compose.yml .env.docker.example .dockerignore
ls -la .github/workflows/publish-docker.yml
```

Expected: all 6 files listed.

- [ ] **Step 3: Verify commit history**

```bash
git log --oneline -7
```

Expected: 6 feature commits on top of the spec/plan commits.

- [ ] **Step 4: Run superpowers:finishing-a-development-branch**

Use the `superpowers:finishing-a-development-branch` skill to complete the branch — create a PR against `main` with a summary of the changes.
