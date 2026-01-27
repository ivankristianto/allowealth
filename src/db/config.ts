export type DatabaseDialect = 'sqlite' | 'postgresql';

export interface DatabaseConfig {
  dialect: DatabaseDialect;
  url: string;
  isSupabase: boolean;
  poolConfig?: { max: number; idleTimeout: number };
}

export function detectDialect(url: string): DatabaseDialect {
  if (url.startsWith('postgres://') || url.startsWith('postgresql://')) {
    return 'postgresql';
  }
  return 'sqlite';
}

export function getDatabaseConfig(): DatabaseConfig {
  const url = process.env.DATABASE_URL || 'db/.dev.db';
  const dialect = detectDialect(url);
  return {
    dialect,
    url,
    // P3: TODO - Use explicit DATABASE_PROVIDER env var or check for .supabase.com/.supabase.co domains
    isSupabase: dialect === 'postgresql' && url.includes('supabase'),
    // P2: TODO - Make pool settings configurable via DATABASE_POOL_MAX and DATABASE_IDLE_TIMEOUT env vars
    poolConfig: dialect === 'postgresql' ? { max: 10, idleTimeout: 30 } : undefined,
  };
}
