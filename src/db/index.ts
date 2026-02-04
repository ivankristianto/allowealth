/**
 * Database connection configuration
 *
 * Provides a database abstraction layer that works across different
 * JavaScript runtimes (Bun and Node.js) and database dialects (SQLite, PostgreSQL).
 *
 * SQLite:
 * - In Bun runtime: Uses bun:sqlite with drizzle-orm/bun-sqlite
 * - In Node.js runtime: Uses better-sqlite3 with drizzle-orm/better-sqlite3
 *
 * PostgreSQL:
 * - Uses postgres.js with drizzle-orm/postgres-js
 * - Supports Supabase with automatic SSL configuration
 *
 * The driver is selected automatically based on the DATABASE_URL format:
 * - postgres:// or postgresql:// → PostgreSQL
 * - Otherwise → SQLite
 *
 * @see https://bun.sh/docs/api/sqlite
 * @see https://github.com/WiseLibs/better-sqlite3
 * @see https://github.com/porsager/postgres
 */
import { createRequire } from 'node:module';
import { getDatabaseConfig } from './config';
import { detectRuntime, type DatabaseDriver } from './driver';
import { createPostgresDatabase, closePostgres } from './drivers/postgres';
import { createNodeDriver } from './drivers/node';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
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
export type Database =
  | BunSQLiteDatabase<typeof sqliteSchema>
  | BetterSQLite3Database<typeof sqliteSchema>;

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
    values: (values: any) => {
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
 * Get a require function that works in both CommonJS and ESM
 *
 * Note: We always use createRequire(import.meta.url) because:
 * 1. When Astro/Vite bundles the code, the global `require` is not available
 *    even in Bun runtime context
 * 2. createRequire works in both Node.js and Bun environments
 */
function getRequire() {
  return createRequire(import.meta.url);
}

/**
 * Create the Drizzle database instance
 *
 * Automatically selects the correct driver based on DATABASE_URL:
 * - PostgreSQL URLs → postgres.js driver
 * - SQLite paths → bun:sqlite or better-sqlite3 based on runtime
 *
 * Note: SQLite drivers are loaded via createRequire to work with Vite/Astro bundling.
 * For edge environments (Cloudflare Workers), only PostgreSQL is supported.
 *
 * @throws Error if database connection fails
 */
function createDatabase(): Database {
  const config = getDatabaseConfig();

  try {
    // PostgreSQL path - used in production (Cloudflare Workers)
    if (config.dialect === 'postgresql') {
      return createPostgresDatabase(config.url, pgSchema) as unknown as Database;
    }

    // SQLite path - requires sync loading which may not work in all environments
    // This path should only be taken in Bun or Node.js environments
    // For edge environments (Cloudflare Workers), configure DATABASE_URL to use PostgreSQL
    const dynamicRequire = getRequire(); // Only call getRequire for SQLite path
    const runtime = detectRuntime();

    // Use static imports for local drivers, dynamic require only for npm packages
    let driver: DatabaseDriver & { _raw: unknown };
    let drizzle: (db: unknown, config: { schema: typeof sqliteSchema }) => Database;

    if (runtime === 'bun') {
      // Bun runtime: use bun:sqlite driver
      const { createBunDriver } = dynamicRequire('./drivers/bun');
      driver = createBunDriver(config.url);
      drizzle = dynamicRequire('drizzle-orm/bun-sqlite').drizzle;
    } else {
      // Node.js runtime: use better-sqlite3 driver (static import)
      driver = createNodeDriver(config.url);
      drizzle = dynamicRequire('drizzle-orm/better-sqlite3').drizzle;
    }

    applyPragmas(driver);
    return drizzle(driver._raw, { schema: sqliteSchema });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to create database connection (dialect: ${config.dialect}): ${message}`
    );
  }
}

/**
 * Singleton database instance
 *
 * In Cloudflare Workers, module-level state is isolated per request,
 * so the singleton naturally resets between requests.
 */
let dbInstance: Database | null = null;

/**
 * Flag to prevent new connections during close
 */
let isClosing = false;

/**
 * Get the database instance
 *
 * Uses singleton pattern to ensure one connection per request context.
 * In Cloudflare Workers, module-level state is isolated per request,
 * so this naturally provides one connection per request.
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
