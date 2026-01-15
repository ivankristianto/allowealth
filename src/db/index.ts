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
 * Dynamic imports are used to avoid loading runtime-specific modules
 * in the wrong environment.
 *
 * @see https://bun.sh/docs/api/sqlite
 * @see https://github.com/WiseLibs/better-sqlite3
 */
import { createRequire } from 'node:module';
import { detectRuntime, type Runtime } from './driver';
import * as schema from './schema';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

// Re-export schema
export * from './schema';

// Database connection (SQLite)
// In production, DATABASE_URL should be set but we fall back to .dev.db for local preview
const dbUrl = process.env.DATABASE_URL || '.dev.db';

// Warn in production if DATABASE_URL is not set (but don't throw)
if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
  console.warn('Warning: DATABASE_URL not set in production, using default .dev.db');
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
      where: (condition: any) => Promise<any[]>;
      groupBy: (column: any) => {
        where: (condition: any) => Promise<any[]>;
      };
    };
    from: (table: any) => Promise<any[]>;
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
 * Create the Drizzle database instance based on runtime
 */
async function createDatabase(): Promise<Database> {
  const runtime = detectRuntime();

  if (runtime === 'bun') {
    // Dynamic import for Bun runtime
    const { drizzle } = await import('drizzle-orm/bun-sqlite');
    const { Database } = await import('bun:sqlite');
    const sqlite = new Database(dbUrl);

    // Apply performance optimizations
    sqlite.exec('PRAGMA journal_mode = WAL;');
    sqlite.exec('PRAGMA synchronous = NORMAL;');
    sqlite.exec('PRAGMA cache_size = -64000;'); // 64MB cache
    sqlite.exec('PRAGMA foreign_keys = ON;');

    return drizzle(sqlite, { schema });
  } else {
    // Dynamic import for Node.js runtime
    const { drizzle } = await import('drizzle-orm/better-sqlite3');
    const BetterSqlite3 = (await import('better-sqlite3')).default;
    const sqlite = new BetterSqlite3(dbUrl);

    // Apply performance optimizations
    sqlite.exec('PRAGMA journal_mode = WAL;');
    sqlite.exec('PRAGMA synchronous = NORMAL;');
    sqlite.exec('PRAGMA cache_size = -64000;'); // 64MB cache
    sqlite.exec('PRAGMA foreign_keys = ON;');

    // Graceful shutdown handler for Node.js
    process.on('beforeExit', () => {
      sqlite.close();
    });

    return drizzle(sqlite, { schema });
  }
}

// Singleton promise for database instance
let dbPromise: Promise<Database> | null = null;

/**
 * Get the database instance (lazy initialization)
 */
export async function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = createDatabase();
  }
  return dbPromise;
}

/**
 * Drizzle ORM instance (synchronous access)
 *
 * For backwards compatibility with existing code that expects
 * synchronous database access. This creates the database instance
 * synchronously at module load time.
 *
 * Uses createRequire for Node.js ESM compatibility and native require for Bun.
 */
let _db: Database;

/**
 * Get a require function that works in both CommonJS and ESM
 * - In Bun: Uses native require (always available)
 * - In Node.js ESM: Uses createRequire from node:module
 */
function getRequire(): NodeRequire {
  const runtime = detectRuntime();
  if (runtime === 'bun') {
    // Bun has require available globally
    // @ts-ignore - Bun provides require
    return require;
  } else {
    // Node.js ESM - use createRequire (imported at top level)
    return createRequire(import.meta.url);
  }
}

const runtime = detectRuntime();
const dynamicRequire = getRequire();

if (runtime === 'bun') {
  // Bun runtime - use bun:sqlite synchronously
  const Database = dynamicRequire('bun:sqlite').Database;
  const sqlite = new Database(dbUrl);

  sqlite.exec('PRAGMA journal_mode = WAL;');
  sqlite.exec('PRAGMA synchronous = NORMAL;');
  sqlite.exec('PRAGMA cache_size = -64000;');
  sqlite.exec('PRAGMA foreign_keys = ON;');

  const { drizzle } = dynamicRequire('drizzle-orm/bun-sqlite');
  _db = drizzle(sqlite, { schema });
} else {
  // Node.js runtime - use better-sqlite3 synchronously
  const BetterSqlite3 = dynamicRequire('better-sqlite3');
  const sqlite = new BetterSqlite3(dbUrl);

  sqlite.exec('PRAGMA journal_mode = WAL;');
  sqlite.exec('PRAGMA synchronous = NORMAL;');
  sqlite.exec('PRAGMA cache_size = -64000;');
  sqlite.exec('PRAGMA foreign_keys = ON;');

  process.on('beforeExit', () => {
    sqlite.close();
  });

  const { drizzle } = dynamicRequire('drizzle-orm/better-sqlite3');
  _db = drizzle(sqlite, { schema });
}

export const db = _db;
