import { describe, it, expect } from 'bun:test';
import type { CacheSetOptions, CacheConfig } from './types';
import { DEFAULT_CACHE_CONFIG } from './types';

describe('Cache Types', () => {
  it('should have correct default config', () => {
    expect(DEFAULT_CACHE_CONFIG.driver).toBe('memory');
    expect(DEFAULT_CACHE_CONFIG.defaultTtl).toBe(3600);
  });

  it('should allow valid CacheConfig', () => {
    const config: CacheConfig = {
      driver: 'upstash',
      upstash: {
        url: 'https://example.upstash.io',
        token: 'test-token',
      },
      defaultTtl: 1800,
    };
    expect(config.driver).toBe('upstash');
  });

  it('should allow valid CacheSetOptions', () => {
    const options: CacheSetOptions = {
      ttl: 300,
      tags: ['workspace:123', 'budget'],
    };
    expect(options.ttl).toBe(300);
    expect(options.tags).toHaveLength(2);
  });
});
