# syntax=docker/dockerfile:1

# ─── Stage 1: Install dependencies ──────────────────────────────────────────
FROM oven/bun:1 AS deps
WORKDIR /app

# better-sqlite3 requires node-gyp → python3 + make + g++ for native compilation
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
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

# Copy entrypoint and healthcheck scripts
COPY --chown=bun:bun docker-entrypoint.sh /docker-entrypoint.sh
COPY --chown=bun:bun docker-healthcheck.ts /docker-healthcheck.ts
RUN chmod +x /docker-entrypoint.sh

# Create the SQLite data directory (volume is mounted here by docker-compose)
# chown here sets the image layer ownership; Docker preserves this into named volumes on first init
RUN mkdir -p /data && chown bun:bun /data

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
