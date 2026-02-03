# Cache Abstraction Layer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement vendor-agnostic caching to reduce page response times from 4-11 seconds to <500ms.

**Architecture:** Service-level caching with Upstash Redis driver for production (works in Cloudflare Workers), memory driver for development. Fail-silent fallback to database on cache miss.

**Tech Stack:** @upstash/redis, TypeScript, bun:test

---

## Task 1: Add Upstash Redis Dependency

**Files:**

- Modify: `package.json`

**Step 1: Install @upstash/redis**

```bash
bun add @upstash/redis
```

**Step 2: Verify installation**

```bash
bun run typecheck
```

Expected: No errors related to @upstash/redis

**Step 3: Commit**

```bash
git add package.json bun.lockb
git commit -m "chore: add @upstash/redis dependency for caching"
```

---

## Task 2: Create Cache Types

**Files:**

- Create: `src/lib/cache/types.ts`
- Test: `src/lib/cache/types.test.ts`

**Step 1: Write the types file**

```typescript
// src/lib/cache/types.ts

/**
 * Cache Driver Interface
 *
 * Abstraction layer for cache storage backends.
 * Implementations: UpstashDriver, MemoryDriver, NoopDriver
 */

export interface CacheSetOptions {
  /** Time-to-live in seconds (default: 3600) */
  ttl?: number;
  /** Tags for bulk invalidation */
  tags?: string[];
}

export interface CacheDriver {
  /** Get value by key, returns null if miss or expired */
  get<T>(key: string): Promise<T | null>;

  /** Set value with optional TTL (seconds) and tags */
  set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void>;

  /** Delete a specific key */
  delete(key: string): Promise<void>;

  /** Delete all keys with any of the given tags */
  invalidateByTags(tags: string[]): Promise<void>;
}

export interface CacheConfig {
  /** Cache driver to use */
  driver: 'upstash' | 'memory' | 'none';
  /** Upstash credentials (required when driver=upstash) */
  upstash?: {
    url: string;
    token: string;
  };
  /** Default TTL in seconds (default: 3600) */
  defaultTtl?: number;
}

/** Default cache configuration */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  driver: 'memory',
  defaultTtl: 3600,
};
```

**Step 2: Write type assertion test**

```typescript
// src/lib/cache/types.test.ts

import { describe, it, expect } from 'bun:test';
import type { CacheDriver, CacheSetOptions, CacheConfig } from './types';
import { DEFAULT_CACHE_CONFIG } from './types';

describe('Cache Types', () => {
  it('should have correct default config', () => {
    expect(DEFAULT_CACHE_CONFIG.driver).toBe('memory');
    expect(DEFAULT_CACHE_CONFIG.defaultTtl).toBe(3600);
  });

  it('should allow valid CacheConfig', () => {
    const config: CacheConfig = {
      driver: 'upstash',
      upstash: {
        url: 'https://example.upstash.io',
        token: 'test-token',
      },
      defaultTtl: 1800,
    };
    expect(config.driver).toBe('upstash');
  });

  it('should allow valid CacheSetOptions', () => {
    const options: CacheSetOptions = {
      ttl: 300,
      tags: ['workspace:123', 'budget'],
    };
    expect(options.ttl).toBe(300);
    expect(options.tags).toHaveLength(2);
  });
});
```

**Step 3: Run test to verify it passes**

```bash
bun test src/lib/cache/types.test.ts
```

Expected: PASS

**Step 4: Commit**

```bash
git add src/lib/cache/types.ts src/lib/cache/types.test.ts
git commit -m "feat(cache): add cache driver types and interfaces"
```

---

## Task 3: Create Cache Keys & Tags Helpers

**Files:**

- Create: `src/lib/cache/keys.ts`
- Create: `src/lib/cache/tags.ts`
- Test: `src/lib/cache/keys.test.ts`

**Step 1: Write keys helper**

```typescript
// src/lib/cache/keys.ts

/**
 * Cache Key Builders
 *
 * Standardized cache key patterns for consistent naming.
 * All keys are prefixed with 'cache:' for easy identification.
 */

import { createHash } from 'node:crypto';

/** Cache key prefix */
const PREFIX = 'cache';

/**
 * Build cache keys for different data types
 */
export const CacheKeys = {
  /** Budget overview: cache:budget:{workspaceId}:{year}:{month}:{currency} */
  budget: (workspaceId: string, year: number, month: number, currency: string): string =>
    `${PREFIX}:budget:${workspaceId}:${year}:${month}:${currency}`,

  /** Dashboard data: cache:dashboard:{workspaceId}:{year}:{month}:{currency} */
  dashboard: (workspaceId: string, year: number, month: number, currency: string): string =>
    `${PREFIX}:dashboard:${workspaceId}:${year}:${month}:${currency}`,

  /** Transaction list: cache:transactions:{workspaceId}:{filtersHash} */
  transactions: (workspaceId: string, filtersHash: string): string =>
    `${PREFIX}:transactions:${workspaceId}:${filtersHash}`,

  /** User settings: cache:settings:{userId} */
  settings: (userId: string): string => `${PREFIX}:settings:${userId}`,

  /** Session: cache:session:{sessionId} */
  session: (sessionId: string): string => `${PREFIX}:session:${sessionId}`,
} as const;

/**
 * Hash filter object to create stable cache key
 *
 * Creates a short hash from filter parameters for transaction list caching.
 * Keys are sorted for consistent hashing regardless of object key order.
 *
 * @param filters - Filter object to hash
 * @returns 8-character hex hash
 */
export function hashFilters(filters: Record<string, unknown>): string {
  // Remove undefined values and sort keys for stable hash
  const cleaned: Record<string, unknown> = {};
  for (const key of Object.keys(filters).sort()) {
    if (filters[key] !== undefined) {
      cleaned[key] = filters[key];
    }
  }
  const json = JSON.stringify(cleaned);
  return createHash('md5').update(json).digest('hex').slice(0, 8);
}
```

**Step 2: Write tags helper**

```typescript
// src/lib/cache/tags.ts

/**
 * Cache Tags
 *
 * Tag constants and builders for cache invalidation.
 * Tags are used to invalidate multiple cache entries at once.
 */

/**
 * Build cache tags for invalidation
 */
export const CacheTags = {
  /** Workspace-scoped tag: workspace:{id} */
  workspace: (id: string): string => `workspace:${id}`,

  /** User-scoped tag: user:{id} */
  user: (id: string): string => `user:${id}`,

  /** Session-scoped tag: session:{id} */
  session: (id: string): string => `session:${id}`,

  // Entity type tags (for cross-workspace invalidation if needed)
  BUDGET: 'budget' as const,
  TRANSACTIONS: 'transactions' as const,
  SETTINGS: 'settings' as const,
  DASHBOARD: 'dashboard' as const,
  SESSION: 'session' as const,
} as const;
```

**Step 3: Write tests for keys**

```typescript
// src/lib/cache/keys.test.ts

import { describe, it, expect } from 'bun:test';
import { CacheKeys, hashFilters } from './keys';
import { CacheTags } from './tags';

describe('CacheKeys', () => {
  it('should build budget key correctly', () => {
    const key = CacheKeys.budget('ws_123', 2026, 2, 'IDR');
    expect(key).toBe('cache:budget:ws_123:2026:2:IDR');
  });

  it('should build dashboard key correctly', () => {
    const key = CacheKeys.dashboard('ws_123', 2026, 2, 'IDR');
    expect(key).toBe('cache:dashboard:ws_123:2026:2:IDR');
  });

  it('should build transactions key correctly', () => {
    const key = CacheKeys.transactions('ws_123', 'abc12345');
    expect(key).toBe('cache:transactions:ws_123:abc12345');
  });

  it('should build settings key correctly', () => {
    const key = CacheKeys.settings('user_456');
    expect(key).toBe('cache:settings:user_456');
  });

  it('should build session key correctly', () => {
    const key = CacheKeys.session('sid_789');
    expect(key).toBe('cache:session:sid_789');
  });
});

describe('hashFilters', () => {
  it('should produce consistent hash for same filters', () => {
    const filters = { type: 'expense', limit: 10 };
    const hash1 = hashFilters(filters);
    const hash2 = hashFilters(filters);
    expect(hash1).toBe(hash2);
  });

  it('should produce same hash regardless of key order', () => {
    const filters1 = { type: 'expense', limit: 10 };
    const filters2 = { limit: 10, type: 'expense' };
    expect(hashFilters(filters1)).toBe(hashFilters(filters2));
  });

  it('should ignore undefined values', () => {
    const filters1 = { type: 'expense' };
    const filters2 = { type: 'expense', category: undefined };
    expect(hashFilters(filters1)).toBe(hashFilters(filters2));
  });

  it('should produce 8-character hash', () => {
    const hash = hashFilters({ foo: 'bar' });
    expect(hash).toHaveLength(8);
  });
});

describe('CacheTags', () => {
  it('should build workspace tag correctly', () => {
    expect(CacheTags.workspace('ws_123')).toBe('workspace:ws_123');
  });

  it('should build user tag correctly', () => {
    expect(CacheTags.user('user_456')).toBe('user:user_456');
  });

  it('should have entity type constants', () => {
    expect(CacheTags.BUDGET).toBe('budget');
    expect(CacheTags.TRANSACTIONS).toBe('transactions');
    expect(CacheTags.SETTINGS).toBe('settings');
  });
});
```

**Step 4: Run tests**

```bash
bun test src/lib/cache/keys.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/cache/keys.ts src/lib/cache/tags.ts src/lib/cache/keys.test.ts
git commit -m "feat(cache): add cache key builders and tag helpers"
```

---

## Task 4: Implement Memory Driver

**Files:**

- Create: `src/lib/cache/drivers/memory.ts`
- Test: `src/lib/cache/drivers/memory.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/cache/drivers/memory.test.ts

import { describe, it, expect, beforeEach } from 'bun:test';
import { MemoryDriver } from './memory';

describe('MemoryDriver', () => {
  let driver: MemoryDriver;

  beforeEach(() => {
    driver = new MemoryDriver();
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

    it('should return null for expired key', async () => {
      await driver.set('key1', 'value', { ttl: 0 });
      // Wait a tiny bit for expiration
      await new Promise((r) => setTimeout(r, 10));
      const result = await driver.get('key1');
      expect(result).toBeNull();
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
  });

  describe('clear', () => {
    it('should clear all entries', async () => {
      await driver.set('key1', 'value1');
      await driver.set('key2', 'value2');
      driver.clear();
      expect(await driver.get('key1')).toBeNull();
      expect(await driver.get('key2')).toBeNull();
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      await driver.set('key1', 'value1');
      await driver.set('key2', 'value2');
      const stats = driver.getStats();
      expect(stats.size).toBe(2);
      expect(stats.tagCount).toBe(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
bun test src/lib/cache/drivers/memory.test.ts
```

Expected: FAIL (module not found)

**Step 3: Write the implementation**

```typescript
// src/lib/cache/drivers/memory.ts

/**
 * Memory Cache Driver
 *
 * In-memory cache implementation for development and testing.
 * Uses Map for storage with TTL support and tag-based invalidation.
 *
 * Note: This cache is per-process. In production with multiple
 * instances, use UpstashDriver for shared cache.
 */

import type { CacheDriver, CacheSetOptions } from '../types';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryDriver implements CacheDriver {
  private store = new Map<string, CacheEntry<unknown>>();
  private tags = new Map<string, Set<string>>();
  private defaultTtl: number;

  constructor(defaultTtl: number = 3600) {
    this.defaultTtl = defaultTtl;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    // Check expiration
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      this.removeKeyFromTags(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
    const ttlSeconds = options?.ttl ?? this.defaultTtl;
    const ttlMs = ttlSeconds * 1000;

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });

    // Track tags for invalidation
    if (options?.tags?.length) {
      for (const tag of options.tags) {
        if (!this.tags.has(tag)) {
          this.tags.set(tag, new Set());
        }
        this.tags.get(tag)!.add(key);
      }
    }
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
    this.removeKeyFromTags(key);
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    const keysToDelete = new Set<string>();

    // Collect all keys that have any of the specified tags
    for (const tag of tags) {
      const keys = this.tags.get(tag);
      if (keys) {
        for (const key of keys) {
          keysToDelete.add(key);
        }
        this.tags.delete(tag);
      }
    }

    // Delete the keys
    for (const key of keysToDelete) {
      this.store.delete(key);
      this.removeKeyFromTags(key);
    }
  }

  /**
   * Clear all entries (useful for testing)
   */
  clear(): void {
    this.store.clear();
    this.tags.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; tagCount: number } {
    return {
      size: this.store.size,
      tagCount: this.tags.size,
    };
  }

  /**
   * Remove key from all tag sets
   */
  private removeKeyFromTags(key: string): void {
    for (const [tag, keys] of this.tags.entries()) {
      keys.delete(key);
      if (keys.size === 0) {
        this.tags.delete(tag);
      }
    }
  }
}
```

**Step 4: Run test to verify it passes**

```bash
bun test src/lib/cache/drivers/memory.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/cache/drivers/memory.ts src/lib/cache/drivers/memory.test.ts
git commit -m "feat(cache): implement MemoryDriver for in-memory caching"
```

---

## Task 5: Implement Noop Driver

**Files:**

- Create: `src/lib/cache/drivers/noop.ts`
- Test: `src/lib/cache/drivers/noop.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/cache/drivers/noop.test.ts

import { describe, it, expect } from 'bun:test';
import { NoopDriver } from './noop';

describe('NoopDriver', () => {
  const driver = new NoopDriver();

  it('should always return null on get', async () => {
    expect(await driver.get('any-key')).toBeNull();
  });

  it('should not throw on set', async () => {
    await expect(driver.set('key', 'value')).resolves.toBeUndefined();
  });

  it('should not throw on delete', async () => {
    await expect(driver.delete('key')).resolves.toBeUndefined();
  });

  it('should not throw on invalidateByTags', async () => {
    await expect(driver.invalidateByTags(['tag1', 'tag2'])).resolves.toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
bun test src/lib/cache/drivers/noop.test.ts
```

Expected: FAIL

**Step 3: Write the implementation**

```typescript
// src/lib/cache/drivers/noop.ts

/**
 * Noop Cache Driver
 *
 * No-operation cache driver that does nothing.
 * Used when caching is disabled or for testing scenarios
 * where cache should have no effect.
 */

import type { CacheDriver, CacheSetOptions } from '../types';

export class NoopDriver implements CacheDriver {
  async get<T>(_key: string): Promise<T | null> {
    return null;
  }

  async set<T>(_key: string, _value: T, _options?: CacheSetOptions): Promise<void> {
    // No-op
  }

  async delete(_key: string): Promise<void> {
    // No-op
  }

  async invalidateByTags(_tags: string[]): Promise<void> {
    // No-op
  }
}
```

**Step 4: Run test to verify it passes**

```bash
bun test src/lib/cache/drivers/noop.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/cache/drivers/noop.ts src/lib/cache/drivers/noop.test.ts
git commit -m "feat(cache): implement NoopDriver for disabled caching"
```

---

## Task 6: Implement Upstash Driver

**Files:**

- Create: `src/lib/cache/drivers/upstash.ts`
- Test: `src/lib/cache/drivers/upstash.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/cache/drivers/upstash.test.ts

import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { UpstashDriver } from './upstash';

// Mock @upstash/redis
const mockRedis = {
  get: mock(() => Promise.resolve(null)),
  set: mock(() => Promise.resolve('OK')),
  del: mock(() => Promise.resolve(1)),
  sadd: mock(() => Promise.resolve(1)),
  smembers: mock(() => Promise.resolve([])),
  expire: mock(() => Promise.resolve(1)),
  pipeline: mock(() => ({
    sadd: mock(() => ({})),
    expire: mock(() => ({})),
    smembers: mock(() => ({})),
    del: mock(() => ({})),
    exec: mock(() => Promise.resolve([])),
  })),
};

// We'll test the driver logic with mocked Redis
describe('UpstashDriver', () => {
  let driver: UpstashDriver;

  beforeEach(() => {
    // Reset mocks
    mockRedis.get.mockClear();
    mockRedis.set.mockClear();
    mockRedis.del.mockClear();

    // Create driver with mock
    driver = new UpstashDriver('https://test.upstash.io', 'test-token');
    // Inject mock (we'll need to expose this for testing)
    (driver as any).redis = mockRedis;
  });

  describe('get', () => {
    it('should return null on cache miss', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      const result = await driver.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should return value on cache hit', async () => {
      mockRedis.get.mockResolvedValueOnce({ foo: 'bar' });
      const result = await driver.get<{ foo: string }>('key1');
      expect(result).toEqual({ foo: 'bar' });
    });

    it('should return null on error (fail silently)', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('Connection failed'));
      const result = await driver.get('key1');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should set value with TTL', async () => {
      await driver.set('key1', { foo: 'bar' }, { ttl: 300 });
      expect(mockRedis.set).toHaveBeenCalled();
    });

    it('should not throw on error (fail silently)', async () => {
      mockRedis.set.mockRejectedValueOnce(new Error('Connection failed'));
      await expect(driver.set('key1', 'value')).resolves.toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should delete key', async () => {
      await driver.delete('key1');
      expect(mockRedis.del).toHaveBeenCalledWith('key1');
    });

    it('should not throw on error', async () => {
      mockRedis.del.mockRejectedValueOnce(new Error('Connection failed'));
      await expect(driver.delete('key1')).resolves.toBeUndefined();
    });
  });

  describe('invalidateByTags', () => {
    it('should delete keys associated with tags', async () => {
      const mockPipeline = {
        smembers: mock(() => mockPipeline),
        del: mock(() => mockPipeline),
        exec: mock(() => Promise.resolve([['key1', 'key2'], ['key3']])),
      };
      mockRedis.pipeline.mockReturnValueOnce(mockPipeline as any);
      mockRedis.del.mockResolvedValueOnce(3);

      await driver.invalidateByTags(['tag:a', 'tag:b']);

      expect(mockRedis.pipeline).toHaveBeenCalled();
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
bun test src/lib/cache/drivers/upstash.test.ts
```

Expected: FAIL

**Step 3: Write the implementation**

```typescript
// src/lib/cache/drivers/upstash.ts

/**
 * Upstash Redis Cache Driver
 *
 * Production cache driver using Upstash Redis with REST API.
 * Works in all environments including Cloudflare Workers.
 *
 * Features:
 * - Fail-silent: Returns null on errors instead of throwing
 * - Tag-based invalidation using Redis Sets
 * - Automatic TTL management
 *
 * Tag Storage Pattern:
 * - Key-Value: cache:key → serialized value
 * - Tag Index: tag:{tagName} → Set of cache keys
 */

import { Redis } from '@upstash/redis';
import type { CacheDriver, CacheSetOptions } from '../types';

export class UpstashDriver implements CacheDriver {
  private redis: Redis;
  private defaultTtl: number;

  constructor(url: string, token: string, defaultTtl: number = 3600) {
    this.redis = new Redis({ url, token });
    this.defaultTtl = defaultTtl;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get<T>(key);
      return value ?? null;
    } catch (error) {
      // Fail silently - return cache miss
      console.warn('[Cache] Get failed:', key, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
    try {
      const ttl = options?.ttl ?? this.defaultTtl;

      // Set the value with expiration
      await this.redis.set(key, value, { ex: ttl });

      // Track tags for invalidation
      if (options?.tags?.length) {
        const pipeline = this.redis.pipeline();
        for (const tag of options.tags) {
          const tagKey = `tag:${tag}`;
          pipeline.sadd(tagKey, key);
          // Tag set expires slightly after the cached value
          pipeline.expire(tagKey, ttl + 60);
        }
        await pipeline.exec();
      }
    } catch (error) {
      // Fail silently - cache write failure is non-fatal
      console.warn('[Cache] Set failed:', key, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.warn('[Cache] Delete failed:', key, error);
    }
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      if (tags.length === 0) return;

      // Get all keys for these tags
      const pipeline = this.redis.pipeline();
      for (const tag of tags) {
        pipeline.smembers(`tag:${tag}`);
      }
      const results = await pipeline.exec<string[][]>();

      // Flatten and dedupe keys
      const keysToDelete = [...new Set(results.flat().filter(Boolean))];
      const tagKeys = tags.map((t) => `tag:${t}`);

      if (keysToDelete.length > 0 || tagKeys.length > 0) {
        // Delete keys and tag sets
        await this.redis.del(...keysToDelete, ...tagKeys);
      }
    } catch (error) {
      console.warn('[Cache] InvalidateByTags failed:', tags, error);
    }
  }
}
```

**Step 4: Run test to verify it passes**

```bash
bun test src/lib/cache/drivers/upstash.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/cache/drivers/upstash.ts src/lib/cache/drivers/upstash.test.ts
git commit -m "feat(cache): implement UpstashDriver for Redis caching"
```

---

## Task 7: Implement Cache Manager

**Files:**

- Create: `src/lib/cache/cache-manager.ts`
- Test: `src/lib/cache/cache-manager.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/cache/cache-manager.test.ts

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { CacheManager, getCacheManager, resetCacheManager } from './cache-manager';
import { MemoryDriver } from './drivers/memory';
import { NoopDriver } from './drivers/noop';

describe('CacheManager', () => {
  afterEach(() => {
    resetCacheManager();
  });

  describe('driver selection', () => {
    it('should use MemoryDriver when driver=memory', () => {
      const manager = new CacheManager({ driver: 'memory' });
      expect((manager as any).driver).toBeInstanceOf(MemoryDriver);
    });

    it('should use NoopDriver when driver=none', () => {
      const manager = new CacheManager({ driver: 'none' });
      expect((manager as any).driver).toBeInstanceOf(NoopDriver);
    });

    it('should fall back to MemoryDriver when upstash credentials missing', () => {
      const manager = new CacheManager({ driver: 'upstash' });
      expect((manager as any).driver).toBeInstanceOf(MemoryDriver);
    });
  });

  describe('get/set operations', () => {
    let manager: CacheManager;

    beforeEach(() => {
      manager = new CacheManager({ driver: 'memory' });
    });

    it('should store and retrieve values', async () => {
      await manager.set('test-key', { data: 'value' });
      const result = await manager.get<{ data: string }>('test-key');
      expect(result).toEqual({ data: 'value' });
    });

    it('should return null for missing keys', async () => {
      const result = await manager.get('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('invalidation', () => {
    let manager: CacheManager;

    beforeEach(() => {
      manager = new CacheManager({ driver: 'memory' });
    });

    it('should invalidate by tags', async () => {
      await manager.set('key1', 'value1', { tags: ['workspace:123'] });
      await manager.set('key2', 'value2', { tags: ['workspace:456'] });

      await manager.invalidateByTags(['workspace:123']);

      expect(await manager.get('key1')).toBeNull();
      expect(await manager.get('key2')).toBe('value2');
    });

    it('should delete specific key', async () => {
      await manager.set('key1', 'value1');
      await manager.delete('key1');
      expect(await manager.get('key1')).toBeNull();
    });
  });

  describe('singleton', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = getCacheManager();
      const instance2 = getCacheManager();
      expect(instance1).toBe(instance2);
    });

    it('should reset singleton', () => {
      const instance1 = getCacheManager();
      resetCacheManager();
      const instance2 = getCacheManager();
      expect(instance1).not.toBe(instance2);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
bun test src/lib/cache/cache-manager.test.ts
```

Expected: FAIL

**Step 3: Write the implementation**

```typescript
// src/lib/cache/cache-manager.ts

/**
 * Cache Manager
 *
 * Central cache orchestrator that selects and manages cache drivers.
 * Provides singleton access for application-wide caching.
 *
 * Driver Selection:
 * - upstash: Use Upstash Redis (requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN)
 * - memory: Use in-memory cache (development/testing)
 * - none: Disable caching (NoopDriver)
 */

import type { CacheDriver, CacheSetOptions, CacheConfig } from './types';
import { UpstashDriver } from './drivers/upstash';
import { MemoryDriver } from './drivers/memory';
import { NoopDriver } from './drivers/noop';

let instance: CacheManager | null = null;

export class CacheManager {
  private driver: CacheDriver;

  constructor(config: CacheConfig) {
    this.driver = this.createDriver(config);
  }

  private createDriver(config: CacheConfig): CacheDriver {
    switch (config.driver) {
      case 'upstash': {
        const url = config.upstash?.url;
        const token = config.upstash?.token;

        if (!url || !token) {
          console.warn('[Cache] Upstash credentials missing, falling back to memory driver');
          return new MemoryDriver(config.defaultTtl);
        }

        return new UpstashDriver(url, token, config.defaultTtl);
      }

      case 'memory':
        return new MemoryDriver(config.defaultTtl);

      case 'none':
      default:
        return new NoopDriver();
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    return this.driver.get<T>(key);
  }

  /**
   * Set value in cache with optional TTL and tags
   */
  async set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
    return this.driver.set(key, value, options);
  }

  /**
   * Delete a specific key
   */
  async delete(key: string): Promise<void> {
    return this.driver.delete(key);
  }

  /**
   * Invalidate all keys with any of the given tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    return this.driver.invalidateByTags(tags);
  }
}

/**
 * Get the cache manager singleton
 *
 * Creates a new instance if none exists, using environment variables
 * for configuration.
 */
export function getCacheManager(): CacheManager {
  if (!instance) {
    const driver = (import.meta.env.CACHE_DRIVER as CacheConfig['driver']) || 'memory';
    const url = import.meta.env.UPSTASH_REDIS_REST_URL || '';
    const token = import.meta.env.UPSTASH_REDIS_REST_TOKEN || '';

    instance = new CacheManager({
      driver,
      upstash: { url, token },
      defaultTtl: 3600,
    });
  }
  return instance;
}

/**
 * Reset the cache manager singleton
 *
 * Primarily useful for testing to ensure clean state between tests.
 */
export function resetCacheManager(): void {
  instance = null;
}
```

**Step 4: Run test to verify it passes**

```bash
bun test src/lib/cache/cache-manager.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/cache/cache-manager.ts src/lib/cache/cache-manager.test.ts
git commit -m "feat(cache): implement CacheManager with driver selection"
```

---

## Task 8: Create Cache Module Entry Point

**Files:**

- Create: `src/lib/cache/index.ts`

**Step 1: Write the entry point**

````typescript
// src/lib/cache/index.ts

/**
 * Cache Module
 *
 * Vendor-agnostic caching layer with support for:
 * - Upstash Redis (production, Cloudflare Workers compatible)
 * - In-memory cache (development)
 * - No-op driver (disabled caching)
 *
 * Usage:
 * ```typescript
 * import { getCacheManager, CacheKeys, CacheTags } from '@/lib/cache';
 *
 * const cache = getCacheManager();
 * const key = CacheKeys.budget(workspaceId, year, month, currency);
 *
 * // Try cache first
 * const cached = await cache.get<BudgetData>(key);
 * if (cached) return cached;
 *
 * // Fetch from DB and cache
 * const data = await fetchFromDb();
 * await cache.set(key, data, {
 *   ttl: 3600,
 *   tags: [CacheTags.workspace(workspaceId), CacheTags.BUDGET],
 * });
 *
 * // Invalidate on mutation
 * await cache.invalidateByTags([CacheTags.workspace(workspaceId), CacheTags.BUDGET]);
 * ```
 */

// Core exports
export { CacheManager, getCacheManager, resetCacheManager } from './cache-manager';
export { CacheKeys, hashFilters } from './keys';
export { CacheTags } from './tags';

// Type exports
export type { CacheDriver, CacheSetOptions, CacheConfig } from './types';
export { DEFAULT_CACHE_CONFIG } from './types';

// Driver exports (for testing/custom usage)
export { MemoryDriver } from './drivers/memory';
export { NoopDriver } from './drivers/noop';
export { UpstashDriver } from './drivers/upstash';
````

**Step 2: Verify module resolves**

```bash
bun run typecheck
```

Expected: No errors

**Step 3: Run all cache tests**

```bash
bun test src/lib/cache/
```

Expected: All tests pass

**Step 4: Commit**

```bash
git add src/lib/cache/index.ts
git commit -m "feat(cache): add cache module entry point"
```

---

## Task 9: Add Environment Variables

**Files:**

- Modify: `.env.example`
- Modify: `src/env.d.ts` (if exists, add cache env types)

**Step 1: Update .env.example**

Add to `.env.example`:

```bash
# Cache Configuration
# Driver: "upstash" | "memory" | "none"
CACHE_DRIVER=memory

# Upstash Redis (required when CACHE_DRIVER=upstash)
# Get credentials from https://console.upstash.com/
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

**Step 2: Update env.d.ts for type safety**

Add to `src/env.d.ts` ImportMetaEnv interface:

```typescript
interface ImportMetaEnv {
  // ... existing env vars ...

  // Cache configuration
  readonly CACHE_DRIVER?: 'upstash' | 'memory' | 'none';
  readonly UPSTASH_REDIS_REST_URL?: string;
  readonly UPSTASH_REDIS_REST_TOKEN?: string;
}
```

**Step 3: Verify typecheck**

```bash
bun run typecheck
```

Expected: No errors

**Step 4: Commit**

```bash
git add .env.example src/env.d.ts
git commit -m "chore: add cache environment variables"
```

---

## Task 10: Add Caching to BudgetService

**Files:**

- Modify: `src/services/budget.service.ts`
- Test: `src/services/budget.service.test.ts` (add cache tests)

**Step 1: Update BudgetService with caching**

At top of file, add imports:

```typescript
import { getCacheManager, CacheKeys, CacheTags } from '@/lib/cache';
```

Modify `getMonthlyOverview` method:

```typescript
async getMonthlyOverview(
  workspaceId: string,
  year: number,
  month: number,
  currency: 'IDR' | 'USD'
): Promise<BudgetSummary> {
  // Validate inputs (existing code)
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error('Invalid year parameter');
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Invalid month parameter');
  }

  // Try cache first
  const cache = getCacheManager();
  const cacheKey = CacheKeys.budget(workspaceId, year, month, currency);

  const cached = await cache.get<BudgetSummary>(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch from database (existing logic)
  const result = await this.fetchMonthlyOverviewFromDb(workspaceId, year, month, currency);

  // Cache the result
  await cache.set(cacheKey, result, {
    ttl: 3600, // 1 hour
    tags: [CacheTags.workspace(workspaceId), CacheTags.BUDGET, CacheTags.TRANSACTIONS],
  });

  return result;
}

// Extract existing DB logic to private method
private async fetchMonthlyOverviewFromDb(
  workspaceId: string,
  year: number,
  month: number,
  currency: 'IDR' | 'USD'
): Promise<BudgetSummary> {
  // ... move existing getMonthlyOverview logic here ...
}
```

Add cache invalidation to mutation methods. In `createBudget`:

```typescript
async createBudget(input: CreateBudgetInput): Promise<Budget> {
  // ... existing create logic ...

  // Invalidate cache
  const cache = getCacheManager();
  await cache.invalidateByTags([
    CacheTags.workspace(input.workspace_id),
    CacheTags.BUDGET,
  ]);

  return budget;
}
```

Similarly for `updateBudget`, `deleteBudget`, `copyBudgets`.

**Step 2: Run existing tests to ensure no regression**

```bash
bun test src/services/budget.service.test.ts
```

Expected: All existing tests pass

**Step 3: Add cache-specific test**

Add to `budget.service.test.ts`:

```typescript
describe('caching', () => {
  it('should return cached result on second call', async () => {
    // First call - cache miss
    const result1 = await budgetService.getMonthlyOverview(userId, year, month, currency);

    // Second call - should hit cache (we can verify by checking call count if we had mocks)
    const result2 = await budgetService.getMonthlyOverview(userId, year, month, currency);

    expect(result1).toEqual(result2);
  });
});
```

**Step 4: Run tests**

```bash
bun test src/services/budget.service.test.ts
```

Expected: All tests pass

**Step 5: Commit**

```bash
git add src/services/budget.service.ts src/services/budget.service.test.ts
git commit -m "feat(cache): add caching to BudgetService"
```

---

## Task 11: Add Caching to DashboardService

**Files:**

- Modify: `src/services/dashboard.service.ts`

**Step 1: Add cache imports at top**

```typescript
import { getCacheManager, CacheKeys, CacheTags } from '@/lib/cache';
```

**Step 2: Modify getDashboardData method**

```typescript
async getDashboardData(
  workspaceId: string,
  month?: number,
  year?: number,
  currency: 'IDR' | 'USD' = 'IDR'
): Promise<DashboardData> {
  const now = new Date();
  const currentMonth = month ?? now.getMonth() + 1;
  const currentYear = year ?? now.getFullYear();

  // Try cache first
  const cache = getCacheManager();
  const cacheKey = CacheKeys.dashboard(workspaceId, currentYear, currentMonth, currency);

  const cached = await cache.get<DashboardData>(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch from database (existing logic)
  const result = await this.fetchDashboardDataFromDb(
    workspaceId,
    currentMonth,
    currentYear,
    currency
  );

  // Cache the result
  await cache.set(cacheKey, result, {
    ttl: 3600, // 1 hour
    tags: [
      CacheTags.workspace(workspaceId),
      CacheTags.DASHBOARD,
      CacheTags.BUDGET,
      CacheTags.TRANSACTIONS,
    ],
  });

  return result;
}

private async fetchDashboardDataFromDb(
  workspaceId: string,
  month: number,
  year: number,
  currency: 'IDR' | 'USD'
): Promise<DashboardData> {
  // Move existing getDashboardData logic here (the Promise.all block)
  // ...
}
```

**Step 3: Run tests**

```bash
bun test src/services/dashboard.service.test.ts
```

Expected: All tests pass

**Step 4: Commit**

```bash
git add src/services/dashboard.service.ts
git commit -m "feat(cache): add caching to DashboardService"
```

---

## Task 12: Add Caching to TransactionService

**Files:**

- Modify: `src/services/transaction.service.ts`

**Step 1: Add cache imports**

```typescript
import { getCacheManager, CacheKeys, CacheTags, hashFilters } from '@/lib/cache';
```

**Step 2: Modify findAll method**

```typescript
async findAll(filters: TransactionFilters) {
  // Build cache key from filters
  const cache = getCacheManager();
  const filtersHash = hashFilters(filters);
  const cacheKey = CacheKeys.transactions(filters.workspace_id, filtersHash);

  // Try cache first
  const cached = await cache.get<ReturnType<typeof this.findAll>>(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch from database (existing logic)
  const result = await this.fetchTransactionsFromDb(filters);

  // Cache the result (shorter TTL due to filter combinations)
  await cache.set(cacheKey, result, {
    ttl: 1800, // 30 minutes
    tags: [CacheTags.workspace(filters.workspace_id), CacheTags.TRANSACTIONS],
  });

  return result;
}

private async fetchTransactionsFromDb(filters: TransactionFilters) {
  // Move existing findAll logic here
  // ...
}
```

**Step 3: Add cache invalidation to mutations**

In `create`, `update`, `delete` methods:

```typescript
// After successful mutation
const cache = getCacheManager();
await cache.invalidateByTags([
  CacheTags.workspace(workspaceId),
  CacheTags.TRANSACTIONS,
  CacheTags.DASHBOARD,
  CacheTags.BUDGET, // Transactions affect budget calculations
]);
```

**Step 4: Run tests**

```bash
bun test src/services/transaction.service.test.ts
```

Expected: All tests pass

**Step 5: Commit**

```bash
git add src/services/transaction.service.ts
git commit -m "feat(cache): add caching to TransactionService"
```

---

## Task 13: Add Caching to UserMetaService

**Files:**

- Modify: `src/services/user-meta.service.ts`

**Step 1: Add cache imports**

```typescript
import { getCacheManager, CacheKeys, CacheTags } from '@/lib/cache';
```

**Step 2: Modify getUserSettings method**

```typescript
async getUserSettings(userId: string): Promise<UserSettings> {
  const cache = getCacheManager();
  const cacheKey = CacheKeys.settings(userId);

  // Try cache first
  const cached = await cache.get<UserSettings>(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch from database
  const result = await this.fetchUserSettingsFromDb(userId);

  // Cache the result
  await cache.set(cacheKey, result, {
    ttl: 3600, // 1 hour
    tags: [CacheTags.user(userId), CacheTags.SETTINGS],
  });

  return result;
}

private async fetchUserSettingsFromDb(userId: string): Promise<UserSettings> {
  // Move existing getUserSettings logic here
  const metaAll = await this.getUserMetaAll(userId);
  return {
    showConvertedTotals: metaValueToBoolean(
      metaAll[USER_META_KEYS.SHOW_CONVERTED_TOTALS],
      DEFAULT_USER_SETTINGS.showConvertedTotals
    ),
    // ... rest of existing logic
  };
}
```

**Step 3: Add cache invalidation to setUserMeta**

```typescript
async setUserMeta(userId: string, key: UserMetaKey, value: string): Promise<void> {
  // ... existing logic ...

  // Invalidate cache
  const cache = getCacheManager();
  await cache.invalidateByTags([CacheTags.user(userId), CacheTags.SETTINGS]);
}
```

**Step 4: Run tests**

```bash
bun test src/services/user-meta.service.test.ts
```

Expected: All tests pass

**Step 5: Commit**

```bash
git add src/services/user-meta.service.ts
git commit -m "feat(cache): add caching to UserMetaService"
```

---

## Task 14: Migrate Session Cache to Use CacheManager

**Files:**

- Modify: `src/lib/auth/session-cache.ts`

**Step 1: Update session-cache to use CacheManager**

```typescript
// src/lib/auth/session-cache.ts

/**
 * Session Cache
 *
 * Caches session validation results to reduce database round-trips.
 * Uses the cache abstraction layer for vendor-agnostic storage.
 *
 * In development: Uses in-memory cache
 * In production: Uses Upstash Redis (shared across instances)
 */

import type { User, Session } from './lucia';
import { getCacheManager, CacheKeys, CacheTags } from '@/lib/cache';

// Cache TTL in seconds (5 minutes)
const SESSION_CACHE_TTL = 5 * 60;

interface CachedSessionData {
  session: Session;
  user: User;
}

/**
 * Get a cached session if it exists and hasn't expired
 */
export async function getCachedSession(
  sessionId: string
): Promise<{ session: Session; user: User } | null> {
  const cache = getCacheManager();
  const cacheKey = CacheKeys.session(sessionId);

  const cached = await cache.get<CachedSessionData>(cacheKey);
  if (!cached) {
    return null;
  }

  // Check if session itself has expired
  const expiresAt = new Date(cached.session.expiresAt);
  if (expiresAt < new Date()) {
    await cache.delete(cacheKey);
    return null;
  }

  return cached;
}

/**
 * Cache a validated session
 */
export async function cacheSession(sessionId: string, session: Session, user: User): Promise<void> {
  const cache = getCacheManager();
  const cacheKey = CacheKeys.session(sessionId);

  await cache.set<CachedSessionData>(
    cacheKey,
    { session, user },
    {
      ttl: SESSION_CACHE_TTL,
      tags: [CacheTags.session(sessionId), CacheTags.user(user.id), CacheTags.SESSION],
    }
  );
}

/**
 * Invalidate a cached session (call on logout or session update)
 */
export async function invalidateSession(sessionId: string): Promise<void> {
  const cache = getCacheManager();
  await cache.invalidateByTags([CacheTags.session(sessionId)]);
}

/**
 * Invalidate all sessions for a user (call on password change, etc.)
 */
export async function invalidateUserSessions(userId: string): Promise<void> {
  const cache = getCacheManager();
  await cache.invalidateByTags([CacheTags.user(userId), CacheTags.SESSION]);
}

/**
 * Clear the entire session cache
 * @deprecated Use invalidateByTags for targeted invalidation
 */
export async function clearSessionCache(): Promise<void> {
  const cache = getCacheManager();
  await cache.invalidateByTags([CacheTags.SESSION]);
}
```

**Step 2: Update middleware to use async functions**

In `src/middleware.ts`, the session cache functions are now async:

```typescript
// Change this:
const cached = getCachedSession(sessionId);

// To this:
const cached = await getCachedSession(sessionId);

// And this:
cacheSession(sessionId, session, user);

// To this:
await cacheSession(sessionId, session, user);
```

**Step 3: Run tests**

```bash
bun test src/lib/auth/
```

Expected: All tests pass

**Step 4: Commit**

```bash
git add src/lib/auth/session-cache.ts src/middleware.ts
git commit -m "refactor(cache): migrate session cache to use CacheManager"
```

---

## Task 15: Remove Old Layout Cache

**Files:**

- Delete: `src/lib/cache/layout-cache.ts`
- Modify: Files that import layout-cache (update to use new cache)

**Step 1: Find files using layout-cache**

```bash
grep -r "layout-cache" src/ --include="*.ts"
```

**Step 2: Remove or migrate usages**

For each file found, either:

- Remove the import if layout data is now cached at service level
- Or migrate to use the new cache abstraction

**Step 3: Delete the old file**

```bash
rm src/lib/cache/layout-cache.ts
```

**Step 4: Run full test suite**

```bash
bun test
```

Expected: All tests pass

**Step 5: Commit**

```bash
git add -A
git commit -m "refactor(cache): remove old layout-cache (superseded by service caching)"
```

---

## Task 16: Quality Gates & Final Verification

**Step 1: Run all quality gates**

```bash
bun run lint:fix
bun run stylelint:fix
bun run format:fix
bun run typecheck
```

Expected: All pass

**Step 2: Run full test suite**

```bash
bun test
```

Expected: All tests pass

**Step 3: Manual verification**

Start the dev server and verify:

- Pages load correctly
- Console shows cache hits after first load
- No errors in browser console

```bash
bun run dev
```

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: quality gates pass after cache implementation"
```

---

## Summary

| Task | Description                       | Files                               |
| ---- | --------------------------------- | ----------------------------------- |
| 1    | Add Upstash dependency            | package.json                        |
| 2    | Create cache types                | src/lib/cache/types.ts              |
| 3    | Create keys & tags helpers        | src/lib/cache/keys.ts, tags.ts      |
| 4    | Implement MemoryDriver            | src/lib/cache/drivers/memory.ts     |
| 5    | Implement NoopDriver              | src/lib/cache/drivers/noop.ts       |
| 6    | Implement UpstashDriver           | src/lib/cache/drivers/upstash.ts    |
| 7    | Implement CacheManager            | src/lib/cache/cache-manager.ts      |
| 8    | Create module entry point         | src/lib/cache/index.ts              |
| 9    | Add environment variables         | .env.example, src/env.d.ts          |
| 10   | Add caching to BudgetService      | src/services/budget.service.ts      |
| 11   | Add caching to DashboardService   | src/services/dashboard.service.ts   |
| 12   | Add caching to TransactionService | src/services/transaction.service.ts |
| 13   | Add caching to UserMetaService    | src/services/user-meta.service.ts   |
| 14   | Migrate session cache             | src/lib/auth/session-cache.ts       |
| 15   | Remove old layout cache           | src/lib/cache/layout-cache.ts       |
| 16   | Quality gates & verification      | -                                   |
