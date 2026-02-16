/**
 * Database connection configuration
 *
 * Provides a database abstraction layer supporting SQLite, PostgreSQL, and D1 dialects.
 *
 * SQLite:
 * - Uses bun:sqlite with drizzle-orm/bun-sqlite (local development)
 *
 * PostgreSQL:
 * - Uses postgres.js with drizzle-orm/postgres-js
 * - Supports Supabase with automatic SSL configuration
 *
 * Cloudflare D1:
 * - Uses D1 binding with drizzle-orm/d1 (Cloudflare Workers)
 * - SQLite-compatible, no connection management needed
 *
 * The driver is selected automatically based on configuration:
 * - D1_ENABLED=true → D1 binding (Cloudflare Workers)
 * - postgres:// or postgresql:// → PostgreSQL
 * - Otherwise → SQLite
 *
 * @see https://bun.sh/docs/api/sqlite
 * @see https://github.com/porsager/postgres
 * @see https://developers.cloudflare.com/d1/
 */
import { createRequire } from 'node:module';
import { getDatabaseConfig } from './config';
import type { DatabaseDriver } from './driver';
import { createBunDriver } from './drivers/bun';
import { createD1Database, getD1Binding } from './drivers/d1';
import { createPostgresDatabase, closePostgres, resetPostgresClient } from './drivers/postgres';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

// Import schemas for type inference (SQLite schema is structurally compatible)
import * as sqliteSchema from './schema/sqlite';
import * as pgSchema from './schema/postgresql';

// Re-export schema (uses SQLite schema for types, runtime selects correct dialect)
export * from './schema';

/**
 * Get the active schema based on current database dialect
 *
 * This function returns the correct schema tables for the current database connection.
 * Use this when you need runtime schema selection (e.g., in services that may connect
 * to either SQLite or PostgreSQL).
 *
 * @returns The schema object for the current database dialect
 */
export function getActiveSchema(): typeof sqliteSchema | typeof pgSchema {
  const config = getDatabaseConfig();
  return config.dialect === 'postgresql' ? pgSchema : sqliteSchema;
}

// Re-export driver types for dependency injection
export type { DatabaseDriver, PreparedStatement, RunResult } from './driver';

// Re-export config utilities
export { getDatabaseConfig, detectDialect } from './config';
export type { DatabaseConfig, DatabaseDialect } from './config';

/**
 * Database type for type inference
 *
 * Uses SQLite database type for compile-time type checking since:
 * 1. Both SQLite and PostgreSQL schemas are structurally compatible
 * 2. Union types cause method signature incompatibilities in TypeScript
 * 3. Runtime correctly selects the appropriate driver based on DATABASE_URL
 *
 * This approach provides correct IntelliSense and type checking while
 * allowing runtime flexibility between database dialects.
 */
export type Database = BunSQLiteDatabase<typeof sqliteSchema>;

/**
 * PostgreSQL database type (for internal use when dialect is known)
 * @internal
 */
export type PostgresDatabase = PostgresJsDatabase<typeof sqliteSchema>;

/**
 * Database interface for dependency injection
 *
 * This interface abstracts the database implementation, allowing services
 * to work with either real database connections or mock implementations in tests.
 *
 * The interface includes:
 * - insert: Insert records into tables
 * - query: Query tables with relations
 * - update: Update records in tables
 * - select: Raw select queries
 * - delete: Delete records from tables
 * - transaction: Execute transactions
 *
 * @example
 * ```ts
 * // In production
 * const service = new CategoryService(db);
 *
 * // In tests
 * const mockDb = createMockDatabase();
 * const service = new CategoryService(mockDb);
 * ```
 */
export interface IDatabase {
  /**
   * Insert records into a table
   */
  insert: (table: any) => {
    values: (values: any) => Promise<any> & {
      returning: (columns?: any) => Promise<any[]>;
      onConflictDoNothing: () => Promise<any>;
      onConflictDoUpdate: (config: any) => Promise<any>;
    };
  };

  /**
   * Query builder for table operations
   */
  query: {
    [key: string]: {
      findFirst: (config?: any) => Promise<any>;
      findMany: (config?: any) => Promise<any[]>;
    };
  };

  /**
   * Update records in a table
   */
  update: (table: any) => {
    set: (values: any) => {
      where: (condition: any) => Promise<any>;
      returning: (columns?: any) => Promise<any[]>;
    };
  };

  /**
   * Raw select queries
   */
  select: (columns: any) => {
    from: (table: any) => {
      where: (condition: any) => {
        groupBy: (column: any) => Promise<any[]>;
        orderBy: (config: any) => Promise<any[]>;
      };
      groupBy: (column: any) => {
        where: (condition: any) => Promise<any[]>;
      };
    };
  };

  /**
   * Delete records from a table
   */
  delete: (table: any) => {
    where: (condition: any) => Promise<any>;
  };

  /**
   * Execute a transaction
   */
  transaction: <T>(callback: (tx: any) => Promise<T>) => Promise<T>;
}

/**
 * Run an async callback transactionally across dialects.
 *
 * - **PostgreSQL**: Uses a real database transaction (BEGIN/COMMIT/ROLLBACK).
 * - **SQLite**: Runs the callback directly against `db` without a transaction
 *   wrapper. SQLite's WAL mode with single-writer guarantees sequential writes
 *   within a single connection are effectively atomic for server request scope.
 *
 * @param db - Database instance
 * @param callback - Async function receiving a transaction-capable db handle
 * @returns The callback's return value
 */
export async function runTransaction<T>(
  db: IDatabase,
  callback: (tx: IDatabase) => Promise<T>
): Promise<T> {
  const config = getDatabaseConfig();
  // PostgreSQL and D1 support async transactions
  if (config.dialect === 'postgresql' || config.isD1) {
    return db.transaction(callback);
  }
  // Local SQLite: run directly — single-writer WAL mode ensures sequential consistency
  return callback(db);
}

/**
 * Performance optimizations for SQLite
 */
const PRAGMA_STATEMENTS = [
  'PRAGMA journal_mode = WAL;',
  'PRAGMA synchronous = NORMAL;',
  'PRAGMA cache_size = -64000;', // 64MB cache
  'PRAGMA foreign_keys = ON;',
];

/**
 * Apply SQLite performance optimizations
 */
function applyPragmas(driver: DatabaseDriver): void {
  PRAGMA_STATEMENTS.forEach((sql) => driver.exec(sql));
}

/**
 * Get a require function for loading npm packages at runtime
 *
 * Used for drizzle-orm dialect packages which must be loaded dynamically
 * to avoid bundling both SQLite and PostgreSQL drivers together.
 * npm packages resolve correctly from built output via node_modules/ walking.
 *
 * Note: Local driver files (./drivers/bun) use static imports instead,
 * as createRequire cannot resolve them from Vite's built output directory.
 */
function getRequire() {
  return createRequire(import.meta.url);
}

/**
 * Create the Drizzle database instance
 *
 * Automatically selects the correct driver based on configuration:
 * - D1_ENABLED=true → D1 binding via drizzle-orm/d1 (Cloudflare Workers)
 * - PostgreSQL URLs → postgres.js driver
 * - SQLite paths → bun:sqlite driver (via static import, bun:sqlite externalized)
 *
 * @throws Error if database connection fails
 */
function createDatabase(): Database {
  const config = getDatabaseConfig();
  let driver: (DatabaseDriver & { _raw: unknown }) | null = null;

  try {
    // D1 path - Cloudflare Workers with D1 binding
    if (config.isD1) {
      const d1Binding = getD1Binding();
      if (!d1Binding) {
        throw new Error(
          'D1_ENABLED is set but D1 binding is not available. ' +
            'Ensure D1 binding is configured in wrangler.toml'
        );
      }
      return createD1Database(d1Binding, sqliteSchema) as unknown as Database;
    }

    // PostgreSQL path - used in production (Cloudflare Workers with PostgreSQL)
    if (config.dialect === 'postgresql') {
      return createPostgresDatabase(config.url, pgSchema) as unknown as Database;
    }

    // SQLite path - uses bun:sqlite via Bun runtime
    // createBunDriver is statically imported so Vite bundles it correctly.
    // bun:sqlite is externalized in astro.config.ts so it remains a runtime require.
    driver = createBunDriver(config.url);
    const dynamicRequire = getRequire();
    const { drizzle } = dynamicRequire('drizzle-orm/bun-sqlite');

    applyPragmas(driver);
    return drizzle(driver._raw, { schema: sqliteSchema });
  } catch (error) {
    if (driver) {
      try {
        driver.close();
      } catch {
        // ignore cleanup errors
      }
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to create database connection (dialect: ${config.dialect}): ${message}`
    );
  }
}

/**
 * Singleton database instance
 *
 * WARNING: In Cloudflare Workers, module-level state persists across requests
 * within the same isolate, but I/O objects (TCP sockets) are bound to the
 * request context that created them. The database middleware must reset this
 * at the start of each request to avoid "Cannot perform I/O on behalf of
 * a different request" errors.
 */
let dbInstance: Database | null = null;

/**
 * Flag to prevent new connections during close
 */
let isClosing = false;

/**
 * Get the database instance
 *
 * Uses singleton pattern within a request. In Cloudflare Workers, the
 * database middleware calls prepareForRequest() at the start of each
 * request to ensure a fresh connection in the current I/O context.
 *
 * @throws Error if database is being closed
 */
export function getDb(): Database {
  if (isClosing) {
    throw new Error('Database is being closed. Cannot acquire new connection.');
  }

  if (!dbInstance) {
    dbInstance = createDatabase();
  }
  return dbInstance;
}

/**
 * Reset the database singleton
 *
 * This is primarily useful for tests that need to switch between
 * different database instances (e.g., test vs development database).
 *
 * After calling this function, the next call to getDb() or accessing
 * the `db` export will create a fresh database instance.
 *
 * @internal
 */
export function resetDb(): void {
  dbInstance = null;
}

/**
 * Prepare database for a new request (Cloudflare Workers)
 *
 * Discards stale connection references from previous requests.
 * Must be called at the start of each request before any DB access.
 *
 * In Workers, I/O objects (TCP sockets) are bound to the request that
 * created them. Reusing a connection from a prior request throws:
 * "Cannot perform I/O on behalf of a different request"
 */
export function prepareForRequest(): void {
  resetPostgresClient();
  dbInstance = null;
  isClosing = false;
}

/**
 * Close database connections
 *
 * Should be called when shutting down the application to properly
 * release database connections. This is especially important for
 * PostgreSQL which uses connection pooling.
 *
 * For SQLite, this is a no-op as connections are file-based.
 *
 * @returns Promise that resolves when the database is closed
 */
export async function closeDatabase(): Promise<void> {
  if (isClosing) return;
  isClosing = true;

  try {
    const config = getDatabaseConfig();
    if (config.dialect === 'postgresql') {
      await closePostgres();
    }
    dbInstance = null;
  } finally {
    isClosing = false;
  }
}

/**
 * Database instance export with lazy initialization
 *
 * Provides backward compatibility for code that imports db directly.
 * The getter function is only executed when db is accessed, not when
 * the module is imported.
 */
export const db = new Proxy({} as Database, {
  get(_target, prop) {
    return getDb()[prop as keyof Database];
  },

  set(_target, prop, value) {
    (getDb() as any)[prop] = value;
    return true;
  },

  has(_target, prop) {
    return prop in getDb();
  },

  getOwnPropertyDescriptor(_target, prop) {
    return Object.getOwnPropertyDescriptor(getDb(), prop);
  },

  ownKeys(_target) {
    return Reflect.ownKeys(getDb());
  },

  getPrototypeOf(_target) {
    return Object.getPrototypeOf(getDb());
  },
});
