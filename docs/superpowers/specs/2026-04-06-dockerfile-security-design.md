# Dockerfile Security Hardening

**Ticket:** ALL-74 / GitHub #379
**Date:** 2026-04-06
**Status:** Approved

## Goal

Harden the Docker build and runtime configuration to improve supply chain integrity and reduce the container attack surface.

## Current State

The project has a well-structured 4-stage multi-stage Dockerfile (`deps` → `build` → `prod-deps` → `runtime`) with a non-root `bun` user in the runtime stage. Docker Compose runs the app alongside Redis with named volumes.

Gaps:

- Base images use floating tags (`oven/bun:1`, `oven/bun:1-slim`, `redis:7-alpine`)
- No OCI metadata labels
- No `VOLUME` instruction in the Dockerfile
- No build cache mounts
- No runtime hardening in Compose (read-only filesystem, privilege restrictions, resource limits)

## Changes

### 1. Dockerfile: Pin Base Images

Replace floating tags with exact version tags across all four stages.

| Current | New |
|---------|-----|
| `oven/bun:1` (3 stages) | `oven/bun:1.2.15` + TODO comment for SHA256 digest |
| `oven/bun:1-slim` (runtime) | `oven/bun:1.2.15-slim` + TODO comment for SHA256 digest |

Each `FROM` line gets a comment: `# TODO: pin to sha256 digest for reproducible builds`

The exact version will be whatever the latest `1.x` is at implementation time.

### 2. Dockerfile: OCI Labels

Add OpenContainers labels to the runtime stage only (the shipped image):

```dockerfile
LABEL org.opencontainers.image.title="Allowealth"
LABEL org.opencontainers.image.description="Personal and family financial application"
LABEL org.opencontainers.image.url="https://github.com/ivankristianto/allowealth"
LABEL org.opencontainers.image.source="https://github.com/ivankristianto/allowealth"
LABEL org.opencontainers.image.licenses="MIT"
```

### 3. Dockerfile: VOLUME Instruction

Add `VOLUME /data` after the `mkdir -p /data && chown bun:bun /data` line and before `USER bun`. This documents the mount point and lets Docker auto-create an anonymous volume if Compose is not used.

### 4. Dockerfile: Build Cache Mounts

Add `--mount=type=cache` to the two `bun install` RUN steps (stages 1 and 3):

```dockerfile
RUN --mount=type=cache,target=/home/bun/.bun/install/cache \
    bun install --frozen-lockfile
```

The cache target is `/home/bun/.bun/install/cache` because the Bun image runs as the `bun` user by default. Cache mounts persist across builds but do not appear in the final image.

### 5. Docker Compose: App Service Hardening

Add to the `app` service:

```yaml
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

`read_only: true` works because the app writes only to `/data` (a named volume) and `/tmp` (a tmpfs mount). The entrypoint creates backup files in `/data`, which remains writable.

### 6. Docker Compose: Redis Service Hardening

Pin the image and add the same security options:

```yaml
image: redis:7.4-alpine  # pinned from redis:7-alpine
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

Redis writes only to `/data` (its named volume), so `read_only: true` is safe.

## Files Changed

| File | Change |
|------|--------|
| `docker/Dockerfile` | Pin 4 FROM lines, add OCI labels, add VOLUME, add cache mounts |
| `docker/docker-compose.yml` | Add hardening to both services, pin Redis image |

## Not Changed

- `.dockerignore` — already comprehensive
- `docker/entrypoint.sh` — no modifications needed
- `docker/healthcheck.ts` — no modifications needed
- `docker/.env.example` — no new env vars required

## Out of Scope

Per the ticket:

- Distroless images (Bun compatibility unknown)
- Seccomp or AppArmor profiles
- Network policies
