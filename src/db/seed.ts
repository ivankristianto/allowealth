/**
 * Database Seeder
 *
 * Seeds the database with realistic sample data for testing and development.
 * Can be run multiple times - will clear existing data before seeding.
 *
 * Usage: bun run src/db/seed.ts [--benchmark] [--stress]
 */

/* eslint-disable no-console -- Console output is intentional for seeder progress feedback */

import { db, getDatabaseConfig } from './index';
import { nanoid } from 'nanoid';
import { hashPassword } from '@/lib/auth/password';
import { eq, sql } from 'drizzle-orm';
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
} from './schema';
import { DEFAULT_ACCOUNT_CATEGORIES } from '@/lib/constants';
import { USER_META_KEYS } from '@/lib/constants/user-meta-keys';
import { WORKSPACE_META_KEYS, WORKSPACE_META_DEFAULTS } from '@/lib/constants/workspace-meta-keys';
import { deriveAccountClass } from '@/lib/types/account';
import {
  calculateDueDate,
  shouldGenerateOccurrence,
  generateInstallmentDescription,
} from '@/lib/utils/recurring-dates';

// ============================================================================
// PRODUCTION GUARD
// ============================================================================

const isProduction = import.meta.env.MODE === 'production';
const allowSeed = import.meta.env.ALLOW_SEED === 'true';

if (isProduction && !allowSeed) {
  console.error('❌ Seeding is disabled in production.');
  console.error('   Set ALLOW_SEED=true to override (use with caution).');
  process.exit(1);
}

// ============================================================================
// BENCHMARK MODE
// ============================================================================

const isBenchmarkMode = process.argv.includes('--benchmark');
const isStressMode = process.argv.includes('--stress');

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEMO_ADMIN = {
  email: 'demo@example.com',
  password: 'demo123456789', // Must be at least 12 chars
  name: 'Demo User',
  role: 'admin' as const,
};

const DEMO_MEMBER = {
  email: 'member@example.com',
  password: 'demo123456789', // Must be at least 12 chars
  name: 'Demo Member',
  role: 'member' as const,
};

const DEMO_SUPER_ADMIN = {
  email: 'superadmin@example.com',
  password: 'demo123456789', // Must be at least 12 chars
  name: 'Super Admin',
  role: 'super_admin' as const,
};

// Seeding configuration constants
const SEED_TIME_HOUR = 10; // 10 AM to avoid timezone boundary issues
const SNAPSHOT_GROWTH_RATE = 0.05; // 5% growth per month for snapshots

/**
 * Compute the 3 months to seed: current month + 2 previous months
 * Uses dynamic dates so seed data always includes the current month.
 */
function getSeedMonths(): Array<{ year: number; month: number }> {
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // 1-indexed
  const currentYear = now.getFullYear();

  return [
    // 2 months ago
    {
      year: currentMonth <= 2 ? currentYear - 1 : currentYear,
      month: currentMonth <= 2 ? currentMonth + 10 : currentMonth - 2,
    },
    // 1 month ago
    {
      year: currentMonth === 1 ? currentYear - 1 : currentYear,
      month: currentMonth === 1 ? 12 : currentMonth - 1,
    },
    // Current month
    { year: currentYear, month: currentMonth },
  ];
}

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
 * Generate a date for specific year, month, day
 * Returns null if the date would be in the future
 */
function specificDate(year: number, month: number, day: number): Date | null {
  const date = new Date(year, month - 1, day);
  date.setHours(SEED_TIME_HOUR, 0, 0, 0);

  // Don't create dates in the future
  const today = new Date();
  today.setHours(23, 59, 59, 999); // End of today
  if (date > today) {
    return null;
  }

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

/**
 * Execute raw SQL across sync/async DB driver variants.
 *
 * Some drivers type `db.run(...)` as sync while others are async; normalizing
 * to Promise keeps call sites consistent without changing runtime ordering.
 */
async function runRawSql(statement: ReturnType<typeof sql>): Promise<void> {
  await Promise.resolve(db.run(statement));
}

// ============================================================================
// DATA TEMPLATES
// ============================================================================

// Icon, color, and description mapping for categories (Lucide icons + DaisyUI semantic colors)
const CATEGORY_STYLES: Record<string, { icon: string; color: string; description?: string }> = {
  // Expense categories
  Holiday: {
    icon: 'plane',
    color: 'bg-secondary',
    description: 'Travel, vacations, and holiday-related expenses',
  },
  'Food & Groceries': {
    icon: 'shopping-basket',
    color: 'bg-info',
    description: 'Daily food shopping and grocery purchases',
  },
  'Dine Out': {
    icon: 'utensils',
    color: 'bg-warning',
    description: 'Restaurant meals and takeout orders',
  },
  'Work Support': { icon: 'briefcase', color: 'bg-neutral', description: 'Work-related expenses' },
  'Pocket Money': {
    icon: 'wallet',
    color: 'bg-secondary',
    description: 'Personal spending money and small allowances',
  },
  'Kids Expenses': {
    icon: 'user',
    color: 'bg-secondary',
    description: 'Education, activities, and supplies for children',
  },
  'Utility Bills': {
    icon: 'zap',
    color: 'bg-info',
    description: 'Electricity, water, internet, and phone bills',
  },
  'Misc. Cost': {
    icon: 'package',
    color: 'bg-neutral',
    description: 'Miscellaneous and uncategorized expenses',
  },
  Entertainment: {
    icon: 'smile',
    color: 'bg-secondary',
    description: 'Movies, games, and recreational activities',
  },
  'Housekeeper Salary': {
    icon: 'users',
    color: 'bg-accent',
    description: 'Household staff salaries',
  },
  Transportation: {
    icon: 'car',
    color: 'bg-secondary',
    description: 'Fuel, parking, tolls, and public transport',
  },
  'Installment Debt': {
    icon: 'home',
    color: 'bg-error',
    description: 'Monthly mortgage or loan payments',
  },
  'House Expenses': {
    icon: 'shopping-cart',
    color: 'bg-success',
    description: 'General household supplies and maintenance costs',
  },
  'House Renovation': {
    icon: 'hammer',
    color: 'bg-warning',
    description: 'Home improvement and renovation costs',
  },
  Insurance: {
    icon: 'shield',
    color: 'bg-info',
    description: 'Health, life, and property insurance premiums',
  },
  // Income categories
  'Dad Salary': { icon: 'banknote', color: 'bg-success', description: 'Monthly salary income' },
  'Mom Salary': { icon: 'banknote', color: 'bg-success', description: 'Monthly salary income' },
  'Side Business': {
    icon: 'banknote',
    color: 'bg-success',
    description: 'Income from freelance or side projects',
  },
  Dividend: { icon: 'banknote', color: 'bg-success', description: 'Investment dividend payments' },
  'Other Income': {
    icon: 'circle-dot',
    color: 'bg-primary',
    description: 'Miscellaneous income from various sources',
  },
};

// Expense categories with their budgets
const EXPENSE_CATEGORIES = [
  { name: 'Holiday', budget: 3000000 },
  { name: 'Food & Groceries', budget: 8000000 },
  { name: 'Dine Out', budget: 3000000 },
  { name: 'Utility Bills', budget: 2000000 },
  { name: 'Misc. Cost', budget: 2000000 },
  { name: 'Entertainment', budget: 1500000 },
  { name: 'Housekeeper Salary', budget: 6000000 },
  { name: 'Transportation', budget: 1500000 },
  { name: 'Installment Debt', budget: 8000000 },
  { name: 'House Expenses', budget: 3000000 },
  { name: 'House Renovation', budget: 5000000 },
  { name: 'Insurance', budget: 3000000 },
  { name: 'Kids Expenses', budget: 5000000 },
  { name: 'Pocket Money', budget: 1000000 },
  { name: 'Work Support', budget: 3000000 },
];

// Income categories
const INCOME_CATEGORIES = [{ name: 'Other Income', budget: 0 }];

interface RecurringTemplateSeed {
  name: string;
  type: 'expense' | 'income';
  amount: string;
  dayOfMonth: number;
  category: string;
  account: string;
  startDate: string;
  endDate?: string;
  totalOccurrences?: number;
  isInstallment?: boolean;
  installmentLabel?: string;
  startingOccurrenceNumber?: number;
  description?: string;
  status?: 'active' | 'paused' | 'completed' | 'cancelled';
}

const RECURRING_TEMPLATE_DATA: RecurringTemplateSeed[] = [
  {
    name: 'Rent',
    type: 'expense',
    amount: '5000000',
    dayOfMonth: 1,
    category: 'House Expenses',
    account: 'Transfer',
    totalOccurrences: 24,
    startDate: '2026-01-01',
  },
  {
    name: 'Netflix',
    type: 'expense',
    amount: '199000',
    dayOfMonth: 15,
    category: 'Entertainment',
    account: 'BCA Credit Card',
    totalOccurrences: 12,
    startDate: '2026-01-01',
  },
  {
    name: 'iPhone 17 Pro',
    type: 'expense',
    amount: '1500000',
    dayOfMonth: 20,
    category: 'Installment Debt',
    account: 'BCA Credit Card',
    totalOccurrences: 12,
    isInstallment: true,
    installmentLabel: 'Installment',
    startingOccurrenceNumber: 5,
    startDate: '2025-10-01',
  },
  {
    name: 'Gym Membership',
    type: 'expense',
    amount: '500000',
    dayOfMonth: 5,
    category: 'Misc. Cost',
    account: 'Cash',
    status: 'paused',
    startDate: '2026-01-01',
    totalOccurrences: 12,
  },
  {
    name: 'Monthly Salary',
    type: 'income',
    amount: '15000000',
    dayOfMonth: 25,
    category: 'Dad Salary',
    account: 'Transfer',
    endDate: '2027-12-31',
    startDate: '2026-01-01',
  },
];

// Payment accounts (used for daily transactions - cash, bank accounts, credit cards, e-wallets)
const PAYMENT_ACCOUNTS = [
  {
    name: 'Cash',
    type: 'cash' as const,
    balance: 2000000,
    currency: 'IDR' as const,
    is_cash_account: true,
  },
  {
    name: 'BCA Credit Card',
    type: 'credit_card' as const,
    balance: 5000000, // Outstanding debt
    currency: 'IDR' as const,
    is_cash_account: false,
    credit_limit: 50000000,
  },
  {
    name: 'Mandiri Credit Card',
    type: 'credit_card' as const,
    balance: 3200000, // Outstanding debt
    currency: 'IDR' as const,
    is_cash_account: false,
    credit_limit: 30000000,
  },
  {
    name: 'GoPay',
    type: 'e_wallet' as const,
    balance: 500000,
    currency: 'IDR' as const,
    is_cash_account: true,
  },
  {
    name: 'OVO',
    type: 'e_wallet' as const,
    balance: 300000,
    currency: 'IDR' as const,
    is_cash_account: true,
  },
  {
    name: 'Transfer',
    type: 'bank_account' as const,
    balance: 10000000,
    currency: 'IDR' as const,
    is_cash_account: true,
  },
];

// Debt accounts (loans - long-term liabilities)
const LOAN_ACCOUNTS = [
  {
    name: 'Home Mortgage - BSD',
    type: 'loan' as const,
    balance: 450000000, // Outstanding principal
    currency: 'IDR' as const,
  },
  {
    name: 'Car Loan - Innova',
    type: 'loan' as const,
    balance: 85000000,
    currency: 'IDR' as const,
  },
];

// Income transaction templates (repeated for each seeded month)
// Day values are capped to the month's last day automatically
const INCOME_TEMPLATES = [
  // Pattern A: current month
  [
    { description: 'Dad Salary', amount: 15000000, day: 25 },
    { description: 'Side Business', amount: 3500000, day: 5 },
    { description: 'Side Business', amount: 2500000, day: 10 },
    { description: 'Dad Salary', amount: 5000000, day: 15 },
    { description: 'Dad Salary', amount: 3000000, day: 20 },
    { description: 'Dividend', amount: 1500000, day: 8 },
    { description: 'Dividend', amount: 800000, day: 12 },
  ],
  // Pattern B: 1 month ago
  [
    { description: 'Dad Salary', amount: 15000000, day: 25 },
    { description: 'Side Business', amount: 2000000, day: 5 },
    { description: 'Side Business', amount: 4000000, day: 10 },
    { description: 'Mom Salary', amount: 3500000, day: 15 },
    { description: 'Mom Salary', amount: 2500000, day: 20 },
    { description: 'Side Business', amount: 3500000, day: 8 },
  ],
  // Pattern C: 2 months ago
  [
    { description: 'Dad Salary', amount: 15000000, day: 25 },
    { description: 'Side Business', amount: 2500000, day: 5 },
    { description: 'Dad Salary', amount: 5000000, day: 12 },
    { description: 'Dad Salary', amount: 3000000, day: 18 },
    { description: 'Dividend', amount: 1500000, day: 8 },
    { description: 'Dividend', amount: 800000, day: 15 },
  ],
];

// Expense transactions with categories and amounts
const EXPENSE_TRANSACTIONS: Array<{
  description: string;
  category: string;
  amount: number | [number, number]; // Fixed amount or range
  months?: number[]; // Specific months (1=Jan, 2=Feb, etc.) - if undefined, all months
}> = [
  // Regular monthly expenses
  {
    description: 'House Installment Payment 20/36',
    category: 'Installment Debt',
    amount: 8500000,
  },
  { description: 'Health Insurance - Dad', category: 'Insurance', amount: 500000 },
  { description: 'Health Insurance - Mom', category: 'Insurance', amount: 400000 },
  { description: 'Health Insurance', category: 'Insurance', amount: [300000, 500000] },
  { description: 'Internet', category: 'Utility Bills', amount: 450000 },
  { description: 'Subscriptions', category: 'Misc. Cost', amount: 250000 },
  { description: 'School Tuition - Kid 1', category: 'Kids Expenses', amount: [500000, 1500000] },
  { description: 'School Tuition - Kid 2', category: 'Kids Expenses', amount: [400000, 1200000] },
  { description: 'HOA Fee', category: 'Utility Bills', amount: [500000, 800000] },
  { description: 'Water Bill', category: 'Utility Bills', amount: [150000, 300000] },
  { description: 'Electricity', category: 'Utility Bills', amount: [800000, 1500000] },
  { description: 'Housekeeper Salary 1', category: 'Housekeeper Salary', amount: 1900000 },
  { description: 'Housekeeper Salary 2', category: 'Housekeeper Salary', amount: 2900000 },
  { description: 'Housekeeper Salary 3', category: 'Housekeeper Salary', amount: 4000000 },
  {
    description: 'Housekeeper Salary Bonus',
    category: 'Housekeeper Salary',
    amount: [2000000, 2500000],
  },
  { description: 'Health Insurance', category: 'Pocket Money', amount: [200000, 400000] },
  { description: 'Personal Care', category: 'Pocket Money', amount: [100000, 300000] },

  // Variable expenses
  { description: 'Home Decor', category: 'House Expenses', amount: [500000, 2000000] },
  { description: 'Pet Supplies', category: 'Misc. Cost', amount: [50000, 200000] },
  { description: 'Specialty Food', category: 'Food & Groceries', amount: [100000, 300000] },
  { description: 'Family Allowance', category: 'Misc. Cost', amount: [200000, 1000000] },
  { description: 'Fruit Shop', category: 'Food & Groceries', amount: [50000, 200000] },
  { description: 'Supermarket', category: 'Food & Groceries', amount: [200000, 800000] },
  { description: 'Bakery', category: 'Food & Groceries', amount: [150000, 400000] },
  { description: 'Minimarket', category: 'Food & Groceries', amount: [100000, 500000] },
  { description: 'Minimarket', category: 'Food & Groceries', amount: [150000, 600000] },
  { description: 'Snacks', category: 'Food & Groceries', amount: [30000, 150000] },
  { description: 'Fruit Market', category: 'Food & Groceries', amount: [100000, 400000] },
  { description: 'Bakery', category: 'Food & Groceries', amount: [50000, 150000] },
  { description: 'Pharmacy', category: 'Misc. Cost', amount: [100000, 500000] },
  { description: 'Health Store', category: 'Misc. Cost', amount: [150000, 600000] },
  { description: 'Electronics Repair', category: 'Misc. Cost', amount: [500000, 1500000] },
  { description: 'Market Groceries', category: 'Food & Groceries', amount: [200000, 700000] },
  { description: 'Supermarket', category: 'Food & Groceries', amount: [300000, 1000000] },
  { description: 'Market Cash', category: 'Food & Groceries', amount: [150000, 600000] },
  { description: 'Street Food', category: 'Food & Groceries', amount: [50000, 200000] },
  { description: 'Noodle Restaurant', category: 'Food & Groceries', amount: [80000, 200000] },
  { description: 'Bakery Cafe', category: 'Food & Groceries', amount: [50000, 150000] },
  { description: 'Breakfast Street Food', category: 'Food & Groceries', amount: [40000, 120000] },
  { description: 'Pharmacy', category: 'Food & Groceries', amount: [50000, 150000] },
  { description: 'Pet Food', category: 'House Expenses', amount: [100000, 300000] },
  { description: 'Water Delivery', category: 'Food & Groceries', amount: [60000, 80000] },
  { description: 'Juice Bar', category: 'Food & Groceries', amount: [30000, 80000] },
  { description: 'Fruits', category: 'Food & Groceries', amount: [100000, 400000] },

  // Dining out
  { description: 'Ramen Seirockya', category: 'Dine Out', amount: [80000, 150000] },
  { description: 'Makmal', category: 'Dine Out', amount: [100000, 300000] },
  { description: 'Titik Beku Cafe', category: 'Dine Out', amount: [100000, 250000] },
  { description: 'Paulaners', category: 'Dine Out', amount: [150000, 400000] },
  { description: 'Makan di GI', category: 'Dine Out', amount: [200000, 500000] },
  { description: 'Mie Gacoan', category: 'Dine Out', amount: [60000, 150000] },

  // Holiday/Travel
  { description: 'Shopping - City', category: 'Holiday', amount: [300000, 1500000] },
  { description: 'Bakery - City', category: 'Holiday', amount: [100000, 300000] },
  { description: 'Kitchen Store', category: 'Holiday', amount: [150000, 400000] },
  { description: 'Attraction Tickets', category: 'Holiday', amount: [100000, 300000] },
  { description: 'Coffee Shop', category: 'Holiday', amount: [50000, 100000] },
  { description: 'Adventure Activities', category: 'Holiday', amount: [500000, 1500000] },
  { description: 'Local Treats', category: 'Holiday', amount: [50000, 150000] },
  { description: 'Coffee Stop', category: 'Holiday', amount: [80000, 200000] },
  { description: 'Restaurant', category: 'Holiday', amount: [150000, 400000] },
  { description: 'Hotel Extra Bed', category: 'Holiday', amount: [500000, 1000000] },
  { description: 'Fashion Outlet', category: 'Holiday', amount: [300000, 1000000] },
  { description: 'Restaurant', category: 'Holiday', amount: [150000, 400000] },
  { description: 'Souvenir Shop', category: 'Holiday', amount: [100000, 500000] },
  { description: 'Cafe', category: 'Holiday', amount: [200000, 600000] },
  { description: 'Restaurant', category: 'Holiday', amount: [150000, 500000] },
  { description: 'Hotel Stay', category: 'Holiday', amount: [2000000, 5000000] },
  { description: 'Rest Area', category: 'Holiday', amount: [80000, 200000] },
  { description: 'Coffee', category: 'Holiday', amount: [50000, 150000] },
  { description: 'Lunch', category: 'Holiday', amount: [150000, 400000] },
  { description: 'Noodle Restaurant', category: 'Holiday', amount: [80000, 200000] },
  { description: 'Night Food', category: 'Holiday', amount: [100000, 300000] },
  { description: 'Mall Shopping', category: 'Holiday', amount: [200000, 600000] },
  { description: 'Restaurant', category: 'Holiday', amount: [150000, 400000] },

  // Family expenses
  { description: 'Family Transfer 1', category: 'Kids Expenses', amount: [1000000, 3000000] },
  { description: 'Family Transfer 2', category: 'Kids Expenses', amount: [500000, 2000000] },
  { description: 'Home Maintenance', category: 'House Expenses', amount: [500000, 2000000] },
  { description: 'Family Transport', category: 'House Expenses', amount: [300000, 800000] },
  { description: 'Family Shopping', category: 'House Expenses', amount: [500000, 2000000] },
  { description: 'Home Accessories', category: 'House Expenses', amount: [200000, 600000] },
  { description: 'Weekend Coffee', category: 'Misc. Cost', amount: [80000, 200000] },
  { description: 'Software Subscription', category: 'Misc. Cost', amount: [100000, 300000] },
  {
    description: 'Software Subscription - Annual',
    category: 'Misc. Cost',
    amount: [100000, 300000],
    months: [1],
  },
  { description: 'Cafe', category: 'Misc. Cost', amount: [80000, 150000] },
  { description: 'Cafe', category: 'Misc. Cost', amount: [150000, 300000] },
  { description: 'Ramen Restaurant', category: 'Misc. Cost', amount: [100000, 250000] },
  { description: 'Haircut', category: 'Pocket Money', amount: [75000, 150000] },
  { description: 'Theme Park', category: 'Kids Expenses', amount: [300000, 800000] },
  { description: 'Arcade', category: 'Kids Expenses', amount: [200000, 500000] },
  { description: 'Cooking Class', category: 'Kids Expenses', amount: [150000, 400000] },
  { description: 'Books', category: 'Kids Expenses', amount: [200000, 500000] },
  { description: 'Language Course', category: 'Kids Expenses', amount: [500000, 1500000] },
  { description: 'Indoor Playground', category: 'Kids Expenses', amount: [300000, 700000] },
  { description: 'Play Center', category: 'Kids Expenses', amount: [250000, 600000] },
  { description: 'Tutoring', category: 'Kids Expenses', amount: [100000, 300000] },
  { description: 'Personal Care', category: 'Kids Expenses', amount: [50000, 150000] },

  // Work support
  { description: 'Hospital Snacks', category: 'Work Support', amount: [50000, 150000] },
  { description: 'Transport to Hospital 1', category: 'Work Support', amount: [30000, 80000] },
  { description: 'Transport to Hospital 2', category: 'Work Support', amount: [30000, 80000] },
  { description: 'Transport to Hospital 3', category: 'Work Support', amount: [30000, 70000] },
  { description: 'Transport Ride-hailing', category: 'Work Support', amount: [40000, 100000] },
  {
    description: 'Office Holiday Contribution',
    category: 'Work Support',
    amount: [200000, 500000],
  },

  // Work reimbursements (these are expenses that get reimbursed)
  { description: 'Business Hotel', category: 'Work Support', amount: [2000000, 5000000] },
  { description: 'Business Travel Insurance', category: 'Work Support', amount: [300000, 800000] },
  { description: 'Visa Application', category: 'Work Support', amount: [800000, 2000000] },
  { description: 'Visa Fee', category: 'Work Support', amount: [1000000, 2500000] },
  { description: 'Transport for Business', category: 'Work Support', amount: [200000, 500000] },
  { description: 'Internet for Work', category: 'Work Support', amount: [300000, 600000] },

  // Utilities and bills
  { description: 'Mobile Plan 1', category: 'Utility Bills', amount: [200000, 400000] },
  { description: 'Mobile Plan 2', category: 'Utility Bills', amount: [150000, 350000] },
  { description: 'Mobile Plan 3', category: 'Utility Bills', amount: [200000, 400000] },
  { description: 'Mobile Plan 4', category: 'Utility Bills', amount: [150000, 350000] },
  { description: 'Electricity - Second Home', category: 'Utility Bills', amount: [300000, 800000] },

  // Shopping and home
  { description: 'Online Shopping', category: 'Misc. Cost', amount: [100000, 400000] },
  { description: 'School Project', category: 'Kids Expenses', amount: [50000, 200000] },
  { description: 'Towels', category: 'House Expenses', amount: [100000, 300000] },
  { description: 'Home Supplies', category: 'House Expenses', amount: [50000, 150000] },
  { description: 'AC Service', category: 'House Expenses', amount: [500000, 1500000] },
  { description: 'Bedding', category: 'House Expenses', amount: [2000000, 5000000] },
  { description: 'Gardening Supplies', category: 'Misc. Cost', amount: [80000, 200000] },
  { description: 'Chemical Supplies', category: 'Misc. Cost', amount: [300000, 800000] },
  { description: 'Storage Fee', category: 'Misc. Cost', amount: [200000, 600000] },
  { description: 'Cleaning Service', category: 'Misc. Cost', amount: [150000, 400000] },

  // Personal care
  { description: 'Hair Care', category: 'Pocket Money', amount: [100000, 300000] },
  { description: 'Clothing', category: 'Pocket Money', amount: [50000, 150000] },

  // Transportation
  { description: 'Gasoline', category: 'Transportation', amount: [300000, 800000] },
  { description: 'Transit Card Top-up', category: 'Transportation', amount: [200000, 600000] },

  // Insurance via marketplace
  { description: 'Health Insurance - Family', category: 'Insurance', amount: [300000, 800000] },

  // Entertainment
  { description: 'Movie Tickets', category: 'Entertainment', amount: [100000, 250000] },
  { description: 'Streaming Subscription', category: 'Entertainment', amount: [50000, 150000] },
  { description: 'Concert Tickets', category: 'Entertainment', amount: [300000, 800000] },
  { description: 'Game Purchase', category: 'Entertainment', amount: [200000, 500000] },
  { description: 'Bowling', category: 'Entertainment', amount: [150000, 350000] },
  { description: 'Karaoke', category: 'Entertainment', amount: [200000, 500000] },
  { description: 'Sports Event', category: 'Entertainment', amount: [150000, 400000] },

  // House Renovation
  { description: 'Paint Supplies', category: 'House Renovation', amount: [500000, 1500000] },
  { description: 'Furniture Assembly', category: 'House Renovation', amount: [300000, 800000] },
  { description: 'Kitchen Upgrade', category: 'House Renovation', amount: [1000000, 3000000] },
  { description: 'Bathroom Fixtures', category: 'House Renovation', amount: [500000, 2000000] },
  { description: 'Flooring Materials', category: 'House Renovation', amount: [1500000, 4000000] },
  { description: 'Contractor Labor', category: 'House Renovation', amount: [800000, 2500000] },
  { description: 'Lighting Upgrade', category: 'House Renovation', amount: [300000, 1000000] },
];

const ACCOUNT_TYPES = [
  // Indonesian bank accounts (IDR)
  {
    name: 'BCA Savings',
    type: 'bank_account' as const,
    balance: 50000000,
    currency: 'IDR' as const,
  },

  // USD-denominated bank accounts
  {
    name: 'Chase Checking',
    type: 'bank_account' as const,
    balance: 5000,
    currency: 'USD' as const,
  },
  { name: 'DBS Savings', type: 'bank_account' as const, balance: 3000, currency: 'USD' as const },

  // Mutual funds (IDR)
  {
    name: 'Reksa Dana BCAP',
    type: 'mutual_fund' as const,
    balance: 25000000,
    currency: 'IDR' as const,
  },

  // Indonesian stocks (IDR)
  { name: 'Stock - BBRI', type: 'stock' as const, balance: 12000000, currency: 'IDR' as const },
  { name: 'Stock - BBCA', type: 'stock' as const, balance: 18000000, currency: 'IDR' as const },

  // USD-denominated stocks
  { name: 'Stock - AAPL', type: 'stock' as const, balance: 15000, currency: 'USD' as const },
  { name: 'Stock - MSFT', type: 'stock' as const, balance: 12000, currency: 'USD' as const },
  { name: 'Stock - GOOGL', type: 'stock' as const, balance: 8000, currency: 'USD' as const },
  { name: 'Stock - AMZN', type: 'stock' as const, balance: 10000, currency: 'USD' as const },

  // Indonesian government bonds
  { name: 'ORI020', type: 'bond' as const, balance: 10000000, currency: 'IDR' as const },
  { name: 'SBN032', type: 'bond' as const, balance: 15000000, currency: 'IDR' as const },
  { name: 'SBR010', type: 'bond' as const, balance: 20000000, currency: 'IDR' as const },

  // Corporate bonds
  {
    name: 'Corporate Bond - ABC',
    type: 'bond' as const,
    balance: 25000000,
    currency: 'IDR' as const,
  },
  {
    name: 'Corporate Bond - XYZ',
    type: 'bond' as const,
    balance: 30000000,
    currency: 'IDR' as const,
  },

  // Cryptocurrency
  { name: 'Bitcoin', type: 'crypto' as const, balance: 45000000, currency: 'IDR' as const },
  { name: 'Ethereum', type: 'crypto' as const, balance: 28000000, currency: 'IDR' as const },
  { name: 'Tether (USDT)', type: 'crypto' as const, balance: 15000000, currency: 'IDR' as const },
  { name: 'USD Coin (USDC)', type: 'crypto' as const, balance: 10000000, currency: 'IDR' as const },
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
    // Disable FK checks during cleanup to avoid ordering issues
    const config = getDatabaseConfig();
    const { dialect } = config;
    if (dialect === 'sqlite' && !config.isD1) {
      await runRawSql(sql`PRAGMA foreign_keys = OFF`);
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
    await db.delete(users);
    await db.delete(workspaceMeta);
    await db.delete(workspaces);

    // Re-enable FK checks
    if (dialect === 'sqlite' && !config.isD1) {
      await runRawSql(sql`PRAGMA foreign_keys = ON`);
    }

    // Run VACUUM to clean up the database and reclaim space (SQLite only, not D1)
    if (dialect === 'sqlite' && !config.isD1) {
      console.log('🧹 Vacuuming database...');
      await runRawSql(sql`VACUUM`);
    }

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
 * Seed workspace first (required for users)
 */
async function seedWorkspace(): Promise<string> {
  console.log('🏢 Seeding workspace...');

  const workspaceId = nanoid();
  const now = new Date();

  await db.insert(workspaces).values({
    id: workspaceId,
    name: 'Demo Family',
    status: 'active',
    created_at: now,
    updated_at: now,
  });

  // Seed default workspace meta values (upsert-safe)
  const workspaceMetaEntries = [
    {
      key: WORKSPACE_META_KEYS.CURRENCY,
      value: WORKSPACE_META_DEFAULTS[WORKSPACE_META_KEYS.CURRENCY],
    },
    { key: 'secondary_currency', value: 'USD' },
    {
      key: WORKSPACE_META_KEYS.WEEK_START,
      value: WORKSPACE_META_DEFAULTS[WORKSPACE_META_KEYS.WEEK_START],
    },
    {
      key: WORKSPACE_META_KEYS.COMPACT_NUMBERS,
      value: WORKSPACE_META_DEFAULTS[WORKSPACE_META_KEYS.COMPACT_NUMBERS],
    },
    // Keep demo workspace onboarding-complete for E2E and local demos.
    { key: WORKSPACE_META_KEYS.MONTHLY_INCOME, value: '30000000' },
  ] as const;

  for (const entry of workspaceMetaEntries) {
    await db
      .insert(workspaceMeta)
      .values({
        id: nanoid(),
        workspace_id: workspaceId,
        meta_key: entry.key,
        meta_value: entry.value,
        created_at: now,
        updated_at: now,
      })
      .onConflictDoUpdate({
        target: [workspaceMeta.workspace_id, workspaceMeta.meta_key],
        set: {
          meta_value: entry.value,
          updated_at: now,
        },
      });
  }

  console.log(`✓ Created workspace: Demo Family`);
  console.log(`✓ Seeded default workspace meta values`);
  return workspaceId;
}

/**
 * Seed users and user settings
 */
async function seedUsers(
  workspaceId: string
): Promise<{ adminUserId: string; memberUserId: string }> {
  console.log('👤 Seeding users...');

  const now = new Date();

  // Create admin user
  const adminUserId = nanoid();
  const adminPasswordHash = await hashPassword(DEMO_ADMIN.password);

  await db.insert(users).values({
    id: adminUserId,
    workspace_id: workspaceId,
    email: DEMO_ADMIN.email,
    password_hash: adminPasswordHash,
    name: DEMO_ADMIN.name,
    role: DEMO_ADMIN.role,
    email_verified_at: now,
    created_at: now,
    updated_at: now,
  });

  // Insert admin user meta values (without currency - it's workspace-scoped only)
  await db.insert(userMeta).values([
    {
      meta_id: nanoid(),
      user_id: adminUserId,
      meta_key: USER_META_KEYS.SHOW_CONVERTED_TOTALS,
      meta_value: 'true',
      created_at: now,
      updated_at: now,
    },
    {
      meta_id: nanoid(),
      user_id: adminUserId,
      meta_key: USER_META_KEYS.SHOW_INDIVIDUAL_CURRENCIES,
      meta_value: 'true',
      created_at: now,
      updated_at: now,
    },
  ]);

  // Create member user
  const memberUserId = nanoid();
  const memberPasswordHash = await hashPassword(DEMO_MEMBER.password);

  await db.insert(users).values({
    id: memberUserId,
    workspace_id: workspaceId,
    email: DEMO_MEMBER.email,
    password_hash: memberPasswordHash,
    name: DEMO_MEMBER.name,
    role: DEMO_MEMBER.role,
    email_verified_at: now,
    created_at: now,
    updated_at: now,
  });

  // Insert member user meta values (without currency - it's workspace-scoped only)
  await db.insert(userMeta).values([
    {
      meta_id: nanoid(),
      user_id: memberUserId,
      meta_key: USER_META_KEYS.SHOW_CONVERTED_TOTALS,
      meta_value: 'true',
      created_at: now,
      updated_at: now,
    },
    {
      meta_id: nanoid(),
      user_id: memberUserId,
      meta_key: USER_META_KEYS.SHOW_INDIVIDUAL_CURRENCIES,
      meta_value: 'true',
      created_at: now,
      updated_at: now,
    },
  ]);

  // Create super admin user (no workspace)
  const superAdminUserId = nanoid();
  const superAdminPasswordHash = await hashPassword(DEMO_SUPER_ADMIN.password);

  await db.insert(users).values({
    id: superAdminUserId,
    workspace_id: null,
    email: DEMO_SUPER_ADMIN.email,
    password_hash: superAdminPasswordHash,
    name: DEMO_SUPER_ADMIN.name,
    role: DEMO_SUPER_ADMIN.role,
    email_verified_at: now,
    created_at: now,
    updated_at: now,
  });

  console.log(`✓ Created admin user: ${DEMO_ADMIN.email}`);
  console.log(`✓ Created member user: ${DEMO_MEMBER.email}`);
  console.log(`✓ Created super admin user: ${DEMO_SUPER_ADMIN.email}`);
  return { adminUserId, memberUserId };
}

/**
 * Seed categories (income and expense)
 */
async function seedCategories(workspaceId: string, userId: string): Promise<Map<string, string>> {
  console.log('🏷️  Seeding categories...');

  const categoryMap = new Map<string, string>();
  const now = new Date();

  // Income categories
  for (const cat of INCOME_CATEGORIES) {
    const id = nanoid();
    const style = CATEGORY_STYLES[cat.name] || { icon: 'circle-dot', color: 'bg-slate-500' };
    await db.insert(categories).values({
      id,
      workspace_id: workspaceId,
      created_by_user_id: userId,
      name: cat.name,
      type: 'income',
      description: style.description || null,
      icon: style.icon,
      color: style.color,
      is_active: true,
      created_at: now,
      updated_at: now,
    });
    categoryMap.set(cat.name, id);
  }

  // Expense categories
  for (const cat of EXPENSE_CATEGORIES) {
    const id = nanoid();
    const style = CATEGORY_STYLES[cat.name] || { icon: 'tag', color: 'bg-slate-500' };
    await db.insert(categories).values({
      id,
      workspace_id: workspaceId,
      created_by_user_id: userId,
      name: cat.name,
      type: 'expense',
      description: style.description || null,
      icon: style.icon,
      color: style.color,
      is_active: true,
      created_at: now,
      updated_at: now,
    });
    categoryMap.set(cat.name, id);
  }

  console.log(`✓ Created ${categoryMap.size} categories`);
  return categoryMap;
}

/**
 * Seed default account categories (system categories)
 */
async function seedAccountCategories(
  workspaceId: string,
  userId: string
): Promise<Map<string, string>> {
  console.log('🏷️  Seeding account categories...');

  const categoryMap = new Map<string, string>();
  const now = new Date();

  for (const category of DEFAULT_ACCOUNT_CATEGORIES) {
    const id = nanoid();
    await db.insert(accountCategories).values({
      id,
      workspace_id: workspaceId,
      created_by_user_id: userId,
      name: category.name,
      description: category.description,
      is_liability: category.isLiability,
      is_system: true,
      sort_order: category.sortOrder,
      created_at: now,
      updated_at: now,
    });
    categoryMap.set(category.legacyType, id);
  }

  console.log(`✓ Created ${categoryMap.size} account categories`);
  return categoryMap;
}

/**
 * Seed budgets for expense categories (last 3 months)
 *
 * P2 TODO: Consider extracting monthsToSeed to a shared constant (SEED_MONTHS)
 * to synchronize with INCOME_TRANSACTIONS and expense seeding months
 */
async function seedBudgets(
  workspaceId: string,
  userId: string,
  categoryMap: Map<string, string>
): Promise<void> {
  console.log('📊 Seeding budgets...');

  const now = new Date();
  const monthsToSeed = getSeedMonths();

  // P2 TODO: Consider using schema-derived type for currency (e.g., 'IDR' as const)
  const budgetRecords: Array<{
    id: string;
    workspace_id: string;
    created_by_user_id: string;
    category_id: string;
    month: number;
    year: number;
    budget_amount: string;
    currency: Currency;
    is_closed: boolean;
    notes: string | null;
    created_at: Date;
    updated_at: Date;
  }> = [];

  for (const { year, month } of monthsToSeed) {
    for (const cat of EXPENSE_CATEGORIES) {
      const categoryId = categoryMap.get(cat.name);
      if (!categoryId || cat.budget === 0) continue;

      budgetRecords.push({
        id: nanoid(),
        workspace_id: workspaceId,
        created_by_user_id: userId,
        category_id: categoryId,
        month,
        year,
        budget_amount: amt(cat.budget),
        currency: 'IDR',
        is_closed: false,
        notes: null,
        created_at: now,
        updated_at: now,
      });
    }
  }

  if (budgetRecords.length > 0) {
    await db.insert(budgets).values(budgetRecords);
  }

  console.log(`✓ Created ${budgetRecords.length} budget records`);
}

/**
 * Seed income transactions for the 3 months
 */
async function seedIncomeTransactions(
  workspaceId: string,
  userId: string,
  categoryMap: Map<string, string>,
  accountMap: Map<string, string>
): Promise<number> {
  console.log('💰 Seeding income transactions...');

  let count = 0;
  // Use only payment accounts for transactions (cash, bank accounts, e-wallets)
  const paymentAccountNames = PAYMENT_ACCOUNTS.map((a) => a.name);
  const now = new Date();
  const seedMonths = getSeedMonths();

  for (let i = 0; i < seedMonths.length; i++) {
    const { year, month } = seedMonths[i];
    // Use templates in reverse order: index 0 = current month, 1 = 1 month ago, 2 = 2 months ago
    const templateIndex = seedMonths.length - 1 - i;
    const template = INCOME_TEMPLATES[templateIndex] || INCOME_TEMPLATES[0];

    for (const income of template) {
      const categoryId = categoryMap.get(income.description);
      if (!categoryId) {
        // Create category if it doesn't exist
        const newId = nanoid();
        const style = CATEGORY_STYLES[income.description] || {
          icon: 'circle-dot',
          color: 'bg-slate-500',
        };
        await db.insert(categories).values({
          id: newId,
          workspace_id: workspaceId,
          created_by_user_id: userId,
          name: income.description,
          type: 'income',
          description: style.description || null,
          icon: style.icon,
          color: style.color,
          is_active: true,
          created_at: now,
          updated_at: now,
        });
        categoryMap.set(income.description, newId);
      }

      const finalCategoryId = categoryMap.get(income.description)!;
      // Pick a random payment account (prefer bank accounts for income)
      const accountName =
        paymentAccountNames[Math.floor(Math.random() * paymentAccountNames.length)];
      const accountId = accountMap.get(accountName || 'Transfer')!;

      // Cap day to the number of days in the month
      const daysInMonth = new Date(year, month, 0).getDate();
      const day = Math.min(income.day, daysInMonth);

      const transactionDate = specificDate(year, month, day);
      // Skip if date would be in the future
      if (!transactionDate) continue;

      // created_at gets time variation for within-day ordering
      const createdAt = new Date(transactionDate);
      createdAt.setHours(SEED_TIME_HOUR + Math.floor(Math.random() * 8), 0, 0, 0);

      await db.insert(transactions).values({
        id: nanoid(),
        workspace_id: workspaceId,
        created_by_user_id: userId,
        category_id: finalCategoryId,
        account_id: accountId,
        type: 'income',
        amount: amt(income.amount),
        currency: 'IDR',
        description: income.description,
        transaction_date: transactionDate,
        created_at: createdAt,
        updated_at: createdAt,
      });
      count++;
    }
  }

  console.log(`✓ Created ${count} income transactions`);
  return count;
}

/**
 * Seed expense transactions for the 3 months
 */
async function seedExpenseTransactions(
  workspaceId: string,
  userId: string,
  categoryMap: Map<string, string>,
  accountMap: Map<string, string>
): Promise<number> {
  console.log('💸 Seeding expense transactions...');

  let count = 0;
  const monthsToSeed = getSeedMonths();

  // Use only payment accounts for transactions
  const paymentAccountNames = PAYMENT_ACCOUNTS.map((a) => a.name);

  for (const { year, month } of monthsToSeed) {
    const daysInMonth = new Date(year, month, 0).getDate();

    for (const expense of EXPENSE_TRANSACTIONS) {
      // Check if this expense is for specific months
      if (expense.months && !expense.months.includes(month)) {
        continue;
      }

      const categoryId = categoryMap.get(expense.category);
      if (!categoryId) continue;

      // Determine amount (fixed or range)
      let amount: number;
      if (Array.isArray(expense.amount)) {
        amount = expense.amount[0] + Math.random() * (expense.amount[1] - expense.amount[0]);
      } else {
        // Add some variation to fixed amounts
        amount = expense.amount * (0.95 + Math.random() * 0.1);
      }

      // Random day in month
      const day = 1 + Math.floor(Math.random() * daysInMonth);
      const transactionDate = specificDate(year, month, day);
      // Skip if date would be in the future
      if (!transactionDate) continue;

      // created_at gets time variation for within-day ordering
      const createdAt = new Date(transactionDate);
      createdAt.setHours(SEED_TIME_HOUR + Math.floor(Math.random() * 10), 0, 0, 0);

      // Select account (prefer bank transfer/credit card for larger amounts)
      let accountName = paymentAccountNames[Math.floor(Math.random() * paymentAccountNames.length)];
      if (amount > 500000) {
        accountName = Math.random() > 0.5 ? 'Transfer' : 'BCA Credit Card';
      }

      const accountId = accountMap.get(accountName || 'Transfer');
      if (!accountId) continue;

      await db.insert(transactions).values({
        id: nanoid(),
        workspace_id: workspaceId,
        created_by_user_id: userId,
        category_id: categoryId,
        account_id: accountId,
        type: 'expense',
        amount: amt(Math.round(amount)),
        currency: 'IDR',
        description: expense.description,
        transaction_date: transactionDate,
        created_at: createdAt,
        updated_at: createdAt,
      });
      count++;
    }

    // Add some random daily expenses
    for (let day = 1; day <= daysInMonth; day++) {
      // 70% chance of having random daily expenses
      if (Math.random() > 0.7) continue;

      const numDailyExpenses = 1 + Math.floor(Math.random() * 4);
      for (let i = 0; i < numDailyExpenses; i++) {
        // Pick a random expense category
        const randomCategory =
          EXPENSE_CATEGORIES[Math.floor(Math.random() * EXPENSE_CATEGORIES.length)];
        const categoryId = categoryMap.get(randomCategory.name);
        if (!categoryId) continue;

        const amount = randomAmount(50000, 500000);
        const transactionDate = specificDate(year, month, day);
        // Skip if date would be in the future
        if (!transactionDate) continue;

        // created_at gets time variation for within-day ordering
        const createdAt = new Date(transactionDate);
        createdAt.setHours(SEED_TIME_HOUR + Math.floor(Math.random() * 12), 0, 0, 0);

        const accountName =
          paymentAccountNames[Math.floor(Math.random() * paymentAccountNames.length)];
        const accountId = accountMap.get(accountName || 'Cash');
        if (!accountId) continue;

        await db.insert(transactions).values({
          id: nanoid(),
          workspace_id: workspaceId,
          created_by_user_id: userId,
          category_id: categoryId,
          account_id: accountId,
          type: 'expense',
          amount,
          currency: 'IDR',
          description: `Daily expense - ${randomCategory.name}`,
          transaction_date: transactionDate,
          created_at: createdAt,
          updated_at: createdAt,
        });
        count++;
      }
    }
  }

  console.log(`✓ Created ${count} expense transactions`);
  return count;
}

// Transfer templates: from -> to with amount ranges
const TRANSFER_TEMPLATES = [
  {
    from: 'Transfer',
    to: 'Cash',
    amount: [1000000, 3000000] as [number, number],
    description: 'ATM Withdrawal',
  },
  {
    from: 'Transfer',
    to: 'GoPay',
    amount: [200000, 500000] as [number, number],
    description: 'Top-up GoPay',
  },
  {
    from: 'Transfer',
    to: 'OVO',
    amount: [200000, 500000] as [number, number],
    description: 'Top-up OVO',
  },
  {
    from: 'Cash',
    to: 'Transfer',
    amount: [500000, 2000000] as [number, number],
    description: 'Cash Deposit',
  },
  {
    from: 'Transfer',
    to: 'BCA Credit Card',
    amount: [2000000, 5000000] as [number, number],
    description: 'Credit Card Payment',
  },
  {
    from: 'Transfer',
    to: 'Mandiri Credit Card',
    amount: [1000000, 3000000] as [number, number],
    description: 'Credit Card Payment',
  },
];

/**
 * Seed transfer transactions between payment accounts (3 months)
 */
async function seedTransferTransactions(
  workspaceId: string,
  userId: string,
  accountMap: Map<string, string>
): Promise<number> {
  console.log('🔄 Seeding transfer transactions...');

  let count = 0;
  const seedMonths = getSeedMonths();

  for (const { year, month } of seedMonths) {
    const daysInMonth = new Date(year, month, 0).getDate();

    for (const tmpl of TRANSFER_TEMPLATES) {
      const fromAccountId = accountMap.get(tmpl.from);
      const toAccountId = accountMap.get(tmpl.to);
      if (!fromAccountId || !toAccountId) continue;

      // 1-2 transfers per template per month
      const numTransfers = 1 + Math.floor(Math.random() * 2);
      for (let i = 0; i < numTransfers; i++) {
        const day = 1 + Math.floor(Math.random() * daysInMonth);
        const transactionDate = specificDate(year, month, day);
        if (!transactionDate) continue;

        const createdAt = new Date(transactionDate);
        createdAt.setHours(SEED_TIME_HOUR + Math.floor(Math.random() * 8), 0, 0, 0);

        const amount = tmpl.amount[0] + Math.random() * (tmpl.amount[1] - tmpl.amount[0]);

        await db.insert(transactions).values({
          id: nanoid(),
          workspace_id: workspaceId,
          created_by_user_id: userId,
          account_id: fromAccountId,
          to_account_id: toAccountId,
          type: 'transfer',
          amount: amt(Math.round(amount)),
          currency: 'IDR',
          description: tmpl.description,
          transaction_date: transactionDate,
          created_at: createdAt,
          updated_at: createdAt,
        });
        count++;
      }
    }
  }

  console.log(`✓ Created ${count} transfer transactions`);
  return count;
}

// Accounts created by the member user (personal e-wallets, some stocks, a credit card)
const MEMBER_OWNED_ACCOUNTS = new Set([
  'GoPay',
  'OVO',
  'Mandiri Credit Card',
  'Stock - AAPL',
  'Stock - GOOGL',
  'Chase Checking',
  'Car Loan - Innova',
]);

/**
 * Seed accounts (both payment accounts and investment accounts)
 */
async function seedAccounts(
  workspaceId: string,
  userId: string,
  memberUserId: string,
  accountCategoryMap: Map<string, string>
): Promise<Map<string, string>> {
  console.log('💰 Seeding accounts...');

  const accountMap = new Map<string, string>();
  const now = new Date();
  const createdAt = daysAgo(90);

  const ownerFor = (name: string) => (MEMBER_OWNED_ACCOUNTS.has(name) ? memberUserId : userId);

  // First, seed payment accounts (cash, bank accounts, credit cards, e-wallets)
  for (const account of PAYMENT_ACCOUNTS) {
    const id = nanoid();
    const categoryId = accountCategoryMap.get(account.type) || null;
    await db.insert(accounts).values({
      id,
      workspace_id: workspaceId,
      created_by_user_id: ownerFor(account.name),
      name: account.name,
      type: account.type,
      account_class: deriveAccountClass(account.type),
      category_id: categoryId,
      balance: amt(account.balance),
      initial_balance: amt(account.balance),
      currency: account.currency,
      is_cash_account: account.is_cash_account,
      credit_limit: 'credit_limit' in account ? amt(account.credit_limit) : null,
      last_updated: now,
      created_at: createdAt,
      updated_at: now,
    });
    accountMap.set(account.name, id);
  }

  // Then, seed investment accounts
  for (const account of ACCOUNT_TYPES) {
    const id = nanoid();
    const categoryId = accountCategoryMap.get(account.type) || null;
    await db.insert(accounts).values({
      id,
      workspace_id: workspaceId,
      created_by_user_id: ownerFor(account.name),
      name: account.name,
      type: account.type,
      account_class: deriveAccountClass(account.type),
      category_id: categoryId,
      balance: amt(account.balance),
      initial_balance: amt(account.balance),
      currency: account.currency,
      is_cash_account: false, // Investment accounts are not cash accounts
      last_updated: now,
      created_at: createdAt,
      updated_at: now,
    });
    accountMap.set(account.name, id);
  }

  // Seed loan accounts (debt class)
  for (const loan of LOAN_ACCOUNTS) {
    const id = nanoid();
    const categoryId = accountCategoryMap.get(loan.type) || null;
    await db.insert(accounts).values({
      id,
      workspace_id: workspaceId,
      created_by_user_id: ownerFor(loan.name),
      name: loan.name,
      type: loan.type,
      account_class: deriveAccountClass(loan.type),
      category_id: categoryId,
      balance: amt(loan.balance),
      initial_balance: amt(loan.balance),
      currency: loan.currency,
      is_cash_account: false,
      last_updated: now,
      created_at: createdAt,
      updated_at: now,
    });
    accountMap.set(loan.name, id);
  }

  // Add a closed test account for testing the closed accounts page
  const closedId = nanoid();
  const closedCategoryId = accountCategoryMap.get('bank_account') || null;
  const closedAt = daysAgo(30);
  await db.insert(accounts).values({
    id: closedId,
    workspace_id: workspaceId,
    created_by_user_id: userId,
    name: 'Old Savings (Closed)',
    type: 'bank_account',
    account_class: deriveAccountClass('bank_account'),
    category_id: closedCategoryId,
    balance: '0',
    initial_balance: '0',
    currency: 'IDR',
    is_cash_account: false,
    status: 'closed',
    closed_at: closedAt,
    closed_by_user_id: userId,
    last_updated: closedAt,
    created_at: daysAgo(180),
    updated_at: closedAt,
  });
  accountMap.set('Old Savings (Closed)', closedId);

  const memberCount = MEMBER_OWNED_ACCOUNTS.size;
  console.log(`✓ Created ${accountMap.size} accounts (${memberCount} owned by member)`);
  return accountMap;
}

// Combined list of all accounts for lookup
const ALL_ACCOUNTS = [...PAYMENT_ACCOUNTS, ...LOAN_ACCOUNTS, ...ACCOUNT_TYPES];

/**
 * Seed account history (monthly entries for 6 months, plus biweekly for recent 2 months)
 * Generates enough data so historical month navigation shows realistic values.
 */
async function seedAccountHistory(accountMap: Map<string, string>): Promise<void> {
  console.log('📈 Seeding account history...');

  let historyCount = 0;
  const now = new Date();

  for (const [accountName, accountId] of accountMap.entries()) {
    const accountConfig = ALL_ACCOUNTS.find((a) => a.name === accountName);
    if (!accountConfig) continue;

    const baseBalance = parseFloat(accountConfig.balance.toString());

    // Generate entries for each of the past 6 months
    for (let monthsAgo = 6; monthsAgo >= 0; monthsAgo--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);

      // Simulate gradual growth/decline over time (older = further from current)
      const growthFactor = 1 - monthsAgo * 0.03; // ~3% growth per month
      const monthBaseBalance = baseBalance * growthFactor;

      if (monthsAgo <= 2) {
        // Recent months: biweekly entries (1st and 15th)
        for (const day of [1, 15]) {
          const recordedAt = new Date(
            monthDate.getFullYear(),
            monthDate.getMonth(),
            day,
            SEED_TIME_HOUR,
            0,
            0,
            0
          );
          if (recordedAt > now) continue;

          const variation = (Math.random() - 0.5) * monthBaseBalance * 0.04; // ±2% variation
          const balance = amt(monthBaseBalance + variation);

          await db.insert(accountHistory).values({
            id: nanoid(),
            account_id: accountId,
            balance,
            notes: `Balance update - ${recordedAt.toLocaleDateString()}`,
            recorded_at: recordedAt,
          });
          historyCount++;
        }
      } else {
        // Older months: one entry mid-month
        const recordedAt = new Date(
          monthDate.getFullYear(),
          monthDate.getMonth(),
          15,
          SEED_TIME_HOUR,
          0,
          0,
          0
        );
        if (recordedAt > now) continue;

        const variation = (Math.random() - 0.5) * monthBaseBalance * 0.06; // ±3% variation
        const balance = amt(monthBaseBalance + variation);

        await db.insert(accountHistory).values({
          id: nanoid(),
          account_id: accountId,
          balance,
          notes: `Monthly balance update - ${recordedAt.toLocaleDateString()}`,
          recorded_at: recordedAt,
        });
        historyCount++;
      }
    }
  }

  console.log(`✓ Created ${historyCount} account history entries`);
}

/**
 * Seed account update reminders
 */
async function seedAccountUpdateReminders(
  workspaceId: string,
  userId: string,
  accountMap: Map<string, string>
): Promise<void> {
  console.log('🔔 Seeding account update reminders...');

  const now = new Date();

  for (const [accountName, accountId] of accountMap.entries()) {
    const accountConfig = ALL_ACCOUNTS.find((a) => a.name === accountName);
    if (!accountConfig) continue; // Skip if account not found

    // Set different frequencies based on account type
    const accountType = accountConfig.type;
    let frequency: 'weekly' | 'monthly' | 'quarterly' = 'monthly';

    if (accountType === 'crypto' || accountType === 'stock') {
      frequency = 'weekly';
    } else if (accountType === 'bond') {
      frequency = 'quarterly';
    } else if (accountType === 'mutual_fund') {
      frequency = 'monthly';
    } else {
      frequency = 'monthly';
    }

    const nextReminder = new Date();
    nextReminder.setDate(nextReminder.getDate() + 7); // Reminder in a week

    await db.insert(accountUpdateReminders).values({
      id: nanoid(),
      workspace_id: workspaceId,
      created_by_user_id: userId,
      account_id: accountId,
      frequency,
      last_updated: now,
      next_reminder: nextReminder,
      is_dismissed: false,
      created_at: now,
    });
  }

  console.log(`✓ Created ${accountMap.size} account update reminders`);
}

/**
 * Seed account snapshots (3 monthly snapshots)
 */
async function seedAccountSnapshots(
  workspaceId: string,
  userId: string,
  accountMap: Map<string, string>
): Promise<void> {
  console.log('📸 Seeding account snapshots...');

  const now = new Date();

  // Create 3 monthly snapshots
  for (let month = 0; month < 3; month++) {
    const snapshotDate = new Date(now.getFullYear(), now.getMonth() - month, 1);

    const snapshotId = nanoid();
    await db.insert(accountSnapshots).values({
      id: snapshotId,
      workspace_id: workspaceId,
      created_by_user_id: userId,
      snapshot_date: snapshotDate,
      month: snapshotDate.getMonth() + 1,
      year: snapshotDate.getFullYear(),
      notes: `Monthly snapshot - ${snapshotDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      created_at: snapshotDate,
    });

    // Add snapshot items for each account
    for (const [accountName, accountId] of accountMap.entries()) {
      const accountConfig = ALL_ACCOUNTS.find((a) => a.name === accountName);
      if (!accountConfig) continue; // Skip if account not found

      const baseBalance = parseFloat(accountConfig.balance.toString());

      // Add some historical variation
      const variation = (Math.random() - 0.5) * baseBalance * 0.15; // ±7.5% variation
      const balance = amt(baseBalance + variation + month * baseBalance * SNAPSHOT_GROWTH_RATE); // Growing trend

      await db.insert(accountSnapshotItems).values({
        id: nanoid(),
        snapshot_id: snapshotId,
        account_id: accountId,
        balance,
        currency: accountConfig.currency,
      });
    }
  }

  console.log('✓ Created 3 account snapshots with items');
}

/**
 * Seed transactions created by the member user (Mom's spending pattern)
 *
 * Gives the member user a realistic but smaller transaction profile so that
 * the member dropdown and /reports/members page have multi-user data.
 */
async function seedMemberTransactions(
  workspaceId: string,
  memberUserId: string,
  categoryMap: Map<string, string>,
  accountMap: Map<string, string>
): Promise<number> {
  console.log('👩 Seeding member (Mom) transactions...');

  let count = 0;
  const seedMonths = getSeedMonths();
  const paymentAccountNames = PAYMENT_ACCOUNTS.map((a) => a.name);

  // Member income templates per month pattern
  const memberIncomeTemplates = [
    // Pattern A: current month
    [
      { description: 'Mom Salary', amount: 8000000, day: 25 },
      { description: 'Side Business', amount: 1500000, day: 12 },
    ],
    // Pattern B: 1 month ago
    [
      { description: 'Mom Salary', amount: 8000000, day: 25 },
      { description: 'Side Business', amount: 2000000, day: 10 },
      { description: 'Side Business', amount: 1000000, day: 18 },
    ],
    // Pattern C: 2 months ago
    [
      { description: 'Mom Salary', amount: 7500000, day: 25 },
      { description: 'Side Business', amount: 1800000, day: 8 },
    ],
  ];

  // Member expense templates (subset of family expenses)
  const memberExpenseTemplates: Array<{
    description: string;
    category: string;
    amount: number | [number, number];
  }> = [
    { description: 'Supermarket', category: 'Food & Groceries', amount: [200000, 600000] },
    { description: 'Minimarket', category: 'Food & Groceries', amount: [100000, 350000] },
    { description: 'Bakery', category: 'Food & Groceries', amount: [80000, 250000] },
    { description: 'Fruit Market', category: 'Food & Groceries', amount: [100000, 300000] },
    { description: 'Cafe Lunch', category: 'Dine Out', amount: [80000, 200000] },
    { description: 'Family Dinner', category: 'Dine Out', amount: [150000, 400000] },
    { description: 'Coffee Shop', category: 'Dine Out', amount: [50000, 120000] },
    { description: 'Kids School Supplies', category: 'Kids Expenses', amount: [100000, 500000] },
    { description: 'Kids Activities', category: 'Kids Expenses', amount: [200000, 600000] },
    { description: 'Indoor Playground', category: 'Kids Expenses', amount: [150000, 400000] },
    { description: 'Personal Care', category: 'Pocket Money', amount: [100000, 300000] },
    { description: 'Clothing', category: 'Pocket Money', amount: [150000, 500000] },
    { description: 'Online Shopping', category: 'Misc. Cost', amount: [100000, 400000] },
    { description: 'Household Items', category: 'House Expenses', amount: [100000, 350000] },
    { description: 'Movie Tickets', category: 'Entertainment', amount: [100000, 200000] },
    { description: 'Ride-hailing', category: 'Transportation', amount: [30000, 100000] },
  ];

  for (let i = 0; i < seedMonths.length; i++) {
    const { year, month } = seedMonths[i];
    const daysInMonth = new Date(year, month, 0).getDate();
    const templateIndex = seedMonths.length - 1 - i;

    // Seed member income
    const incomeTemplate = memberIncomeTemplates[templateIndex] || memberIncomeTemplates[0];
    for (const income of incomeTemplate) {
      const categoryId = categoryMap.get(income.description);
      if (!categoryId) continue;

      const day = Math.min(income.day, daysInMonth);
      const transactionDate = specificDate(year, month, day);
      if (!transactionDate) continue;

      const createdAt = new Date(transactionDate);
      createdAt.setHours(SEED_TIME_HOUR + Math.floor(Math.random() * 8), 0, 0, 0);

      const accountName =
        paymentAccountNames[Math.floor(Math.random() * paymentAccountNames.length)];
      const accountId = accountMap.get(accountName || 'Transfer')!;

      await db.insert(transactions).values({
        id: nanoid(),
        workspace_id: workspaceId,
        created_by_user_id: memberUserId,
        category_id: categoryId,
        account_id: accountId,
        type: 'income',
        amount: amt(income.amount),
        currency: 'IDR',
        description: income.description,
        transaction_date: transactionDate,
        created_at: createdAt,
        updated_at: createdAt,
      });
      count++;
    }

    // Seed member expenses
    for (const expense of memberExpenseTemplates) {
      const categoryId = categoryMap.get(expense.category);
      if (!categoryId) continue;

      let amount: number;
      if (Array.isArray(expense.amount)) {
        amount = expense.amount[0] + Math.random() * (expense.amount[1] - expense.amount[0]);
      } else {
        amount = expense.amount;
      }

      const day = 1 + Math.floor(Math.random() * daysInMonth);
      const transactionDate = specificDate(year, month, day);
      if (!transactionDate) continue;

      const createdAt = new Date(transactionDate);
      createdAt.setHours(SEED_TIME_HOUR + Math.floor(Math.random() * 10), 0, 0, 0);

      let accountName = paymentAccountNames[Math.floor(Math.random() * paymentAccountNames.length)];
      if (amount > 300000) {
        accountName = Math.random() > 0.5 ? 'Transfer' : 'Mandiri Credit Card';
      }

      const accountId = accountMap.get(accountName || 'Cash');
      if (!accountId) continue;

      await db.insert(transactions).values({
        id: nanoid(),
        workspace_id: workspaceId,
        created_by_user_id: memberUserId,
        category_id: categoryId,
        account_id: accountId,
        type: 'expense',
        amount: amt(Math.round(amount)),
        currency: 'IDR',
        description: expense.description,
        transaction_date: transactionDate,
        created_at: createdAt,
        updated_at: createdAt,
      });
      count++;
    }
  }

  console.log(`✓ Created ${count} member transactions`);
  return count;
}

/**
 * Seed recurring templates and occurrences with mixed statuses.
 */
async function seedRecurringData(
  workspaceId: string,
  userId: string,
  categoryMap: Map<string, string>,
  accountMap: Map<string, string>
): Promise<void> {
  console.log('🔁 Seeding recurring templates and occurrences...');

  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const windowStartIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1))
    .toISOString()
    .slice(0, 10);
  const windowEndIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 3, 0))
    .toISOString()
    .slice(0, 10);

  let templateCount = 0;
  let occurrenceCount = 0;
  let confirmedCount = 0;
  let skippedCount = 0;

  for (const seedTemplate of RECURRING_TEMPLATE_DATA) {
    const categoryId = categoryMap.get(seedTemplate.category);
    const accountId = accountMap.get(seedTemplate.account);

    if (!categoryId || !accountId) {
      console.warn(
        `Skipping recurring template "${seedTemplate.name}" due to missing category/account mapping.`
      );
      continue;
    }

    const templateId = nanoid();
    const templateStatus = seedTemplate.status || 'active';
    const startingOccurrence = seedTemplate.startingOccurrenceNumber || 1;

    await db.insert(recurringTemplates).values({
      id: templateId,
      workspace_id: workspaceId,
      created_by_user_id: userId,
      name: seedTemplate.name,
      type: seedTemplate.type,
      amount: seedTemplate.amount,
      currency: 'IDR',
      category_id: categoryId,
      account_id: accountId,
      day_of_month: seedTemplate.dayOfMonth,
      start_date: seedTemplate.startDate,
      end_date: seedTemplate.endDate || null,
      total_occurrences: seedTemplate.totalOccurrences || null,
      is_installment: seedTemplate.isInstallment || false,
      installment_label: seedTemplate.installmentLabel || null,
      starting_occurrence_number: startingOccurrence,
      description: seedTemplate.description || null,
      status: templateStatus,
      created_at: now,
      updated_at: now,
    });

    templateCount++;

    const generatedOccurrences: Array<{ id: string; dueDate: string; occurrenceNumber: number }> =
      [];

    for (let offset = 0; offset < 72; offset++) {
      const occurrenceNumber = startingOccurrence + offset;
      const dueDate = calculateDueDate(seedTemplate.startDate, seedTemplate.dayOfMonth, offset);

      if (dueDate < windowStartIso) {
        continue;
      }

      if (dueDate > windowEndIso) {
        break;
      }

      if (
        !shouldGenerateOccurrence(
          {
            total_occurrences: seedTemplate.totalOccurrences || null,
            end_date: seedTemplate.endDate || null,
          },
          occurrenceNumber,
          dueDate
        )
      ) {
        break;
      }

      const occurrenceId = nanoid();
      const dueAt = new Date(`${dueDate}T${String(SEED_TIME_HOUR).padStart(2, '0')}:00:00.000Z`);

      await db.insert(recurringOccurrences).values({
        id: occurrenceId,
        template_id: templateId,
        workspace_id: workspaceId,
        due_date: dueDate,
        occurrence_number: occurrenceNumber,
        status: 'pending',
        transaction_id: null,
        confirmed_amount: null,
        skip_reason: null,
        confirmed_at: null,
        created_at: dueAt,
        updated_at: dueAt,
      });

      generatedOccurrences.push({ id: occurrenceId, dueDate, occurrenceNumber });
      occurrenceCount++;
    }

    if (templateStatus !== 'active') {
      continue;
    }

    const pastOccurrences = generatedOccurrences
      .filter((occurrence) => occurrence.dueDate < todayIso)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    const firstPast = pastOccurrences[0];
    if (firstPast) {
      const transactionId = nanoid();
      const transactionDate = new Date(
        `${firstPast.dueDate}T${String(SEED_TIME_HOUR).padStart(2, '0')}:00:00.000Z`
      );
      const description =
        seedTemplate.isInstallment && seedTemplate.totalOccurrences
          ? generateInstallmentDescription(
              seedTemplate.name,
              seedTemplate.installmentLabel || 'Installment',
              firstPast.occurrenceNumber,
              seedTemplate.totalOccurrences
            )
          : seedTemplate.description || seedTemplate.name;

      await db.insert(transactions).values({
        id: transactionId,
        workspace_id: workspaceId,
        created_by_user_id: userId,
        category_id: categoryId,
        account_id: accountId,
        type: seedTemplate.type,
        amount: seedTemplate.amount,
        currency: 'IDR',
        description,
        transaction_date: transactionDate,
        created_at: transactionDate,
        updated_at: transactionDate,
      });

      await db
        .update(recurringOccurrences)
        .set({
          status: 'confirmed',
          transaction_id: transactionId,
          confirmed_amount: seedTemplate.amount,
          confirmed_at: transactionDate,
          updated_at: transactionDate,
        })
        .where(eq(recurringOccurrences.id, firstPast.id));

      confirmedCount++;
    }

    const secondPast = pastOccurrences[1];
    if (secondPast) {
      await db
        .update(recurringOccurrences)
        .set({
          status: 'skipped',
          skip_reason: 'Seeded example: skipped this month',
          updated_at: now,
        })
        .where(eq(recurringOccurrences.id, secondPast.id));

      skippedCount++;
    }
  }

  console.log(
    `✓ Created ${templateCount} recurring templates, ${occurrenceCount} occurrences (${confirmedCount} confirmed, ${skippedCount} skipped)`
  );
}

// ============================================================================
// BACKFILL FUNCTIONS
// ============================================================================

/**
 * Backfill initial_balance for existing accounts that don't have it set.
 * Uses the earliest account_history entry as the initial balance.
 * Falls back to current balance if no history exists.
 */
async function backfillInitialBalance(): Promise<void> {
  console.log('🔄 Backfilling initial_balance for existing accounts...');

  const accountsWithoutInitial = await db
    .select()
    .from(accounts)
    .where(sql`${accounts.initial_balance} IS NULL AND ${accounts.deleted_at} IS NULL`);

  if (accountsWithoutInitial.length === 0) {
    console.log('✓ No accounts need backfilling');
    return;
  }

  let updated = 0;
  for (const account of accountsWithoutInitial) {
    // Find the earliest history entry
    const firstHistory = await db.query.accountHistory.findFirst({
      where: eq(accountHistory.account_id, account.id),
      orderBy: (h: any, { asc }: any) => [asc(h.recorded_at)],
    });

    const initialBalance = firstHistory?.balance || account.balance;

    await db
      .update(accounts)
      .set({ initial_balance: initialBalance })
      .where(eq(accounts.id, account.id));

    updated++;
  }

  console.log(`✓ Backfilled initial_balance for ${updated} accounts`);
}

/**
 * Seed transaction audit logs for demo history feature
 * Picks some recent transactions and creates realistic audit trail entries:
 * - Create events for selected transactions
 * - Update events (simulating edits by another user)
 * - Delete events for a few transactions
 */
async function seedTransactionAuditLogs(
  workspaceId: string,
  adminUserId: string,
  memberUserId: string
): Promise<void> {
  console.log('📝 Seeding transaction audit logs...');

  // Get recent transactions to add audit history to
  const recentTransactions = await db.query.transactions.findMany({
    where: eq(transactions.workspace_id, workspaceId),
    orderBy: [sql`${transactions.created_at} DESC`],
    limit: 20,
    with: {
      category: { columns: { id: true, name: true } },
      account: { columns: { id: true, name: true } },
    },
  });

  if (recentTransactions.length === 0) return;

  let createCount = 0;
  let updateCount = 0;
  let deleteCount = 0;

  // Create "create" audit entries for all selected transactions
  for (const t of recentTransactions) {
    await db.insert(auditLogs).values({
      id: nanoid(),
      workspace_id: workspaceId,
      user_id: adminUserId,
      action: 'create',
      entity_type: 'transaction',
      entity_id: t.id,
      old_value: null,
      new_value: JSON.stringify({
        amount: t.amount,
        currency: t.currency,
        type: t.type,
        category_id: t.category_id,
        account_id: t.account_id,
        description: t.description,
        transaction_date:
          t.transaction_date instanceof Date
            ? t.transaction_date.toISOString()
            : t.transaction_date,
      }),
      created_at: t.created_at,
    });
    createCount++;
  }

  // Add "update" events for ~10 transactions (simulating edits by member user)
  const editCandidates = recentTransactions.slice(0, 10);
  for (const t of editCandidates) {
    const oldAmount = t.amount;
    const newAmount = String(Math.round(Number(oldAmount) * (0.8 + Math.random() * 0.4)));

    const editDate = new Date(
      t.created_at instanceof Date ? t.created_at.getTime() : Number(t.created_at)
    );
    editDate.setDate(editDate.getDate() + 1 + Math.floor(Math.random() * 3));

    await db.insert(auditLogs).values({
      id: nanoid(),
      workspace_id: workspaceId,
      user_id: memberUserId,
      action: 'update',
      entity_type: 'transaction',
      entity_id: t.id,
      old_value: JSON.stringify({ amount: oldAmount }),
      new_value: JSON.stringify({ amount: newAmount }),
      created_at: editDate,
    });

    // Persist the amount change to the transaction row
    await db
      .update(transactions)
      .set({ amount: newAmount, updated_at: editDate, updated_by_user_id: memberUserId })
      .where(eq(transactions.id, t.id));

    updateCount++;

    // Add a second edit for some transactions
    if (Math.random() > 0.5) {
      const secondEditDate = new Date(editDate);
      secondEditDate.setHours(secondEditDate.getHours() + 2);
      const newDesc = `${t.description || 'Transaction'} (updated)`;

      await db.insert(auditLogs).values({
        id: nanoid(),
        workspace_id: workspaceId,
        user_id: adminUserId,
        action: 'update',
        entity_type: 'transaction',
        entity_id: t.id,
        old_value: JSON.stringify({ description: t.description }),
        new_value: JSON.stringify({ description: newDesc }),
        created_at: secondEditDate,
      });

      // Persist the description change to the transaction row
      await db
        .update(transactions)
        .set({ description: newDesc, updated_at: secondEditDate, updated_by_user_id: adminUserId })
        .where(eq(transactions.id, t.id));

      updateCount++;
    }
  }

  // Add "delete" events for 2 transactions and soft-delete them
  const deleteCandidates = recentTransactions.slice(10, 12);
  for (const t of deleteCandidates) {
    const deleteDate = new Date(
      t.created_at instanceof Date ? t.created_at.getTime() : Number(t.created_at)
    );
    deleteDate.setDate(deleteDate.getDate() + 5);

    await db.insert(auditLogs).values({
      id: nanoid(),
      workspace_id: workspaceId,
      user_id: memberUserId,
      action: 'delete',
      entity_type: 'transaction',
      entity_id: t.id,
      old_value: JSON.stringify({
        amount: t.amount,
        currency: t.currency,
        type: t.type,
        category_id: t.category_id,
        account_id: t.account_id,
        description: t.description,
      }),
      new_value: null,
      created_at: deleteDate,
    });

    // Soft-delete the transaction
    await db
      .update(transactions)
      .set({
        deleted_at: deleteDate,
        deleted_by_user_id: memberUserId,
      })
      .where(eq(transactions.id, t.id));

    deleteCount++;
  }

  console.log(
    `✓ Created ${createCount} create + ${updateCount} update + ${deleteCount} delete audit entries`
  );
}

// ============================================================================
// BENCHMARK SEED (--benchmark flag)
// ============================================================================

/**
 * Benchmark data scale: ~10k extra transactions spread across 12 months,
 * 20 additional recurring templates with ~200 occurrences.
 *
 * This adds volume on top of the normal seed to stress-test query performance.
 * All benchmark data uses the same workspace, categories, and accounts as
 * the normal seed, so the app works normally with the extra volume.
 */
const BENCHMARK_TRANSACTION_COUNT = 10_000;
const BENCHMARK_RECURRING_TEMPLATES = 20;

/**
 * Compute trailing 12-month window ending at current month.
 * All months guaranteed in the past — no null dates, no fallback.
 */
function getBenchmarkMonths(): Array<{ year: number; month: number }> {
  const now = new Date();
  const months: Array<{ year: number; month: number }> = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return months;
}

/**
 * Max usable day for a benchmark month — caps to today for the current month
 * so we never generate future-dated transactions.
 */
function benchMaxDay(year: number, month: number): number {
  const now = new Date();
  const daysInMonth = new Date(year, month, 0).getDate();
  if (year === now.getFullYear() && month === now.getMonth() + 1) {
    return Math.min(now.getDate(), daysInMonth);
  }
  return daysInMonth;
}

async function seedBenchmarkData(
  workspaceId: string,
  userId: string,
  categoryMap: Map<string, string>,
  accountMap: Map<string, string>
): Promise<void> {
  console.log('\n📊 Seeding benchmark data (~10k transactions)...');
  const startTime = Date.now();

  // Collect category IDs by type, preserving name→id for realistic descriptions
  const expenseCategoryIds: string[] = [];
  const incomeCategoryIds: string[] = [];
  const categoryNameToId: Map<string, string> = new Map();
  for (const cat of EXPENSE_CATEGORIES) {
    const id = categoryMap.get(cat.name);
    if (id) {
      expenseCategoryIds.push(id);
      categoryNameToId.set(cat.name, id);
    }
  }
  for (const cat of INCOME_CATEGORIES) {
    const id = categoryMap.get(cat.name);
    if (id) {
      incomeCategoryIds.push(id);
      categoryNameToId.set(cat.name, id);
    }
  }
  // Also map income category names from CATEGORY_STYLES (Dad Salary, Mom Salary, etc.)
  for (const name of ['Dad Salary', 'Mom Salary', 'Side Business', 'Dividend']) {
    const id = categoryMap.get(name);
    if (id) {
      incomeCategoryIds.push(id);
      categoryNameToId.set(name, id);
    }
  }
  // Deduplicate income category IDs
  const uniqueIncomeCategoryIds = [...new Set(incomeCategoryIds)];

  // Collect account IDs (payment accounts only)
  const paymentAccountIds: string[] = [];
  const accountNameToId: Map<string, string> = new Map();
  for (const acct of PAYMENT_ACCOUNTS) {
    const id = accountMap.get(acct.name);
    if (id) {
      paymentAccountIds.push(id);
      accountNameToId.set(acct.name, id);
    }
  }
  // Fallback: use all account IDs if payment accounts are empty
  if (paymentAccountIds.length === 0) {
    for (const [name, id] of accountMap.entries()) {
      paymentAccountIds.push(id);
      accountNameToId.set(name, id);
    }
  }

  // Bank/credit card IDs for large amounts
  const largeAmountAccountIds = ['Transfer', 'BCA Credit Card', 'Mandiri Credit Card']
    .map((n) => accountNameToId.get(n))
    .filter((id): id is string => !!id);
  const smallAmountAccountIds = paymentAccountIds;

  const now = new Date();
  const benchMonths = getBenchmarkMonths();

  // --- Benchmark income transactions (~2k) ---
  console.log('   Inserting benchmark income transactions...');
  const BATCH_SIZE = 500;
  type TxnRow = {
    id: string;
    workspace_id: string;
    created_by_user_id: string;
    category_id: string;
    account_id: string;
    type: 'expense' | 'income';
    amount: string;
    currency: string;
    description: string;
    transaction_date: Date;
    created_at: Date;
    updated_at: Date;
  };
  let batch: TxnRow[] = [];
  let totalTxns = 0;
  const allTxnIds: string[] = [];

  async function flushBatch() {
    if (batch.length > 0) {
      await db.insert(transactions).values(batch);
      totalTxns += batch.length;
      batch = [];
    }
  }

  // Income: 2 salaries/month (25th) + sporadic side income, cycling through INCOME_TEMPLATES
  for (let mi = 0; mi < benchMonths.length; mi++) {
    const { year, month } = benchMonths[mi];
    const pattern = INCOME_TEMPLATES[mi % INCOME_TEMPLATES.length];
    const maxDay = benchMaxDay(year, month);

    for (const tmpl of pattern) {
      const day = Math.min(tmpl.day, maxDay);
      const txDate = new Date(year, month - 1, day, SEED_TIME_HOUR, 0, 0, 0);
      const catId = categoryNameToId.get(tmpl.description) ?? uniqueIncomeCategoryIds[0];
      // Large income → bank transfer
      const accountId =
        tmpl.amount >= 5_000_000
          ? (largeAmountAccountIds[0] ?? paymentAccountIds[0])
          : paymentAccountIds[Math.floor(Math.random() * paymentAccountIds.length)];
      const id = nanoid();
      allTxnIds.push(id);

      batch.push({
        id,
        workspace_id: workspaceId,
        created_by_user_id: userId,
        category_id: catId,
        account_id: accountId,
        type: 'income',
        amount: amt(tmpl.amount * (0.9 + Math.random() * 0.2)), // ±10% variation
        currency: 'IDR',
        description: tmpl.description,
        transaction_date: txDate,
        created_at: txDate,
        updated_at: txDate,
      });
      if (batch.length >= BATCH_SIZE) await flushBatch();
    }

    // Additional sporadic income to reach ~170/month
    const extraIncome = 10 + Math.floor(Math.random() * 5);
    for (let j = 0; j < extraIncome; j++) {
      const day = 1 + Math.floor(Math.random() * maxDay);
      const txDate = new Date(year, month - 1, day, SEED_TIME_HOUR, 0, 0, 0);
      const catId =
        uniqueIncomeCategoryIds[Math.floor(Math.random() * uniqueIncomeCategoryIds.length)];
      const id = nanoid();
      allTxnIds.push(id);

      batch.push({
        id,
        workspace_id: workspaceId,
        created_by_user_id: userId,
        category_id: catId,
        account_id: paymentAccountIds[Math.floor(Math.random() * paymentAccountIds.length)],
        type: 'income',
        amount: randomAmount(500_000, 5_000_000),
        currency: 'IDR',
        description: ['Freelance payment', 'Bonus', 'Cashback', 'Gift money', 'Refund'][
          Math.floor(Math.random() * 5)
        ],
        transaction_date: txDate,
        created_at: txDate,
        updated_at: txDate,
      });
      if (batch.length >= BATCH_SIZE) await flushBatch();
    }
  }
  await flushBatch();
  const incomeCount = totalTxns;
  console.log(`   ✓ ${incomeCount} income transactions`);

  // --- Benchmark expense transactions (~7.5k) ---
  console.log('   Inserting benchmark expense transactions...');

  // Cycle through EXPENSE_TRANSACTIONS for realistic descriptions
  const expenseTemplateCount = EXPENSE_TRANSACTIONS.length;
  let expenseIdx = 0;

  for (const { year, month } of benchMonths) {
    const maxDay = benchMaxDay(year, month);

    // Monthly fixed expenses from templates
    for (const tmpl of EXPENSE_TRANSACTIONS) {
      // Skip month-specific transactions if not in the right month
      if (tmpl.months && !tmpl.months.includes(month)) continue;

      const catId = categoryNameToId.get(tmpl.category) ?? expenseCategoryIds[0];
      const amount = Array.isArray(tmpl.amount)
        ? tmpl.amount[0] + Math.random() * (tmpl.amount[1] - tmpl.amount[0])
        : tmpl.amount * (0.95 + Math.random() * 0.1);
      // Large amounts → bank/credit card
      const accountId =
        amount >= 1_000_000 && largeAmountAccountIds.length > 0
          ? largeAmountAccountIds[Math.floor(Math.random() * largeAmountAccountIds.length)]
          : smallAmountAccountIds[Math.floor(Math.random() * smallAmountAccountIds.length)];
      const day = 1 + Math.floor(Math.random() * maxDay);
      const txDate = new Date(year, month - 1, day, SEED_TIME_HOUR, 0, 0, 0);
      const id = nanoid();
      allTxnIds.push(id);

      batch.push({
        id,
        workspace_id: workspaceId,
        created_by_user_id: userId,
        category_id: catId,
        account_id: accountId,
        type: 'expense',
        amount: amt(amount),
        currency: 'IDR',
        description: tmpl.description,
        transaction_date: txDate,
        created_at: txDate,
        updated_at: txDate,
      });
      if (batch.length >= BATCH_SIZE) await flushBatch();
    }

    // Additional daily random expenses to reach ~625/month
    const targetPerMonth = Math.floor((BENCHMARK_TRANSACTION_COUNT * 0.75) / 12);
    const extraNeeded = Math.max(0, targetPerMonth - EXPENSE_TRANSACTIONS.length);
    for (let j = 0; j < extraNeeded; j++) {
      const tmpl = EXPENSE_TRANSACTIONS[expenseIdx % expenseTemplateCount];
      expenseIdx++;
      if (tmpl.months && !tmpl.months.includes(month)) continue;

      const catId =
        categoryNameToId.get(tmpl.category) ??
        expenseCategoryIds[Math.floor(Math.random() * expenseCategoryIds.length)];
      const amount = Array.isArray(tmpl.amount)
        ? tmpl.amount[0] + Math.random() * (tmpl.amount[1] - tmpl.amount[0])
        : tmpl.amount * (0.9 + Math.random() * 0.2);
      const accountId =
        amount >= 1_000_000 && largeAmountAccountIds.length > 0
          ? largeAmountAccountIds[Math.floor(Math.random() * largeAmountAccountIds.length)]
          : smallAmountAccountIds[Math.floor(Math.random() * smallAmountAccountIds.length)];
      const day = 1 + Math.floor(Math.random() * maxDay);
      const txDate = new Date(year, month - 1, day, SEED_TIME_HOUR, 0, 0, 0);
      const id = nanoid();
      allTxnIds.push(id);

      batch.push({
        id,
        workspace_id: workspaceId,
        created_by_user_id: userId,
        category_id: catId,
        account_id: accountId,
        type: 'expense',
        amount: amt(amount),
        currency: 'IDR',
        description: tmpl.description,
        transaction_date: txDate,
        created_at: txDate,
        updated_at: txDate,
      });
      if (batch.length >= BATCH_SIZE) await flushBatch();
    }
  }
  await flushBatch();
  const expenseCount = totalTxns - incomeCount;
  console.log(`   ✓ ${expenseCount} expense transactions`);

  // --- Benchmark transfer transactions (~500) ---
  console.log('   Inserting benchmark transfer transactions...');
  for (const { year, month } of benchMonths) {
    const maxDay = benchMaxDay(year, month);
    for (const tmpl of TRANSFER_TEMPLATES) {
      const fromAccountId = accountNameToId.get(tmpl.from);
      const toAccountId = accountNameToId.get(tmpl.to);
      if (!fromAccountId || !toAccountId) continue;

      // 2-4 transfers per template per month
      const numTransfers = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < numTransfers; i++) {
        const day = 1 + Math.floor(Math.random() * maxDay);
        const txDate = new Date(year, month - 1, day, SEED_TIME_HOUR, 0, 0, 0);
        const amount = tmpl.amount[0] + Math.random() * (tmpl.amount[1] - tmpl.amount[0]);
        const id = nanoid();
        allTxnIds.push(id);

        batch.push({
          id,
          workspace_id: workspaceId,
          created_by_user_id: userId,
          category_id: expenseCategoryIds[0], // transfers use a default category
          account_id: fromAccountId,
          type: 'expense',
          amount: amt(amount),
          currency: 'IDR',
          description: tmpl.description,
          transaction_date: txDate,
          created_at: txDate,
          updated_at: txDate,
        });
        if (batch.length >= BATCH_SIZE) await flushBatch();
      }
    }
  }
  await flushBatch();
  console.log(`   ✓ ${totalTxns - incomeCount - expenseCount} transfer transactions`);
  console.log(`   ✓ ${totalTxns} total benchmark transactions`);

  // --- Benchmark recurring templates + occurrences ---
  console.log(`   Inserting ${BENCHMARK_RECURRING_TEMPLATES} recurring templates...`);

  let occurrenceCount = 0;
  for (let t = 0; t < BENCHMARK_RECURRING_TEMPLATES; t++) {
    const isIncome = t < 3;
    const catId = isIncome
      ? uniqueIncomeCategoryIds[Math.floor(Math.random() * uniqueIncomeCategoryIds.length)]
      : expenseCategoryIds[Math.floor(Math.random() * expenseCategoryIds.length)];
    const accountId = paymentAccountIds[Math.floor(Math.random() * paymentAccountIds.length)];
    const startMonthIdx = t % 6; // start 0-5 months back from oldest bench month
    const startBenchMonth = benchMonths[startMonthIdx];
    const dayOfMonth = (t % 28) + 1;
    const startDate = `${startBenchMonth.year}-${String(startBenchMonth.month).padStart(2, '0')}-01`;
    const templateId = nanoid();

    await db.insert(recurringTemplates).values({
      id: templateId,
      workspace_id: workspaceId,
      created_by_user_id: userId,
      name: `Bench Recurring ${t + 1}`,
      type: isIncome ? 'income' : 'expense',
      amount: isIncome ? randomAmount(5_000_000, 20_000_000) : randomAmount(100_000, 5_000_000),
      currency: 'IDR',
      category_id: catId,
      account_id: accountId,
      day_of_month: dayOfMonth,
      start_date: startDate,
      total_occurrences: 12,
      is_installment: t % 5 === 0,
      status: 'active',
      created_at: now,
      updated_at: now,
    });

    // Generate occurrences across trailing months
    const occBatch: Array<{
      id: string;
      template_id: string;
      workspace_id: string;
      due_date: string;
      occurrence_number: number;
      status: 'pending' | 'confirmed' | 'skipped';
      confirmed_at: Date | null;
      created_at: Date;
      updated_at: Date;
    }> = [];

    for (let o = 0; o < Math.min(10, benchMonths.length - startMonthIdx); o++) {
      const bm = benchMonths[startMonthIdx + o];
      const dueDate = `${bm.year}-${String(bm.month).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;
      const isPast = new Date(dueDate) < now;
      const status = isPast
        ? Math.random() < 0.6
          ? 'confirmed'
          : Math.random() < 0.5
            ? 'skipped'
            : 'pending'
        : 'pending';

      occBatch.push({
        id: nanoid(),
        template_id: templateId,
        workspace_id: workspaceId,
        due_date: dueDate,
        occurrence_number: o + 1,
        status,
        confirmed_at: status === 'confirmed' ? new Date(dueDate) : null,
        created_at: now,
        updated_at: now,
      });
    }

    if (occBatch.length > 0) {
      await db.insert(recurringOccurrences).values(occBatch);
      occurrenceCount += occBatch.length;
    }
  }

  // --- Benchmark budgets (extend to trailing 12 months) ---
  console.log('   Extending budgets to 12 months...');
  let budgetCount = 0;
  for (const cat of EXPENSE_CATEGORIES) {
    const categoryId = categoryMap.get(cat.name);
    if (!categoryId) continue;
    for (const { year, month } of benchMonths) {
      await db
        .insert(budgets)
        .values({
          id: nanoid(),
          workspace_id: workspaceId,
          created_by_user_id: userId,
          category_id: categoryId,
          month,
          year,
          budget_amount: amt(cat.budget),
          currency: 'IDR',
          created_at: now,
          updated_at: now,
        })
        .onConflictDoNothing();
      budgetCount++;
    }
  }

  // --- Workspace meta (for getOnboardingStatus) ---
  console.log('   Seeding workspace meta...');
  await db
    .insert(workspaceMeta)
    .values([
      {
        id: nanoid(),
        workspace_id: workspaceId,
        meta_key: WORKSPACE_META_KEYS.CURRENCY,
        meta_value: 'IDR',
        created_at: now,
        updated_at: now,
      },
      {
        id: nanoid(),
        workspace_id: workspaceId,
        meta_key: WORKSPACE_META_KEYS.MONTHLY_INCOME,
        meta_value: '30000000',
        created_at: now,
        updated_at: now,
      },
    ])
    .onConflictDoNothing();

  // --- Audit logs (~100 entries for getHistory, getTransactionIdsWithHistory) ---
  console.log('   Seeding benchmark audit logs...');
  const auditBatch: Array<{
    id: string;
    workspace_id: string;
    user_id: string;
    action: string;
    entity_type: string;
    entity_id: string;
    old_value: string | null;
    new_value: string | null;
    created_at: Date;
  }> = [];
  const sampleTxnIds = allTxnIds.slice(0, 100);
  for (const txnId of sampleTxnIds) {
    auditBatch.push({
      id: nanoid(),
      workspace_id: workspaceId,
      user_id: userId,
      action: 'create',
      entity_type: 'transaction',
      entity_id: txnId,
      old_value: null,
      new_value: JSON.stringify({ amount: '100000', type: 'expense' }),
      created_at: daysAgo(Math.floor(Math.random() * 90)),
    });
    // Half get an update too
    if (Math.random() < 0.5) {
      auditBatch.push({
        id: nanoid(),
        workspace_id: workspaceId,
        user_id: userId,
        action: 'update',
        entity_type: 'transaction',
        entity_id: txnId,
        old_value: JSON.stringify({ amount: '100000' }),
        new_value: JSON.stringify({ amount: '150000' }),
        created_at: daysAgo(Math.floor(Math.random() * 30)),
      });
    }
  }
  if (auditBatch.length > 0) {
    await db.insert(auditLogs).values(auditBatch);
  }
  console.log(`   ✓ ${auditBatch.length} audit log entries`);

  // --- Extend account history to all 12 trailing months ---
  console.log('   Extending account history to 12 months...');
  let ahCount = 0;
  for (const [, accountId] of accountMap.entries()) {
    for (const { year, month } of benchMonths) {
      const recordedAt = new Date(year, month - 1, 15, SEED_TIME_HOUR, 0, 0, 0);
      await db
        .insert(accountHistory)
        .values({
          id: nanoid(),
          account_id: accountId,
          balance: randomAmount(1_000_000, 100_000_000),
          recorded_at: recordedAt,
        })
        .onConflictDoNothing();
      ahCount++;
    }
  }
  console.log(`   ✓ ${ahCount} account history entries`);

  // --- Second user with ~500 transactions (for getMemberSummary) ---
  console.log('   Seeding second benchmark user...');
  const benchMemberUserId = nanoid();
  await db.insert(users).values({
    id: benchMemberUserId,
    workspace_id: workspaceId,
    email: `bench-member-${nanoid(4)}@test.com`,
    name: 'Benchmark Member',
    password_hash: 'not-real-bench',
    role: 'member',
    created_at: now,
    updated_at: now,
  });

  let memberTxnCount = 0;
  for (const { year, month } of benchMonths) {
    const maxDay = benchMaxDay(year, month);
    const txnsPerMonth = 40 + Math.floor(Math.random() * 10);
    for (let j = 0; j < txnsPerMonth; j++) {
      const isIncome = Math.random() < 0.2;
      const tmpl = EXPENSE_TRANSACTIONS[j % expenseTemplateCount];
      const catId = isIncome
        ? uniqueIncomeCategoryIds[Math.floor(Math.random() * uniqueIncomeCategoryIds.length)]
        : (categoryNameToId.get(tmpl.category) ?? expenseCategoryIds[0]);
      const day = 1 + Math.floor(Math.random() * maxDay);
      const txDate = new Date(year, month - 1, day, SEED_TIME_HOUR, 0, 0, 0);

      batch.push({
        id: nanoid(),
        workspace_id: workspaceId,
        created_by_user_id: benchMemberUserId,
        category_id: catId,
        account_id: paymentAccountIds[Math.floor(Math.random() * paymentAccountIds.length)],
        type: isIncome ? 'income' : 'expense',
        amount: isIncome ? randomAmount(2_000_000, 10_000_000) : randomAmount(10_000, 3_000_000),
        currency: 'IDR',
        description: isIncome ? 'Mom Salary' : tmpl.description,
        transaction_date: txDate,
        created_at: txDate,
        updated_at: txDate,
      });
      memberTxnCount++;
      if (batch.length >= BATCH_SIZE) await flushBatch();
    }
  }
  await flushBatch();
  console.log(`   ✓ ${memberTxnCount} second-user transactions`);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`   ✓ ${BENCHMARK_RECURRING_TEMPLATES} templates, ${occurrenceCount} occurrences`);
  console.log(`   ✓ ${budgetCount} budget entries (with dedup)`);
  console.log(`✅ Benchmark data seeded in ${elapsed}s`);
}

// ============================================================================
// STRESS SEED (--stress flag)
// ============================================================================

type FamilyMemberProfile = {
  userId: string;
  label: string;
  incomeCategory: string;
  incomeBase: number;
  incomeDay: number;
  preferredAccounts: string[];
  spendingWeights: Array<{
    category: string;
    weight: number;
    descriptions: string[];
    min: number;
    max: number;
  }>;
};

function getStressMonths(): Array<{ year: number; month: number }> {
  const now = new Date();
  const months: Array<{ year: number; month: number }> = [];
  for (let i = 59; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return months;
}

function pickWeighted<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let target = Math.random() * total;
  for (const item of items) {
    target -= item.weight;
    if (target <= 0) return item;
  }
  return items[items.length - 1]!;
}

async function seedStressFamilyMembers(
  workspaceId: string
): Promise<Array<{ id: string; label: string }>> {
  const now = new Date();
  const extraMembers = [
    { email: 'teen@example.com', name: 'Teen Child' },
    { email: 'youngest@example.com', name: 'Youngest Child' },
  ] as const;
  const passwordHash = await hashPassword('demo123456789');
  const memberIds: Array<{ id: string; label: string }> = [];

  for (const member of extraMembers) {
    const id = nanoid();
    await db.insert(users).values({
      id,
      workspace_id: workspaceId,
      email: member.email,
      password_hash: passwordHash,
      name: member.name,
      role: 'member',
      email_verified_at: now,
      created_at: now,
      updated_at: now,
    });

    await db.insert(userMeta).values([
      {
        meta_id: nanoid(),
        user_id: id,
        meta_key: USER_META_KEYS.SHOW_CONVERTED_TOTALS,
        meta_value: 'true',
        created_at: now,
        updated_at: now,
      },
      {
        meta_id: nanoid(),
        user_id: id,
        meta_key: USER_META_KEYS.SHOW_INDIVIDUAL_CURRENCIES,
        meta_value: 'true',
        created_at: now,
        updated_at: now,
      },
    ]);

    memberIds.push({ id, label: member.name });
  }

  return memberIds;
}

async function seedStressData(
  workspaceId: string,
  adminUserId: string,
  memberUserId: string,
  categoryMap: Map<string, string>,
  accountMap: Map<string, string>
): Promise<void> {
  console.log('\n🔥 Seeding stress-test data (5 years of family history)...');
  const startTime = Date.now();
  const months = getStressMonths();
  const now = new Date();

  // Rebuild monthly datasets to guarantee full 60-month coverage.
  await db.delete(accountSnapshotItems);
  await db.delete(accountSnapshots);
  await db.delete(accountHistory);
  await db.delete(budgets);

  const extraMembers = await seedStressFamilyMembers(workspaceId);
  const memberProfiles: FamilyMemberProfile[] = [
    {
      userId: adminUserId,
      label: 'Dad',
      incomeCategory: 'Dad Salary',
      incomeBase: 22_000_000,
      incomeDay: 25,
      preferredAccounts: ['Transfer', 'BCA Credit Card'],
      spendingWeights: [
        {
          category: 'Utility Bills',
          weight: 3,
          descriptions: ['Electricity', 'Internet', 'Water Bill', 'Mobile Plan 1'],
          min: 120_000,
          max: 1_600_000,
        },
        {
          category: 'Transportation',
          weight: 3,
          descriptions: ['Gasoline', 'Transit Card Top-up', 'Ride-hailing'],
          min: 35_000,
          max: 850_000,
        },
        {
          category: 'Work Support',
          weight: 2,
          descriptions: ['Office Supplies', 'Business Lunch', 'Transport for Business'],
          min: 75_000,
          max: 1_400_000,
        },
      ],
    },
    {
      userId: memberUserId,
      label: 'Mom',
      incomeCategory: 'Mom Salary',
      incomeBase: 12_500_000,
      incomeDay: 24,
      preferredAccounts: ['Transfer', 'OVO', 'GoPay'],
      spendingWeights: [
        {
          category: 'Food & Groceries',
          weight: 4,
          descriptions: ['Supermarket', 'Market Groceries', 'Fruit Shop', 'Bakery'],
          min: 80_000,
          max: 900_000,
        },
        {
          category: 'Kids Expenses',
          weight: 3,
          descriptions: ['School Supplies', 'Tutoring', 'Indoor Playground', 'Books'],
          min: 120_000,
          max: 1_250_000,
        },
        {
          category: 'House Expenses',
          weight: 2,
          descriptions: ['Home Supplies', 'Household Items', 'Home Maintenance'],
          min: 90_000,
          max: 1_100_000,
        },
      ],
    },
    {
      userId: extraMembers[0]!.id,
      label: extraMembers[0]!.label,
      incomeCategory: 'Side Business',
      incomeBase: 2_200_000,
      incomeDay: 12,
      preferredAccounts: ['GoPay', 'OVO', 'Cash'],
      spendingWeights: [
        {
          category: 'Entertainment',
          weight: 4,
          descriptions: ['Movie Tickets', 'Game Purchase', 'Karaoke', 'Sports Event'],
          min: 50_000,
          max: 600_000,
        },
        {
          category: 'Pocket Money',
          weight: 3,
          descriptions: ['Coffee Shop', 'Clothing', 'Personal Care', 'Snacks'],
          min: 25_000,
          max: 350_000,
        },
        {
          category: 'Dine Out',
          weight: 2,
          descriptions: ['Cafe Lunch', 'Ramen Seirockya', 'Mie Gacoan'],
          min: 40_000,
          max: 450_000,
        },
      ],
    },
    {
      userId: extraMembers[1]!.id,
      label: extraMembers[1]!.label,
      incomeCategory: 'Other Income',
      incomeBase: 900_000,
      incomeDay: 6,
      preferredAccounts: ['Cash', 'GoPay'],
      spendingWeights: [
        {
          category: 'Kids Expenses',
          weight: 4,
          descriptions: ['School Project', 'Books', 'Play Center', 'Theme Park'],
          min: 35_000,
          max: 450_000,
        },
        {
          category: 'Food & Groceries',
          weight: 3,
          descriptions: ['Snacks', 'Juice Bar', 'Breakfast Street Food'],
          min: 20_000,
          max: 180_000,
        },
        {
          category: 'Entertainment',
          weight: 2,
          descriptions: ['Arcade', 'Movie Tickets', 'Indoor Playground'],
          min: 40_000,
          max: 320_000,
        },
      ],
    },
  ];

  const memberWeights = [
    { userId: memberProfiles[0]!.userId, weight: 3 },
    { userId: memberProfiles[1]!.userId, weight: 3 },
    { userId: memberProfiles[2]!.userId, weight: 2 },
    { userId: memberProfiles[3]!.userId, weight: 1.5 },
  ];
  const memberProfileById = new Map(memberProfiles.map((profile) => [profile.userId, profile]));

  const paymentAccountIds = memberProfiles
    .flatMap((profile) => profile.preferredAccounts)
    .map((name) => accountMap.get(name))
    .filter((id): id is string => !!id);
  const fallbackAccountIds = [...new Set(paymentAccountIds)];

  const txBatch: Array<{
    id: string;
    workspace_id: string;
    created_by_user_id: string;
    category_id: string;
    account_id: string;
    type: 'income' | 'expense';
    amount: string;
    currency: string;
    description: string;
    transaction_date: Date;
    created_at: Date;
    updated_at: Date;
  }> = [];
  const TX_BATCH_SIZE = 500;
  let transactionCount = 0;

  const flushTransactions = async () => {
    if (txBatch.length === 0) return;
    await db.insert(transactions).values(txBatch);
    transactionCount += txBatch.length;
    txBatch.length = 0;
  };

  for (let monthIndex = 0; monthIndex < months.length; monthIndex++) {
    const { year, month } = months[monthIndex]!;
    const daysInMonth = new Date(year, month, 0).getDate();
    const maxDay =
      year === now.getFullYear() && month === now.getMonth() + 1
        ? Math.min(now.getDate(), daysInMonth)
        : daysInMonth;
    const progressPct = Math.round(((monthIndex + 1) / months.length) * 100);
    console.log(
      `   [${String(monthIndex + 1).padStart(2, '0')}/${months.length}] ${year}-${String(month).padStart(2, '0')} (${progressPct}%)`
    );

    // 1) Monthly income per member profile
    for (const profile of memberProfiles) {
      const categoryId = categoryMap.get(profile.incomeCategory);
      const accountId = accountMap.get(profile.preferredAccounts[0] || '') || fallbackAccountIds[0];
      if (!categoryId || !accountId) continue;

      const incomeDay = Math.min(profile.incomeDay, maxDay);
      const txDate = specificDate(year, month, incomeDay);
      if (!txDate) continue;

      const variation = 0.92 + Math.random() * 0.18;
      const amount = Math.round(profile.incomeBase * variation);
      const createdAt = new Date(txDate);
      createdAt.setHours(8 + Math.floor(Math.random() * 3), 0, 0, 0);

      txBatch.push({
        id: nanoid(),
        workspace_id: workspaceId,
        created_by_user_id: profile.userId,
        category_id: categoryId,
        account_id: accountId,
        type: 'income',
        amount: amt(amount),
        currency: 'IDR',
        description: profile.incomeCategory,
        transaction_date: txDate,
        created_at: createdAt,
        updated_at: createdAt,
      });
    }

    // 2) Daily family expenses (3-8/day, distributed across family members)
    for (let day = 1; day <= maxDay; day++) {
      const dailyCount = 3 + Math.floor(Math.random() * 6);
      for (let i = 0; i < dailyCount; i++) {
        const selectedMember = pickWeighted(memberWeights);
        const profile = memberProfileById.get(selectedMember.userId);
        if (!profile) continue;

        const chosenSpend = pickWeighted(profile.spendingWeights);
        const categoryId = categoryMap.get(chosenSpend.category);
        if (!categoryId) continue;

        const accountName =
          profile.preferredAccounts[Math.floor(Math.random() * profile.preferredAccounts.length)];
        const accountId =
          (accountName && accountMap.get(accountName)) ||
          fallbackAccountIds[Math.floor(Math.random() * fallbackAccountIds.length)];
        if (!accountId) continue;

        const weekEndBoost = [0, 6].includes(new Date(year, month - 1, day).getDay()) ? 1.12 : 1;
        const amount = Math.round(
          (chosenSpend.min + Math.random() * (chosenSpend.max - chosenSpend.min)) * weekEndBoost
        );
        const description =
          chosenSpend.descriptions[Math.floor(Math.random() * chosenSpend.descriptions.length)] ||
          `${profile.label} expense`;

        const txDate = specificDate(year, month, day);
        if (!txDate) continue;
        const createdAt = new Date(txDate);
        createdAt.setHours(
          7 + Math.floor(Math.random() * 14),
          Math.floor(Math.random() * 60),
          0,
          0
        );

        txBatch.push({
          id: nanoid(),
          workspace_id: workspaceId,
          created_by_user_id: profile.userId,
          category_id: categoryId,
          account_id: accountId,
          type: 'expense',
          amount: amt(amount),
          currency: 'IDR',
          description,
          transaction_date: txDate,
          created_at: createdAt,
          updated_at: createdAt,
        });
      }
    }

    // 3) Budgets for all categories every month (60 months)
    const budgetValues = EXPENSE_CATEGORIES.map((category) => {
      const inflationFactor = 1 + monthIndex * 0.0025;
      return {
        id: nanoid(),
        workspace_id: workspaceId,
        created_by_user_id: adminUserId,
        category_id: categoryMap.get(category.name)!,
        month,
        year,
        budget_amount: amt(Math.round(category.budget * inflationFactor)),
        currency: 'IDR' as const,
        is_closed: false,
        notes: null,
        created_at: now,
        updated_at: now,
      };
    }).filter((record) => !!record.category_id);

    if (budgetValues.length > 0) {
      await db.insert(budgets).values(budgetValues);
    }

    // 4) Account history month-end balances (60 months)
    const historyValues: Array<{
      id: string;
      account_id: string;
      balance: string;
      notes: string;
      recorded_at: Date;
    }> = [];
    for (const [accountName, accountId] of accountMap.entries()) {
      const accountConfig = ALL_ACCOUNTS.find((account) => account.name === accountName);
      const baseBalance = Number(accountConfig?.balance || 0) || 1_000_000;
      const trendFactor = 1 + monthIndex * 0.0015;
      const variation = 0.94 + Math.random() * 0.12;
      const balance = Math.round(baseBalance * trendFactor * variation);
      historyValues.push({
        id: nanoid(),
        account_id: accountId,
        balance: amt(balance),
        notes: `Stress monthly close ${year}-${String(month).padStart(2, '0')}`,
        recorded_at: new Date(year, month - 1, Math.min(28, maxDay), SEED_TIME_HOUR, 0, 0, 0),
      });
    }
    if (historyValues.length > 0) {
      await db.insert(accountHistory).values(historyValues);
    }

    // 5) Monthly snapshot + items for each account
    const snapshotDate = new Date(year, month - 1, 1, SEED_TIME_HOUR, 0, 0, 0);
    const snapshotId = nanoid();
    await db.insert(accountSnapshots).values({
      id: snapshotId,
      workspace_id: workspaceId,
      created_by_user_id: adminUserId,
      snapshot_date: snapshotDate,
      month,
      year,
      notes: `Stress snapshot ${snapshotDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`,
      created_at: snapshotDate,
    });
    const snapshotItems = Array.from(accountMap.entries()).map(([accountName, accountId]) => {
      const accountConfig = ALL_ACCOUNTS.find((account) => account.name === accountName);
      const baseBalance = Number(accountConfig?.balance || 0) || 1_000_000;
      const variation = 0.9 + Math.random() * 0.2;
      return {
        id: nanoid(),
        snapshot_id: snapshotId,
        account_id: accountId,
        balance: amt(Math.round(baseBalance * variation)),
        currency: accountConfig?.currency || 'IDR',
      };
    });
    if (snapshotItems.length > 0) {
      await db.insert(accountSnapshotItems).values(snapshotItems);
    }

    if (txBatch.length >= TX_BATCH_SIZE) {
      await flushTransactions();
    }
  }

  await flushTransactions();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`✅ Stress data seeded in ${elapsed}s`);
  console.log(`   ✓ 60 months generated`);
  console.log(`   ✓ ${transactionCount} stress transactions inserted`);
  console.log(`   ✓ 4 family members in workspace (2 original + 2 additional, distinct profiles)`);
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
    const workspaceId = await seedWorkspace();
    const { adminUserId: userId, memberUserId } = await seedUsers(workspaceId);
    const categoryMap = await seedCategories(workspaceId, userId);
    const accountCategoryMap = await seedAccountCategories(workspaceId, userId);

    // Seed budgets for expense categories (must be after categories)
    await seedBudgets(workspaceId, userId, categoryMap);

    // Seed accounts FIRST (transactions now depend on accounts)
    const accountMap = await seedAccounts(workspaceId, userId, memberUserId, accountCategoryMap);

    // Seed transactions for the 3 months (admin user = Dad)
    await seedIncomeTransactions(workspaceId, userId, categoryMap, accountMap);
    await seedExpenseTransactions(workspaceId, userId, categoryMap, accountMap);
    await seedTransferTransactions(workspaceId, userId, accountMap);

    // Seed member transactions (member user = Mom)
    await seedMemberTransactions(workspaceId, memberUserId, categoryMap, accountMap);

    // Seed audit trail for some transactions
    await seedTransactionAuditLogs(workspaceId, userId, memberUserId);

    // Seed recurring templates + generated occurrences (with mixed statuses)
    await seedRecurringData(workspaceId, userId, categoryMap, accountMap);

    // Seed account-related data
    await seedAccountHistory(accountMap);
    await seedAccountUpdateReminders(workspaceId, userId, accountMap);
    await seedAccountSnapshots(workspaceId, userId, accountMap);

    // Backfill initial_balance for any accounts that don't have it
    await backfillInitialBalance();

    // Benchmark mode: add ~10k transactions for performance testing
    if (isBenchmarkMode) {
      await seedBenchmarkData(workspaceId, userId, categoryMap, accountMap);
    }

    // Stress mode: 5 years of realistic family activity
    if (isStressMode) {
      await seedStressData(workspaceId, userId, memberUserId, categoryMap, accountMap);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log(`\n✅ Database seeded successfully in ${elapsed}s!`);
    if (isBenchmarkMode) {
      console.log('📊 Benchmark mode: ~10k extra transactions added for performance testing');
    }
    if (isStressMode) {
      console.log('🔥 Stress mode: 5 years of realistic family activity added');
    }
    console.log('\n📋 Demo Credentials:');
    console.log('\n   Admin User:');
    console.log(`   Email:    ${DEMO_ADMIN.email}`);
    console.log(`   Password: ${DEMO_ADMIN.password}`);
    console.log('\n   Member User:');
    console.log(`   Email:    ${DEMO_MEMBER.email}`);
    console.log(`   Password: ${DEMO_MEMBER.password}`);
    if (isStressMode) {
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
