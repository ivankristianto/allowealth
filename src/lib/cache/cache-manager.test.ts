import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { CacheManager, getCacheManager, resetCacheManager } from './cache-manager';
import type { CacheDriver } from './types';
import { MemoryDriver } from './drivers/memory';
import { NoopDriver } from './drivers/noop';
import { setTestEnv } from '@/lib/env';

async function waitFor(condition: () => boolean, timeoutMs: number = 1_000): Promise<void> {
  const start = Date.now();

  while (!condition()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('Timed out waiting for condition');
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe('CacheManager', () => {
  afterEach(() => {
    resetCacheManager();
    setTestEnv(null);
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

    it('should fall back to MemoryDriver when redis URL missing', async () => {
      const manager = await CacheManager.create({ driver: 'redis' });
      expect(manager.getDriverName()).toBe('memory');
    });

    it('should use RedisDriver when redis URL provided', async () => {
      const manager = await CacheManager.create({
        driver: 'redis',
        redis: { url: 'redis://:changeme@localhost:6379' },
      });

      expect(manager.getDriverName()).toBe('redis');
    });

    it('should promote the singleton to redis after async init completes', async () => {
      setTestEnv({
        CACHE_DRIVER: 'redis',
        REDIS_URL: 'redis://:changeme@localhost:6379',
      });

      const manager = getCacheManager();

      expect(manager.getDriverName()).toBe('memory');

      await waitFor(() => manager.getDriverName() === 'redis');

      expect(manager.getDriverName()).toBe('redis');
      expect(getCacheManager()).toBe(manager);
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

    it('should clear async init state on reset', async () => {
      setTestEnv({
        CACHE_DRIVER: 'redis',
        REDIS_URL: 'redis://:changeme@localhost:6379',
      });

      const staleInstance = getCacheManager();
      resetCacheManager();

      setTestEnv({ CACHE_DRIVER: 'memory' });
      const freshInstance = getCacheManager();

      await waitFor(() => staleInstance.getDriverName() === 'redis');

      expect(freshInstance.getDriverName()).toBe('memory');

      const latestInstance = getCacheManager();

      expect(latestInstance).toBe(freshInstance);
      expect(latestInstance).not.toBe(staleInstance);
      expect(latestInstance.getDriverName()).toBe('memory');
    });

    it('should preserve startup writes until redis init completes', async () => {
      const originalCreate = CacheManager.create;
      const redisStore = new Map<string, unknown>();
      const fakeRedisDriver: CacheDriver = {
        async get<T>(key: string): Promise<T | null> {
          return (redisStore.get(key) as T | undefined) ?? null;
        },
        async set<T>(key: string, value: T): Promise<void> {
          redisStore.set(key, value);
        },
        async delete(key: string): Promise<void> {
          redisStore.delete(key);
        },
        async invalidateByTags(_tags: string[]): Promise<void> {},
      };

      let releaseInit = () => {};
      const initGate = new Promise<void>((resolve) => {
        releaseInit = resolve;
      });

      (CacheManager as typeof CacheManager & { create: typeof CacheManager.create }).create =
        (async (_config, manager = new CacheManager()) => {
          await initGate;
          (manager as any).applyDriver(fakeRedisDriver, 'redis');
          return manager;
        }) as typeof CacheManager.create;

      try {
        setTestEnv({
          CACHE_DRIVER: 'redis',
          REDIS_URL: 'redis://:changeme@localhost:6379',
        });

        const manager = getCacheManager();
        const startupWrite = manager.set('startup-key', { data: 'value' });

        releaseInit();
        await startupWrite;
        await waitFor(() => manager.getDriverName() === 'redis');

        expect(await manager.get<{ data: string }>('startup-key')).toEqual({ data: 'value' });
      } finally {
        releaseInit();
        (CacheManager as typeof CacheManager & { create: typeof CacheManager.create }).create =
          originalCreate;
      }
    });
  });
});
