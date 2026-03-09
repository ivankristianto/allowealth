import { getEnv } from '@/lib/env';
import { createLogger } from '@/lib/logger';

// Re-export setRuntimeEnv for middleware to use
export { setRuntimeEnv } from '@/lib/env';

const log = createLogger('database');

export type DatabaseDialect = 'sqlite';

export interface DatabaseConfig {
  dialect: DatabaseDialect;
  url: string;
  isD1: boolean;
}

/**
 * Get the DATABASE_URL from available sources
 *
 * Priority:
 * 1. Runtime env (Cloudflare Workers secrets)
 * 2. import.meta.env (build-time env vars)
 * 3. Fallback to SQLite dev database
 */
function getDatabaseUrl(): string {
  const url = getEnv('DATABASE_URL');

  if (url) {
    return url;
  }

  // Log warning if we're falling back to SQLite in a non-dev environment
  if (import.meta.env.PROD) {
    log.warn(
      'DATABASE_URL not found in runtime env or import.meta.env. ' +
        'Falling back to SQLite which will fail in Cloudflare Workers. ' +
        'Ensure DATABASE_URL secret is set via: wrangler secret put DATABASE_URL'
    );
  }

  return 'db/.dev.db';
}

export function getDatabaseConfig(): DatabaseConfig {
  const isD1 = getEnv('D1_ENABLED') === 'true';

  if (isD1) {
    return {
      dialect: 'sqlite',
      url: '',
      isD1,
    };
  }

  return {
    dialect: 'sqlite',
    url: getDatabaseUrl(),
    isD1: false,
  };
}
