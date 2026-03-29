# Redis Cache Driver Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `'redis'` cache driver using `Bun.Redis` for persistent local-dev and self-hosted caching.

**Architecture:** New `RedisDriver` class mirrors the Upstash driver's data model (JSON strings, tag Sets) but uses Bun's built-in Redis client over TCP. Dynamic import prevents Workers build breakage. Docker Compose provides the Redis server for local dev.

**Tech Stack:** Bun.Redis (built-in), Redis 7 Alpine (Docker), bun:test

**Spec:** `docs/superpowers/specs/2026-03-26-redis-cache-driver-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/lib/cache/drivers/redis.ts` | RedisDriver implementing CacheDriver |
| Create | `src/lib/cache/drivers/redis.test.ts` | Integration tests against real Redis |
| Create | `docker-compose.dev.yml` | Local dev Redis service |
| Modify | `src/lib/cache/types.ts` | Add `'redis'` to driver union, add `redis?` config |
| Modify | `src/lib/cache/cache-manager.ts` | Async `createDriver()`, dynamic import, factory pattern |
| Modify | `src/lib/cache/cache-manager.test.ts` | Test redis driver selection and fallback |
| Modify | `src/env.d.ts` | Add `REDIS_URL`, update `CACHE_DRIVER` union |
| Modify | `.env.docker.example` | Document redis driver option |
| Modify | `docs/architecture/008-cache-abstraction.md` | Add RedisDriver to ADR |

---

### Task 1: Update CacheConfig types

**Files:**
- Modify: `src/lib/cache/types.ts:1-45`

- [ ] **Step 1: Add `'redis'` to the driver union and add redis config option**

```ts
// In CacheConfig interface, update:
/** Cache driver to use */
driver: 'upstash' | 'redis' | 'memory' | 'none';
/** Upstash credentials (required when driver=upstash) */
upstash?: {
  url: string;
  token: string;
};
/** Redis connection (required when driver=redis) */
redis?: {
  url: string;
};
```

Also update the doc comment at the top:

```ts
/**
 * Cache Driver Interface
 *
 * Abstraction layer for cache storage backends.
 * Implementations: UpstashDriver, RedisDriver, MemoryDriver, NoopDriver
 */
```

- [ ] **Step 2: Update `src/env.d.ts` environment types**

In the `ImportMetaEnv` interface, update the cache section:

```ts
// Cache configuration
readonly CACHE_DRIVER?: 'upstash' | 'redis' | 'memory' | 'none';
readonly UPSTASH_REDIS_REST_URL?: string;
readonly UPSTASH_REDIS_REST_TOKEN?: string;
readonly REDIS_URL?: string;
```

- [ ] **Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS (no consumers break from adding a union member)

- [ ] **Step 4: Commit**

```bash
git add src/lib/cache/types.ts src/env.d.ts
git commit -m "feat(cache): add redis driver type to CacheConfig"
```

---

### Task 2: Implement RedisDriver

**Files:**
- Create: `src/lib/cache/drivers/redis.ts`

- [ ] **Step 0: Verify Bun.Redis API**

Run: `bun eval "console.log('Redis:', typeof Bun.Redis, 'RedisClient:', typeof Bun.RedisClient)"`

This confirms whether the constructor is `Bun.Redis` or `Bun.RedisClient`. The code below assumes `Bun.Redis` based on Bun docs. If the eval shows `RedisClient` instead, adjust the constructor call and type accordingly.

- [ ] **Step 1: Create the RedisDriver class**

Create `src/lib/cache/drivers/redis.ts`:

```ts
/**
 * Redis Cache Driver
 *
 * Local/self-hosted cache driver using Bun's built-in Redis client (TCP).
 * Bun-only — not compatible with Cloudflare Workers (use UpstashDriver instead).
 *
 * Features:
 * - Fail-silent: Returns null on errors instead of throwing
 * - Tag-based invalidation using Redis Sets (same data model as UpstashDriver)
 * - Automatic pipelining via Promise.all (Bun.Redis batches concurrent commands)
 */

import type { CacheDriver, CacheSetOptions } from '../types';
import { createLogger } from '@/lib/logger';

const log = createLogger('cache:redis');

export class RedisDriver implements CacheDriver {
  private redis: InstanceType<typeof Bun.Redis>;
  private defaultTtl: number;

  constructor(url: string, defaultTtl: number = 3600) {
    this.redis = new Bun.Redis(url);
    this.defaultTtl = defaultTtl;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (error) {
      log.warn('Get failed:', key, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
    try {
      const ttl = options?.ttl ?? this.defaultTtl;
      await this.redis.set(key, JSON.stringify(value), { ex: ttl });

      if (options?.tags?.length) {
        const tagOps = options.tags.flatMap((tag) => {
          const tagKey = `tag:${tag}`;
          return [
            this.redis.sadd(tagKey, key),
            this.redis.send('EXPIRE', [tagKey, String(ttl + 60), 'GT']),
          ];
        });
        await Promise.all(tagOps);
      }
    } catch (error) {
      log.warn('Set failed:', key, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      log.warn('Delete failed:', key, error);
    }
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      if (tags.length === 0) return;

      // Fetch all keys for each tag concurrently (auto-pipelined)
      const results = await Promise.all(
        tags.map((tag) => this.redis.smembers(`tag:${tag}`))
      );

      const keysToDelete = [...new Set(results.flat().filter(Boolean))];
      const tagKeys = tags.map((t) => `tag:${t}`);
      const allKeys = [...keysToDelete, ...tagKeys];

      if (allKeys.length > 0) {
        await this.redis.del(...allKeys);
      }
    } catch (error) {
      log.warn('InvalidateByTags failed:', tags, error);
    }
  }
}
```

- [ ] **Step 2: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/cache/drivers/redis.ts
git commit -m "feat(cache): implement RedisDriver with Bun.Redis"
```

---

### Task 3: Write RedisDriver tests

**Files:**
- Create: `src/lib/cache/drivers/redis.test.ts`

**Prerequisite:** Redis running locally (`docker compose -f docker-compose.dev.yml up -d`). Tests skip gracefully if Redis is unavailable.

**Note:** Test file is colocated at `src/lib/cache/drivers/redis.test.ts` (matching existing pattern: `memory.test.ts`, `upstash.test.ts`), not in `__tests__/` as the spec mentioned.

- [ ] **Step 1: Create test file with connection check and full test suite**

Create `src/lib/cache/drivers/redis.test.ts`:

```ts
import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'bun:test';
import { RedisDriver } from './redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Check if Redis is available before running tests
let redisAvailable = false;
try {
  const client = new Bun.Redis(REDIS_URL);
  await client.ping();
  await client.quit();
  redisAvailable = true;
} catch {
  console.warn('Redis not available, skipping RedisDriver tests');
}

describe.skipIf(!redisAvailable)('RedisDriver', () => {
  let driver: RedisDriver;
  let cleanupClient: InstanceType<typeof Bun.RedisClient>;

  beforeAll(() => {
    cleanupClient = new Bun.Redis(REDIS_URL);
  });

  afterAll(async () => {
    await cleanupClient.quit();
  });

  beforeEach(async () => {
    // Flush test keys before each test
    await cleanupClient.send('FLUSHDB', []);
    driver = new RedisDriver(REDIS_URL);
  });

  describe('get/set', () => {
    it('should return null for missing key', async () => {
      const result = await driver.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should store and retrieve value', async () => {
      await driver.set('key1', { foo: 'bar' });
      const result = await driver.get<{ foo: string }>('key1');
      expect(result).toEqual({ foo: 'bar' });
    });

    it('should handle string values', async () => {
      await driver.set('key1', 'hello');
      const result = await driver.get<string>('key1');
      expect(result).toBe('hello');
    });

    it('should handle numeric values', async () => {
      await driver.set('key1', 42);
      const result = await driver.get<number>('key1');
      expect(result).toBe(42);
    });

    it('should handle nested objects', async () => {
      const data = { a: { b: [1, 2, 3] }, c: null };
      await driver.set('key1', data);
      const result = await driver.get('key1');
      expect(result).toEqual(data);
    });
  });

  describe('delete', () => {
    it('should delete existing key', async () => {
      await driver.set('key1', 'value');
      await driver.delete('key1');
      const result = await driver.get('key1');
      expect(result).toBeNull();
    });

    it('should not throw for nonexistent key', async () => {
      await expect(driver.delete('nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('invalidateByTags', () => {
    it('should invalidate keys with matching tags', async () => {
      await driver.set('key1', 'value1', { tags: ['tag:a', 'tag:b'] });
      await driver.set('key2', 'value2', { tags: ['tag:a'] });
      await driver.set('key3', 'value3', { tags: ['tag:c'] });

      await driver.invalidateByTags(['tag:a']);

      expect(await driver.get('key1')).toBeNull();
      expect(await driver.get('key2')).toBeNull();
      expect(await driver.get('key3')).toBe('value3');
    });

    it('should invalidate keys matching any of the tags', async () => {
      await driver.set('key1', 'value1', { tags: ['tag:a'] });
      await driver.set('key2', 'value2', { tags: ['tag:b'] });
      await driver.set('key3', 'value3', { tags: ['tag:c'] });

      await driver.invalidateByTags(['tag:a', 'tag:b']);

      expect(await driver.get('key1')).toBeNull();
      expect(await driver.get('key2')).toBeNull();
      expect(await driver.get('key3')).toBe('value3');
    });

    it('should handle empty tags array', async () => {
      await driver.set('key1', 'value1');
      await driver.invalidateByTags([]);
      expect(await driver.get('key1')).toBe('value1');
    });
  });

  describe('fail-silent', () => {
    it('should return null on get error', async () => {
      // Create driver with invalid URL to trigger errors
      const badDriver = new RedisDriver('redis://localhost:59999');
      const result = await badDriver.get('key1');
      expect(result).toBeNull();
    });
  });
});
```

- [ ] **Step 2: Start Redis and run tests**

Run: `docker compose -f docker-compose.dev.yml up -d`
Run: `bun test src/lib/cache/drivers/redis.test.ts`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/cache/drivers/redis.test.ts
git commit -m "test(cache): add RedisDriver integration tests"
```

---

### Task 4: Update CacheManager for dynamic import

**Files:**
- Modify: `src/lib/cache/cache-manager.ts:1-103`

- [ ] **Step 1: Refactor CacheManager to support async driver creation**

Key changes to `src/lib/cache/cache-manager.ts`:

1. Make `createDriver()` async (returns `Promise`)
2. Add `static async create(config)` factory for the async path
3. Keep the existing `constructor(config)` for sync drivers (upstash, memory, none)
4. Add a private no-arg constructor for the factory pattern
5. Update `getCacheManager()` to handle redis async init with memory fallback
6. Update `resetCacheManager()` to also clear `initPromise`

```ts
/**
 * Cache Manager
 *
 * Central cache orchestrator that selects and manages cache drivers.
 * Provides singleton access for application-wide caching.
 */

import type { CacheDriver, CacheSetOptions, CacheConfig } from './types';
import type { PerfCollector } from '@/lib/perf';
import { getEnv } from '@/lib/env';
import { createLogger } from '@/lib/logger';

const log = createLogger('cache');
import { UpstashDriver } from './drivers/upstash';
import { MemoryDriver } from './drivers/memory';
import { NoopDriver } from './drivers/noop';

let instance: CacheManager | null = null;
let initPromise: Promise<CacheManager> | null = null;

export class CacheManager {
  private driver: CacheDriver;
  private driverName: string;

  constructor(config?: CacheConfig) {
    if (config) {
      const { driver, name } = this.createDriverSync(config);
      this.driver = driver;
      this.driverName = name;
    } else {
      // No-arg: memory fallback (used by async factory before driver is ready)
      this.driver = new MemoryDriver();
      this.driverName = 'memory';
    }
  }

  static async create(config: CacheConfig): Promise<CacheManager> {
    const manager = new CacheManager();
    const { driver, name } = await manager.createDriverAsync(config);
    manager.driver = driver;
    manager.driverName = name;
    return manager;
  }

  private createDriverSync(config: CacheConfig): { driver: CacheDriver; name: string } {
    switch (config.driver) {
      case 'upstash': {
        const url = config.upstash?.url;
        const token = config.upstash?.token;

        if (!url || !token) {
          log.warn('Upstash credentials missing, falling back to memory driver');
          return { driver: new MemoryDriver(config.defaultTtl), name: 'memory' };
        }

        return { driver: new UpstashDriver(url, token, config.defaultTtl), name: 'upstash' };
      }

      case 'memory':
        return { driver: new MemoryDriver(config.defaultTtl), name: 'memory' };

      case 'none':
      default:
        return { driver: new NoopDriver(), name: 'noop' };
    }
  }

  private async createDriverAsync(config: CacheConfig): Promise<{ driver: CacheDriver; name: string }> {
    if (config.driver === 'redis') {
      const url = config.redis?.url;
      if (!url) {
        log.warn('Redis URL missing, falling back to memory driver');
        return { driver: new MemoryDriver(config.defaultTtl), name: 'memory' };
      }
      const { RedisDriver } = await import('./drivers/redis');
      return { driver: new RedisDriver(url, config.defaultTtl), name: 'redis' };
    }

    return this.createDriverSync(config);
  }

  getDriverName(): string {
    return this.driverName;
  }

  async get<T>(key: string, perf?: PerfCollector): Promise<T | null> {
    try {
      perf?.setCacheDriver(this.driverName);
      const result = await this.driver.get<T>(key);
      if (result !== null) {
        perf?.cacheHit();
      } else {
        perf?.cacheMiss();
      }
      return result;
    } catch {
      perf?.cacheMiss();
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
    return this.driver.set(key, value, options);
  }

  async delete(key: string): Promise<void> {
    return this.driver.delete(key);
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    return this.driver.invalidateByTags(tags);
  }
}

export function getCacheManager(): CacheManager {
  if (instance) return instance;

  if (!initPromise) {
    const driver = (getEnv('CACHE_DRIVER') as CacheConfig['driver']) || 'memory';
    const url = getEnv('UPSTASH_REDIS_REST_URL') || '';
    const token = getEnv('UPSTASH_REDIS_REST_TOKEN') || '';

    if (driver === 'redis') {
      // Start async init, use memory driver until ready.
      // Trade-off: cache writes during the brief async window go to MemoryDriver
      // and are lost when the RedisDriver instance replaces it. Acceptable for
      // startup — the app populates cache on first request anyway.
      instance = new CacheManager();
      initPromise = CacheManager.create({
        driver,
        redis: { url: getEnv('REDIS_URL') || '' },
        defaultTtl: 3600,
      }).then((mgr) => {
        instance = mgr;
        return mgr;
      });
    } else {
      instance = new CacheManager({
        driver,
        upstash: { url, token },
        defaultTtl: 3600,
      });
    }
  }

  return instance!;
}

export function resetCacheManager(): void {
  instance = null;
  initPromise = null;
}
```

- [ ] **Step 2: Run existing cache-manager tests to verify no regressions**

Run: `bun test src/lib/cache/cache-manager.test.ts`
Expected: All existing tests PASS

- [ ] **Step 3: Run typecheck**

Run: `bun run typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/cache/cache-manager.ts
git commit -m "feat(cache): add async driver init for Redis dynamic import"
```

---

### Task 5: Update CacheManager tests

**Files:**
- Modify: `src/lib/cache/cache-manager.test.ts`

- [ ] **Step 1: Add tests for redis driver selection and fallback**

Add these tests to the existing `describe('driver selection')` block in `cache-manager.test.ts`:

```ts
it('should fall back to MemoryDriver when redis URL missing', async () => {
  const manager = await CacheManager.create({ driver: 'redis' });
  expect(manager.getDriverName()).toBe('memory');
});

it('should use RedisDriver when redis URL provided', async () => {
  const manager = await CacheManager.create({
    driver: 'redis',
    redis: { url: 'redis://localhost:6379' },
  });
  expect(manager.getDriverName()).toBe('redis');
});
```

Also add a `describe('resetCacheManager')` test:

```ts
it('should clear async init state on reset', () => {
  getCacheManager();
  resetCacheManager();
  const instance = getCacheManager();
  // Should get a fresh instance, not a stale one
  expect(instance).toBeDefined();
});
```

- [ ] **Step 2: Run tests**

Run: `bun test src/lib/cache/cache-manager.test.ts`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add src/lib/cache/cache-manager.test.ts
git commit -m "test(cache): add CacheManager redis driver selection tests"
```

---

### Task 6: Create docker-compose.dev.yml

**Files:**
- Create: `docker-compose.dev.yml`

- [ ] **Step 1: Create the dev compose file**

Create `docker-compose.dev.yml`:

```yaml
# Allowealth Docker Compose — local development services
# Usage:
#   docker compose -f docker-compose.dev.yml up -d
#
# Provides Redis for persistent local caching.
# Set in .env:
#   CACHE_DRIVER=redis
#   REDIS_PASSWORD=changeme
#   REDIS_URL=redis://:changeme@localhost:6379

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

- [ ] **Step 2: Verify it starts**

Run: `docker compose -f docker-compose.dev.yml up -d`
Expected: Redis container starts successfully

Run: `docker compose -f docker-compose.dev.yml exec redis redis-cli -a changeme ping`
Expected: `PONG`

- [ ] **Step 3: Commit**

```bash
git add docker-compose.dev.yml
git commit -m "feat: add docker-compose.dev.yml with Redis for local caching"
```

---

### Task 7: Update environment and documentation

**Files:**
- Modify: `.env.docker.example:62-69`
- Modify: `docs/architecture/008-cache-abstraction.md:15-21`

- [ ] **Step 1: Update `.env.docker.example` cache section**

Replace the cache section (lines 62-69):

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

- [ ] **Step 2: Update ADR 008 components list**

In `docs/architecture/008-cache-abstraction.md`, update the Components section to add RedisDriver:

```markdown
### Components

- `CacheManager`: central runtime manager for cache operations.
- `CacheDriver` interface: consistent API for all drivers.
- `UpstashDriver`: shared production cache backend (REST API, Workers-compatible).
- `RedisDriver`: local/self-hosted cache backend (TCP via Bun.Redis, Bun-only).
- `MemoryDriver`: local/dev in-memory cache backend.
- `NoopDriver`: explicit no-cache mode (tests or disabled cache).
```

- [ ] **Step 3: Run quality gates**

Run: `bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck`
Expected: All PASS

- [ ] **Step 4: Commit**

```bash
git add .env.docker.example docs/architecture/008-cache-abstraction.md
git commit -m "docs: add Redis cache driver to env example and ADR 008"
```

---

### Task 8: Final verification

- [ ] **Step 1: Run all cache tests**

Run: `bun test src/lib/cache/`
Expected: All tests PASS

- [ ] **Step 2: Run full quality gates**

Run: `bun run lint:fix && bun run stylelint:fix && bun run format:fix && bun run typecheck`
Expected: All PASS

- [ ] **Step 3: Run build**

Run: `bun run build`
Expected: Build succeeds (RedisDriver is not statically imported, so Workers build is unaffected)

- [ ] **Step 4: Manual smoke test**

1. Start Redis: `docker compose -f docker-compose.dev.yml up -d`
2. Set env: `CACHE_DRIVER=redis REDIS_URL=redis://:changeme@localhost:6379`
3. Start dev server: `bun --bun run dev`
4. Navigate to a cached page (e.g., dashboard)
5. Check logs for `cache:redis` entries
6. Restart dev server and verify cache persists (data loads from Redis, not DB)
