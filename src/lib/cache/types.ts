/**
 * Cache Driver Interface
 *
 * Abstraction layer for cache storage backends.
 * Implementations: UpstashDriver, RedisDriver, MemoryDriver, NoopDriver
 */

export interface CacheSetOptions {
  /** Time-to-live in seconds (default: 3600) */
  ttl?: number;
  /** Tags for bulk invalidation */
  tags?: string[];
}

export interface CacheDriver {
  /** Get value by key, returns null if miss or expired */
  get<T>(key: string): Promise<T | null>;

  /** Set value with optional TTL (seconds) and tags */
  set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void>;

  /** Delete a specific key */
  delete(key: string): Promise<void>;

  /** Delete all keys with any of the given tags */
  invalidateByTags(tags: string[]): Promise<void>;

  /**
   * Atomically increment the counter at `key` and return the new value.
   * The TTL (seconds) is applied only when the key is created, so the counter
   * expires a fixed window after its first increment.
   */
  increment(key: string, ttl: number): Promise<number>;

  /** Atomically read and delete a key, returns null if missing */
  getAndDelete<T>(key: string): Promise<T | null>;
}

export interface CacheConfig {
  /** Cache driver to use */
  driver: 'upstash' | 'redis' | 'memory' | 'none';
  /** Upstash credentials (required when driver=upstash) */
  upstash?: {
    url: string;
    token: string;
  };
  /** Redis connection (required when driver=redis) */
  redis?: {
    url: string;
  };
  /** Default TTL in seconds (default: 3600) */
  defaultTtl?: number;
}

/** Default cache configuration */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  driver: 'memory',
  defaultTtl: 3600,
};
