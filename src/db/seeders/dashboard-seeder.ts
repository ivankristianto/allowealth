/**
 * Dashboard Database Seeder
 *
 * Focused seeder for testing dashboard functionality.
 * Creates realistic test data including:
 * - Test user account
 * - Categories with budgets
 * - Payment methods
 * - 20-30 transactions over 3 months
 * - 5-10 assets with different update dates
 * - Exchange rates
 *
 * Usage: bun run db:seed:dashboard
 */

/* eslint-disable no-console -- Console output is intentional for seeder progress feedback */

import { db } from '../index';
import { nanoid } from 'nanoid';
import { Scrypt } from 'oslo/password';
import {
  users,
  userSettings,
  categories,
  paymentMethods,
  transactions,
  assets,
  exchangeRates,
  sessions,
  passwordResetTokens,
} from '../schema';

// ============================================================================
// CONFIGURATION
// ============================================================================

const TEST_USER = {
  email: 'test@example.com',
  password: 'Test12345678!',
  name: 'Test User',
};

// Scrypt parameters (matches Lucia Auth defaults)
const SCRYPT_PARAMS = {
  N: 16384,
  r: 16,
  p: 1,
  dkLen: 32,
};

const SEED_TIME_HOUR = 10; // 10 AM to avoid timezone boundary issues

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Hash password using scrypt (same as Lucia Auth)
 */
async function hashPassword(password: string): Promise<string> {
  const scrypt = new Scrypt(SCRYPT_PARAMS);
  return await scrypt.hash(password);
}

/**
 * Generate a date N days ago
 */
function daysAgo(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(SEED_TIME_HOUR, 0, 0, 0);
  return date;
}

/**
 * Format amount as string
 */
function amt(amount: number): string {
  return amount.toString();
}

/**
 * Generate random amount within range
 */
function randomAmount(min: number, max: number): string {
  const amount = min + Math.random() * (max - min);
  // Round to thousands for cleaner IDR amounts
  return amt(Math.round(amount / 1000) * 1000);
}

// ============================================================================
// DATA TEMPLATES
// ============================================================================

const INCOME_CATEGORIES = [
  { name: 'Salary', budget: 0 },
  { name: 'Freelance', budget: 0 },
  { name: 'Investment Returns', budget: 0 },
];

const EXPENSE_CATEGORIES = [
  { name: 'Food', budget: 5000000 },
  { name: 'Transport', budget: 2000000 },
  { name: 'Housing', budget: 10000000 },
  { name: 'Utilities', budget: 1500000 },
  { name: 'Entertainment', budget: 2000000 },
  { name: 'Healthcare', budget: 1000000 },
  { name: 'Shopping', budget: 3000000 },
  { name: 'Education', budget: 1500000 },
];

const PAYMENT_METHODS = [
  { name: 'Cash', type: 'cash' as const },
  { name: 'Bank Transfer', type: 'bank_transfer' as const },
  { name: 'Credit Card', type: 'credit_card' as const },
];

const ASSET_TYPES = [
  { name: 'BCA Checking', type: 'bank_account' as const, balance: 25000000 },
  { name: 'Mandiri Savings', type: 'bank_account' as const, balance: 45000000 },
  { name: 'Reksa Dana Schroder', type: 'mutual_fund' as const, balance: 35000000 },
  { name: 'Stock - BBCA', type: 'stock' as const, balance: 22000000 },
  { name: 'Bitcoin', type: 'crypto' as const, balance: 18000000 },
  { name: 'Cash on Hand', type: 'other' as const, balance: 5000000 },
];

const EXPENSE_PATTERNS: Array<{
  category: string;
  description: string[];
  amountRange: [number, number];
  frequency: number;
}> = [
  {
    category: 'Food',
    description: ['Grocery', 'Restaurant', 'Coffee', 'Snacks', 'Food Delivery'],
    amountRange: [50000, 500000],
    frequency: 0.6,
  },
  {
    category: 'Transport',
    description: ['Gasoline', 'Parking', 'Toll', 'Public Transport', 'Ride-hailing'],
    amountRange: [20000, 150000],
    frequency: 0.5,
  },
  {
    category: 'Housing',
    description: ['Rent Payment', 'Home Repair', 'Furniture', 'Cleaning Service'],
    amountRange: [500000, 3000000],
    frequency: 0.15,
  },
  {
    category: 'Utilities',
    description: ['Electricity', 'Water', 'Internet', 'Gas'],
    amountRange: [200000, 800000],
    frequency: 0.2,
  },
  {
    category: 'Entertainment',
    description: ['Movie', 'Concert', 'Games', 'Streaming Service', 'Hobby'],
    amountRange: [50000, 500000],
    frequency: 0.3,
  },
  {
    category: 'Healthcare',
    description: ['Pharmacy', 'Doctor', 'Vitamins', 'Hospital', 'Insurance'],
    amountRange: [100000, 1000000],
    frequency: 0.1,
  },
  {
    category: 'Shopping',
    description: ['Clothes', 'Electronics', 'Online Shopping', 'Books'],
    amountRange: [100000, 2000000],
    frequency: 0.25,
  },
  {
    category: 'Education',
    description: ['Course', 'Books', 'Workshop', 'Training', 'Tuition'],
    amountRange: [200000, 1500000],
    frequency: 0.1,
  },
];

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

/**
 * Clear existing data
 */
async function clearData() {
  console.log('⚠️  Clearing existing data...');

  try {
    // Delete in reverse dependency order to respect foreign key constraints
    await db.delete(passwordResetTokens);
    await db.delete(sessions);
    await db.delete(transactions);
    await db.delete(assets);
    await db.delete(paymentMethods);
    await db.delete(categories);
    await db.delete(userSettings);
    await db.delete(users);
    await db.delete(exchangeRates);

    console.log('✓ Data cleared');
  } catch (error) {
    if (error instanceof Error && error.message.includes('no such table')) {
      console.error('❌ Database tables not found.');
      console.error('💡 Run `bun run db:push` to create tables first.');
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Seed test user
 */
async function seedUser(): Promise<string> {
  console.log('👤 Seeding test user...');

  const userId = nanoid();
  const passwordHash = await hashPassword(TEST_USER.password);

  await db.insert(users).values({
    id: userId,
    email: TEST_USER.email,
    password_hash: passwordHash,
    name: TEST_USER.name,
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

  console.log(`✓ Created user: ${TEST_USER.email}`);
  return userId;
}

/**
 * Seed categories
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
 * Seed transactions (30 days of realistic data)
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
    const isSalaryDay = transactionDate.getDate() === 25;

    // Add monthly salary
    if (isSalaryDay) {
      await db.insert(transactions).values({
        id: nanoid(),
        user_id: userId,
        category_id: categoryMap.get('Salary')!,
        payment_method_id: methodMap.get('Bank Transfer')!,
        type: 'income',
        amount: amt(20000000), // 20 million IDR salary
        currency: 'IDR',
        description: 'Monthly Salary',
        transaction_date: transactionDate,
        created_at: transactionDate,
        updated_at: transactionDate,
      });
      transactionCount++;
    }

    // Add 2-4 expense transactions per day
    const dailyTransactions = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < dailyTransactions; i++) {
      const pattern = EXPENSE_PATTERNS[Math.floor(Math.random() * EXPENSE_PATTERNS.length)];
      if (!pattern) continue;

      const categoryId = categoryMap.get(pattern.category);
      if (!categoryId) continue;

      const [min, max] = pattern.amountRange;
      const amount = randomAmount(min, max);

      const description =
        pattern.description[Math.floor(Math.random() * pattern.description.length)];

      const methodName = methodNames[Math.floor(Math.random() * methodNames.length)];
      if (!methodName) continue;

      const paymentMethodId = methodMap.get(methodName);
      if (!paymentMethodId) continue;

      await db.insert(transactions).values({
        id: nanoid(),
        user_id: userId,
        category_id: categoryId,
        payment_method_id: paymentMethodId,
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

    // Occasional freelance income (8% chance)
    if (Math.random() < 0.08) {
      await db.insert(transactions).values({
        id: nanoid(),
        user_id: userId,
        category_id: categoryMap.get('Freelance')!,
        payment_method_id: methodMap.get('Bank Transfer')!,
        type: 'income',
        amount: randomAmount(2000000, 8000000),
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
 * Seed assets with different update dates
 */
async function seedAssets(userId: string): Promise<void> {
  console.log('💰 Seeding assets...');

  // Assets with different last_updated dates to test priority logic
  const assetsByAge: Array<{ asset: (typeof ASSET_TYPES)[0]; daysOld: number }> = [];

  for (const asset of ASSET_TYPES) {
    // Random days since last update (0-60 days)
    const daysOld = Math.floor(Math.random() * 60);
    assetsByAge.push({ asset, daysOld });
  }

  // Sort by days old (descending) - oldest first
  assetsByAge.sort((a, b) => b.daysOld - a.daysOld);

  for (const { asset, daysOld } of assetsByAge) {
    const id = nanoid();
    const lastUpdated = daysAgo(daysOld);

    await db.insert(assets).values({
      id,
      user_id: userId,
      name: asset.name,
      type: asset.type,
      balance: amt(asset.balance),
      currency: 'IDR',
      last_updated: lastUpdated,
      created_at: daysAgo(90),
      updated_at: lastUpdated,
    });
  }

  console.log(`✓ Created ${ASSET_TYPES.length} assets with varied update dates`);
}

/**
 * Seed exchange rates
 */
async function seedExchangeRates(): Promise<void> {
  console.log('💱 Seeding exchange rates...');

  // Base rate: ~1 USD = 15,500 IDR
  const baseRate = 15500;

  for (let day = 0; day < 90; day++) {
    const effectiveDate = daysAgo(day);

    // Add variation to the rate (±100 IDR)
    const variation = (Math.random() - 0.5) * 200;
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
 * Main seed function
 */
async function seed() {
  console.log('🌱 Starting dashboard seeder...\n');

  const startTime = Date.now();

  try {
    // Clear existing data
    await clearData();

    // Seed in dependency order
    const userId = await seedUser();
    const categoryMap = await seedCategories(userId);
    const methodMap = await seedPaymentMethods(userId);
    await seedTransactions(userId, categoryMap, methodMap);
    await seedAssets(userId);
    await seedExchangeRates();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n✅ Dashboard seeded successfully in ${elapsed}s!`);
    console.log('\n📋 Test User Credentials:');
    console.log(`   Email:    ${TEST_USER.email}`);
    console.log(`   Password: ${TEST_USER.password}`);
    console.log('\n💡 Now you can:');
    console.log('   1. Login at /login');
    console.log('   2. View dashboard at /dashboard');
    console.log('   3. Test all dashboard features');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run the seed function
seed();
