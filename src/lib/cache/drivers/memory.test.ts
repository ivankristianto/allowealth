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

  describe('increment', () => {
    it('creates the counter at 1 and increments it', async () => {
      expect(await driver.increment('counter', 60)).toBe(1);
      expect(await driver.increment('counter', 60)).toBe(2);
      expect(await driver.get<number>('counter')).toBe(2);
    });

    it('keeps the TTL from the first increment', async () => {
      const realNow = Date.now;
      try {
        let now = 1_000_000;
        Date.now = () => now;
        await driver.increment('counter', 10);
        now += 9_000;
        expect(await driver.increment('counter', 10)).toBe(2);
        now += 2_000;
        expect(await driver.increment('counter', 10)).toBe(1);
      } finally {
        Date.now = realNow;
      }
    });
  });

  describe('getAndDelete', () => {
    it('returns the value and removes the key', async () => {
      await driver.set('key1', 'value1');
      expect(await driver.getAndDelete<string>('key1')).toBe('value1');
      expect(await driver.get('key1')).toBeNull();
    });

    it('returns null for a missing key', async () => {
      expect(await driver.getAndDelete('missing')).toBeNull();
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
