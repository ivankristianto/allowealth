/**
 * Redis Cache Driver
 *
 * Local/self-hosted cache driver using Bun's built-in Redis client (TCP).
 * Bun-only - not compatible with Cloudflare Workers (use UpstashDriver instead).
 *
 * Features:
 * - Fail-silent: Returns null on errors instead of throwing
 * - Tag-based invalidation using Redis Sets (same data model as UpstashDriver)
 * - Automatic pipelining via Promise.all
 */

import type { CacheDriver, CacheSetOptions } from '../types';
import { createLogger } from '@/lib/logger';

const log = createLogger('cache:redis');

export class RedisDriver implements CacheDriver {
  private redis: InstanceType<typeof Bun.RedisClient>;
  private defaultTtl: number;

  constructor(url: string, defaultTtl: number = 3600) {
    this.redis = new Bun.RedisClient(url);
    this.defaultTtl = defaultTtl;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);
      if (!raw) {
        return null;
      }

      return JSON.parse(raw) as T;
    } catch (error) {
      log.warn('Get failed:', key, error);
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
      log.warn('Set failed:', key, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      log.warn('Delete failed:', key, error);
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
      log.warn('InvalidateByTags failed:', tags, error);
    }
  }
}
