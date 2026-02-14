/**
 * Database Driver Interface
 *
 * Interface for the SQLite database driver using Bun's native bun:sqlite.
 *
 * @see https://bun.sh/docs/api/sqlite
 */

/**
 * Database driver interface for bun:sqlite
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
