/**
 * Database connection configuration
 *
 * Uses bun:sqlite with drizzle-orm/bun-sqlite.
 *
 * @see https://bun.sh/docs/api/sqlite
 */
import { createRequire } from 'node:module';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { getDatabaseConfig } from './config';
import type { DatabaseDriver } from './driver';
import { createBunDriver } from './drivers/bun';

// Import schema for type inference
import * as sqliteSchema from './schema/sqlite';

// Re-export schema
export * from './schema';

/**
 * Get the active schema for the current database dialect
 */
export function getActiveSchema(): typeof sqliteSchema {
  return sqliteSchema;
}

// Re-export driver types for dependency injection
export type { DatabaseDriver, PreparedStatement, RunResult } from './driver';

// Re-export config utilities
export { getDatabaseConfig } from './config';
export type { DatabaseConfig, DatabaseDialect } from './config';

/**
 * Database type for type inference
 */
export type Database = BunSQLiteDatabase<typeof sqliteSchema>;

/**
 * Database interface for dependency injection
 */
export interface IDatabase {
  insert: (table: any) => {
    values: (values: any) => Promise<any> & {
      returning: (columns?: any) => Promise<any[]>;
      onConflictDoNothing: () => Promise<any>;
      onConflictDoUpdate: (config: any) => Promise<any>;
    };
  };
  query: {
    [key: string]: {
      findFirst: (config?: any) => Promise<any>;
      findMany: (config?: any) => Promise<any[]>;
    };
  };
  update: (table: any) => {
    set: (values: any) => {
      where: (condition: any) => Promise<any> & {
        returning: (columns?: any) => Promise<any[]>;
      };
      returning: (columns?: any) => Promise<any[]>;
    };
  };
  select: (columns: any) => {
    from: (table: any) => {
      where: (condition: any) => Promise<any[]> & {
        groupBy: (column: any) => Promise<any[]>;
        orderBy: (config: any) => Promise<any[]>;
      };
      groupBy: (column: any) => {
        where: (condition: any) => Promise<any[]>;
      };
    };
  };
  delete: (table: any) => {
    where: (condition: any) => Promise<any>;
  };
  transaction: <T>(callback: (tx: any) => Promise<T>) => Promise<T>;
}

/**
 * Run an async callback in a database transaction.
 *
 * Wraps Drizzle's native SQLite transaction support so services have a single
 * entry point for atomic multi-step writes.
 */
export async function runTransaction<T>(
  db: IDatabase,
  callback: (tx: IDatabase) => Promise<T>
): Promise<T> {
  return db.transaction((tx) => callback(tx as IDatabase));
}

/**
 * Performance optimizations for SQLite
 */
const PRAGMA_STATEMENTS = [
  'PRAGMA journal_mode = WAL;',
  'PRAGMA synchronous = NORMAL;',
  'PRAGMA cache_size = -64000;',
  'PRAGMA foreign_keys = ON;',
];

function applyPragmas(driver: DatabaseDriver): void {
  PRAGMA_STATEMENTS.forEach((sql) => driver.exec(sql));
}

/**
 * Create the Drizzle database instance backed by bun:sqlite
 */
function createDatabase(): Database {
  const config = getDatabaseConfig();
  let driver: (DatabaseDriver & { _raw: unknown }) | null = null;

  try {
    driver = createBunDriver(config.url);
    const dynamicRequire = createRequire(import.meta.url);
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

let dbInstance: Database | null = null;
let isClosing = false;

export function getDb(): Database {
  if (isClosing) {
    throw new Error('Database is being closed. Cannot acquire new connection.');
  }

  if (!dbInstance) {
    dbInstance = createDatabase();
  }
  return dbInstance;
}

export function resetDb(): void {
  dbInstance = null;
}

/**
 * Prepare database for a new request
 *
 * Discards stale connection references from previous requests. The request
 * middleware calls it before any database work.
 */
export function prepareForRequest(): void {
  dbInstance = null;
  isClosing = false;
}

/**
 * Close database connections
 *
 * For SQLite, this resets the singleton. No connection pool to close.
 */
export async function closeDatabase(): Promise<void> {
  if (isClosing) return;
  isClosing = true;
  try {
    dbInstance = null;
  } finally {
    isClosing = false;
  }
}

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
