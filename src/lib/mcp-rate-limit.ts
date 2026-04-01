import { Redis } from '@upstash/redis';

import { simpleHash } from '@/lib/cache';
import { getEnv } from '@/lib/env';
import { checkRateLimitByKey, type RateLimitResult } from '@/lib/rate-limit';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;
const ENDPOINT_ID = 'api-mcp';
const UPSTASH_TTL_SECONDS = 120;

export interface McpRateLimitDeps {
  now?: () => number;
  hash?: (value: string) => string;
  checkByKey?: (key: string, config: { maxRequests: number; windowMs: number }) => RateLimitResult;
  redis?: {
    incr: (key: string) => Promise<number>;
    expire: (key: string, seconds: number) => Promise<unknown>;
  };
  env?: (key: string) => string | undefined;
}

function getRedisClient(deps: McpRateLimitDeps): McpRateLimitDeps['redis'] | null {
  if (deps.redis) {
    return deps.redis;
  }

  const env = deps.env ?? getEnv;
  if (env('NODE_ENV') !== 'production') {
    return null;
  }

  const url = env('UPSTASH_REDIS_REST_URL');
  const token = env('UPSTASH_REDIS_REST_TOKEN');

  if (!url || !token) {
    return null;
  }

  return new Redis({ url, token });
}

export function buildMcpRateLimitKey(token: string, deps: McpRateLimitDeps = {}): string {
  const now = deps.now?.() ?? Date.now();
  const hash = deps.hash ?? simpleHash;
  const windowEpochMinute = Math.floor(now / WINDOW_MS);
  return `mcp:ratelimit:${hash(token)}:${ENDPOINT_ID}:${windowEpochMinute}`;
}

export async function checkMcpRateLimit(
  token: string,
  deps: McpRateLimitDeps = {}
): Promise<RateLimitResult> {
  const now = deps.now?.() ?? Date.now();
  const windowEpochMinute = Math.floor(now / WINDOW_MS);
  const key = buildMcpRateLimitKey(token, { ...deps, now: () => now });
  const resetTime = Math.floor(((windowEpochMinute + 1) * WINDOW_MS) / 1000);
  const redis = getRedisClient(deps);
  const checkByKey = deps.checkByKey ?? checkRateLimitByKey;

  if (redis) {
    try {
      const currentCount = await redis.incr(key);
      if (currentCount === 1) {
        await redis.expire(key, UPSTASH_TTL_SECONDS);
      }

      const remaining = Math.max(0, MAX_REQUESTS - currentCount);
      return {
        allowed: currentCount <= MAX_REQUESTS,
        remaining,
        limit: MAX_REQUESTS,
        resetTime,
        retryAfter:
          currentCount <= MAX_REQUESTS
            ? 0
            : Math.max(1, Math.ceil((resetTime * 1000 - now) / 1000)),
      };
    } catch {
      return checkByKey(key, {
        maxRequests: MAX_REQUESTS,
        windowMs: WINDOW_MS,
      });
    }
  }

  return checkByKey(key, {
    maxRequests: MAX_REQUESTS,
    windowMs: WINDOW_MS,
  });
}
