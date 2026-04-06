# Dockerfile Security Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the Docker build and runtime configuration per ALL-74 acceptance criteria.

**Architecture:** Edit two files — `docker/Dockerfile` (pin images, labels, VOLUME, cache mounts) and `docker/docker-compose.yml` (read-only filesystem, no-new-privileges, resource limits, tmpfs for both services). No application code changes.

**Tech Stack:** Docker, Docker Compose v2

**Spec:** `docs/superpowers/specs/2026-04-06-dockerfile-security-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `docker/Dockerfile` | Modify | Pin images, add labels, VOLUME, cache mounts |
| `docker/docker-compose.yml` | Modify | Harden both services with security options and resource limits |

---

### Task 1: Pin base images in Dockerfile

**Files:**
- Modify: `docker/Dockerfile:4,11,21,28`

- [ ] **Step 1: Pin build stage images from floating to exact version**

Replace the three `oven/bun:1` references and the one `oven/bun:1-slim` reference:

```dockerfile
# Line 4 — was: FROM oven/bun:1 AS deps
# TODO: pin to sha256 digest for reproducible builds
FROM oven/bun:1.3.11 AS deps

# Line 11 — was: FROM oven/bun:1 AS build
# TODO: pin to sha256 digest for reproducible builds
FROM oven/bun:1.3.11 AS build

# Line 21 — was: FROM oven/bun:1 AS prod-deps
# TODO: pin to sha256 digest for reproducible builds
FROM oven/bun:1.3.11 AS prod-deps

# Line 28 — was: FROM oven/bun:1-slim AS runtime
# TODO: pin to sha256 digest for reproducible builds
FROM oven/bun:1.3.11-slim AS runtime
```

- [ ] **Step 2: Verify the Dockerfile parses correctly**

Run:
```bash
docker build --check -f docker/Dockerfile . 2>&1 || echo "Docker not available — visual review only"
```

If Docker is unavailable, visually confirm all four `FROM` lines have `oven/bun:1.3.11` or `oven/bun:1.3.11-slim`.

- [ ] **Step 3: Commit**

```bash
git add docker/Dockerfile
git commit -m "chore(docker): pin base images to oven/bun:1.3.11"
```

---

### Task 2: Add OCI labels and VOLUME instruction to Dockerfile

**Files:**
- Modify: `docker/Dockerfile:28-51`

- [ ] **Step 1: Add OCI labels after the runtime FROM line**

Insert these labels immediately after the `FROM oven/bun:1.3.11-slim AS runtime` line and before `WORKDIR /app`:

```dockerfile
# TODO: pin to sha256 digest for reproducible builds
FROM oven/bun:1.3.11-slim AS runtime

LABEL org.opencontainers.image.title="Allowealth"
LABEL org.opencontainers.image.description="Personal and family financial application"
LABEL org.opencontainers.image.url="https://github.com/ivankristianto/allowealth"
LABEL org.opencontainers.image.source="https://github.com/ivankristianto/allowealth"
LABEL org.opencontainers.image.licenses="MIT"

WORKDIR /app
```

- [ ] **Step 2: Add VOLUME instruction after the data directory creation**

Insert `VOLUME /data` after the `mkdir` line and before `USER bun`. The block should read:

```dockerfile
# Create the SQLite data directory (volume is mounted here by docker-compose)
# chown here sets the image layer ownership; Docker preserves this into named volumes on first init
RUN mkdir -p /data && chown bun:bun /data

VOLUME /data

# Use the non-root user provided by the official Bun image
USER bun
```

- [ ] **Step 3: Commit**

```bash
git add docker/Dockerfile
git commit -m "chore(docker): add OCI labels and VOLUME /data instruction"
```

---

### Task 3: Add build cache mounts to Dockerfile

**Files:**
- Modify: `docker/Dockerfile:8,25`

- [ ] **Step 1: Add cache mount to the deps stage install**

Replace line 8:

```dockerfile
# Was:
RUN bun install --frozen-lockfile

# Now:
RUN --mount=type=cache,target=/home/bun/.bun/install/cache \
    bun install --frozen-lockfile
```

- [ ] **Step 2: Add cache mount to the prod-deps stage install**

Replace line 25:

```dockerfile
# Was:
RUN bun install --frozen-lockfile --production --ignore-scripts

# Now:
RUN --mount=type=cache,target=/home/bun/.bun/install/cache \
    bun install --frozen-lockfile --production --ignore-scripts
```

- [ ] **Step 3: Commit**

```bash
git add docker/Dockerfile
git commit -m "chore(docker): add build cache mounts for bun install"
```

---

### Task 4: Harden app service in docker-compose

**Files:**
- Modify: `docker/docker-compose.yml:13-38`

- [ ] **Step 1: Add security options and resource limits to the app service**

Add these keys to the `app` service, after `restart: unless-stopped`:

```yaml
  app:
    container_name: allowealth-app
    build:
      context: ..
      dockerfile: docker/Dockerfile
    depends_on:
      - redis
    ports:
      - '${PORT:-3000}:${PORT:-3000}'
    volumes:
      - allowealth-data:/data
    env_file: ../.env
    environment:
      CACHE_DRIVER: ${CACHE_DRIVER:-redis}
      REDIS_URL: ${REDIS_URL:-redis://:${REDIS_PASSWORD:-changeme}@redis:6379}
      # Ensure the standalone server binds on all interfaces inside the container
      # (overrides any DEV_HOST that may have been baked in at build time)
      HOST: '0.0.0.0'
      # Override dev values from .env for container context
      DATABASE_URL: /data/allowealth.db
      PORT: ${PORT:-3000}
      # Set to your production URL (e.g., https://finances.example.com)
      # Defaults to localhost for local Docker testing
      PUBLIC_URL: ${PUBLIC_URL:-http://localhost:3000}
    restart: unless-stopped
    read_only: true
    security_opt:
      - no-new-privileges:true
    tmpfs:
      - /tmp:noexec,nosuid,size=64m
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 1024M
        reservations:
          cpus: '0.5'
          memory: 256M
```

- [ ] **Step 2: Validate compose syntax**

Run:
```bash
docker compose -f docker/docker-compose.yml config --quiet 2>&1 || echo "Docker not available — visual review only"
```

- [ ] **Step 3: Commit**

```bash
git add docker/docker-compose.yml
git commit -m "chore(docker): harden app service with read-only fs and resource limits"
```

---

### Task 5: Harden Redis service in docker-compose

**Files:**
- Modify: `docker/docker-compose.yml:40-46`

- [ ] **Step 1: Pin Redis image and add security options**

Update the `redis` service to pin the image version and add hardening:

```yaml
  redis:
    image: redis:7.4-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD:-changeme}
    volumes:
      - redis-data:/data
    restart: unless-stopped
    read_only: true
    security_opt:
      - no-new-privileges:true
    tmpfs:
      - /tmp:noexec,nosuid,size=32m
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 256M
        reservations:
          cpus: '0.1'
          memory: 64M
```

- [ ] **Step 2: Validate compose syntax**

Run:
```bash
docker compose -f docker/docker-compose.yml config --quiet 2>&1 || echo "Docker not available — visual review only"
```

- [ ] **Step 3: Commit**

```bash
git add docker/docker-compose.yml
git commit -m "chore(docker): harden Redis service with read-only fs and resource limits"
```

---

### Task 6: Final verification

- [ ] **Step 1: Review the full Dockerfile**

Read `docker/Dockerfile` end-to-end and verify:
- All four `FROM` lines use `oven/bun:1.3.11` or `oven/bun:1.3.11-slim`
- Each `FROM` line has a `# TODO: pin to sha256 digest` comment above it
- OCI labels are present in the runtime stage
- `VOLUME /data` is present before `USER bun`
- Both `bun install` commands use `--mount=type=cache`

- [ ] **Step 2: Review the full docker-compose.yml**

Read `docker/docker-compose.yml` end-to-end and verify:
- `app` service has `read_only`, `security_opt`, `tmpfs`, `deploy.resources`
- `redis` service has `redis:7.4-alpine`, `read_only`, `security_opt`, `tmpfs`, `deploy.resources`
- Volume definitions are unchanged

- [ ] **Step 3: Attempt a Docker build (if Docker is available)**

Run:
```bash
docker compose -f docker/docker-compose.yml build 2>&1 | tail -5 || echo "Docker not available — skip build verification"
```

If Docker is unavailable, this task passes on visual review alone.
