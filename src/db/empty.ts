/* eslint-disable no-console -- CLI script requires console output */
/**
 * Database Empty Script
 *
 * Empties all data from the database while preserving the schema.
 * Works for SQLite and D1.
 *
 * Usage:
 *   bun run db:empty                        # Uses default .env (SQLite)
 *   bun run aw --target d1 db empty         # Uses D1
 */

import { sql } from 'drizzle-orm';
import { getDatabaseConfig } from './config';
import { db, getActiveSchema } from './index';

const schema = getActiveSchema();
const config = getDatabaseConfig();

// Tables in reverse dependency order (children first, parents last)
// This ensures foreign key constraints are satisfied during deletion
const tablesToEmpty = [
  // Dependent tables first
  schema.accountSnapshotItems,
  schema.accountSnapshots,
  schema.accountUpdateReminders,
  schema.accountHistory,
  schema.transactions,
  schema.budgets,
  schema.accounts,
  schema.categories,
  schema.accountCategories,
  schema.auditLogs,
  schema.oauthConsent,
  schema.oauthAccessToken,
  schema.oauthApplication,
  schema.passwordResetTokens,
  schema.sessions,
  schema.userMeta,
  schema.workspaceInvitations,
  schema.workspaceMeta,
  schema.users,
  // Parent tables last
  schema.workspaces,
];

async function emptyDatabase() {
  console.log(`\n🗑️  Emptying database (${config.dialect})...\n`);

  const isProduction = import.meta.env.MODE === 'production';

  if (isProduction) {
    console.log('⚠️  WARNING: Running in production mode!');
    console.log('   This will DELETE ALL DATA from the production database.');
    console.log('   Press Ctrl+C within 5 seconds to abort...\n');
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  try {
    // SQLite / D1: Delete from each table individually
    console.log('Using DELETE for SQLite...\n');

    // Disable foreign key checks temporarily (not supported on D1)
    if (!config.isD1) {
      await (db as any).run(sql.raw('PRAGMA foreign_keys = OFF'));
    }

    for (const table of tablesToEmpty) {
      try {
        await db.delete(table);
        const tableName = (table as any)[Symbol.for('drizzle:Name')] || (table as any)._.name;
        console.log(`  ✓ Emptied: ${tableName}`);
      } catch (error: any) {
        const tableName = (table as any)[Symbol.for('drizzle:Name')] || (table as any)._.name;
        console.log(`  ⊘ Skipped: ${tableName} - ${error.message}`);
      }
    }

    // Re-enable foreign key checks
    if (!config.isD1) {
      await (db as any).run(sql.raw('PRAGMA foreign_keys = ON'));
    }

    console.log('\n✅ Database emptied successfully!\n');
  } catch (error) {
    console.error('\n❌ Failed to empty database:', error);
    process.exit(1);
  }
}

// Run the script
emptyDatabase();
