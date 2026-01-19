/**
 * Node.js SQLite Driver
 *
 * Database driver implementation using better-sqlite3.
 * This driver is used in contexts where the application runs
 * in the Node.js runtime, such as Astro middleware.
 *
 * @see https://github.com/WiseLibs/better-sqlite3
 */

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import type { DatabaseDriver, PreparedStatement, RunResult } from '../driver';

/**
 * better-sqlite3 Database type
 */
type BetterSqlite3Database = any;

/**
 * better-sqlite3 Statement type
 */
type BetterSqlite3Statement = any;

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
 * Create a Node.js SQLite driver using better-sqlite3
 *
 * @param dbPath - Path to the SQLite database file
 * @returns DatabaseDriver instance with raw SQLite connection
 */
export function createNodeDriver(dbPath: string): DatabaseDriver & { _raw: BetterSqlite3Database } {
  // Ensure the database directory exists
  ensureDatabaseDir(dbPath);

  // Import better-sqlite3 dynamically
  // This package is compatible with Node.js and already in devDependencies
  const require = createRequire(import.meta.url);
  const Database = require('better-sqlite3');
  const sqlite: BetterSqlite3Database = new Database(dbPath);

  const driver: DatabaseDriver & { _raw: BetterSqlite3Database } = {
    exec(sql: string): void {
      sqlite.exec(sql);
    },

    prepare(sql: string): PreparedStatement {
      const statement: BetterSqlite3Statement = sqlite.prepare(sql);
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
        finalize(): void {
          // better-sqlite3 statements are automatically finalized
          // This method exists for interface compatibility
        },
      };
    },

    close(): void {
      sqlite.close();
    },

    open(): void {
      // better-sqlite3 automatically opens the database
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

  // Graceful shutdown handler for Node.js
  process.on('beforeExit', () => {
    sqlite.close();
  });

  return driver;
}
