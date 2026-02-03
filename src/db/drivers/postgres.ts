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
 * Detect if running in Cloudflare Workers edge environment
 */
function isEdgeRuntime(): boolean {
  return (
    typeof globalThis.caches !== 'undefined' &&
    typeof (globalThis as any).WebSocketPair !== 'undefined'
  );
}

/**
 * Create a PostgreSQL connection using postgres.js
 *
 * IMPORTANT: In Cloudflare Workers, connections cannot be shared between requests.
 * Each request must create its own connection due to I/O context isolation.
 *
 * For non-edge environments (Node.js, Bun), uses singleton pattern to prevent
 * connection leaks.
 *
 * @param url - PostgreSQL connection URL
 * @returns postgres.js client instance
 */
export function createPostgresDriver(url: string): ReturnType<typeof postgres> {
  const isEdge = isEdgeRuntime();

  // In Cloudflare Workers, MUST create fresh connection per request
  // Singleton pattern causes "Cannot perform I/O on behalf of a different request" error
  if (isEdge) {
    return postgres(url, {
      max: 1,
      idle_timeout: 20,
      ssl: false, // SSL causes "too many subrequests" in Workers
      connect_timeout: 10,
    });
  }

  // Non-edge: use singleton pattern to prevent connection leaks
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
    max: config.poolConfig?.max ?? 10,
    idle_timeout: config.poolConfig?.idleTimeout ?? 30,
    ssl: getSslConfig(config.isSupabase),
    connect_timeout: 30,
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
 * Close the PostgreSQL connection pool
 *
 * Should be called when shutting down the application
 * to properly release database connections.
 */
export async function closePostgres(): Promise<void> {
  if (client) {
    await client.end();
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
