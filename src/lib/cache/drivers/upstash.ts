/**
 * Upstash Redis Cache Driver
 *
 * Production cache driver using Upstash Redis with REST API.
 * Talks HTTP, so it needs no TCP connection to Redis.
 *
 * Features:
 * - Fail-silent by default: returns null on errors instead of throwing.
 *   `strict: true` rethrows instead, for Better Auth storage.
 * - Tag-based invalidation using Redis Sets
 */

import { Redis } from '@upstash/redis';
import type { CacheDriver, CacheDriverOptions, CacheSetOptions } from '../types';
import { INCREMENT_WITH_TTL_SCRIPT } from './increment-script';
import { CacheBackendError, describeCacheError } from './log-error';
import { createLogger } from '@/lib/logger';

const log = createLogger('cache:upstash');

export class UpstashDriver implements CacheDriver {
  private redis: Redis;
  private defaultTtl: number;
  private strict: boolean;

  constructor(
    url: string,
    token: string,
    defaultTtl: number = 3600,
    options: CacheDriverOptions = {}
  ) {
    this.redis = new Redis({ url, token });
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
      const value = await this.redis.get<T>(key);
      return value ?? null;
    } catch (error) {
      this.fail('Get', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
    try {
      const ttl = options?.ttl ?? this.defaultTtl;
      await this.redis.set(key, value, { ex: ttl });

      if (options?.tags?.length) {
        const pipeline = this.redis.pipeline();
        for (const tag of options.tags) {
          const tagKey = `tag:${tag}`;
          pipeline.sadd(tagKey, key);
          pipeline.expire(tagKey, ttl + 60, 'GT');
        }
        await pipeline.exec();
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
      const value = await this.redis.eval<string[], number>(
        INCREMENT_WITH_TTL_SCRIPT,
        [key],
        [String(ttl)]
      );
      return Number(value);
    } catch (error) {
      // Fail open like get/set: a cache outage must not lock users out of the app cache.
      this.fail('Increment', error);
      return 1;
    }
  }

  async getAndDelete<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.getdel<T>(key);
      return value ?? null;
    } catch (error) {
      this.fail('GetAndDelete', error);
      return null;
    }
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      if (tags.length === 0) return;

      const pipeline = this.redis.pipeline();
      for (const tag of tags) {
        pipeline.smembers(`tag:${tag}`);
      }
      const results = await pipeline.exec<string[][]>();

      const keysToDelete = [...new Set(results.flat().filter(Boolean))];
      const tagKeys = tags.map((t) => `tag:${t}`);

      if (keysToDelete.length > 0 || tagKeys.length > 0) {
        await this.redis.del(...keysToDelete, ...tagKeys);
      }
    } catch (error) {
      this.fail('InvalidateByTags', error);
    }
  }
}
