/**
 * PostgreSQL Driver
 *
 * Database driver implementation using postgres.js for PostgreSQL/Supabase.
 * This driver is used for staging and production environments.
 *
 * Features:
 * - Connection pooling
 * - SSL enabled by default (disabled only in development)
 * - Automatic reconnection
 *
 * @see https://github.com/porsager/postgres
 */

import postgres from 'postgres';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { getDatabaseConfig } from '../config';

// Singleton client instance - prevents multiple pool creation
let client: ReturnType<typeof postgres> | null = null;
let clientUrl: string | null = null;

/**
 * Determine SSL configuration for PostgreSQL connection
 *
 * SSL is enabled by default for security. Only disabled when:
 * - Running in development mode AND
 * - Not connecting to Supabase
 *
 * @param isSupabase - Whether connecting to Supabase
 * @returns SSL configuration for postgres.js
 */
function getSslConfig(isSupabase: boolean): boolean | 'require' {
  // Always require SSL for Supabase
  if (isSupabase) {
    return 'require';
  }

  // Only disable SSL in development for local PostgreSQL
  if (import.meta.env.MODE === 'development') {
    // P3: TODO - Consider using DATABASE_SSL env var for explicit opt-out
    return false;
  }

  // Default: require SSL in production
  return 'require';
}

/**
 * Create a PostgreSQL connection using postgres.js
 *
 * In Cloudflare Workers, the database middleware resets this per request
 * (I/O objects are bound to the request that created them).
 *
 * @param url - PostgreSQL connection URL
 * @returns postgres.js client instance
 */
export function createPostgresDriver(url: string): ReturnType<typeof postgres> {
  // Return cached client if URL matches
  if (client && clientUrl === url) {
    return client;
  }

  // Close existing client if URL changed
  if (client && clientUrl !== url) {
    client.end().catch((error) => {
      console.error('[PostgreSQL] Error closing existing connection during URL switch:', error);
    });
  }

  const config = getDatabaseConfig();

  client = postgres(url, {
    max: config.poolConfig?.max ?? 1,
    idle_timeout: config.poolConfig?.idleTimeout ?? 20,
    ssl: getSslConfig(config.isSupabase),
    connect_timeout: 30,
    // Supabase transaction pooler (port 6543) uses PgBouncer in transaction mode,
    // which doesn't support prepared statements across connections.
    prepare: !config.isTransactionPooler,
    // Disable type catalog query to reduce subrequests in Cloudflare Workers.
    // postgres.js queries pg_type on first connection by default.
    fetch_types: false,
  });
  clientUrl = url;

  return client;
}

/**
 * Create a Drizzle ORM database instance for PostgreSQL
 *
 * @param url - PostgreSQL connection URL
 * @param schema - Drizzle schema object
 * @returns Drizzle database instance
 */
export function createPostgresDatabase<T extends Record<string, unknown>>(
  url: string,
  schema: T
): PostgresJsDatabase<T> {
  const postgresClient = createPostgresDriver(url);
  return drizzle(postgresClient, { schema });
}

/**
 * Reset the PostgreSQL client singleton without closing
 *
 * In Cloudflare Workers, I/O objects (TCP sockets) are bound to the request
 * context that created them. Reusing a connection from a previous request throws:
 * "Cannot perform I/O on behalf of a different request"
 *
 * This function discards the stale reference so the next access creates
 * a fresh connection in the current request's I/O context.
 * The old socket is cleaned up by the Workers runtime when the previous
 * request context is garbage collected.
 */
export function resetPostgresClient(): void {
  client = null;
  clientUrl = null;
}

/**
 * Close the PostgreSQL connection pool
 *
 * Should be called when shutting down the application or at the end
 * of a request in Cloudflare Workers to properly release connections.
 */
export async function closePostgres(): Promise<void> {
  if (client) {
    try {
      await client.end();
    } catch {
      // In Workers, the socket may already be invalidated — ignore close errors
    }
    client = null;
    clientUrl = null;
  }
}

/**
 * Get the current PostgreSQL client instance
 *
 * @returns The postgres.js client or null if not initialized
 */
export function getPostgresClient(): ReturnType<typeof postgres> | null {
  return client;
}
