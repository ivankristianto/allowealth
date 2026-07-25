import { getEnv } from '@/lib/env';
import { createLogger } from '@/lib/logger';

const log = createLogger('database');

export type DatabaseDialect = 'sqlite';

export interface DatabaseConfig {
  dialect: DatabaseDialect;
  url: string;
}

/**
 * Get the DATABASE_URL via getEnv() (checks process.env, import.meta.env)
 * with SQLite dev fallback.
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
        'Falling back to the local SQLite dev database.'
    );
  }

  return 'db/.dev.db';
}

export function getDatabaseConfig(): DatabaseConfig {
  return {
    dialect: 'sqlite',
    url: getDatabaseUrl(),
  };
}
