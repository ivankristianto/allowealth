/**
 * Database connection configuration
 *
 * Provides a database abstraction layer that works across different
 * JavaScript runtimes (Bun and Node.js).
 *
 * - In Bun runtime (API routes, server context): Uses bun:sqlite for optimal performance
 * - In Node.js runtime (Astro middleware): Uses better-sqlite3 for compatibility
 *
 * The driver is selected automatically based on the detected runtime.
 *
 * @see https://bun.sh/docs/api/sqlite
 * @see https://github.com/WiseLibs/better-sqlite3
 */
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { detectRuntime } from './driver';
import { createBunDriver } from './drivers/bun';
import { createNodeDriver } from './drivers/node';
import * as schema from './schema';

// Database connection (SQLite)
const dbUrl = process.env.DATABASE_URL || '.dev.db';

// In production, DATABASE_URL should be set
if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable must be set in production');
}

/**
 * Create the appropriate database driver based on runtime
 */
const runtime = detectRuntime();

let driver: ReturnType<typeof createBunDriver> | ReturnType<typeof createNodeDriver>;

if (runtime === 'bun') {
  // Use bun:sqlite in Bun runtime for optimal performance
  driver = createBunDriver(dbUrl);
} else {
  // Use better-sqlite3 in Node.js runtime for compatibility
  // This is necessary for Astro middleware which runs in Node.js
  driver = createNodeDriver(dbUrl);
}

// Apply performance optimizations for SQLite
driver.exec('PRAGMA journal_mode = WAL;');
driver.exec('PRAGMA synchronous = NORMAL;');
driver.exec('PRAGMA cache_size = -64000;'); // 64MB cache
driver.exec('PRAGMA foreign_keys = ON;');

/**
 * Drizzle ORM instance
 *
 * We cast the driver to 'any' because drizzle-orm/bun-sqlite expects
 * a bun:sqlite Database object, but our driver interface is compatible.
 * Both bun:sqlite and better-sqlite3 expose the same core methods we need.
 */
const db = drizzle(driver as any, { schema });

// Graceful shutdown handler
process.on('beforeExit', () => {
  driver.close();
});

export * from './schema';
export { db };
