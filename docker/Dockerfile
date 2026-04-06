# syntax=docker/dockerfile:1

# ─── Stage 1: Install ALL dependencies (needed for build) ───────────────────
# TODO: pin to sha256 digest for reproducible builds
FROM oven/bun:1.3.11 AS deps
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# ─── Stage 2: Build ──────────────────────────────────────────────────────────
# TODO: pin to sha256 digest for reproducible builds
FROM oven/bun:1.3.11 AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the Node.js standalone server
RUN bun run build:node

# ─── Stage 3: Production dependencies only ──────────────────────────────────
# TODO: pin to sha256 digest for reproducible builds
FROM oven/bun:1.3.11 AS prod-deps
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production --ignore-scripts

# ─── Stage 4: Runtime ────────────────────────────────────────────────────────
# TODO: pin to sha256 digest for reproducible builds
FROM oven/bun:1.3.11-slim AS runtime
WORKDIR /app

# Use root for image filesystem setup; drop privileges before runtime
USER root

# Copy production-only node_modules (excludes dev deps like Playwright, ESLint, etc.)
COPY --from=prod-deps --chown=bun:bun /app/node_modules ./node_modules
COPY --from=build --chown=bun:bun /app/dist ./dist
COPY --from=build --chown=bun:bun /app/package.json ./package.json

# Copy migration files (Bun SQLite migrator reads these at runtime)
COPY --from=build --chown=bun:bun /app/drizzle/sqlite ./drizzle/sqlite
COPY --from=build --chown=bun:bun /app/src/db/migrate.ts ./src/db/migrate.ts

# Copy entrypoint and healthcheck scripts
COPY --chown=bun:bun docker/entrypoint.sh /docker-entrypoint.sh
COPY --chown=bun:bun docker/healthcheck.ts /docker-healthcheck.ts
RUN chmod +x /docker-entrypoint.sh

# Create the SQLite data directory (volume is mounted here by docker-compose)
# chown here sets the image layer ownership; Docker preserves this into named volumes on first init
RUN mkdir -p /data && chown bun:bun /data

# Use the non-root user provided by the official Bun image
USER bun

# Runtime defaults (overridden via env_file or environment in docker-compose)
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=/data/allowealth.db

EXPOSE 3000

# Health check: Verify the app responds with 200 OK
# The healthcheck script reads process.env.PORT at runtime and follows redirects
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD bun /docker-healthcheck.ts

ENTRYPOINT ["/docker-entrypoint.sh"]
