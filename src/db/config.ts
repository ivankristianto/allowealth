import { getEnv } from '@/lib/env';
import { createLogger } from '@/lib/logger';

// Re-export setRuntimeEnv for middleware to use
export { setRuntimeEnv } from '@/lib/env';

const log = createLogger('database');

export type DatabaseDialect = 'sqlite' | 'postgresql';

export interface DatabaseConfig {
  dialect: DatabaseDialect;
  url: string;
  isD1: boolean;
  isSupabase: boolean;
  isTransactionPooler: boolean;
  isHyperdrive: boolean;
  poolConfig?: { max: number; idleTimeout: number };
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

export function detectDialect(url: string): DatabaseDialect {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.startsWith('postgres://') || lowerUrl.startsWith('postgresql://')) {
    return 'postgresql';
  }
  return 'sqlite';
}

/**
 * Check if the URL points to a Supabase instance
 *
 * Checks for official Supabase domains rather than substring matching
 * to avoid false positives from custom hostnames containing "supabase".
 */
function isSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const supabaseDomains = ['.supabase.com', '.supabase.co', 'pooler.supabase.com'];
    return supabaseDomains.some((domain) => parsed.hostname.endsWith(domain));
  } catch {
    // If URL parsing fails, fall back to substring check
    return (
      url.toLowerCase().includes('.supabase.com') || url.toLowerCase().includes('.supabase.co')
    );
  }
}

/**
 * Detect if the URL uses the Supabase transaction pooler (port 6543)
 *
 * Transaction mode pooler (PgBouncer) doesn't support prepared statements,
 * so postgres.js must use `prepare: false` when connecting through it.
 */
function isTransactionPoolerUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.port === '6543';
  } catch {
    return url.includes(':6543');
  }
}

export function getDatabaseConfig(): DatabaseConfig {
  const isD1 = getEnv('D1_ENABLED') === 'true';

  // D1 is SQLite-compatible — no DATABASE_URL needed
  if (isD1) {
    return {
      dialect: 'sqlite',
      url: '', // D1 doesn't use a URL
      isD1,
      isSupabase: false,
      isTransactionPooler: false,
      isHyperdrive: false,
    };
  }

  const url = getDatabaseUrl();

  const dialect = detectDialect(url);
  const isHyperdrive = getEnv('HYPERDRIVE_ENABLED') === 'true';
  // Hyperdrive handles Supabase/pooler specifics — skip detection when active
  const isSupabase = !isHyperdrive && dialect === 'postgresql' && isSupabaseUrl(url);
  const isTransactionPooler =
    !isHyperdrive && dialect === 'postgresql' && isTransactionPoolerUrl(url);

  return {
    dialect,
    url,
    isD1,
    isSupabase,
    isTransactionPooler,
    isHyperdrive,
    // Cloudflare Workers: use max 1 to minimize subrequests (TCP connections).
    // Supabase pooler handles connection pooling server-side.
    poolConfig: dialect === 'postgresql' ? { max: 1, idleTimeout: 20 } : undefined,
  };
}
