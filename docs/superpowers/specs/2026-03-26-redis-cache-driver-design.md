# Redis Cache Driver Design

**Ticket:** ALL-67
**Date:** 2026-03-26
**Status:** Draft

## Summary

Add a `'redis'` cache driver that connects to standard Redis instances via `Bun.Redis` (TCP). This enables persistent, production-like caching for local development and self-hosted environments (e.g., Dokploy) without the cost or complexity of Upstash.

## Motivation

Current drivers and their gaps:

| Driver | Persistence | Runtime | Cost |
|--------|------------|---------|------|
| `upstash` | Yes (cloud) | All (REST) | Paid |
| `memory` | No (lost on restart) | All | Free |
| `none` | N/A | All | Free |
| **`redis` (new)** | **Yes (local/self-hosted)** | **Bun only (TCP)** | **Free** |

The memory driver loses state on restart, making development friction higher than necessary. Upstash is overkill for local dev. A local Redis driver fills the gap with zero additional npm dependencies using Bun's native Redis support.

## Design

### RedisDriver (`src/lib/cache/drivers/redis.ts`)

Implements `CacheDriver` interface. Mirrors the Upstash driver's data model and fail-silent behavior, using `Bun.Redis` instead of `@upstash/redis`.

#### Constructor

```ts
constructor(url: string, defaultTtl: number = 3600)
```

- `url`: Redis connection string (e.g., `redis://:password@redis:6379`)
- Creates `Bun.Redis` client from URL

#### Redis Data Model

Identical to Upstash driver:

| Data | Redis Type | Key Pattern | Example |
|------|-----------|-------------|---------|
| Cache entry | STRING | `cache:budget:ws-1:2024:3:USD` | JSON string |
| Tag index | SET | `tag:workspace:ws-1` | Set of cache keys |

#### Operations

- **get(key):** `GET key` then `JSON.parse(result)`. Returns `null` on miss or error.
- **set(key, value, options):** `SET key JSON.stringify(value) EX ttl`. If tags provided, pipeline `SADD tag:{tag} key` and `EXPIRE tag:{tag} ttl+60 GT` for each tag.
- **delete(key):** `DEL key`.
- **invalidateByTags(tags):** Pipeline `SMEMBERS tag:{tag}` for each tag. Collect unique keys. `DEL ...keys ...tagKeys`.

#### Serialization

Unlike `@upstash/redis` which auto-serializes, `Bun.Redis` works with raw strings. The driver handles `JSON.stringify` on write and `JSON.parse` on read.

#### Error Handling

Fail-silent pattern matching Upstash driver: log warnings via `createLogger('cache:redis')`, return `null` on get errors, swallow set/delete/invalidate errors.

### Configuration Changes

#### `src/lib/cache/types.ts`

```ts
export interface CacheConfig {
  driver: 'upstash' | 'redis' | 'memory' | 'none';
  upstash?: { url: string; token: string };
  redis?: { url: string };
  defaultTtl?: number;
}
```

#### `src/lib/cache/cache-manager.ts`

Add `case 'redis'` to `createDriver()`:

```ts
case 'redis': {
  const url = config.redis?.url;
  if (!url) {
    log.warn('Redis URL missing, falling back to memory driver');
    return { driver: new MemoryDriver(config.defaultTtl), name: 'memory' };
  }
  return { driver: new RedisDriver(url, config.defaultTtl), name: 'redis' };
}
```

Update `getCacheManager()` to read `REDIS_URL`:

```ts
const redisUrl = getEnv('REDIS_URL') || '';
```

#### `src/env.d.ts`

```ts
readonly CACHE_DRIVER?: 'upstash' | 'redis' | 'memory' | 'none';
readonly REDIS_URL?: string;
```

#### `src/lib/cache/index.ts`

Export `RedisDriver` alongside existing drivers.

### Docker Compose

Add Redis service to `docker-compose.yml` with password authentication:

```yaml
services:
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD:-changeme}
    ports:
      - '6379:6379'
    volumes:
      - redis-data:/data
    restart: unless-stopped

volumes:
  redis-data:
```

The app service references Redis via the Docker network hostname `redis`.

### Environment Variables

Add to `.env.docker.example` (or equivalent):

```env
CACHE_DRIVER=redis
REDIS_PASSWORD=changeme
REDIS_URL=redis://:changeme@redis:6379
```

For local dev, the same `.env` pattern applies. Password is included for production readiness (Dokploy deployments share Docker networks per workspace, but defense in depth is warranted).

### Documentation Updates

- **ADR 008 (`docs/architecture/008-cache-abstraction.md`):** Add `RedisDriver` to Components list. Note Bun-only runtime constraint (TCP, not Workers-compatible).
- **`src/lib/cache/types.ts` doc comment:** Update implementations list to include `RedisDriver`.

### Testing

Unit tests in `src/lib/cache/drivers/__tests__/redis.test.ts`:

- Mirrors existing driver test patterns (get/set/delete/invalidateByTags)
- Tests JSON serialization round-trip
- Tests tag-based invalidation
- Tests fail-silent behavior on connection errors
- Tests missing URL fallback to memory driver (in cache-manager tests)

Tests require a running Redis instance. Use the docker-compose Redis container.

## Out of Scope

- TCP Redis in Cloudflare Workers (not possible — Workers only support HTTP)
- Redis Sentinel/Cluster support (single instance only)
- TLS/SSL configuration beyond what `REDIS_URL` supports natively
- Redis pub/sub or streams

## Runtime Constraints

| Runtime | Driver Available |
|---------|-----------------|
| Bun (local dev) | Yes |
| Bun (self-hosted/Dokploy) | Yes |
| Cloudflare Workers | No (use `upstash`) |

The `redis` driver uses `Bun.Redis` which requires the Bun runtime. It must not be imported in middleware or any code path that runs on Cloudflare Workers. The lazy `case 'redis'` in `createDriver()` ensures the import only happens when the driver is selected.

## References

- [Bun Redis docs](https://bun.sh/docs/runtime/redis)
- Current cache implementation: `src/lib/cache/`
- ADR: `docs/architecture/008-cache-abstraction.md`
- Linear ticket: [ALL-67](https://linear.app/allowealth/issue/ALL-67)
- GitHub issue: [#365](https://github.com/ivankristianto/allowealth/issues/365)
