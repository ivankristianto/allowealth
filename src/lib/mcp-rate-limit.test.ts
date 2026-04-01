import { describe, expect, it, beforeEach } from 'bun:test';

import { clearRateLimitStore } from '@/lib/rate-limit';
import { buildMcpRateLimitKey, checkMcpRateLimit } from './mcp-rate-limit';

describe('mcp-rate-limit', () => {
  beforeEach(() => {
    clearRateLimitStore();
  });

  it('builds a stable per-token per-minute key', () => {
    expect(
      buildMcpRateLimitKey('token-1', {
        now: () => 120_000,
        hash: (value) => `hash:${value}`,
      })
    ).toBe('mcp:ratelimit:hash:token-1:api-mcp:2');
  });

  it('blocks requests after 60 calls in the same minute', async () => {
    for (let i = 0; i < 60; i++) {
      const result = await checkMcpRateLimit('token-1', {
        now: () => 120_000,
      });

      expect(result).toMatchObject({ allowed: true });
    }

    const blocked = await checkMcpRateLimit('token-1', {
      now: () => 120_000,
    });

    expect(blocked).toMatchObject({
      allowed: false,
      limit: 60,
      remaining: 0,
    });
  });

  it('uses Upstash-style shared counters when redis is configured', async () => {
    let counter = 0;
    const expire = jestLikeNoop;

    const result = await checkMcpRateLimit('token-1', {
      now: () => 120_000,
      redis: {
        incr: async () => ++counter,
        expire,
      },
    });

    expect(result.allowed).toBe(true);
    expect(counter).toBe(1);
  });

  it('aligns redis reset headers to the current fixed window boundary', async () => {
    const result = await checkMcpRateLimit('token-1', {
      now: () => 179_999,
      redis: {
        incr: async () => 61,
        expire: jestLikeNoop,
      },
    });

    expect(result).toMatchObject({
      allowed: false,
      limit: 60,
      remaining: 0,
      resetTime: 180,
      retryAfter: 1,
    });
  });

  it('falls back to the in-memory limiter when redis fails', async () => {
    const result = await checkMcpRateLimit('token-1', {
      now: () => 120_000,
      redis: {
        incr: async () => {
          throw new Error('upstash unavailable');
        },
        expire: jestLikeNoop,
      },
      checkByKey: (key, config) => ({
        allowed: true,
        remaining: config.maxRequests - 1,
        limit: config.maxRequests,
        resetTime: key.includes('api-mcp') ? 121 : 0,
        retryAfter: 0,
      }),
    });

    expect(result).toMatchObject({
      allowed: true,
      remaining: 59,
      limit: 60,
      resetTime: 121,
      retryAfter: 0,
    });
  });

  it('keeps local dev and test on in-memory limiting even with Upstash env vars', async () => {
    const result = await checkMcpRateLimit('token-1', {
      now: () => 120_000,
      env: (key) => {
        if (key === 'NODE_ENV') return 'test';
        if (key === 'UPSTASH_REDIS_REST_URL') return 'https://example.upstash.io';
        if (key === 'UPSTASH_REDIS_REST_TOKEN') return 'token';
        return undefined;
      },
    });

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(60);
  });
});

const jestLikeNoop = async () => undefined;
