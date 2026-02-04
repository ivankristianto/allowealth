/**
 * Upstash Redis Cache Driver
 *
 * Production cache driver using Upstash Redis with REST API.
 * Works in all environments including Cloudflare Workers.
 *
 * Features:
 * - Fail-silent: Returns null on errors instead of throwing
 * - Tag-based invalidation using Redis Sets
 */

import { Redis } from '@upstash/redis';
import type { CacheDriver, CacheSetOptions } from '../types';
import { createLogger } from '@/lib/logger';

const log = createLogger('cache:upstash');

export class UpstashDriver implements CacheDriver {
  private redis: Redis;
  private defaultTtl: number;

  constructor(url: string, token: string, defaultTtl: number = 3600) {
    this.redis = new Redis({ url, token });
    this.defaultTtl = defaultTtl;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get<T>(key);
      return value ?? null;
    } catch (error) {
      log.warn('Get failed:', key, error);
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
      log.warn('InvalidateByTags failed:', tags, error);
    }
  }
}
