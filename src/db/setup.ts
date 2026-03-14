/* eslint-disable no-console */
/**
 * Database Setup Script
 *
 * Creates all database tables from scratch using the consolidated schema.
 * No migrations - just clean setup.
 *
 * Usage:
 *   bun run src/db/setup.ts              # Setup SQLite database
 *   bun run db:reset                     # Full reset (delete + setup + seed)
 */

import { Database } from 'bun:sqlite';
import { getDatabaseConfig } from './config';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const config = getDatabaseConfig();

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

async function setupDatabase() {
  console.log(`\n🔧 Setting up database (${config.dialect})...\n`);

  if (config.isD1) {
    console.error('❌ D1 setup should be done via Wrangler/D1 console.');
    console.error('   Use: wrangler d1 execute <db-name> --file=./src/db/setup.sql');
    process.exit(1);
  }

  const dbPath = config.url;

  const dbDir = dirname(dbPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
    console.log(`  📁 Created directory: ${dbDir}`);
  }

  const sqlFile = new URL('./setup.sql', import.meta.url);
  const sql = await Bun.file(sqlFile).text();

  const db = new Database(dbPath);

  try {
    execSetupSql(db, sql);

    console.log(`  ✓ Database created at: ${dbPath}`);
    console.log('\n✅ Database setup complete!\n');
  } catch (error: any) {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

setupDatabase().catch((error) => {
  console.error('\n❌ Setup failed:', error);
  process.exit(1);
});
