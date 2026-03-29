import { getCacheManager } from '@/lib/cache';
import { getEnv } from '@/lib/env';

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
  const configuredDriver = getEnv('CACHE_DRIVER');

  if (configuredDriver === 'upstash') {
    const url = getEnv('UPSTASH_REDIS_REST_URL');
    const token = getEnv('UPSTASH_REDIS_REST_TOKEN');

    if (!url || !token) {
      return undefined;
    }
  } else if (configuredDriver === 'redis') {
    if (!getEnv('REDIS_URL')) {
      return undefined;
    }
  } else {
    return undefined;
  }

  const cache = getCacheManager();

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
