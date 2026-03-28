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
let initPromise: Promise<CacheManager> | null = null;
let configuredDriver: CacheConfig['driver'] | null = null;
let initializationError: string | null = null;

export class CacheManager {
  private driver: CacheDriver;
  private driverName: string;
  private initializationPromise: Promise<void> | null = null;

  constructor(config?: CacheConfig) {
    if (config) {
      const { driver, name } = this.createDriverSync(config);
      this.driver = driver;
      this.driverName = name;
      return;
    }

    this.driver = new MemoryDriver();
    this.driverName = 'memory';
  }

  static async create(
    config: CacheConfig,
    manager: CacheManager = new CacheManager()
  ): Promise<CacheManager> {
    const { driver, name } = await manager.createDriverAsync(config);
    manager.applyDriver(driver, name);
    return manager;
  }

  private applyDriver(driver: CacheDriver, name: string): void {
    this.driver = driver;
    this.driverName = name;
  }

  setInitializationPromise(promise: Promise<void> | null): void {
    this.initializationPromise = promise;
  }

  private async waitForInitialization(): Promise<void> {
    if (this.initializationPromise) {
      await this.initializationPromise;
    }
  }

  private createDriverSync(config: CacheConfig): { driver: CacheDriver; name: string } {
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

      case 'redis':
        throw new Error(
          "Redis driver requires async initialization. Use CacheManager.create(...) when configuring driver: 'redis'."
        );

      case 'none':
      default:
        return { driver: new NoopDriver(), name: 'noop' };
    }
  }

  private async createDriverAsync(
    config: CacheConfig
  ): Promise<{ driver: CacheDriver; name: string }> {
    if (config.driver === 'redis') {
      const url = config.redis?.url;

      if (!url) {
        log.warn('Redis URL missing, falling back to memory driver');
        return { driver: new MemoryDriver(config.defaultTtl), name: 'memory' };
      }

      const { RedisDriver } = await import('./drivers/redis');
      return { driver: new RedisDriver(url, config.defaultTtl), name: 'redis' };
    }

    return this.createDriverSync(config);
  }

  getDriverName(): string {
    return this.driverName;
  }

  async get<T>(key: string, perf?: PerfCollector): Promise<T | null> {
    try {
      await this.waitForInitialization();
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
    await this.waitForInitialization();
    return this.driver.set(key, value, options);
  }

  async delete(key: string): Promise<void> {
    await this.waitForInitialization();
    return this.driver.delete(key);
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    await this.waitForInitialization();
    return this.driver.invalidateByTags(tags);
  }
}

export function getCacheManagerState(): {
  configuredDriver: CacheConfig['driver'] | null;
  activeDriver: string | null;
  isInitializing: boolean;
  initializationError: string | null;
} {
  return {
    configuredDriver,
    activeDriver: instance?.getDriverName() ?? null,
    isInitializing: initPromise !== null,
    initializationError,
  };
}

export function getCacheManager(): CacheManager {
  if (instance) {
    return instance;
  }

  if (!initPromise) {
    const driver = (getEnv('CACHE_DRIVER') as CacheConfig['driver']) || 'memory';
    const url = getEnv('UPSTASH_REDIS_REST_URL') || '';
    const token = getEnv('UPSTASH_REDIS_REST_TOKEN') || '';
    configuredDriver = driver;
    initializationError = null;

    if (driver === 'redis') {
      const manager = new CacheManager();
      instance = manager;

      const pendingInit = CacheManager.create(
        {
          driver,
          redis: { url: getEnv('REDIS_URL') || '' },
          defaultTtl: 3600,
        },
        manager
      )
        .catch((error) => {
          initializationError = error instanceof Error ? error.message : String(error);
          log.warn('Redis initialization failed, continuing with memory driver', error);
          return manager;
        })
        .finally(() => {
          manager.setInitializationPromise(null);

          if (initPromise === pendingInit) {
            initPromise = null;
          }
        });

      manager.setInitializationPromise(pendingInit.then(() => undefined));
      initPromise = pendingInit;
    } else {
      instance = new CacheManager({
        driver,
        upstash: { url, token },
        defaultTtl: 3600,
      });
    }
  }

  return instance;
}

export function resetCacheManager(): void {
  instance = null;
  initPromise = null;
  configuredDriver = null;
  initializationError = null;
}
