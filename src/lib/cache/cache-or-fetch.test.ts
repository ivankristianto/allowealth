import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { resetCacheManager } from '@/lib/cache';
import { cacheOrFetch } from './cache-or-fetch';
import { setTestEnv } from '@/lib/env';

describe('cacheOrFetch', () => {
  beforeEach(() => {
    setTestEnv({ CACHE_DRIVER: 'memory' });
    resetCacheManager();
  });

  afterEach(() => {
    setTestEnv(null);
  });

  it('calls fetch and returns result on cache miss', async () => {
    const result = await cacheOrFetch('test:miss', { ttl: 60 }, async () => ({ value: 42 }));
    expect(result).toEqual({ value: 42 });
  });

  it('returns cached value without calling fetch again on cache hit', async () => {
    let calls = 0;
    const fetch = async () => {
      calls++;
      return 'data';
    };

    await cacheOrFetch('test:hit', { ttl: 60 }, fetch);
    const second = await cacheOrFetch('test:hit', { ttl: 60 }, fetch);

    expect(second).toBe('data');
    expect(calls).toBe(1);
  });

  it('uses different keys independently', async () => {
    await cacheOrFetch('key:a', { ttl: 60 }, async () => 'A');
    await cacheOrFetch('key:b', { ttl: 60 }, async () => 'B');

    const a = await cacheOrFetch('key:a', { ttl: 60 }, async () => 'WRONG');
    const b = await cacheOrFetch('key:b', { ttl: 60 }, async () => 'WRONG');

    expect(a).toBe('A');
    expect(b).toBe('B');
  });
});
