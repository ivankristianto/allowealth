/**
 * Cache Manager
 *
 * Central cache orchestrator that selects and manages cache drivers.
 * Provides singleton access for application-wide caching.
 */

import type { CacheDriver, CacheSetOptions, CacheConfig } from './types';
import { UpstashDriver } from './drivers/upstash';
import { MemoryDriver } from './drivers/memory';
import { NoopDriver } from './drivers/noop';

let instance: CacheManager | null = null;

export class CacheManager {
  private driver: CacheDriver;

  constructor(config: CacheConfig) {
    this.driver = this.createDriver(config);
  }

  private createDriver(config: CacheConfig): CacheDriver {
    switch (config.driver) {
      case 'upstash': {
        const url = config.upstash?.url;
        const token = config.upstash?.token;

        if (!url || !token) {
          console.warn('[Cache] Upstash credentials missing, falling back to memory driver');
          return new MemoryDriver(config.defaultTtl);
        }

        return new UpstashDriver(url, token, config.defaultTtl);
      }

      case 'memory':
        return new MemoryDriver(config.defaultTtl);

      case 'none':
      default:
        return new NoopDriver();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    return this.driver.get<T>(key);
  }

  async set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
    return this.driver.set(key, value, options);
  }

  async delete(key: string): Promise<void> {
    return this.driver.delete(key);
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    return this.driver.invalidateByTags(tags);
  }
}

export function getCacheManager(): CacheManager {
  if (!instance) {
    const driver = (import.meta.env.CACHE_DRIVER as CacheConfig['driver']) || 'memory';
    const url = import.meta.env.UPSTASH_REDIS_REST_URL || '';
    const token = import.meta.env.UPSTASH_REDIS_REST_TOKEN || '';

    instance = new CacheManager({
      driver,
      upstash: { url, token },
      defaultTtl: 3600,
    });
  }
  return instance;
}

export function resetCacheManager(): void {
  instance = null;
}
