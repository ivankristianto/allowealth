/* eslint-disable no-console -- CLI script requires console output */
/**
 * Database Drop Script (PostgreSQL)
 *
 * Drops all tables from the PostgreSQL database.
 * This is a dangerous operation and should be used with caution.
 *
 * Usage:
 *   bun run aw --target postgres db drop
 */

import { db, getActiveSchema } from './index';
import { getDatabaseConfig } from './config';
import { sql } from 'drizzle-orm';

const schema = getActiveSchema();
const config = getDatabaseConfig();

// All tables in dependency order (parents first)
// Drop in reverse order to avoid foreign key constraint errors
const tablesToDrop = [
  // Parent tables first (for proper drop order, we reverse this later)
  schema.workspaces,
  schema.workspaceMeta,
  schema.workspaceInvitations,
  schema.users,
  schema.userMeta,
  schema.sessions,
  schema.passwordResetTokens,
  schema.emailVerificationTokens,
  schema.categories,
  schema.accountCategories,
  schema.transactions,
  schema.recurringTemplates,
  schema.recurringOccurrences,
  schema.accounts,
  schema.accountHistory,
  schema.accountUpdateReminders,
  schema.accountSnapshots,
  schema.accountSnapshotItems,
  schema.auditLogs,
  schema.budgets,
  schema.apiKeys,
  schema.oauthAccounts,
  schema.userMfa,
  schema.userMfaBackupCodes,
];

async function dropDatabase() {
  console.log(`\n🗑️  Dropping all database tables (${config.dialect})...\n`);

  const isProduction = import.meta.env.MODE === 'production';

  if (isProduction) {
    console.log('⚠️  WARNING: Running in production mode!');
    console.log('   This will DELETE ALL TABLES from the production database.');
    console.log('   Press Ctrl+C within 5 seconds to abort...\n');
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  try {
    if (config.dialect === 'postgresql') {
      console.log('Dropping PostgreSQL tables...\n');

      // Reverse order: drop children before parents
      const tablesToDropReversed = [...tablesToDrop].reverse();

      for (const table of tablesToDropReversed) {
        try {
          // Get table name from schema object
          const tableName = (table as any)[Symbol.for('drizzle:Name')] || (table as any)._.name;

          // Use DROP TABLE IF EXISTS with CASCADE to drop dependent objects
          await (db as any).execute(sql.raw(`DROP TABLE IF EXISTS "${tableName}" CASCADE`));
          console.log(`  ✓ Dropped: ${tableName}`);
        } catch (error: any) {
          // Table might not exist, skip
          if (error.message?.includes('does not exist')) {
            const tableName = (table as any)[Symbol.for('drizzle:Name')] || (table as any)._.name;
            console.log(`  ⊘ Skipped (not exists): ${tableName}`);
          } else {
            throw error;
          }
        }
      }

      // Also drop migrations table if it exists
      try {
        await (db as any).execute(sql.raw(`DROP TABLE IF EXISTS "__drizzle_migrations" CASCADE`));
        console.log(`  ✓ Dropped: __drizzle_migrations`);
      } catch {
        // Ignore if table doesn't exist
      }
    }

    console.log('\n✅ All tables dropped successfully!');
    console.log('Run "aw db migrate" to recreate the schema.\n');
  } catch (error) {
    console.error('\n❌ Failed to drop tables:', error);
    process.exit(1);
  }
}

// Run the script
dropDatabase();
