/**
 * Database connection configuration
 *
 * Uses Bun's native SQLite driver (bun:sqlite) for optimal performance.
 * In development: creates .dev.db file locally
 * In production: uses DATABASE_URL environment variable
 *
 * @see https://bun.sh/docs/api/sqlite
 */
import { drizzle } from 'drizzle-orm/bun-sqlite';
import Database from 'bun:sqlite';
import * as schema from './schema';

// Database connection (SQLite)
const dbUrl = process.env.DATABASE_URL || '.dev.db';

// In production, DATABASE_URL should be set
if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable must be set in production');
}

let sqlite: Database;

try {
  sqlite = new Database(dbUrl);

  // Performance optimizations for SQLite
  sqlite.exec('PRAGMA journal_mode = WAL;');
  sqlite.exec('PRAGMA synchronous = NORMAL;');
  sqlite.exec('PRAGMA cache_size = -64000;'); // 64MB cache
  sqlite.exec('PRAGMA foreign_keys = ON;');
} catch (error) {
  throw new Error(`Failed to connect to database at ${dbUrl}: ${error}`);
}

const db = drizzle(sqlite as any, { schema });

// Graceful shutdown handler
process.on('beforeExit', () => {
  sqlite.close();
});

export * from './schema';
export { db };
