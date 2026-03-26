import { afterEach, describe, expect, it } from 'bun:test';
import { resetCacheManager } from '@/lib/cache';
import { setTestEnv } from '@/lib/env';
import { DiagnosticsService } from './diagnostics.service';

const mockDb = {
  query: {
    users: {
      findFirst: async () => null,
      findMany: async () => [],
    },
  },
} as any;

describe('DiagnosticsService environment variables', () => {
  afterEach(() => {
    setTestEnv(null);
    resetCacheManager();
  });

  it('returns only insensitive environment variables in diagnostics output', () => {
    setTestEnv({
      NODE_ENV: 'development',
      DATABASE_URL: 'db/.dev.db',
      CACHE_DRIVER: 'memory',
      UPSTASH_REDIS_REST_URL: 'https://example.upstash.io',
      PUBLIC_URL: 'https://app.allowealth.test',
      DEV_HOST: 'local.allowealth.test',
      BETTER_AUTH_SECRET: 'super-secret-value',
      PUBLIC_TURNSTILE_SITE_KEY: 'turnstile-public-key',
      TURNSTILE_SECRET_KEY: 'turnstile-secret-key',
      EMAIL_MODE: 'console',
      LOG_LEVEL: 'debug',
      PERF_DEBUG: 'false',
    });

    const service = new DiagnosticsService(mockDb);
    const envVars = service.getEnvironmentVariables();

    expect(envVars.map((envVar) => envVar.name)).toEqual([
      'NODE_ENV',
      'CACHE_DRIVER',
      'PUBLIC_URL',
      'DEV_HOST',
      'EMAIL_MODE',
      'LOG_LEVEL',
      'PERF_DEBUG',
    ]);
    expect(envVars.every((envVar) => envVar.isSensitive === false)).toBe(true);
  });

  it('reports redis cache details when redis driver is configured', async () => {
    setTestEnv({
      NODE_ENV: 'development',
      CACHE_DRIVER: 'redis',
      REDIS_URL: 'redis://:changeme@localhost:6379',
    });

    const service = new DiagnosticsService(mockDb);
    const cacheInfo = await service.getCacheInfo();

    expect(cacheInfo.driver).toBe('redis');
    expect(cacheInfo.redisConfig?.url).toBe('redis://:***@localhost:6379');
  });
});
