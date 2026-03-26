import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test';
import { RedisDriver } from './redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://:changeme@localhost:6379';

let redisAvailable = false;

try {
  const client = new Bun.RedisClient(REDIS_URL, {
    autoReconnect: false,
    enableOfflineQueue: false,
    connectionTimeout: 250,
  });
  await client.connect();
  await client.ping();
  client.close();
  redisAvailable = true;
} catch {
  console.warn('Redis not available, skipping RedisDriver tests');
}

function getDriverClient(driver: RedisDriver): InstanceType<typeof Bun.RedisClient> {
  return (driver as any).redis;
}

describe('RedisDriver', () => {
  let driver: RedisDriver;
  let cleanupClient: InstanceType<typeof Bun.RedisClient>;

  beforeAll(() => {
    if (!redisAvailable) {
      return;
    }

    cleanupClient = new Bun.RedisClient(REDIS_URL);
  });

  afterAll(() => {
    if (!redisAvailable) {
      return;
    }

    cleanupClient.close();
  });

  afterEach(() => {
    if (!redisAvailable) {
      return;
    }

    getDriverClient(driver).close();
  });

  beforeEach(async () => {
    if (!redisAvailable) {
      return;
    }

    await cleanupClient.send('FLUSHDB', []);
    driver = new RedisDriver(REDIS_URL);
  });

  describe('get/set', () => {
    it('should return null for missing key', async () => {
      if (!redisAvailable) return;

      const result = await driver.get('nonexistent');
      expect(result).toBeNull();
    });

    it('should store and retrieve value', async () => {
      if (!redisAvailable) return;

      await driver.set('key1', { foo: 'bar' });
      const result = await driver.get<{ foo: string }>('key1');
      expect(result).toEqual({ foo: 'bar' });
    });

    it('should handle string values', async () => {
      if (!redisAvailable) return;

      await driver.set('key1', 'hello');
      const result = await driver.get<string>('key1');
      expect(result).toBe('hello');
    });

    it('should handle numeric values', async () => {
      if (!redisAvailable) return;

      await driver.set('key1', 42);
      const result = await driver.get<number>('key1');
      expect(result).toBe(42);
    });

    it('should handle nested objects', async () => {
      if (!redisAvailable) return;

      const data = { a: { b: [1, 2, 3] }, c: null };
      await driver.set('key1', data);
      const result = await driver.get('key1');
      expect(result).toEqual(data);
    });
  });

  describe('delete', () => {
    it('should delete existing key', async () => {
      if (!redisAvailable) return;

      await driver.set('key1', 'value');
      await driver.delete('key1');
      const result = await driver.get('key1');
      expect(result).toBeNull();
    });

    it('should not throw for nonexistent key', async () => {
      if (!redisAvailable) return;

      await expect(driver.delete('nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('invalidateByTags', () => {
    it('should invalidate keys with matching tags', async () => {
      if (!redisAvailable) return;

      await driver.set('key1', 'value1', { tags: ['tag:a', 'tag:b'] });
      await driver.set('key2', 'value2', { tags: ['tag:a'] });
      await driver.set('key3', 'value3', { tags: ['tag:c'] });

      await driver.invalidateByTags(['tag:a']);

      expect(await driver.get('key1')).toBeNull();
      expect(await driver.get('key2')).toBeNull();
      expect(await driver.get('key3')).toBe('value3');
    });

    it('should invalidate keys matching any of the tags', async () => {
      if (!redisAvailable) return;

      await driver.set('key1', 'value1', { tags: ['tag:a'] });
      await driver.set('key2', 'value2', { tags: ['tag:b'] });
      await driver.set('key3', 'value3', { tags: ['tag:c'] });

      await driver.invalidateByTags(['tag:a', 'tag:b']);

      expect(await driver.get('key1')).toBeNull();
      expect(await driver.get('key2')).toBeNull();
      expect(await driver.get('key3')).toBe('value3');
    });

    it('should handle empty tags array', async () => {
      if (!redisAvailable) return;

      await driver.set('key1', 'value1');
      await driver.invalidateByTags([]);
      expect(await driver.get('key1')).toBe('value1');
    });
  });

  describe('fail-silent', () => {
    it('should return null on get error', async () => {
      const badDriver = new RedisDriver(REDIS_URL);
      (badDriver as any).redis = {
        get: async () => {
          throw new Error('Connection failed');
        },
      };

      const result = await badDriver.get('key1');
      expect(result).toBeNull();
    });
  });
});
