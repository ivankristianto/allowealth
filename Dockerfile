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

# Create a non-root user for security
RUN addgroup --system --gid 1001 allowealth \
 && adduser --system --uid 1001 --ingroup allowealth allowealth

# Copy only what is needed to run the server
COPY --from=build --chown=allowealth:allowealth /app/dist ./dist
COPY --from=build --chown=allowealth:allowealth /app/node_modules ./node_modules
COPY --from=build --chown=allowealth:allowealth /app/package.json ./package.json

# Copy migration files (drizzle-kit migrate reads these at runtime)
COPY --from=build --chown=allowealth:allowealth /app/drizzle ./drizzle
COPY --from=build --chown=allowealth:allowealth /app/drizzle.config.ts ./drizzle.config.ts

# Copy entrypoint and healthcheck scripts
COPY --chown=allowealth:allowealth docker-entrypoint.sh /docker-entrypoint.sh
COPY --chown=allowealth:allowealth docker-healthcheck.ts /docker-healthcheck.ts
RUN chmod +x /docker-entrypoint.sh

# Create the SQLite data directory (volume is mounted here by docker-compose)
# chown here sets the image layer ownership; Docker preserves this into named volumes on first init
RUN mkdir -p /data && chown allowealth:allowealth /data

USER allowealth

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
