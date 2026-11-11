import { afterEach, describe, expect, it, mock } from 'bun:test';
import { setTestEnv } from '@/lib/env';
import { UpstashDriver } from '@/lib/cache/drivers/upstash';
import type { CacheDriver } from '@/lib/cache/types';
import { createAuthSecondaryStorage, createStrictAuthStorage } from './secondary-storage';

const SESSION_KEY = 'SECRET-SESSION-TOKEN';

function failingClient() {
  const outage = () => Promise.reject(new Error(`Connection failed, command was: ${SESSION_KEY}`));
  return {
    get: mock(outage),
    set: mock(outage),
    del: mock(outage),
    eval: mock(outage),
    getdel: mock(outage),
  };
}

function upstashWithOutage(strict: boolean): UpstashDriver {
  const driver = new UpstashDriver('https://example.upstash.io', 'token', 3600, { strict });
  (driver as any).redis = failingClient();
  return driver;
}

function failingDriver(): CacheDriver {
  const outage = () => Promise.reject(new Error('backend down'));
  return {
    get: outage,
    set: outage,
    delete: outage,
    invalidateByTags: outage,
    increment: outage,
    getAndDelete: outage,
  };
}

afterEach(() => {
  setTestEnv(null);
});

describe('Better Auth secondary storage', () => {
  it('surfaces every backend error from a failing driver', async () => {
    const storage = createStrictAuthStorage(async () => failingDriver());

    await expect(storage.get('k')).rejects.toThrow('backend down');
    await expect(storage.set('k', 'v', 60)).rejects.toThrow('backend down');
    await expect(storage.delete('k')).rejects.toThrow('backend down');
    await expect(storage.increment('k', 60)).rejects.toThrow('backend down');
    await expect(storage.getAndDelete('k')).rejects.toThrow('backend down');
  });

  it('keeps the better-auth key prefix so live sessions survive the deploy', async () => {
    const seen: string[] = [];
    const recording: CacheDriver = {
      ...failingDriver(),
      get: async (key) => {
        seen.push(key);
        return null;
      },
    };
    const storage = createStrictAuthStorage(async () => recording);

    await storage.get('abc');

    expect(seen).toEqual(['better-auth:abc']);
  });

  it('does not count a failed rate-limit increment as the first request', async () => {
    const storage = createStrictAuthStorage(async () => upstashWithOutage(true));

    await expect(storage.increment('rate:/sign-in/email', 900)).rejects.toThrow();
  });

  it('does not report a failed write as stored', async () => {
    const storage = createStrictAuthStorage(async () => upstashWithOutage(true));

    await expect(storage.set('verification:abc', 'value', 3600)).rejects.toThrow();
  });

  it('keeps the cache key out of the thrown error', async () => {
    const storage = createStrictAuthStorage(async () => upstashWithOutage(true));

    const error = await storage.get(SESSION_KEY).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).not.toContain(SESSION_KEY);
  });

  it('surfaces Redis driver errors in strict mode', async () => {
    const { RedisDriver } = await import('@/lib/cache/drivers/redis');
    const driver = new RedisDriver('redis://localhost:1', 3600, { strict: true });
    const outage = () => Promise.reject(new Error('Connection closed'));
    (driver as any).redis = { get: outage, set: outage, del: outage, send: outage };
    const storage = createStrictAuthStorage(async () => driver);

    await expect(storage.increment('rate:/sign-in/email', 900)).rejects.toThrow();
    await expect(storage.set('verification:abc', 'value', 3600)).rejects.toThrow();
    await expect(storage.get('k')).rejects.toThrow();
  });

  it('builds a strict Upstash driver when Upstash is configured', async () => {
    setTestEnv({
      CACHE_DRIVER: 'upstash',
      UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'token',
    });

    expect(createAuthSecondaryStorage()).toBeDefined();
  });

  it('stays off without a shared cache backend', () => {
    setTestEnv({ CACHE_DRIVER: 'memory' });

    expect(createAuthSecondaryStorage()).toBeUndefined();
  });
});

describe('app cache drivers stay lenient', () => {
  it('fails open on increment and swallows set errors by default', async () => {
    const driver = upstashWithOutage(false);

    expect(await driver.increment('k', 60)).toBe(1);
    await expect(driver.set('k', 'v')).resolves.toBeUndefined();
    expect(await driver.get('k')).toBeNull();
  });
});
