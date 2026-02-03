/**
 * Memory Cache Driver
 *
 * In-memory cache implementation for development and testing.
 */

import type { CacheDriver, CacheSetOptions } from '../types';

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryDriver implements CacheDriver {
  private store = new Map<string, CacheEntry<unknown>>();
  private tags = new Map<string, Set<string>>();
  private defaultTtl: number;

  constructor(defaultTtl: number = 3600) {
    this.defaultTtl = defaultTtl;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      this.removeKeyFromTags(key);
      return null;
    }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, options?: CacheSetOptions): Promise<void> {
    const ttlSeconds = options?.ttl ?? this.defaultTtl;
    const ttlMs = ttlSeconds * 1000;
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
    if (options?.tags?.length) {
      for (const tag of options.tags) {
        if (!this.tags.has(tag)) this.tags.set(tag, new Set());
        this.tags.get(tag)!.add(key);
      }
    }
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
    this.removeKeyFromTags(key);
  }

  async invalidateByTags(tags: string[]): Promise<void> {
    const keysToDelete = new Set<string>();
    for (const tag of tags) {
      const keys = this.tags.get(tag);
      if (keys) {
        for (const key of keys) keysToDelete.add(key);
        this.tags.delete(tag);
      }
    }
    for (const key of keysToDelete) {
      this.store.delete(key);
      this.removeKeyFromTags(key);
    }
  }

  clear(): void {
    this.store.clear();
    this.tags.clear();
  }

  getStats(): { size: number; tagCount: number } {
    return { size: this.store.size, tagCount: this.tags.size };
  }

  private removeKeyFromTags(key: string): void {
    for (const [tag, keys] of this.tags.entries()) {
      keys.delete(key);
      if (keys.size === 0) this.tags.delete(tag);
    }
  }
}
