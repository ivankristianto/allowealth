/**
 * Noop Cache Driver
 *
 * No-operation cache driver that does nothing.
 * Used when caching is disabled.
 */

import type { CacheDriver, CacheSetOptions } from '../types';

export class NoopDriver implements CacheDriver {
  async get<T>(_key: string): Promise<T | null> {
    return null;
  }

  async set<T>(_key: string, _value: T, _options?: CacheSetOptions): Promise<void> {
    // No-op
  }

  async delete(_key: string): Promise<void> {
    // No-op
  }

  async invalidateByTags(_tags: string[]): Promise<void> {
    // No-op
  }
}
