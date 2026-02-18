import { getCacheManager } from '@/lib/cache/cache-manager';
import type { CacheSetOptions } from '@/lib/cache/types';
import type { PerfCollector } from '@/lib/perf';

export async function cacheOrFetch<T>(
  key: string,
  options: CacheSetOptions,
  fetch: () => Promise<T>,
  perf?: PerfCollector
): Promise<T> {
  const cache = getCacheManager();

  try {
    const cached = await cache.get<T>(key, perf);
    if (cached !== null) return cached;
  } catch {
    // Cache read failure — fall through to fetch
  }

  const result = await fetch();

  try {
    await cache.set(key, result, options);
  } catch {
    // Cache write failure — return result without caching
  }

  return result;
}
