/**
 * Cache Driver Interface
 *
 * Abstraction layer for cache storage backends.
 * Implementations: UpstashDriver, MemoryDriver, NoopDriver
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
}

export interface CacheConfig {
  /** Cache driver to use */
  driver: 'upstash' | 'memory' | 'none';
  /** Upstash credentials (required when driver=upstash) */
  upstash?: {
    url: string;
    token: string;
  };
  /** Default TTL in seconds (default: 3600) */
  defaultTtl?: number;
}

/** Default cache configuration */
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  driver: 'memory',
  defaultTtl: 3600,
};
