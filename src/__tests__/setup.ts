/**
 * Test setup file
 *
 * This file is preloaded before all tests to configure the test environment.
 * It sets up the test database schema and suppresses noisy error output.
 */

import { Database } from 'bun:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

// Database path for tests (uses env var or default)
const TEST_DB_PATH = process.env.DATABASE_URL || 'db/.test.db';

/**
 * Remove comments from SQL statement
 */
function removeComments(sql: string): string {
  // Remove single-line comments (-- ...)
  let result = sql.replace(/--[^\n]*/g, '');
  // Remove multi-line comments (/* ... */)
  result = result.replace(/\/\*[\s\S]*?\*\//g, '');
  return result.trim();
}

/**
 * Execute SQL statements from setup.sql
 * Splits by semicolon and executes each statement separately
 */
function execSetupSql(db: Database, sql: string) {
  const statements = sql
    .split(';')
    .map((s) => removeComments(s).trim())
    .filter((s) => s.length > 0);

  for (const stmt of statements) {
    try {
      db.prepare(stmt).run();
    } catch (error: any) {
      // Ignore "already exists" errors for idempotent setup
      if (!error.message?.includes('already exists')) {
        throw error;
      }
    }
  }
}

/**
 * Setup test database with schema from setup.sql
 */
async function setupTestDatabase() {
  // Ensure directory exists
  const dbDir = dirname(TEST_DB_PATH);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
  }

  // Create database and apply schema
  const db = new Database(TEST_DB_PATH);
  try {
    const setupSqlPath = join(process.cwd(), 'src', 'db', 'setup.sql');
    const sql = await Bun.file(setupSqlPath).text();
    execSetupSql(db, sql);
  } finally {
    db.close();
  }
}

// Run setup before tests
await setupTestDatabase();

// Replace console.error with a no-op during tests
// This prevents noisy output when testing error handling paths
console.error = () => {};
