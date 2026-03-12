import { getCacheManager } from '@/lib/cache';

type BetterAuthSecondaryStorage = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttl: number): Promise<void>;
  delete(key: string): Promise<void>;
};

const AUTH_CACHE_KEY_PREFIX = 'better-auth';

function getAuthCacheKey(key: string): string {
  return `${AUTH_CACHE_KEY_PREFIX}:${key}`;
}

export function createAuthSecondaryStorage(): BetterAuthSecondaryStorage | undefined {
  const cache = getCacheManager();

  if (cache.getDriverName() !== 'upstash') {
    return undefined;
  }

  return {
    async get(key) {
      return cache.get<string>(getAuthCacheKey(key));
    },
    async set(key, value, ttl) {
      await cache.set(getAuthCacheKey(key), value, { ttl });
    },
    async delete(key) {
      await cache.delete(getAuthCacheKey(key));
    },
  };
}
