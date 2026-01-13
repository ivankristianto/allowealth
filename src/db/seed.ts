/**
 * Database Seeder
 *
 * Seeds the database with realistic sample data for testing and development.
 * Can be run multiple times - will clear existing data before seeding.
 *
 * Usage: bun run src/db/seed.ts
 */

/* eslint-disable no-console -- Console output is intentional for seeder progress feedback */

import { db } from './index';
import { nanoid } from 'nanoid';
import { hashPassword } from '@/lib/auth/password';
import { sql } from 'drizzle-orm';
import {
  users,
  userSettings,
  categories,
  paymentMethods,
  transactions,
  assets,
  assetHistory,
  assetUpdateReminders,
  assetSnapshots,
  assetSnapshotItems,
  exchangeRates,
  sessions,
  passwordResetTokens,
} from './schema';

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEMO_USER = {
  email: 'demo@example.com',
  password: 'demo123456789', // Must be at least 12 chars for Argon2id
  name: 'Demo User',
};

// Seeding configuration constants
const SEED_TIME_HOUR = 10; // 10 AM to avoid timezone boundary issues
const SNAPSHOT_GROWTH_RATE = 0.05; // 5% growth per month for snapshots

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate a date N days ago
 */
function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(SEED_TIME_HOUR, 0, 0, 0); // Set to 10 AM for consistency
  return date;
}

/**
 * Format amount as string (for Decimal.js compatibility)
 */
function amt(amount: number): string {
  return amount.toString();
}

/**
 * Generate random amount within range
 */
function randomAmount(min: number, max: number): string {
  return amt(min + Math.random() * (max - min));
}

// ============================================================================
// DATA TEMPLATES
// ============================================================================

const INCOME_CATEGORIES = [
  { name: 'Salary', budget: 0 },
  { name: 'Freelance', budget: 0 },
  { name: 'Investment Returns', budget: 0 },
  { name: 'Other Income', budget: 0 },
];

const EXPENSE_CATEGORIES = [
  { name: 'Groceries', budget: 3000000 },
  { name: 'Rent', budget: 8000000 },
  { name: 'Utilities', budget: 1500000 },
  { name: 'Transportation', budget: 1000000 },
  { name: 'Dining Out', budget: 2000000 },
  { name: 'Shopping', budget: 2500000 },
  { name: 'Healthcare', budget: 1000000 },
  { name: 'Entertainment', budget: 1500000 },
  { name: 'Education', budget: 2000000 },
  { name: 'Insurance', budget: 1500000 },
  { name: 'Subscriptions', budget: 500000 },
];

const PAYMENT_METHODS = [
  { name: 'Cash', type: 'cash' as const },
  { name: 'BCA Debit', type: 'debit_card' as const },
  { name: 'BCA Credit Card', type: 'credit_card' as const },
  { name: 'GoPay', type: 'e_wallet' as const },
  { name: 'OVO', type: 'e_wallet' as const },
];

const ASSET_TYPES = [
  { name: 'BCA Checking', type: 'bank_account' as const, balance: 15000000 },
  { name: 'BCA Savings', type: 'bank_account' as const, balance: 50000000 },
  { name: 'Reksa Dana BCAP', type: 'mutual_fund' as const, balance: 25000000 },
  { name: 'Stock - BBRI', type: 'stock' as const, balance: 12000000 },
  { name: 'Stock - BBCA', type: 'stock' as const, balance: 18000000 },
  { name: 'Bitcoin', type: 'crypto' as const, balance: 45000000 },
];

// Indonesian expense patterns for realistic transaction data
const EXPENSE_PATTERNS: Array<{
  category: string;
  description: string[];
  amountRange: [number, number];
  frequency: number; // Probability per day (0-1)
}> = [
  {
    category: 'Groceries',
    description: ['Supermarket', 'Fresh Market', 'Ranch Market', 'Lotte Mart'],
    amountRange: [200000, 800000],
    frequency: 0.3,
  },
  {
    category: 'Dining Out',
    description: ['Lunch', 'Dinner', 'Coffee', 'Snacks', 'GrabFood', 'GoFood'],
    amountRange: [30000, 200000],
    frequency: 0.6,
  },
  {
    category: 'Transportation',
    description: ['GoRide', 'Grab', 'Bensin', 'Parking', 'Toll'],
    amountRange: [15000, 100000],
    frequency: 0.5,
  },
  {
    category: 'Shopping',
    description: ['Tokopedia', 'Shopee', 'Lazada', 'Toko ABC', 'Online Shopping'],
    amountRange: [100000, 1500000],
    frequency: 0.2,
  },
  {
    category: 'Utilities',
    description: ['Electricity Bill', 'Water Bill', 'Internet Bill', 'Gas'],
    amountRange: [200000, 800000],
    frequency: 0.1,
  },
  {
    category: 'Entertainment',
    description: ['Netflix', 'Spotify', 'Movie Tickets', 'Concert', 'Games'],
    amountRange: [50000, 500000],
    frequency: 0.15,
  },
  {
    category: 'Healthcare',
    description: ['Pharmacy', 'Doctor Visit', 'Vitamins', 'Medicine'],
    amountRange: [100000, 800000],
    frequency: 0.1,
  },
  {
    category: 'Education',
    description: ['Online Course', 'Books', 'Workshop', 'Training'],
    amountRange: [200000, 2000000],
    frequency: 0.05,
  },
  {
    category: 'Insurance',
    description: ['Health Insurance', 'Life Insurance', 'Car Insurance'],
    amountRange: [500000, 2000000],
    frequency: 0.08,
  },
  {
    category: 'Subscriptions',
    description: ['Netflix', 'Spotify', 'YouTube Premium', 'Cloud Storage'],
    amountRange: [50000, 200000],
    frequency: 0.05,
  },
];

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

/**
 * Clear all existing data from all tables
 */
async function clearAllTables() {
  console.log('⚠️  Clearing existing data...');

  try {
    // Delete in reverse dependency order
    await db.delete(passwordResetTokens);
    await db.delete(sessions);
    await db.delete(assetSnapshotItems);
    await db.delete(assetSnapshots);
    await db.delete(assetUpdateReminders);
    await db.delete(assetHistory);
    await db.delete(assets);
    await db.delete(transactions);
    await db.delete(paymentMethods);
    await db.delete(categories);
    await db.delete(userSettings);
    await db.delete(users);
    await db.delete(exchangeRates);

    // Run VACUUM to clean up the database and reclaim space
    // This helps prevent I/O errors on subsequent operations
    console.log('🧹 Vacuuming database...');
    await db.run(sql`VACUUM`);

    console.log('✓ All tables cleared');
  } catch (error) {
    if (error instanceof Error && error.message.includes('no such table')) {
      console.error('❌ Database tables not found.');
      console.error('💡 Run `bun run db:reset` to create tables first.');
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Seed users and user settings
 */
async function seedUsers(): Promise<string> {
  console.log('👤 Seeding users...');

  const userId = nanoid();
  const passwordHash = await hashPassword(DEMO_USER.password);

  await db.insert(users).values({
    id: userId,
    email: DEMO_USER.email,
    password_hash: passwordHash,
    name: DEMO_USER.name,
    created_at: new Date(),
    updated_at: new Date(),
  });

  await db.insert(userSettings).values({
    user_id: userId,
    primary_currency: 'IDR',
    show_converted_totals: true,
    show_individual_currencies: true,
    created_at: new Date(),
    updated_at: new Date(),
  });

  console.log(`✓ Created user: ${DEMO_USER.email}`);
  return userId;
}

/**
 * Seed categories (income and expense)
 */
async function seedCategories(userId: string): Promise<Map<string, string>> {
  console.log('🏷️  Seeding categories...');

  const categoryMap = new Map<string, string>();

  // Income categories
  for (const cat of INCOME_CATEGORIES) {
    const id = nanoid();
    await db.insert(categories).values({
      id,
      user_id: userId,
      name: cat.name,
      type: 'income',
      percentage: '0',
      budget_amount: amt(cat.budget),
      currency: 'IDR',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });
    categoryMap.set(cat.name, id);
  }

  // Expense categories
  for (const cat of EXPENSE_CATEGORIES) {
    const id = nanoid();
    await db.insert(categories).values({
      id,
      user_id: userId,
      name: cat.name,
      type: 'expense',
      percentage: '0',
      budget_amount: amt(cat.budget),
      currency: 'IDR',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });
    categoryMap.set(cat.name, id);
  }

  console.log(`✓ Created ${categoryMap.size} categories`);
  return categoryMap;
}

/**
 * Seed payment methods
 */
async function seedPaymentMethods(userId: string): Promise<Map<string, string>> {
  console.log('💳 Seeding payment methods...');

  const methodMap = new Map<string, string>();

  for (const method of PAYMENT_METHODS) {
    const id = nanoid();
    await db.insert(paymentMethods).values({
      id,
      user_id: userId,
      name: method.name,
      type: method.type,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });
    methodMap.set(method.name, id);
  }

  console.log(`✓ Created ${methodMap.size} payment methods`);
  return methodMap;
}

/**
 * Seed transactions (90 days of realistic data)
 */
async function seedTransactions(
  userId: string,
  categoryMap: Map<string, string>,
  methodMap: Map<string, string>
): Promise<void> {
  console.log('💸 Seeding transactions...');

  const methodNames = Array.from(methodMap.keys());
  let transactionCount = 0;

  // Generate transactions for the past 90 days
  for (let day = 0; day < 90; day++) {
    const transactionDate = daysAgo(day);
    const isSalaryDay = transactionDate.getDate() === 25; // Monthly salary on 25th

    // Add salary transaction
    if (isSalaryDay) {
      await db.insert(transactions).values({
        id: nanoid(),
        user_id: userId,
        category_id: categoryMap.get('Salary')!,
        payment_method_id: methodMap.get('BCA Debit')!,
        type: 'income',
        amount: amt(15000000), // 15 million IDR monthly salary
        currency: 'IDR',
        description: 'Monthly Salary',
        transaction_date: transactionDate,
        created_at: transactionDate,
        updated_at: transactionDate,
      });
      transactionCount++;
    }

    // Add 3-5 expense transactions per day
    const dailyTransactions = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < dailyTransactions; i++) {
      // Select a random expense pattern
      const pattern = EXPENSE_PATTERNS[Math.floor(Math.random() * EXPENSE_PATTERNS.length)];
      if (!pattern) continue;

      // Skip if this category doesn't exist
      const categoryId = categoryMap.get(pattern.category);
      if (!categoryId) continue;

      // Random amount within range
      const [min, max] = pattern.amountRange;
      const amount = randomAmount(min, max);

      // Random description
      const description =
        pattern.description[Math.floor(Math.random() * pattern.description.length)];

      // Random payment method (prefer debit/credit for larger amounts)
      const randomMethodIndex = Math.floor(Math.random() * methodNames.length);
      const selectedMethod = methodNames[randomMethodIndex];
      if (!selectedMethod) continue;

      let methodName = selectedMethod;
      if (parseFloat(amount) > 500000) {
        methodName = Math.random() > 0.5 ? 'BCA Debit' : 'BCA Credit Card';
      }

      const paymentMethodId = methodMap.get(methodName);
      if (!paymentMethodId) continue;

      // TypeScript needs explicit non-null assertion after continue
      const methodId: string = paymentMethodId;

      await db.insert(transactions).values({
        id: nanoid(),
        user_id: userId,
        category_id: categoryId,
        payment_method_id: methodId,
        type: 'expense',
        amount,
        currency: 'IDR',
        description,
        transaction_date: transactionDate,
        created_at: transactionDate,
        updated_at: transactionDate,
      });
      transactionCount++;
    }

    // Occasional freelance income (5% chance)
    if (Math.random() < 0.05) {
      await db.insert(transactions).values({
        id: nanoid(),
        user_id: userId,
        category_id: categoryMap.get('Freelance')!,
        payment_method_id: methodMap.get('BCA Debit')!,
        type: 'income',
        amount: randomAmount(1000000, 5000000),
        currency: 'IDR',
        description: 'Freelance Project',
        transaction_date: transactionDate,
        created_at: transactionDate,
        updated_at: transactionDate,
      });
      transactionCount++;
    }
  }

  console.log(`✓ Created ${transactionCount} transactions over 90 days`);
}

/**
 * Seed assets
 */
async function seedAssets(userId: string): Promise<Map<string, string>> {
  console.log('💰 Seeding assets...');

  const assetMap = new Map<string, string>();

  for (const asset of ASSET_TYPES) {
    const id = nanoid();
    await db.insert(assets).values({
      id,
      user_id: userId,
      name: asset.name,
      type: asset.type,
      balance: amt(asset.balance),
      currency: 'IDR',
      last_updated: new Date(),
      created_at: daysAgo(90),
      updated_at: new Date(),
    });
    assetMap.set(asset.name, id);
  }

  console.log(`✓ Created ${assetMap.size} assets`);
  return assetMap;
}

/**
 * Seed asset history (weekly updates for 12 weeks)
 */
async function seedAssetHistory(assetMap: Map<string, string>): Promise<void> {
  console.log('📈 Seeding asset history...');

  let historyCount = 0;

  for (const [assetName, assetId] of assetMap.entries()) {
    // Generate weekly history for 12 weeks
    for (let week = 0; week < 12; week++) {
      const recordedAt = daysAgo(week * 7);
      const baseBalance = parseFloat(
        ASSET_TYPES.find((a) => a.name === assetName)!.balance.toString()
      );

      // Add some variation to the balance
      const variation = (Math.random() - 0.5) * baseBalance * 0.1; // ±5% variation
      const balance = amt(baseBalance + variation);

      await db.insert(assetHistory).values({
        id: nanoid(),
        asset_id: assetId,
        balance,
        notes: `Weekly balance update - ${new Date(recordedAt).toLocaleDateString()}`,
        recorded_at: recordedAt,
      });
      historyCount++;
    }
  }

  console.log(`✓ Created ${historyCount} asset history entries`);
}

/**
 * Seed asset update reminders
 */
async function seedAssetUpdateReminders(
  userId: string,
  assetMap: Map<string, string>
): Promise<void> {
  console.log('🔔 Seeding asset update reminders...');

  for (const [assetName, assetId] of assetMap.entries()) {
    // Set different frequencies based on asset type
    const assetType = ASSET_TYPES.find((a) => a.name === assetName)!.type;
    let frequency: 'weekly' | 'monthly' | 'quarterly' = 'monthly';

    if (assetType === 'crypto' || assetType === 'stock') {
      frequency = 'weekly';
    } else if (assetType === 'mutual_fund') {
      frequency = 'monthly';
    } else {
      frequency = 'monthly';
    }

    const nextReminder = new Date();
    nextReminder.setDate(nextReminder.getDate() + 7); // Reminder in a week

    await db.insert(assetUpdateReminders).values({
      id: nanoid(),
      user_id: userId,
      asset_id: assetId,
      frequency,
      last_updated: new Date(),
      next_reminder: nextReminder,
      is_dismissed: false,
      created_at: new Date(),
    });
  }

  console.log(`✓ Created ${assetMap.size} asset update reminders`);
}

/**
 * Seed asset snapshots (3 monthly snapshots)
 */
async function seedAssetSnapshots(userId: string, assetMap: Map<string, string>): Promise<void> {
  console.log('📸 Seeding asset snapshots...');

  const now = new Date();

  // Create 3 monthly snapshots
  for (let month = 0; month < 3; month++) {
    const snapshotDate = new Date(now.getFullYear(), now.getMonth() - month, 1);

    const snapshotId = nanoid();
    await db.insert(assetSnapshots).values({
      id: snapshotId,
      user_id: userId,
      snapshot_date: snapshotDate,
      month: snapshotDate.getMonth() + 1,
      year: snapshotDate.getFullYear(),
      notes: `Monthly snapshot - ${snapshotDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      created_at: snapshotDate,
    });

    // Add snapshot items for each asset
    for (const [assetName, assetId] of assetMap.entries()) {
      const baseBalance = parseFloat(
        ASSET_TYPES.find((a) => a.name === assetName)!.balance.toString()
      );

      // Add some historical variation
      const variation = (Math.random() - 0.5) * baseBalance * 0.15; // ±7.5% variation
      const balance = amt(baseBalance + variation + month * baseBalance * SNAPSHOT_GROWTH_RATE); // Growing trend

      await db.insert(assetSnapshotItems).values({
        id: nanoid(),
        snapshot_id: snapshotId,
        asset_id: assetId,
        balance,
        currency: 'IDR',
      });
    }
  }

  console.log('✓ Created 3 asset snapshots with items');
}

/**
 * Seed exchange rates (IDR/USD for last 90 days)
 */
async function seedExchangeRates(): Promise<void> {
  console.log('💱 Seeding exchange rates...');

  // Base rate: ~1 USD = 15,500 IDR (with daily variation)
  const baseRate = 15500;

  for (let day = 0; day < 90; day++) {
    const effectiveDate = daysAgo(day);

    // Add variation to the rate
    const variation = (Math.random() - 0.5) * 200; // ±100 IDR variation
    const rate = amt(baseRate + variation);

    await db.insert(exchangeRates).values({
      id: nanoid(),
      from_currency: 'USD',
      to_currency: 'IDR',
      rate,
      effective_date: effectiveDate,
      created_at: effectiveDate,
    });
  }

  console.log('✓ Created 90 exchange rate entries');
}

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

/**
 * Main seed function - orchestrates all seeding operations
 */
async function seed() {
  console.log('🌱 Starting database seed...\n');

  const startTime = Date.now();

  try {
    // Clear existing data
    await clearAllTables();

    // Seed in dependency order
    const userId = await seedUsers();
    const categoryMap = await seedCategories(userId);
    const methodMap = await seedPaymentMethods(userId);
    await seedTransactions(userId, categoryMap, methodMap);
    const assetMap = await seedAssets(userId);
    await seedAssetHistory(assetMap);
    await seedAssetUpdateReminders(userId, assetMap);
    await seedAssetSnapshots(userId, assetMap);
    await seedExchangeRates();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n✅ Database seeded successfully in ${elapsed}s!`);
    console.log('\n📋 Demo Credentials:');
    console.log(`   Email:    ${DEMO_USER.email}`);
    console.log(`   Password: ${DEMO_USER.password}`);
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seed function
seed();
