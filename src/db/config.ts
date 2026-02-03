export type DatabaseDialect = 'sqlite' | 'postgresql';

export interface DatabaseConfig {
  dialect: DatabaseDialect;
  url: string;
  isSupabase: boolean;
  poolConfig?: { max: number; idleTimeout: number };
}

/**
 * Runtime environment holder for Cloudflare Workers
 *
 * In Cloudflare Workers, secrets are only accessible via request context
 * (Astro.locals.runtime.env), not via import.meta.env at module load time.
 * This holder allows middleware to set the runtime env on first request.
 */
let runtimeEnv: Record<string, string | undefined> | null = null;

/**
 * Set the runtime environment (call from middleware on first request)
 *
 * This is needed for Cloudflare Workers where secrets are passed via
 * the runtime context, not available at module initialization.
 */
export function setRuntimeEnv(env: Record<string, string | undefined>): void {
  if (!runtimeEnv) {
    runtimeEnv = env;
  }
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
  // Check runtime env first (Cloudflare Workers)
  if (runtimeEnv?.DATABASE_URL) {
    return runtimeEnv.DATABASE_URL;
  }

  // Check import.meta.env (Node.js/Bun build-time vars)
  if (import.meta.env.DATABASE_URL) {
    return import.meta.env.DATABASE_URL;
  }

  // Log warning if we're falling back to SQLite in a non-dev environment
  if (import.meta.env.PROD) {
    console.error(
      '[DATABASE] WARNING: DATABASE_URL not found in runtime env or import.meta.env. ' +
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

export function getDatabaseConfig(): DatabaseConfig {
  const url = getDatabaseUrl();
  const dialect = detectDialect(url);
  return {
    dialect,
    url,
    isSupabase: dialect === 'postgresql' && isSupabaseUrl(url),
    // P2: TODO - Make pool settings configurable via DATABASE_POOL_MAX and DATABASE_IDLE_TIMEOUT env vars
    poolConfig: dialect === 'postgresql' ? { max: 10, idleTimeout: 30 } : undefined,
  };
}
