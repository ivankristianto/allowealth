/**
 * Database connection configuration
 *
 * Provides a database abstraction layer that works across different
 * JavaScript runtimes (Bun and Node.js).
 *
 * - In Bun runtime: Uses bun:sqlite with drizzle-orm/bun-sqlite
 * - In Node.js runtime: Uses better-sqlite3 with drizzle-orm/better-sqlite3
 *
 * The driver is selected automatically based on the detected runtime.
 *
 * @see https://bun.sh/docs/api/sqlite
 * @see https://github.com/WiseLibs/better-sqlite3
 */
import { createRequire } from 'node:module';
import { detectRuntime } from './driver';
import { createBunDriver } from './drivers/bun';
import { createNodeDriver } from './drivers/node';
import * as schema from './schema';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

// Re-export schema
export * from './schema';

// Re-export driver types for dependency injection
export type { DatabaseDriver, PreparedStatement, RunResult } from './driver';

// Database connection (SQLite)
// In production, DATABASE_URL should be set but we fall back to db/.dev.db for local preview
const dbUrl = process.env.DATABASE_URL || 'db/.dev.db';

// Warn in production if DATABASE_URL is not set (but don't throw)
if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
  console.warn('Warning: DATABASE_URL not set in production, using default db/.dev.db');
}

/**
 * Database type that works across both runtimes
 */
export type Database = BunSQLiteDatabase<typeof schema> | BetterSQLite3Database<typeof schema>;

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
function applyPragmas(driver: ReturnType<typeof createBunDriver | typeof createNodeDriver>): void {
  PRAGMA_STATEMENTS.forEach((sql) => driver.exec(sql));
}

/**
 * Get a require function that works in both CommonJS and ESM
 */
function getRequire(): NodeRequire {
  if (detectRuntime() === 'bun') {
    // Bun has require available globally
    // @ts-ignore - Bun provides require
    return require;
  } else {
    // Node.js ESM - use createRequire
    return createRequire(import.meta.url);
  }
}

/**
 * Create the Drizzle database instance
 */
function createDatabase(): Database {
  const runtime = detectRuntime();
  const dynamicRequire = getRequire();

  // Create the native SQLite driver
  const driver = runtime === 'bun' ? createBunDriver(dbUrl) : createNodeDriver(dbUrl);

  // Apply performance optimizations
  applyPragmas(driver);

  // Create Drizzle ORM instance
  const { drizzle } =
    runtime === 'bun'
      ? dynamicRequire('drizzle-orm/bun-sqlite')
      : dynamicRequire('drizzle-orm/better-sqlite3');

  return drizzle(driver._raw, { schema });
}

/**
 * Singleton database instance
 */
let dbInstance: Database | null = null;

/**
 * Get the database instance (singleton pattern)
 */
export function getDb(): Database {
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
