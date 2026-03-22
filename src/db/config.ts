import { getBinding, getEnv } from '@/lib/env';
import { createLogger } from '@/lib/logger';

const log = createLogger('database');

export type DatabaseDialect = 'sqlite';

export interface DatabaseConfig {
  dialect: DatabaseDialect;
  url: string;
  isD1: boolean;
}

/**
 * Get the DATABASE_URL via getEnv() (checks cloudflare:workers,
 * process.env, import.meta.env) with SQLite dev fallback.
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
        'Ensure the Cloudflare D1 binding is configured in wrangler.toml with binding "DB".'
    );
  }

  return 'db/.dev.db';
}

export function getDatabaseConfig(): DatabaseConfig {
  // Detect D1: check for the DB binding (workerd) or D1_ENABLED env var (CLI)
  const isD1 = getBinding('DB') != null || getEnv('D1_ENABLED') === 'true';

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
