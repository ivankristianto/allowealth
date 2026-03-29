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
- **set(key, value, options):** `SET key JSON.stringify(value) EX ttl`. If tags provided, use `Promise.all` to run `SADD tag:{tag} key` and `redis.send("EXPIRE", [tagKey, String(ttl + 60), "GT"])` for each tag concurrently (Bun.Redis auto-pipelines concurrent commands).
- **delete(key):** `DEL key`.
- **invalidateByTags(tags):** Use `Promise.all` to run `SMEMBERS tag:{tag}` for each tag concurrently. Collect unique keys. `DEL ...keys ...tagKeys`.

#### Bun.Redis API Notes

Bun.Redis does **not** have an explicit `.pipeline()` method like `@upstash/redis`. Instead, it uses **automatic pipelining**: concurrent commands issued via `Promise.all` are batched into a single network round-trip. This is functionally equivalent.

The `EXPIRE` command's `GT` flag (Redis 7.0+) is not available via the typed `.expire()` convenience method. Use `redis.send("EXPIRE", [key, ttl, "GT"])` instead.

#### Serialization

Unlike `@upstash/redis` which auto-serializes, `Bun.Redis` returns raw strings. The driver must call `JSON.stringify(value)` before `SET` and `JSON.parse(result)` after `GET`.

```ts
// set
await this.redis.set(key, JSON.stringify(value), { ex: ttl });

// get
const raw = await this.redis.get(key);
return raw ? JSON.parse(raw) : null;
```

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

**Critical: Dynamic import required.** `Bun.Redis` is a Bun built-in that fails at import time on non-Bun runtimes (Node.js, Cloudflare Workers). The existing drivers are statically imported, but `RedisDriver` must use a dynamic import to avoid breaking Workers builds.

Change `createDriver()` to `async` and use dynamic import:

```ts
private async createDriver(config: CacheConfig): Promise<{ driver: CacheDriver; name: string }> {
  switch (config.driver) {
    case 'redis': {
      const url = config.redis?.url;
      if (!url) {
        log.warn('Redis URL missing, falling back to memory driver');
        return { driver: new MemoryDriver(config.defaultTtl), name: 'memory' };
      }
      const { RedisDriver } = await import('./drivers/redis');
      return { driver: new RedisDriver(url, config.defaultTtl), name: 'redis' };
    }
    // ... existing cases unchanged (static imports are fine)
  }
}
```

The constructor becomes async via a static factory:

```ts
static async create(config: CacheConfig): Promise<CacheManager> {
  const manager = new CacheManager();
  const { driver, name } = await manager.createDriver(config);
  manager.driver = driver;
  manager.driverName = name;
  return manager;
}
```

Update `getCacheManager()` to handle async initialization:

```ts
let instance: CacheManager | null = null;
let initPromise: Promise<CacheManager> | null = null;

export function getCacheManager(): CacheManager {
  // Return cached instance synchronously if already initialized
  if (instance) return instance;

  // Synchronous fallback: start with memory, replace when async init completes
  if (!initPromise) {
    const driver = (getEnv('CACHE_DRIVER') as CacheConfig['driver']) || 'memory';

    if (driver === 'redis') {
      // Start async init, use memory driver until ready
      instance = new CacheManager(); // memory fallback
      initPromise = CacheManager.create({
        driver,
        redis: { url: getEnv('REDIS_URL') || '' },
        defaultTtl: 3600,
      }).then((mgr) => {
        instance = mgr;
        return mgr;
      });
    } else {
      // Existing sync path for upstash/memory/none
      instance = new CacheManager({
        driver,
        upstash: {
          url: getEnv('UPSTASH_REDIS_REST_URL') || '',
          token: getEnv('UPSTASH_REDIS_REST_TOKEN') || '',
        },
        defaultTtl: 3600,
      });
    }
  }

  return instance!;
}
```

This preserves the synchronous `getCacheManager()` API that all consumers depend on. For the `redis` driver, the first few calls may hit the memory fallback until the async import resolves — acceptable since the app is starting up.

#### `src/env.d.ts`

```ts
readonly CACHE_DRIVER?: 'upstash' | 'redis' | 'memory' | 'none';
readonly REDIS_URL?: string;
```

#### `src/lib/cache/index.ts`

Do **not** add a static export for `RedisDriver`. Since it uses Bun built-ins, a static export would break Workers builds. Consumers that need the class directly can use `import('./drivers/redis')`. The normal usage path goes through `CacheManager`, which handles the dynamic import internally.

### Docker Compose

Add Redis to a **separate `docker-compose.dev.yml`** for local development. The existing `docker-compose.yml` is the self-hosted production file and should not bundle Redis (self-hosted users choose their own cache driver).

#### `docker-compose.dev.yml` (new file)

```yaml
# Local development services
# Usage: docker compose -f docker-compose.dev.yml up -d
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

For self-hosted Dokploy deployments, users add a Redis service to their project stack and set `REDIS_URL` accordingly. The app does not prescribe the Redis deployment topology.

### Environment Variables

Update `.env.docker.example` cache section to document the new `redis` driver option:

```env
# ─── Cache ───────────────────────────────────────────────────────────────────
# memory  = in-process cache (resets on restart, fine for single-container)
# upstash = Redis via Upstash REST API (set UPSTASH_REDIS_REST_URL and TOKEN)
# redis   = TCP Redis via Bun.Redis (local dev or self-hosted with Bun runtime)
CACHE_DRIVER=memory

# UPSTASH_REDIS_REST_URL=
# UPSTASH_REDIS_REST_TOKEN=

# REDIS_URL=redis://:changeme@redis:6379
```

For local dev with `docker-compose.dev.yml`, set in `.env`:

```env
CACHE_DRIVER=redis
REDIS_PASSWORD=changeme
REDIS_URL=redis://:changeme@localhost:6379
```

Password is included for production readiness (Dokploy deployments share Docker networks per workspace, defense in depth).

### Documentation Updates

- **ADR 008 (`docs/architecture/008-cache-abstraction.md`):** Add `RedisDriver` to Components list. Note Bun-only runtime constraint (TCP, not Workers-compatible).
- **`src/lib/cache/types.ts` doc comment:** Update implementations list to include `RedisDriver`.

### Testing

**Unit tests** in `src/lib/cache/drivers/__tests__/redis.test.ts`:

- Mirrors existing driver test patterns (get/set/delete/invalidateByTags)
- Tests JSON serialization round-trip
- Tests tag-based invalidation
- Tests missing URL fallback to memory driver (in cache-manager tests)
- Uses a real Redis instance (`docker-compose.dev.yml`) — not mocks. This matches the driver's purpose (local dev) and avoids mock/prod divergence.

**CI note:** Tests are skipped when Redis is unavailable (check connection before test suite). This avoids adding Redis as a CI infrastructure requirement. The driver's logic mirrors the Upstash driver which is already tested with mocks.

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

The `redis` driver uses `Bun.Redis` which requires the Bun runtime. It **fails at import time** on non-Bun runtimes (Node.js, Cloudflare Workers) — the `"bun"` module does not exist. The driver file must never be statically imported. `CacheManager.createDriver()` uses `await import('./drivers/redis')` (dynamic import) so the module is only loaded when `CACHE_DRIVER=redis` is set, which only happens in Bun environments.

## References

- [Bun Redis docs](https://bun.sh/docs/runtime/redis)
- Current cache implementation: `src/lib/cache/`
- ADR: `docs/architecture/008-cache-abstraction.md`
- Linear ticket: [ALL-67](https://linear.app/allowealth/issue/ALL-67)
- GitHub issue: [#365](https://github.com/ivankristianto/allowealth/issues/365)
