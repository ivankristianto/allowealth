/**
 * Database Driver Interface
 *
 * Abstract interface for SQLite database drivers that can work across
 * different JavaScript runtimes (Bun, Node.js).
 *
 * This abstraction layer allows the application to use Bun's native
 * bun:sqlite in API routes (which run in Bun) while falling back to
 * better-sqlite3 in middleware context (which runs in Node.js).
 *
 * @see https://bun.sh/docs/api/sqlite
 * @see https://github.com/WiseLibs/better-sqlite3
 */

/**
 * Abstract database driver interface
 *
 * Both bun:sqlite and better-sqlite3 implement compatible APIs,
 * so this interface captures the shared functionality we need.
 */
export interface DatabaseDriver {
  /**
   * Execute a SQL statement without returning results
   * @param sql - SQL statement to execute
   */
  exec(sql: string): void;

  /**
   * Prepare a SQL statement for execution
   * @param sql - SQL statement to prepare
   * @returns Prepared statement object
   */
  prepare(sql: string): PreparedStatement;

  /**
   * Close the database connection
   */
  close(): void;

  /**
   * Open a database connection (for drivers that support it)
   */
  open?(): void;

  /**
   * Check if a table exists in the database
   * @param tableName - Name of the table to check
   * @returns true if table exists, false otherwise
   */
  tableExists?(tableName: string): boolean;

  /**
   * Raw SQLite connection for passing to drizzle()
   * @internal
   */
  _raw: unknown;
}

/**
 * Prepared statement interface
 *
 * Represents a compiled SQL statement that can be executed
 * multiple times with different parameters.
 */
export interface PreparedStatement {
  /**
   * Execute the prepared statement and return all matching rows
   * @param params - Parameters to bind to the statement
   * @returns Array of result rows
   */
  all(params?: unknown[]): unknown[];

  /**
   * Execute the prepared statement and return the first result row
   * @param params - Parameters to bind to the statement
   * @returns First result row or undefined if no results
   */
  get(params?: unknown[]): unknown | undefined;

  /**
   * Execute the prepared statement without returning results
   * @param params - Parameters to bind to the statement
   * @returns Object with info about the execution (e.g., lastInsertId)
   */
  run(params?: unknown[]): RunResult;

  /**
   * Finalize the prepared statement and free resources
   */
  finalize?(): void;
}

/**
 * Result from executing a prepared statement with run()
 */
export interface RunResult {
  /** Number of rows affected */
  changes: number;

  /** Row ID of the last inserted row */
  lastInsertRowid: number | bigint;
}

/**
 * Runtime type detection
 */
export type Runtime = 'bun' | 'node';

/**
 * Detect the current JavaScript runtime
 * @returns The detected runtime type
 */
export function detectRuntime(): Runtime {
  // Check for Bun runtime
  // @ts-ignore - Bun is not a standard global
  if (typeof Bun !== 'undefined') {
    return 'bun';
  }

  // Check for Node.js runtime
  if (typeof process !== 'undefined' && process.versions?.node) {
    return 'node';
  }

  // Default to Node.js for unknown runtimes
  // (this is the safer default as Astro middleware runs in Node)
  return 'node';
}
