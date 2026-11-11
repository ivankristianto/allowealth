/* eslint-disable no-console -- CLI script requires console output */
/**
 * Deletes every row from every table while keeping the schema and the migration history.
 * Usage: bun run db:empty --yes   (refuses a DB with non-demo users unless --force is added)
 */

import { sql } from 'drizzle-orm';
import { getDatabaseConfig } from './config';
import { db, runTransaction, type Database } from './index';
import { enforceWipeGuard, parseWipeFlags, resolveDatabasePath } from './wipe-guard';

/** Kept so the emptied database still passes the startup migration guard. */
const KEPT_TABLE = '__drizzle_migrations';

// Read from the database itself: the schema index leaves out the deprecated MFA tables,
// and a hand-kept list is how the Better Auth, recurring and token tables were missed.
const LIST_TABLES = sql`
  SELECT name FROM sqlite_master
  WHERE type = 'table'
    AND name NOT LIKE 'sqlite\\_%' ESCAPE '\\'
    AND name != ${KEPT_TABLE}
  ORDER BY name`;

/** Empty every table in one transaction; any failure rolls the whole wipe back and throws. */
function emptyAllTables(database: Database): string[] {
  return runTransaction(database, (tx) => {
    // Checks run at COMMIT instead of per DELETE, so table order does not matter.
    // foreign_keys itself cannot be switched off inside a transaction.
    tx.run(sql`PRAGMA defer_foreign_keys = ON`);

    const tables = tx.all<{ name: string }>(LIST_TABLES).map((row) => row.name);
    for (const table of tables) {
      tx.run(sql`DELETE FROM ${sql.identifier(table)}`);
    }
    return tables;
  });
}

async function emptyDatabase() {
  const config = getDatabaseConfig();
  enforceWipeGuard({
    dbPath: resolveDatabasePath(config.url),
    action: 'empty',
    ...parseWipeFlags(process.argv.slice(2)),
  });

  console.log(`\n🗑️  Emptying database (${config.dialect})...\n`);

  // `import.meta.env.MODE` is undefined under Bun, so use `process.env.NODE_ENV`,
  // which `bun build` inlines at build time (NODE_ENV is set in build:scripts).
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    console.log('⚠️  WARNING: Running in production mode!');
    console.log('   This will DELETE ALL DATA from the production database.');
    console.log('   Press Ctrl+C within 5 seconds to abort...\n');
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  const tables = emptyAllTables(db);
  for (const table of tables) {
    console.log(`  ✓ Emptied: ${table}`);
  }
  console.log(`\n✅ Emptied ${tables.length} tables (kept ${KEPT_TABLE}).\n`);
}

emptyDatabase().catch((error: unknown) => {
  console.error('\n❌ Failed to empty database:', error);
  process.exit(1);
});
