/**
 * Database connection configuration
 *
 * Uses bun:sqlite with drizzle-orm/bun-sqlite.
 *
 * @see https://bun.sh/docs/api/sqlite
 */
import type { Database as SqliteClient } from 'bun:sqlite';
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
export type Database = BunSQLiteDatabase<typeof sqliteSchema> & { $client: SqliteClient };

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

export type DbTransaction = Parameters<Parameters<Database['transaction']>[0]>[0];

/**
 * Run a synchronous callback in one SQLite transaction; a throw rolls back every statement.
 * bun-sqlite commits at the first `await`, so a Promise-returning callback is a type error.
 */
export function runTransaction<T>(
  db: IDatabase | Database,
  callback: (tx: DbTransaction) => T,
  ..._guard: [T] extends [never]
    ? []
    : T extends PromiseLike<unknown>
      ? [callbackMustBeSynchronous: never]
      : []
): T {
  return (db as Database).transaction(callback);
}

/**
 * Performance optimizations for SQLite
 */
const PRAGMA_STATEMENTS = [
  // First, so the WAL switch and every later write wait out a lock held by the CLI or another process
  'PRAGMA busy_timeout = 5000;',
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

// One connection for the life of the process: it keeps the page cache warm and
// stops concurrent requests from swapping handles under each other.
let dbInstance: Database | null = null;

export function getDb(): Database {
  if (!dbInstance) {
    dbInstance = createDatabase();
  }
  return dbInstance;
}

/** Close the connection so the next getDb() reopens DATABASE_URL. Tests use it to switch files. */
export function resetDb(): void {
  const current = dbInstance;
  dbInstance = null;
  current?.$client.close();
}

// A Proxy rather than a plain export: modules bind `db` at import time, and the handle
// must open lazily and follow resetDb().
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
