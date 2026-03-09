/**
 * Database connection configuration
 *
 * Provides a database abstraction layer supporting SQLite and D1 dialects.
 *
 * SQLite:
 * - Uses bun:sqlite with drizzle-orm/bun-sqlite (local development)
 *
 * Cloudflare D1:
 * - Uses D1 binding with drizzle-orm/d1 (Cloudflare Workers)
 * - SQLite-compatible, no connection management needed
 *
 * The driver is selected automatically based on configuration:
 * - D1_ENABLED=true -> D1 binding (Cloudflare Workers)
 * - Otherwise -> SQLite
 *
 * @see https://bun.sh/docs/api/sqlite
 * @see https://developers.cloudflare.com/d1/
 */
import { createRequire } from 'node:module';
import type { BunSQLiteDatabase } from 'drizzle-orm/bun-sqlite';
import { getDatabaseConfig } from './config';
import type { DatabaseDriver } from './driver';
import { createBunDriver } from './drivers/bun';
import { createD1Database, getD1Binding } from './drivers/d1';

// Import schema for type inference
import * as sqliteSchema from './schema/sqlite';

// Re-export schema
export * from './schema';

/**
 * Get the active schema based on current database dialect
 *
 * Returns the SQLite schema, used by both local SQLite and D1.
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
      where: (condition: any) => {
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
 * Run an async callback.
 *
 * SQLite and D1 run the callback directly -- single-writer WAL mode ensures
 * sequential consistency. D1 does not support BEGIN/COMMIT/ROLLBACK.
 */
export async function runTransaction<T>(
  db: IDatabase,
  callback: (tx: IDatabase) => Promise<T>
): Promise<T> {
  return callback(db);
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
 * Get a require function for loading npm packages at runtime
 */
function getRequire() {
  return createRequire(import.meta.url);
}

/**
 * Create the Drizzle database instance
 *
 * Automatically selects the correct driver:
 * - D1_ENABLED=true -> D1 binding via drizzle-orm/d1 (Cloudflare Workers)
 * - Otherwise -> bun:sqlite driver
 */
function createDatabase(): Database {
  const config = getDatabaseConfig();
  let driver: (DatabaseDriver & { _raw: unknown }) | null = null;

  try {
    // D1 path - Cloudflare Workers binding or CLI HTTP/local drivers
    if (config.isD1) {
      const d1Binding = getD1Binding();
      if (d1Binding) {
        return createD1Database(d1Binding, sqliteSchema) as unknown as Database;
      }

      const awTarget = process.env.AW_TARGET;
      if (awTarget === 'd1') {
        const dynamicRequire = getRequire();
        const { createD1HttpDatabase } = dynamicRequire('./drivers/d1-http');
        return createD1HttpDatabase(sqliteSchema) as unknown as Database;
      }

      if (awTarget === 'd1-local') {
        const localRequire = getRequire();
        const { findLocalD1Path } = localRequire('./drivers/d1-local');
        const localPath = findLocalD1Path(process.cwd());
        driver = createBunDriver(localPath);
        const { drizzle } = localRequire('drizzle-orm/bun-sqlite');
        return drizzle(driver._raw, { schema: sqliteSchema });
      }

      throw new Error(
        'D1_ENABLED is set but no D1 driver is available. ' +
          'Use --target d1 or --target d1-local, or run in Cloudflare Workers.'
      );
    }

    // SQLite path - uses bun:sqlite via Bun runtime
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
 * Prepare database for a new request (Cloudflare Workers)
 *
 * Discards stale connection references from previous requests.
 */
export function prepareForRequest(): void {
  dbInstance = null;
  isClosing = false;
}

/**
 * Close database connections
 *
 * For SQLite/D1, this resets the singleton. No connection pool to close.
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
