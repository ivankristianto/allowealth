/**
 * Cache Manager
 *
 * Central cache orchestrator that selects and manages cache drivers.
 * Provides singleton access for application-wide caching.
 */

import type { CacheDriver, CacheSetOptions, CacheConfig } from './types';
import type { PerfCollector } from '@/lib/perf';
import { getEnv } from '@/lib/env';
import { createLogger } from '@/lib/logger';

const log = createLogger('cache');
import { UpstashDriver } from './drivers/upstash';
import { MemoryDriver } from './drivers/memory';
import { NoopDriver } from './drivers/noop';

let instance: CacheManager | null = null;

export class CacheManager {
  private driver: CacheDriver;
  private driverName: string;

  constructor(config: CacheConfig) {
    const { driver, name } = this.createDriver(config);
    this.driver = driver;
    this.driverName = name;
  }

  private createDriver(config: CacheConfig): { driver: CacheDriver; name: string } {
    switch (config.driver) {
      case 'upstash': {
        const url = config.upstash?.url;
        const token = config.upstash?.token;

        if (!url || !token) {
          log.warn('Upstash credentials missing, falling back to memory driver');
          return { driver: new MemoryDriver(config.defaultTtl), name: 'memory' };
        }

        return { driver: new UpstashDriver(url, token, config.defaultTtl), name: 'upstash' };
      }

      case 'memory':
        return { driver: new MemoryDriver(config.defaultTtl), name: 'memory' };

      case 'none':
      default:
        return { driver: new NoopDriver(), name: 'noop' };
    }
  }

  getDriverName(): string {
    return this.driverName;
  }

  async get<T>(key: string, perf?: PerfCollector): Promise<T | null> {
    try {
      perf?.setCacheDriver(this.driverName);
      const result = await this.driver.get<T>(key);
      if (result !== null) {
        perf?.cacheHit();
      } else {
        perf?.cacheMiss();
      }
      return result;
    } catch {
      perf?.cacheMiss();
      return null;
    }
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
    const driver = (getEnv('CACHE_DRIVER') as CacheConfig['driver']) || 'memory';
    const url = getEnv('UPSTASH_REDIS_REST_URL') || '';
    const token = getEnv('UPSTASH_REDIS_REST_TOKEN') || '';

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
