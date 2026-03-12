/* eslint-disable no-console -- CLI script requires console output */
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

async function setupDatabase() {
  console.log(`\n🔧 Setting up database (${config.dialect})...\n`);

  if (config.isD1) {
    console.error('❌ D1 setup should be done via Wrangler/D1 console.');
    console.error('   Use: wrangler d1 execute <db-name> --file=./src/db/setup.sql');
    process.exit(1);
  }

  const dbPath = config.url;

  // Ensure directory exists
  const dbDir = dirname(dbPath);
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true });
    console.log(`  📁 Created directory: ${dbDir}`);
  }

  // Read the SQL file
  const sqlFile = new URL('./setup.sql', import.meta.url);
  const sql = await Bun.file(sqlFile).text();

  // Open database
  const db = new Database(dbPath);

  try {
    // Execute all SQL statements in a single transaction
    // SQLite can handle multiple statements in one exec() call
    db.exec(sql);

    console.log(`  ✓ Database created at: ${dbPath}`);
    console.log('\n✅ Database setup complete!\n');
  } catch (error: any) {
    // Ignore "already exists" errors for idempotent setup
    if (error.message?.includes('already exists')) {
      console.log(`  ✓ Database already exists at: ${dbPath}`);
      console.log('\n✅ Database setup complete!\n');
    } else {
      throw error;
    }
  } finally {
    db.close();
  }
}

// Run the setup
setupDatabase().catch((error) => {
  console.error('\n❌ Setup failed:', error);
  process.exit(1);
});
