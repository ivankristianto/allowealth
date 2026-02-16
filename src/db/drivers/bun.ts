/**
 * Bun SQLite Driver
 *
 * Database driver implementation using Bun's native bun:sqlite.
 * This driver is used in API routes and server contexts where
 * the application runs in the Bun runtime.
 *
 * @see https://bun.sh/docs/api/sqlite
 */

import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import type { DatabaseDriver, PreparedStatement, RunResult } from '../driver';

/**
 * Bun-specific Database import
 *
 * bun:sqlite is loaded via createRequire() inside createBunDriver() to avoid
 * loading it at module evaluation time. This file is statically imported by
 * db/index.ts, but bun:sqlite must only load when actually creating a SQLite
 * driver (not in Workers/PostgreSQL contexts).
 */
type BunDatabase = any;

/**
 * Bun-specific PreparedStatement type
 */
type BunStatement = any;

/**
 * Ensure the database directory exists
 */
function ensureDatabaseDir(dbPath: string): void {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Create a Bun SQLite driver
 *
 * @param dbPath - Path to the SQLite database file
 * @returns DatabaseDriver instance with raw SQLite connection
 */
export function createBunDriver(dbPath: string): DatabaseDriver & { _raw: BunDatabase } {
  // Ensure the database directory exists
  ensureDatabaseDir(dbPath);

  // Load bun:sqlite via createRequire to work in Vite SSR context
  // (bare require() is not defined in Vite's ESM module scope)
  const dynamicRequire = createRequire(import.meta.url);
  const Database = dynamicRequire('bun:sqlite').Database;
  const sqlite: BunDatabase = new Database(dbPath);

  const driver: DatabaseDriver & { _raw: BunDatabase } = {
    exec(sql: string): void {
      sqlite.exec(sql);
    },

    prepare(sql: string): PreparedStatement {
      const statement: BunStatement = sqlite.prepare(sql);
      return {
        all(params?: unknown[]): unknown[] {
          return statement.all(...(params || []));
        },
        get(params?: unknown[]): unknown | undefined {
          return statement.get(...(params || []));
        },
        run(params?: unknown[]): RunResult {
          const result = statement.run(...(params || []));
          return {
            changes: result.changes,
            lastInsertRowid: result.lastInsertRowid,
          };
        },
      };
    },

    close(): void {
      sqlite.close();
    },

    open(): void {
      // bun:sqlite automatically opens the database
      // This method exists for interface compatibility
    },

    tableExists(tableName: string): boolean {
      const result = sqlite
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?")
        .get(tableName);
      return result !== undefined;
    },

    // Expose raw connection for drizzle
    _raw: sqlite,
  };

  return driver;
}
