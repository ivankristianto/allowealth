import { getEnv } from '@/lib/env';
import type { CacheDriver } from '@/lib/cache/types';
import { UpstashDriver } from '@/lib/cache/drivers/upstash';

type BetterAuthSecondaryStorage = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl: number): Promise<void>;
  delete(key: string): Promise<void>;
  increment(key: string, ttl: number): Promise<number>;
  getAndDelete(key: string): Promise<string | null>;
};

const AUTH_CACHE_KEY_PREFIX = 'better-auth';
const AUTH_DEFAULT_TTL_SECONDS = 3600;

function getAuthCacheKey(key: string): string {
  return `${AUTH_CACHE_KEY_PREFIX}:${key}`;
}

/**
 * Better Auth storage over a strict driver. Errors propagate so an outage fails
 * closed: rate limits stay on and lost writes surface instead of vanishing.
 */
export function createStrictAuthStorage(
  loadDriver: () => Promise<CacheDriver>
): BetterAuthSecondaryStorage {
  let driverPromise: Promise<CacheDriver> | null = null;
  const driver = () => {
    driverPromise ??= loadDriver().catch((error) => {
      driverPromise = null;
      throw error;
    });
    return driverPromise;
  };

  return {
    async get(key) {
      return (await driver()).get<string>(getAuthCacheKey(key));
    },
    async set(key, value, ttl) {
      await (await driver()).set(getAuthCacheKey(key), value, { ttl });
    },
    async delete(key) {
      await (await driver()).delete(getAuthCacheKey(key));
    },
    async increment(key, ttl) {
      return (await driver()).increment(getAuthCacheKey(key), ttl);
    },
    async getAndDelete(key) {
      return (await driver()).getAndDelete<string>(getAuthCacheKey(key));
    },
  };
}

// Auth gets its own driver instance: the app CacheManager swallows errors and
// falls back to per-process memory, which would silently split auth state.
export function createAuthSecondaryStorage(): BetterAuthSecondaryStorage | undefined {
  const configuredDriver = getEnv('CACHE_DRIVER');

  if (configuredDriver === 'upstash') {
    const url = getEnv('UPSTASH_REDIS_REST_URL');
    const token = getEnv('UPSTASH_REDIS_REST_TOKEN');
    if (!url || !token) return undefined;

    return createStrictAuthStorage(async () => {
      return new UpstashDriver(url, token, AUTH_DEFAULT_TTL_SECONDS, { strict: true });
    });
  }

  if (configuredDriver === 'redis') {
    const url = getEnv('REDIS_URL');
    if (!url) return undefined;

    return createStrictAuthStorage(async () => {
      // Bun-only client, loaded lazily like the CacheManager does.
      const { RedisDriver } = await import('@/lib/cache/drivers/redis');
      return new RedisDriver(url, AUTH_DEFAULT_TTL_SECONDS, { strict: true });
    });
  }

  return undefined;
}
