/**
 * Redis Cache Driver
 *
 * Local/self-hosted cache driver using Bun's built-in Redis client (TCP).
 * Bun-only (uses Bun.RedisClient).
 *
 * Features:
 * - Fail-silent by default: returns null on errors instead of throwing.
 *   `strict: true` rethrows instead, for Better Auth storage.
 * - Tag-based invalidation using Redis Sets (same data model as UpstashDriver)
 * - Automatic pipelining via Promise.all
 */

import type { CacheDriver, CacheDriverOptions, CacheSetOptions } from '../types';
import { INCREMENT_WITH_TTL_SCRIPT } from './increment-script';
import { CacheBackendError, describeCacheError } from './log-error';
import { createLogger } from '@/lib/logger';

const log = createLogger('cache:redis');

export class RedisDriver implements CacheDriver {
  private redis: InstanceType<typeof Bun.RedisClient>;
  private defaultTtl: number;
  private strict: boolean;

  constructor(url: string, defaultTtl: number = 3600, options: CacheDriverOptions = {}) {
    this.redis = new Bun.RedisClient(url);
    this.defaultTtl = defaultTtl;
    this.strict = options.strict ?? false;
  }

  private fail(operation: string, error: unknown): void {
    const description = describeCacheError(error);
    log.warn(`${operation} failed:`, description);
    if (this.strict) throw new CacheBackendError(operation, description);
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      if (!raw) {
        return null;
      }

      return JSON.parse(raw) as T;
    } catch (error) {
      this.fail('Get', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
    try {
      const ttl = options?.ttl ?? this.defaultTtl;
      await this.redis.set(key, JSON.stringify(value), 'EX', ttl);

      if (options?.tags?.length) {
        const tagOperations = options.tags.flatMap((tag) => {
          const tagKey = `tag:${tag}`;
          return [
            this.redis.sadd(tagKey, key),
            this.redis.send('EXPIRE', [tagKey, String(ttl + 60), 'GT']),
          ];
        });

        await Promise.all(tagOperations);
      }
    } catch (error) {
      this.fail('Set', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      this.fail('Delete', error);
    }
  }

  async increment(key: string, ttl: number): Promise<number> {
    try {
      const value = await this.redis.send('EVAL', [
        INCREMENT_WITH_TTL_SCRIPT,
        '1',
        key,
        String(ttl),
      ]);
      return Number(value);
    } catch (error) {
      // Fail open like get/set: a cache outage must not lock users out of the app cache.
      this.fail('Increment', error);
      return 1;
    }
  }

  async getAndDelete<T>(key: string): Promise<T | null> {
    try {
      const raw = (await this.redis.send('GETDEL', [key])) as string | null;
      if (!raw) {
        return null;
      }

      return JSON.parse(raw) as T;
    } catch (error) {
      this.fail('GetAndDelete', error);
      return null;
    }
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      if (tags.length === 0) {
        return;
      }

      const results = await Promise.all(tags.map((tag) => this.redis.smembers(`tag:${tag}`)));
      const keysToDelete = [...new Set(results.flat().filter(Boolean))];
      const tagKeys = tags.map((tag) => `tag:${tag}`);
      const allKeys = [...keysToDelete, ...tagKeys];

      if (allKeys.length > 0) {
        await this.redis.del(...allKeys);
      }
    } catch (error) {
      this.fail('InvalidateByTags', error);
    }
  }
}
