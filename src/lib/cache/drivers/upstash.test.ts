import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { INCREMENT_WITH_TTL_SCRIPT } from './increment-script';
import { UpstashDriver } from './upstash';

const mockRedis = {
  get: mock(() => Promise.resolve(null)),
  set: mock(() => Promise.resolve('OK')),
  del: mock(() => Promise.resolve(1)),
  eval: mock((..._args: unknown[]) => Promise.resolve(1)),
  getdel: mock((..._args: unknown[]) => Promise.resolve(null as unknown)),
  pipeline: mock(() => ({
    sadd: mock(() => ({})),
    expire: mock(() => ({})),
    smembers: mock(() => ({})),
    exec: mock(() => Promise.resolve([])),
  })),
};

describe('UpstashDriver', () => {
  let driver: UpstashDriver;

  beforeEach(() => {
    mockRedis.get.mockClear();
    mockRedis.set.mockClear();
    mockRedis.del.mockClear();
    mockRedis.eval.mockClear();
    mockRedis.getdel.mockClear();
    mockRedis.pipeline.mockClear();

    driver = new UpstashDriver('https://test.upstash.io', 'test-token');
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
        exec: mock(() => Promise.resolve([['key1', 'key2'], ['key3']])),
      };
      mockRedis.pipeline.mockReturnValueOnce(mockPipeline as any);
      mockRedis.del.mockResolvedValueOnce(3);

      await driver.invalidateByTags(['tag:a', 'tag:b']);

      expect(mockRedis.pipeline).toHaveBeenCalled();
    });

    it('should handle empty tags array', async () => {
      await driver.invalidateByTags([]);
      expect(mockRedis.pipeline).not.toHaveBeenCalled();
    });

    it('should not throw on error', async () => {
      const mockPipeline = {
        smembers: mock(() => mockPipeline),
        exec: mock(() => Promise.reject(new Error('Connection failed'))),
      };
      mockRedis.pipeline.mockReturnValueOnce(mockPipeline as any);

      await expect(driver.invalidateByTags(['tag:a'])).resolves.toBeUndefined();
    });
  });

  describe('increment', () => {
    it('runs the atomic INCR + first-set EXPIRE script', async () => {
      mockRedis.eval.mockResolvedValueOnce(3);
      expect(await driver.increment('counter', 60)).toBe(3);
      expect(mockRedis.eval).toHaveBeenCalledWith(INCREMENT_WITH_TTL_SCRIPT, ['counter'], ['60']);
    });

    it('fails open on error', async () => {
      mockRedis.eval.mockRejectedValueOnce(new Error('Connection failed'));
      expect(await driver.increment('counter', 60)).toBe(1);
    });
  });

  describe('getAndDelete', () => {
    it('returns the deleted value', async () => {
      mockRedis.getdel.mockResolvedValueOnce({ foo: 'bar' });
      expect(await driver.getAndDelete('key1')).toEqual({ foo: 'bar' });
      expect(mockRedis.getdel).toHaveBeenCalledWith('key1');
    });

    it('returns null on error', async () => {
      mockRedis.getdel.mockRejectedValueOnce(new Error('Connection failed'));
      expect(await driver.getAndDelete('key1')).toBeNull();
    });
  });
});
