/**
 * Database Seeder
 *
 * Seeds the database with realistic sample data for testing and development.
 * You can run this multiple times; it clears existing data before seeding.
 *
 * Usage: bun run src/db/seed/index.ts [options]
 *
 * Options:
 *   --months=N          Seed transactions for this many months (default: 6)
 *   --transactions=N    Seed this many extra transactions (default: 0)
 *   --benchmark         Legacy: adds 10,000 transactions over 12 months
 *   --stress            Legacy: generates 5 years of family data
 *   --help              Show this help message
 */

/* eslint-disable no-console -- Console output is intentional for seeder progress feedback */

import { db, getDatabaseConfig } from '@/db';
import { sql } from 'drizzle-orm';
import {
  workspaces,
  workspaceMeta,
  users,
  userMeta,
  categories,
  accountCategories,
  transactions,
  recurringTemplates,
  recurringOccurrences,
  accounts,
  accountHistory,
  accountUpdateReminders,
  accountSnapshots,
  accountSnapshotItems,
  sessions,
  passwordResetTokens,
  budgets,
  auditLogs,
  // Better Auth tables
  user,
  account,
  session as betterAuthSession,
  verification,
  passkey,
  twoFactor,
} from '@/db/schema';

// Domain seeders
import { seedWorkspace } from './domains/workspace';
import { seedUsers, type SeededUsers } from './domains/users';
import { seedPasskeys } from './domains/security';
import { seedCategories, seedAccountCategories } from './domains/categories';
import { seedBudgets } from './domains/budgets';
import {
  seedAccounts,
  seedAccountHistory,
  seedAccountUpdateReminders,
  seedAccountSnapshots,
} from './domains/accounts';
import {
  seedIncomeTransactions,
  seedExpenseTransactions,
  seedTransferTransactions,
  seedMemberTransactions,
  backfillInitialBalance,
} from './domains/transactions';
import { seedRecurringData } from './domains/recurring';
import { seedTransactionAuditLogs } from './domains/audit';
import { seedStressData } from './domains/stress';
import { seedBulkTransactions, type BulkSeedOptions } from './bulk';

// Config
import { DEMO_ADMIN, DEMO_MEMBER, DEMO_SUPER_ADMIN, setSeederConfig } from './config';
import { getTrailingMonths } from './lib/dates';

// ============================================================================
// PRODUCTION GUARD
// ============================================================================

const isProduction = import.meta.env.MODE === 'production';
const allowSeed = import.meta.env.ALLOW_SEED === 'true';

if (isProduction && !allowSeed) {
  console.error('❌ Seeding disabled in production.');
  console.error('   Set ALLOW_SEED=true to override (use caution).');
  process.exit(1);
}

// ============================================================================
// CLI ARGUMENT PARSING
// ============================================================================

interface SeedOptions {
  months: number;
  transactions: number;
  recurringTemplates: number;
  primaryCurrency: string;
  secondaryCurrency: string;
}

function parseArgs(): SeedOptions & {
  showHelp: boolean;
  isLegacyBenchmark: boolean;
  isLegacyStress: boolean;
} {
  const args = process.argv.slice(2);

  // Check for help
  if (args.includes('--help') || args.includes('-h')) {
    return {
      months: 6,
      transactions: 0,
      recurringTemplates: 0,
      primaryCurrency: 'IDR',
      secondaryCurrency: 'USD',
      showHelp: true,
      isLegacyBenchmark: false,
      isLegacyStress: false,
    };
  }

  // Check for legacy flags (for CI compatibility)
  const isLegacyBenchmark = args.includes('--benchmark');
  const isLegacyStress = args.includes('--stress');

  // Parse --months=N
  let months = 6;
  const monthsArg = args.find((arg) => arg.startsWith('--months='));
  if (monthsArg) {
    const value = parseInt(monthsArg.split('=')[1], 10);
    if (!isNaN(value) && value >= 0) {
      months = value;
    }
  }

  // Parse --transactions=N
  let transactions = 0;
  const transactionsArg = args.find((arg) => arg.startsWith('--transactions='));
  if (transactionsArg) {
    const value = parseInt(transactionsArg.split('=')[1], 10);
    if (!isNaN(value) && value >= 0) {
      transactions = value;
    }
  }

  // Parse currencies
  let primaryCurrency = 'IDR';
  const primaryCurrencyArg = args.find((arg) => arg.startsWith('--primary-currency='));
  if (primaryCurrencyArg) {
    const val = primaryCurrencyArg.split('=')[1].toUpperCase();
    if (!/^[A-Z]{3}$/.test(val)) {
      console.error(`❌ Invalid primary currency: ${val}. Must be a 3-letter code (e.g. IDR).`);
      process.exit(1);
    }
    primaryCurrency = val;
  }

  let secondaryCurrency = 'USD';
  const secondaryCurrencyArg = args.find((arg) => arg.startsWith('--secondary-currency='));
  if (secondaryCurrencyArg) {
    const val = secondaryCurrencyArg.split('=')[1].toUpperCase();
    if (!/^[A-Z]{3}$/.test(val)) {
      console.error(`❌ Invalid secondary currency: ${val}. Must be a 3-letter code (e.g. USD).`);
      process.exit(1);
    }
    secondaryCurrency = val;
  }

  // Legacy flag mappings
  if (isLegacyBenchmark) {
    months = 12;
    transactions = 10000;
  }

  if (isLegacyStress) {
    months = 60;
    transactions = 0; // Stress mode handles its own transaction generation
  }

  return {
    months,
    transactions,
    recurringTemplates: isLegacyBenchmark ? 20 : 0,
    primaryCurrency,
    secondaryCurrency,
    showHelp: false,
    isLegacyBenchmark,
    isLegacyStress,
  };
}

function showHelp() {
  console.log(`
Database Seeder

Usage: bun run db:seed [options]

Options:
  --months=N               Seed transactions for this many months (default: 6)
  --transactions=N         Seed this many extra transactions (default: 0)
  --primary-currency=CUR   Set primary currency (default: IDR)
  --secondary-currency=CUR Set secondary currency (default: USD)
  --benchmark              Legacy: adds 10,000 transactions over 12 months
  --stress                 Legacy: generates 5 years of family data
  --help, -h               Show this help message

Examples:
  bun run db:seed                                   # Default: 6 months of base data
  bun run db:seed --primary-currency=EUR --secondary-currency=GBP
  bun run db:seed --months=6                        # 6 months of base data
  bun run db:seed --months=12 --transactions=5000   # 12 months + 5000 extra transactions
  bun run db:seed --benchmark                       # Legacy CI mode: 12 months + ~10k transactions
  bun run db:seed --stress                          # 5 years of family history
`);
  process.exit(0);
}

// ============================================================================
// CLEAR TABLES
// ============================================================================

/**
 * Clear all existing data from all tables
 */
async function clearAllTables() {
  console.log('⚠️  Clearing existing data...');

  try {
    // Disable FK checks during cleanup to avoid ordering issues
    const config = getDatabaseConfig();
    const { dialect } = config;
    if (dialect === 'sqlite' && !config.isD1) {
      db.run(sql`PRAGMA foreign_keys = OFF`);
    }

    // Delete in reverse dependency order
    await db.delete(auditLogs);
    await db.delete(passwordResetTokens);
    await db.delete(sessions);
    await db.delete(accountSnapshotItems);
    await db.delete(accountSnapshots);
    await db.delete(accountUpdateReminders);
    await db.delete(accountHistory);
    await db.delete(recurringOccurrences);
    await db.delete(recurringTemplates);
    await db.delete(transactions);
    await db.delete(budgets);
    await db.delete(accounts);
    await db.delete(accountCategories);
    await db.delete(categories);
    await db.delete(userMeta);
    // Better Auth tables (must be deleted before app users due to FK relationships)
    await db.delete(passkey);
    await db.delete(twoFactor);
    await db.delete(account);
    await db.delete(betterAuthSession);
    await db.delete(verification);
    await db.delete(user);
    await db.delete(users);
    await db.delete(workspaceMeta);
    await db.delete(workspaces);

    // Re-enable FK checks
    if (dialect === 'sqlite' && !config.isD1) {
      db.run(sql`PRAGMA foreign_keys = ON`);
    }

    // Run VACUUM to clean up the database and reclaim space (SQLite only, not D1)
    if (dialect === 'sqlite' && !config.isD1) {
      console.log('🧹 Vacuuming database...');
      db.run(sql`VACUUM`);
    }

    console.log('✓ All tables cleared');
  } catch (error) {
    if (error instanceof Error && error.message.includes('no such table')) {
      console.error('❌ Database tables not found.');
      console.error("💡 Run 'bun run db:reset' to create tables.");
      process.exit(1);
    }
    throw error;
  }
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

/**
 * Main seed function - orchestrates all seeding operations
 */
async function seed() {
  const options = parseArgs();

  if (options.showHelp) {
    showHelp();
  }

  setSeederConfig({
    PRIMARY_CURRENCY: options.primaryCurrency,
    SECONDARY_CURRENCY: options.secondaryCurrency,
  });

  console.log('🌱 Starting database seed...\n');
  console.log(
    `   Configuration: ${options.months} months, ${options.transactions} extra transactions`
  );
  console.log(
    `   Currencies: ${options.primaryCurrency} (Primary), ${options.secondaryCurrency} (Secondary)`
  );
  if (options.isLegacyBenchmark) {
    console.log('   (Legacy --benchmark mode enabled)');
  }
  if (options.isLegacyStress) {
    console.log('   (Legacy --stress mode enabled)');
  }
  console.log();

  const startTime = Date.now();

  try {
    // Clear existing data
    await clearAllTables();

    // Seed in dependency order
    const workspaceId = await seedWorkspace();
    const { adminUserId, memberUserId }: SeededUsers = await seedUsers(workspaceId);
    await seedPasskeys(adminUserId, memberUserId);
    const categoryMap = await seedCategories(workspaceId, adminUserId);
    const accountCategoryMap = await seedAccountCategories(workspaceId, adminUserId);

    // Calculate months to seed for base data
    // If stress mode, we use 3 months for base data, then stress data handles the rest
    const baseMonths = options.isLegacyStress ? 3 : options.months;
    const monthsToSeed = getTrailingMonths(baseMonths);

    // Seed budgets for expense categories
    await seedBudgets(workspaceId, adminUserId, categoryMap, monthsToSeed);

    // Seed accounts FIRST (transactions now depend on accounts)
    const accountMap = await seedAccounts(
      workspaceId,
      adminUserId,
      memberUserId,
      accountCategoryMap
    );

    // Seed base transactions
    await seedIncomeTransactions(
      workspaceId,
      adminUserId,
      memberUserId,
      categoryMap,
      accountMap,
      monthsToSeed
    );
    await seedExpenseTransactions(workspaceId, adminUserId, categoryMap, accountMap, monthsToSeed);
    await seedTransferTransactions(workspaceId, adminUserId, accountMap, monthsToSeed);

    // Seed member transactions
    await seedMemberTransactions(workspaceId, memberUserId, categoryMap, accountMap, monthsToSeed);

    // Seed audit trail
    await seedTransactionAuditLogs(workspaceId, adminUserId, memberUserId);

    // Seed recurring templates + occurrences
    await seedRecurringData(workspaceId, adminUserId, categoryMap, accountMap);

    // Seed account-related data
    await seedAccountHistory(accountMap);
    await seedAccountUpdateReminders(workspaceId, adminUserId, accountMap);
    await seedAccountSnapshots(workspaceId, adminUserId, accountMap, monthsToSeed);

    // Backfill initial_balance for any accounts that don't have it
    await backfillInitialBalance();

    // Bulk/benchmark transactions (if requested)
    if (options.transactions > 0 && !options.isLegacyStress) {
      const bulkOptions: BulkSeedOptions = {
        transactionCount: options.transactions,
        monthsCount: options.months,
        recurringTemplateCount: options.recurringTemplates,
      };
      await seedBulkTransactions(workspaceId, adminUserId, categoryMap, accountMap, bulkOptions);
    }

    // Stress mode: 5 years of realistic family activity
    if (options.isLegacyStress) {
      await seedStressData(
        workspaceId,
        adminUserId,
        memberUserId,
        categoryMap,
        accountMap,
        options.months
      );
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n✅ Database seeded successfully in ${elapsed}s!`);
    console.log(`   📊 Base data: ${baseMonths} months of transactions`);
    if (options.transactions > 0) {
      console.log(`   📈 Bulk data: ~${options.transactions} extra transactions`);
    }
    if (options.isLegacyStress) {
      console.log(`   🔥 Stress data: ${options.months} months of family activity`);
    }

    console.log('\n📋 Demo Credentials:');
    console.log('\n   Dad User:');
    console.log(`   Email:    ${DEMO_ADMIN.email}`);
    console.log(`   Password: ${DEMO_ADMIN.password}`);
    console.log('\n   Mom User:');
    console.log(`   Email:    ${DEMO_MEMBER.email}`);
    console.log(`   Password: ${DEMO_MEMBER.password}`);
    if (options.isLegacyStress) {
      console.log('\n   Additional Family Members:');
      console.log('   Email:    teen@example.com');
      console.log('   Password: demo123456789');
      console.log('   Email:    youngest@example.com');
      console.log('   Password: demo123456789');
    }
    console.log('\n   Super Admin User:');
    console.log(`   Email:    ${DEMO_SUPER_ADMIN.email}`);
    console.log(`   Password: ${DEMO_SUPER_ADMIN.password}`);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seed function
seed();
