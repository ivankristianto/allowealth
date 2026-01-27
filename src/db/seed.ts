/**
 * Database Seeder
 *
 * Seeds the database with realistic sample data for testing and development.
 * Can be run multiple times - will clear existing data before seeding.
 *
 * Usage: bun run src/db/seed.ts
 */

/* eslint-disable no-console -- Console output is intentional for seeder progress feedback */

import { db, getDatabaseConfig } from './index';
import { nanoid } from 'nanoid';
import { hashPassword } from '@/lib/auth/password';
import { sql } from 'drizzle-orm';
import {
  users,
  userSettings,
  categories,
  transactions,
  assets,
  assetHistory,
  assetUpdateReminders,
  assetSnapshots,
  assetSnapshotItems,
  exchangeRates,
  sessions,
  passwordResetTokens,
  budgets,
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

// ============================================================================
// DATA TEMPLATES
// ============================================================================

// Icon and color mapping for categories (Lucide icons + DaisyUI semantic colors)
const CATEGORY_STYLES: Record<string, { icon: string; color: string }> = {
  // Expense categories
  Holiday: { icon: 'plane', color: 'bg-secondary' },
  'Food & Groceries': { icon: 'shopping-basket', color: 'bg-info' },
  'Dine Out': { icon: 'utensils', color: 'bg-warning' },
  'Vony Work Support': { icon: 'briefcase', color: 'bg-neutral' },
  "Vony's Pocket Money": { icon: 'wallet', color: 'bg-secondary' },
  'Mama Medan': { icon: 'heart', color: 'bg-error' },
  'Ivan Expenses': { icon: 'user', color: 'bg-primary' },
  'Reina Expenses': { icon: 'user', color: 'bg-secondary' },
  'Rex Expenses': { icon: 'user', color: 'bg-accent' },
  'Utility Bills': { icon: 'zap', color: 'bg-info' },
  'Misc. Cost': { icon: 'package', color: 'bg-neutral' },
  Entertainment: { icon: 'smile', color: 'bg-secondary' },
  'Expenses for Mom': { icon: 'heart', color: 'bg-error' },
  'Maid Salary': { icon: 'users', color: 'bg-accent' },
  Transportation: { icon: 'car', color: 'bg-secondary' },
  'Cicilan Properti': { icon: 'home', color: 'bg-error' },
  'Belanja Rumah': { icon: 'shopping-cart', color: 'bg-success' },
  'Renovasi Rumah': { icon: 'hammer', color: 'bg-warning' },
  Insurance: { icon: 'shield', color: 'bg-info' },
  'Reimburse to HM': { icon: 'repeat', color: 'bg-neutral' },
  // Income categories
  'HM + Reimburse': { icon: 'banknote', color: 'bg-success' },
  QW: { icon: 'banknote', color: 'bg-success' },
  Primaya: { icon: 'banknote', color: 'bg-success' },
  'Premier Jatinegara': { icon: 'banknote', color: 'bg-success' },
  'BCA Ivan - ST12T2': { icon: 'banknote', color: 'bg-success' },
  'AKP Bintaro': { icon: 'banknote', color: 'bg-success' },
  'INDON48 CIMB Ivan': { icon: 'banknote', color: 'bg-success' },
  'FR 102 Vony': { icon: 'banknote', color: 'bg-success' },
  'Div BBRI BMRI': { icon: 'trending-up', color: 'bg-success' },
  'Div ADRO': { icon: 'trending-up', color: 'bg-success' },
  'CIMB BRPT-Vony': { icon: 'banknote', color: 'bg-success' },
  'Other Income': { icon: 'circle-dot', color: 'bg-primary' },
};

// Expense categories with their budgets
const EXPENSE_CATEGORIES = [
  { name: 'Holiday', budget: 3000000 },
  { name: 'Food & Groceries', budget: 8000000 },
  { name: 'Dine Out', budget: 3000000 },
  { name: 'Vony Work Support', budget: 500000 },
  { name: "Vony's Pocket Money", budget: 2000000 },
  { name: 'Mama Medan', budget: 3000000 },
  { name: 'Ivan Expenses', budget: 2000000 },
  { name: 'Reina Expenses', budget: 2000000 },
  { name: 'Rex Expenses', budget: 2000000 },
  { name: 'Utility Bills', budget: 2000000 },
  { name: 'Misc. Cost', budget: 2000000 },
  { name: 'Entertainment', budget: 1500000 },
  { name: 'Expenses for Mom', budget: 2000000 },
  { name: 'Maid Salary', budget: 6000000 },
  { name: 'Transportation', budget: 1500000 },
  { name: 'Cicilan Properti', budget: 8000000 },
  { name: 'Belanja Rumah', budget: 3000000 },
  { name: 'Renovasi Rumah', budget: 5000000 },
  { name: 'Insurance', budget: 3000000 },
  { name: 'Reimburse to HM', budget: 5000000 },
];

// Income categories
const INCOME_CATEGORIES = [
  { name: 'HM + Reimburse', budget: 0 },
  { name: 'QW', budget: 0 },
  { name: 'Primaya', budget: 0 },
  { name: 'Premier Jatinegara', budget: 0 },
  { name: 'BCA Ivan - ST12T2', budget: 0 },
  { name: 'AKP Bintaro', budget: 0 },
  { name: 'INDON48 CIMB Ivan', budget: 0 },
  { name: 'FR 102 Vony', budget: 0 },
  { name: 'Div BBRI BMRI', budget: 0 },
  { name: 'Div ADRO', budget: 0 },
  { name: 'CIMB BRPT-Vony', budget: 0 },
  { name: 'Other Income', budget: 0 },
];

// Payment assets (used for daily transactions - cash, bank accounts, credit cards, e-wallets)
const PAYMENT_ASSETS = [
  {
    name: 'Cash',
    type: 'cash' as const,
    balance: 2000000,
    currency: 'IDR' as const,
    is_cash_account: true,
  },
  {
    name: 'BCA Debit',
    type: 'bank_account' as const,
    balance: 15000000,
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

// Income transactions with amounts and dates
const INCOME_TRANSACTIONS = [
  // January 2026
  { description: 'HM + Reimburse', amount: 15000000, day: 25, month: 1, year: 2026 },
  { description: 'QW', amount: 3500000, day: 5, month: 1, year: 2026 },
  { description: 'Primaya', amount: 2500000, day: 10, month: 1, year: 2026 },
  { description: 'BCA Ivan - ST12T2', amount: 5000000, day: 15, month: 1, year: 2026 },
  { description: 'INDON48 CIMB Ivan', amount: 3000000, day: 20, month: 1, year: 2026 },
  { description: 'Div BBRI BMRI', amount: 1500000, day: 8, month: 1, year: 2026 },
  { description: 'Div ADRO', amount: 800000, day: 12, month: 1, year: 2026 },

  // December 2025
  { description: 'HM + Reimburse', amount: 15000000, day: 25, month: 12, year: 2025 },
  { description: 'Premier Jatinegara', amount: 2000000, day: 5, month: 12, year: 2025 },
  { description: 'AKP Bintaro', amount: 4000000, day: 10, month: 12, year: 2025 },
  { description: 'FR 102 Vony', amount: 3500000, day: 15, month: 12, year: 2025 },
  { description: 'CIMB BRPT-Vony', amount: 2500000, day: 20, month: 12, year: 2025 },
  { description: 'QW', amount: 3500000, day: 8, month: 12, year: 2025 },

  // November 2025
  { description: 'HM + Reimburse', amount: 15000000, day: 25, month: 11, year: 2025 },
  { description: 'Primaya', amount: 2500000, day: 5, month: 11, year: 2025 },
  { description: 'BCA Ivan - ST12T2', amount: 5000000, day: 12, month: 11, year: 2025 },
  { description: 'INDON48 CIMB Ivan', amount: 3000000, day: 18, month: 11, year: 2025 },
  { description: 'Div BBRI BMRI', amount: 1500000, day: 8, month: 11, year: 2025 },
  { description: 'Div ADRO', amount: 800000, day: 15, month: 11, year: 2025 },
];

// Expense transactions with categories and amounts
const EXPENSE_TRANSACTIONS: Array<{
  description: string;
  category: string;
  amount: number | [number, number]; // Fixed amount or range
  months?: number[]; // Specific months (1=Jan, 2=Feb, etc.) - if undefined, all months
}> = [
  // Regular monthly expenses
  { description: 'Cicilan CRV ke 20 / 36', category: 'Cicilan Properti', amount: 8500000 },
  { description: 'JHT Ivan', category: 'Insurance', amount: 500000 },
  { description: 'JHT Vony', category: 'Insurance', amount: 400000 },
  { description: 'Allianz insurance', category: 'Insurance', amount: [300000, 500000] },
  { description: 'Allianz insurance', category: 'Reimburse to HM', amount: [300000, 500000] },
  { description: 'XLHome', category: 'Utility Bills', amount: 450000 },
  { description: 'Apple, Xbox, Server, YouTube', category: 'Ivan Expenses', amount: 250000 },
  { description: 'SPP Reina', category: 'Reina Expenses', amount: [500000, 1500000] },
  { description: 'SPP Rex', category: 'Rex Expenses', amount: [400000, 1200000] },
  { description: 'IPL Arana', category: 'Utility Bills', amount: [500000, 800000] },
  { description: 'PDAM', category: 'Utility Bills', amount: [150000, 300000] },
  { description: 'Listrik', category: 'Utility Bills', amount: [800000, 1500000] },
  { description: 'Gaji mba kasbon 1.9 jt', category: 'Maid Salary', amount: 1900000 },
  { description: 'Gaji mba kasbon 2.9 jt', category: 'Maid Salary', amount: 2900000 },
  { description: 'Gaji mba kasbon 4 jt', category: 'Maid Salary', amount: 4000000 },
  { description: 'Gaji mpo', category: 'Maid Salary', amount: [2000000, 2500000] },
  { description: 'BPJS Medan', category: "Vony's Pocket Money", amount: [200000, 400000] },
  { description: 'Ext alis', category: "Vony's Pocket Money", amount: [100000, 300000] },

  // Variable expenses
  { description: 'Dekoruma 02/03', category: 'Belanja Rumah', amount: [500000, 2000000] },
  { description: 'Jangkrik Mimi', category: 'Misc. Cost', amount: [50000, 200000] },
  { description: 'Helaparumaen Bipang', category: 'Food & Groceries', amount: [100000, 300000] },
  { description: 'Ttitp belanja ke Mama', category: 'Misc. Cost', amount: [200000, 1000000] },
  { description: 'Cece Buah', category: 'Food & Groceries', amount: [50000, 200000] },
  { description: 'Grand Lucky', category: 'Food & Groceries', amount: [200000, 800000] },
  { description: 'Pizza Grand Lucky', category: 'Food & Groceries', amount: [150000, 400000] },
  { description: 'Alfamidi', category: 'Food & Groceries', amount: [100000, 500000] },
  { description: 'Alfamidi n prime', category: 'Food & Groceries', amount: [150000, 600000] },
  { description: 'Snack', category: 'Food & Groceries', amount: [30000, 150000] },
  { description: 'Kebun buah', category: 'Food & Groceries', amount: [100000, 400000] },
  { description: 'Roti Mako', category: 'Food & Groceries', amount: [50000, 150000] },
  { description: 'Beli Obat di Apotik', category: 'Misc. Cost', amount: [100000, 500000] },
  { description: 'Belanja di Century SMB', category: 'Misc. Cost', amount: [150000, 600000] },
  { description: 'Sparepart LCD TV Mama', category: 'Misc. Cost', amount: [500000, 1500000] },
  { description: 'Belanja Pasar - Ivan', category: 'Food & Groceries', amount: [200000, 700000] },
  { description: 'Groceries Superindo', category: 'Food & Groceries', amount: [300000, 1000000] },
  { description: 'Belanja pasar cash', category: 'Food & Groceries', amount: [150000, 600000] },
  {
    description: 'Cash: Makanan Mimi + Gorengan',
    category: 'Food & Groceries',
    amount: [50000, 200000],
  },
  {
    description: 'Mie Aceh SMB + sari tebu',
    category: 'Food & Groceries',
    amount: [80000, 200000],
  },
  { description: 'Beard Papa SMB', category: 'Food & Groceries', amount: [50000, 150000] },
  {
    description: 'Sarapan Lontng + Nasi Uduk',
    category: 'Food & Groceries',
    amount: [40000, 120000],
  },
  { description: 'Beli Obat Cacing', category: 'Food & Groceries', amount: [50000, 150000] },
  { description: 'Beli Ikan + Ulat', category: 'Belanja Rumah', amount: [100000, 300000] },
  { description: 'Aqua 4 galon', category: 'Food & Groceries', amount: [60000, 80000] },
  { description: 'Beli Jus', category: 'Food & Groceries', amount: [30000, 80000] },
  { description: 'Belanja Buah', category: 'Food & Groceries', amount: [100000, 400000] },

  // Dining out
  { description: 'Ramen Seirockya', category: 'Dine Out', amount: [80000, 150000] },
  { description: 'Makmal', category: 'Dine Out', amount: [100000, 300000] },
  { description: 'Titik Beku Cafe', category: 'Dine Out', amount: [100000, 250000] },
  { description: 'Paulaners', category: 'Dine Out', amount: [150000, 400000] },
  { description: 'Makan di GI', category: 'Dine Out', amount: [200000, 500000] },
  { description: 'Mie Gacoan', category: 'Dine Out', amount: [60000, 150000] },

  // Holiday/Travel
  { description: 'Belanja di Bandung OctoPay', category: 'Holiday', amount: [300000, 1500000] },
  { description: 'Mode Bakery - Bandung', category: 'Holiday', amount: [100000, 300000] },
  { description: 'Mode Kitchen', category: 'Holiday', amount: [150000, 400000] },
  { description: 'Gecko & Permen di Farmhouse', category: 'Holiday', amount: [100000, 300000] },
  { description: 'Fore Coffee - Ciwalk', category: 'Holiday', amount: [50000, 100000] },
  {
    description: 'Naik ATV & Kuda & Playground di Intercontinental',
    category: 'Holiday',
    amount: [500000, 1500000],
  },
  { description: 'Sunset Juice di Kartika Sari', category: 'Holiday', amount: [50000, 150000] },
  { description: 'Sbux KM 72A', category: 'Holiday', amount: [80000, 200000] },
  { description: 'Bijan - Bandung', category: 'Holiday', amount: [150000, 400000] },
  { description: 'Extra Bed - Intercontinental', category: 'Holiday', amount: [500000, 1000000] },
  { description: 'Rumah Mode', category: 'Holiday', amount: [300000, 1000000] },
  { description: 'Mujigae - Ciwalk', category: 'Holiday', amount: [150000, 400000] },
  { description: 'Kartika Sari - Dago', category: 'Holiday', amount: [100000, 500000] },
  { description: 'Congo - Bandung', category: 'Holiday', amount: [200000, 600000] },
  { description: 'Sagoo Kitchen - PVJ', category: 'Holiday', amount: [150000, 500000] },
  { description: 'Intercontinental', category: 'Holiday', amount: [2000000, 5000000] },
  { description: 'A&W Rest Area', category: 'Holiday', amount: [80000, 200000] },
  { description: 'Kopi - Kota Baru Parahyangan', category: 'Holiday', amount: [50000, 150000] },
  { description: 'Lunch di Kota Baru Parahyangan', category: 'Holiday', amount: [150000, 400000] },
  { description: 'Lomie mambo', category: 'Holiday', amount: [80000, 200000] },
  { description: 'Makmalam RuMod', category: 'Holiday', amount: [100000, 300000] },
  { description: 'Jajan aeon', category: 'Holiday', amount: [200000, 600000] },
  { description: 'Maksi', category: 'Holiday', amount: [150000, 400000] },

  // Family expenses
  { description: 'Trf mama', category: 'Mama Medan', amount: [1000000, 3000000] },
  { description: 'Trf ci culien', category: 'Mama Medan', amount: [500000, 2000000] },
  {
    description: 'Rumah Sibolga 258 dr 300',
    category: 'Expenses for Mom',
    amount: [500000, 2000000],
  },
  { description: 'Transport PP Mama', category: 'Expenses for Mom', amount: [300000, 800000] },
  { description: 'Belanja Mama', category: 'Expenses for Mom', amount: [500000, 2000000] },
  { description: 'Cermin', category: 'Ivan Expenses', amount: [200000, 600000] },
  { description: 'Kopi Saturday - GI', category: 'Ivan Expenses', amount: [80000, 200000] },
  { description: 'Claude Code', category: 'Ivan Expenses', amount: [100000, 300000] },
  {
    description: 'Claude Code January',
    category: 'Reimburse to HM',
    amount: [100000, 300000],
    months: [1],
  },
  { description: 'Matcha HI-Five', category: 'Ivan Expenses', amount: [80000, 150000] },
  { description: 'Fore Kuningan City', category: 'Ivan Expenses', amount: [150000, 300000] },
  { description: 'Ramen Kuningan City', category: 'Ivan Expenses', amount: [100000, 250000] },
  { description: 'Potong Rambut', category: 'Ivan Expenses', amount: [75000, 150000] },
  { description: 'Farmhouse', category: 'Reina Expenses', amount: [300000, 800000] },
  { description: 'Timezone', category: 'Reina Expenses', amount: [200000, 500000] },
  { description: 'Excur little chef', category: 'Reina Expenses', amount: [150000, 400000] },
  { description: 'Buku i can read', category: 'Reina Expenses', amount: [200000, 500000] },
  { description: 'Happy mandarin', category: 'Reina Expenses', amount: [500000, 1500000] },
  { description: 'Kidzland', category: 'Reina Expenses', amount: [300000, 700000] },
  { description: 'Kidzoona', category: 'Rex Expenses', amount: [250000, 600000] },
  { description: 'Giyath 2x', category: 'Rex Expenses', amount: [100000, 300000] },
  { description: 'Sikat n pasta gigi', category: 'Rex Expenses', amount: [50000, 150000] },

  // Vony work
  { description: 'Jajan rs', category: 'Vony Work Support', amount: [50000, 150000] },
  {
    description: 'Transport rsab rspj rsab',
    category: 'Vony Work Support',
    amount: [30000, 80000],
  },
  { description: 'Transport rspj rsab', category: 'Vony Work Support', amount: [30000, 80000] },
  { description: 'Transport rspj', category: 'Vony Work Support', amount: [30000, 70000] },
  {
    description: 'Transport rspj rsab greyhound',
    category: 'Vony Work Support',
    amount: [40000, 100000],
  },
  { description: 'Patungan Natalan', category: 'Vony Work Support', amount: [200000, 500000] },

  // Reimburse items
  { description: 'Intercontinental', category: 'Reimburse to HM', amount: [2000000, 5000000] },
  { description: 'Travel Insurance', category: 'Reimburse to HM', amount: [300000, 800000] },
  { description: 'VFS Global - Visa', category: 'Reimburse to HM', amount: [800000, 2000000] },
  { description: 'Visa Fee Croatia', category: 'Reimburse to HM', amount: [1000000, 2500000] },
  {
    description: 'Transport PP urusan Visa',
    category: 'Reimburse to HM',
    amount: [200000, 500000],
  },
  { description: 'Toped: Indihome', category: 'Reimburse to HM', amount: [300000, 600000] },

  // Utilities and bills
  { description: 'Halo vony', category: 'Utility Bills', amount: [200000, 400000] },
  { description: 'Simpati vony', category: 'Utility Bills', amount: [150000, 350000] },
  { description: 'Toped: Halo Ivan', category: 'Utility Bills', amount: [200000, 400000] },
  { description: 'Toped: Halo Mama', category: 'Utility Bills', amount: [150000, 350000] },
  { description: 'Toped: Listrik Sibolga', category: 'Utility Bills', amount: [300000, 800000] },

  // Shopping and home
  { description: 'Shopee: Tongtol', category: 'Misc. Cost', amount: [100000, 400000] },
  { description: 'Prakarya: Reina - Lampu', category: 'Reina Expenses', amount: [50000, 200000] },
  { description: 'Handuk putih', category: 'Belanja Rumah', amount: [100000, 300000] },
  { description: 'Lem & Baterai', category: 'Belanja Rumah', amount: [50000, 150000] },
  { description: 'AC Skyhouse', category: 'Belanja Rumah', amount: [500000, 1500000] },
  { description: 'Spring bed comforta', category: 'Belanja Rumah', amount: [2000000, 5000000] },
  { description: 'Em4 molase', category: 'Misc. Cost', amount: [80000, 200000] },
  { description: 'Chandra asri excess 5 thn', category: 'Misc. Cost', amount: [300000, 800000] },
  { description: 'Excess chandra asri', category: 'Misc. Cost', amount: [200000, 600000] },
  { description: 'Hydroclean', category: 'Misc. Cost', amount: [150000, 400000] },

  // Personal care
  { description: 'Aplikator hair oil', category: "Vony's Pocket Money", amount: [100000, 300000] },
  { description: 'Kaos kaki', category: "Vony's Pocket Money", amount: [50000, 150000] },

  // Transportation
  {
    description: 'Shell - Kota Baru Parahyangan',
    category: 'Transportation',
    amount: [300000, 800000],
  },
  { description: 'Top up e money 2x', category: 'Transportation', amount: [200000, 600000] },

  // Insurance via marketplace
  { description: 'Toped: BPJS Mama', category: 'Insurance', amount: [300000, 800000] },
];

const ASSET_TYPES = [
  // Indonesian bank accounts (IDR)
  {
    name: 'BCA Checking',
    type: 'bank_account' as const,
    balance: 15000000,
    currency: 'IDR' as const,
  },
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
    // Delete in reverse dependency order
    await db.delete(passwordResetTokens);
    await db.delete(sessions);
    await db.delete(assetSnapshotItems);
    await db.delete(assetSnapshots);
    await db.delete(assetUpdateReminders);
    await db.delete(assetHistory);
    await db.delete(transactions);
    await db.delete(budgets);
    await db.delete(assets);
    await db.delete(categories);
    await db.delete(userSettings);
    await db.delete(users);
    await db.delete(exchangeRates);

    // Run VACUUM to clean up the database and reclaim space (SQLite only)
    const { dialect } = getDatabaseConfig();
    if (dialect === 'sqlite') {
      console.log('🧹 Vacuuming database...');
      db.run(sql`VACUUM`);
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
    const style = CATEGORY_STYLES[cat.name] || { icon: 'circle-dot', color: 'bg-slate-500' };
    await db.insert(categories).values({
      id,
      user_id: userId,
      name: cat.name,
      type: 'income',
      icon: style.icon,
      color: style.color,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });
    categoryMap.set(cat.name, id);
  }

  // Expense categories
  for (const cat of EXPENSE_CATEGORIES) {
    const id = nanoid();
    const style = CATEGORY_STYLES[cat.name] || { icon: 'tag', color: 'bg-slate-500' };
    await db.insert(categories).values({
      id,
      user_id: userId,
      name: cat.name,
      type: 'expense',
      icon: style.icon,
      color: style.color,
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
 * Seed budgets for expense categories (last 3 months)
 *
 * P2 TODO: Consider extracting monthsToSeed to a shared constant (SEED_MONTHS)
 * to synchronize with INCOME_TRANSACTIONS and expense seeding months
 */
async function seedBudgets(userId: string, categoryMap: Map<string, string>): Promise<void> {
  console.log('📊 Seeding budgets...');

  const monthsToSeed = [
    { year: 2025, month: 11 }, // November 2025
    { year: 2025, month: 12 }, // December 2025
    { year: 2026, month: 1 }, // January 2026
  ];

  // P2 TODO: Consider using schema-derived type for currency (e.g., 'IDR' as const)
  const budgetRecords: Array<{
    id: string;
    user_id: string;
    category_id: string;
    month: number;
    year: number;
    budget_amount: string;
    currency: 'IDR' | 'USD';
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
        user_id: userId,
        category_id: categoryId,
        month,
        year,
        budget_amount: amt(cat.budget),
        currency: 'IDR',
        is_closed: false,
        notes: null,
        created_at: new Date(),
        updated_at: new Date(),
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
  userId: string,
  categoryMap: Map<string, string>,
  assetMap: Map<string, string>
): Promise<number> {
  console.log('💰 Seeding income transactions...');

  let count = 0;
  // Use only payment assets for transactions (cash, bank accounts, e-wallets)
  const paymentAssetNames = PAYMENT_ASSETS.map((a) => a.name);

  for (const income of INCOME_TRANSACTIONS) {
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
        user_id: userId,
        name: income.description,
        type: 'income',
        icon: style.icon,
        color: style.color,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
      categoryMap.set(income.description, newId);
    }

    const finalCategoryId = categoryMap.get(income.description)!;
    // Pick a random payment asset (prefer bank accounts for income)
    const assetName = paymentAssetNames[Math.floor(Math.random() * paymentAssetNames.length)];
    const assetId = assetMap.get(assetName || 'Transfer')!;

    const transactionDate = specificDate(income.year, income.month, income.day);
    // Skip if date would be in the future
    if (!transactionDate) continue;

    // Add some random time variation
    transactionDate.setHours(SEED_TIME_HOUR + Math.floor(Math.random() * 8), 0, 0, 0);

    await db.insert(transactions).values({
      id: nanoid(),
      user_id: userId,
      category_id: finalCategoryId,
      asset_id: assetId,
      type: 'income',
      amount: amt(income.amount),
      currency: 'IDR',
      description: income.description,
      transaction_date: transactionDate,
      created_at: transactionDate,
      updated_at: transactionDate,
    });
    count++;
  }

  console.log(`✓ Created ${count} income transactions`);
  return count;
}

/**
 * Seed expense transactions for the 3 months
 */
async function seedExpenseTransactions(
  userId: string,
  categoryMap: Map<string, string>,
  assetMap: Map<string, string>
): Promise<number> {
  console.log('💸 Seeding expense transactions...');

  let count = 0;
  const monthsToSeed = [
    { year: 2025, month: 11 }, // November 2025
    { year: 2025, month: 12 }, // December 2025
    { year: 2026, month: 1 }, // January 2026
  ];

  // Use only payment assets for transactions
  const paymentAssetNames = PAYMENT_ASSETS.map((a) => a.name);

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

      // Add some random time variation
      transactionDate.setHours(SEED_TIME_HOUR + Math.floor(Math.random() * 10), 0, 0, 0);

      // Select asset (prefer debit/credit card for larger amounts)
      let assetName = paymentAssetNames[Math.floor(Math.random() * paymentAssetNames.length)];
      if (amount > 500000) {
        assetName = Math.random() > 0.5 ? 'BCA Debit' : 'BCA Credit Card';
      }

      const assetId = assetMap.get(assetName || 'BCA Debit');
      if (!assetId) continue;

      await db.insert(transactions).values({
        id: nanoid(),
        user_id: userId,
        category_id: categoryId,
        asset_id: assetId,
        type: 'expense',
        amount: amt(Math.round(amount)),
        currency: 'IDR',
        description: expense.description,
        transaction_date: transactionDate,
        created_at: transactionDate,
        updated_at: transactionDate,
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

        transactionDate.setHours(SEED_TIME_HOUR + Math.floor(Math.random() * 12), 0, 0, 0);

        const assetName = paymentAssetNames[Math.floor(Math.random() * paymentAssetNames.length)];
        const assetId = assetMap.get(assetName || 'Cash');
        if (!assetId) continue;

        await db.insert(transactions).values({
          id: nanoid(),
          user_id: userId,
          category_id: categoryId,
          asset_id: assetId,
          type: 'expense',
          amount,
          currency: 'IDR',
          description: `Daily expense - ${randomCategory.name}`,
          transaction_date: transactionDate,
          created_at: transactionDate,
          updated_at: transactionDate,
        });
        count++;
      }
    }
  }

  console.log(`✓ Created ${count} expense transactions`);
  return count;
}

/**
 * Seed assets (both payment assets and investment assets)
 */
async function seedAssets(userId: string): Promise<Map<string, string>> {
  console.log('💰 Seeding assets...');

  const assetMap = new Map<string, string>();

  // First, seed payment assets (cash, bank accounts, credit cards, e-wallets)
  for (const asset of PAYMENT_ASSETS) {
    const id = nanoid();
    await db.insert(assets).values({
      id,
      user_id: userId,
      name: asset.name,
      type: asset.type,
      balance: amt(asset.balance),
      currency: asset.currency,
      is_cash_account: asset.is_cash_account,
      credit_limit: 'credit_limit' in asset ? amt(asset.credit_limit) : null,
      last_updated: new Date(),
      created_at: daysAgo(90),
      updated_at: new Date(),
    });
    assetMap.set(asset.name, id);
  }

  // Then, seed investment assets
  for (const asset of ASSET_TYPES) {
    const id = nanoid();
    await db.insert(assets).values({
      id,
      user_id: userId,
      name: asset.name,
      type: asset.type,
      balance: amt(asset.balance),
      currency: asset.currency,
      is_cash_account: false, // Investment assets are not cash accounts
      last_updated: new Date(),
      created_at: daysAgo(90),
      updated_at: new Date(),
    });
    assetMap.set(asset.name, id);
  }

  console.log(`✓ Created ${assetMap.size} assets`);
  return assetMap;
}

// Combined list of all assets for lookup
const ALL_ASSETS = [...PAYMENT_ASSETS, ...ASSET_TYPES];

/**
 * Seed asset history (weekly updates for 12 weeks)
 */
async function seedAssetHistory(assetMap: Map<string, string>): Promise<void> {
  console.log('📈 Seeding asset history...');

  let historyCount = 0;

  for (const [assetName, assetId] of assetMap.entries()) {
    const assetConfig = ALL_ASSETS.find((a) => a.name === assetName);
    if (!assetConfig) continue; // Skip if asset not found

    // Generate weekly history for 12 weeks
    for (let week = 0; week < 12; week++) {
      const recordedAt = daysAgo(week * 7);
      const baseBalance = parseFloat(assetConfig.balance.toString());

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
    const assetConfig = ALL_ASSETS.find((a) => a.name === assetName);
    if (!assetConfig) continue; // Skip if asset not found

    // Set different frequencies based on asset type
    const assetType = assetConfig.type;
    let frequency: 'weekly' | 'monthly' | 'quarterly' = 'monthly';

    if (assetType === 'crypto' || assetType === 'stock') {
      frequency = 'weekly';
    } else if (assetType === 'bond') {
      frequency = 'quarterly';
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
      const assetConfig = ALL_ASSETS.find((a) => a.name === assetName);
      if (!assetConfig) continue; // Skip if asset not found

      const baseBalance = parseFloat(assetConfig.balance.toString());

      // Add some historical variation
      const variation = (Math.random() - 0.5) * baseBalance * 0.15; // ±7.5% variation
      const balance = amt(baseBalance + variation + month * baseBalance * SNAPSHOT_GROWTH_RATE); // Growing trend

      await db.insert(assetSnapshotItems).values({
        id: nanoid(),
        snapshot_id: snapshotId,
        asset_id: assetId,
        balance,
        currency: assetConfig.currency,
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

    // Seed budgets for expense categories (must be after categories)
    await seedBudgets(userId, categoryMap);

    // Seed assets FIRST (transactions now depend on assets)
    const assetMap = await seedAssets(userId);

    // Seed transactions for the 3 months
    await seedIncomeTransactions(userId, categoryMap, assetMap);
    await seedExpenseTransactions(userId, categoryMap, assetMap);

    // Seed asset-related data
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
