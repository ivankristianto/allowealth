# Single Docker Compose Design

## Goal

Use one Docker Compose file for the Docker workflow so `docker compose -f docker/docker-compose.yml up -d --build` starts both Allowealth and Redis, with Redis enabled by default.

## Scope

- Keep Docker assets under `docker/`
- Make `docker/docker-compose.yml` the single compose entrypoint
- Remove the separate Redis-only compose file
- Default Docker cache configuration to Redis
- Update Bun helper scripts and docs to use the single compose file

## Design

`docker/docker-compose.yml` will define two services: `app` and `redis`. The app service will build from the checked-out repository with `docker/Dockerfile`, keep its port, env file, and persistent SQLite volume, and start alongside Redis. The Redis service will use `redis:7-alpine`, require a password, expose port `6379`, and persist data in a named volume.

The app container will default to Redis through compose-managed environment variables: `CACHE_DRIVER=${CACHE_DRIVER:-redis}` and `REDIS_URL=${REDIS_URL:-redis://:${REDIS_PASSWORD:-changeme}@redis:6379}`. This keeps the Docker path simple and self-contained while still allowing `.env` overrides.

`docker/.env.example` and the self-host docs will describe Redis as the default Docker cache mode. `package.json` and `COMMANDS.md` will point `docker:start` and `docker:stop` at `docker/docker-compose.yml` so one command starts the full stack.

## Compatibility

Keep the explicit `allowealth-data` named volume to preserve existing SQLite data across the compose-file change. Add an explicit `redis-data` named volume for Redis persistence.

## Verification

- `docker compose -f docker/docker-compose.yml config`
- `bun run docker:start`
- `bun run docker:stop`
- `bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck`
- `bun run build`
- `bun run docs:build`
