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
