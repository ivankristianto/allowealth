/**
 * Mock Dashboard Data Generator
 * =============================
 * Generates realistic mock data for testing dashboard components and services.
 * Deterministic: same input produces same output.
 */

import type {
  TotalAccounts,
  MonthlySpent,
  BudgetHealth,
  BudgetAlert,
  AccountReminder,
} from '../../dashboard.service';

/**
 * Mock total accounts data
 */
export interface MockTotalAccounts extends TotalAccounts {
  userId: string;
}

/**
 * Mock monthly spent data
 */
export interface MockMonthlySpent extends MonthlySpent {
  userId: string;
  month: number;
  year: number;
}

/**
 * Mock budget health data
 */
export interface MockBudgetHealth extends BudgetHealth {
  userId: string;
  month: number;
  year: number;
}

/**
 * Mock account reminder data
 */
export interface MockAccountReminder extends AccountReminder {}

/**
 * Mock transaction data
 */
export interface MockTransaction {
  id: string;
  userId: string;
  categoryId: string;
  categoryName: string;
  accountId: string;
  accountName: string;
  type: 'expense' | 'income';
  amount: string;
  currency: 'IDR' | 'USD';
  description: string;
  transactionDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Complete mock dashboard data
 */
export interface MockDashboardData {
  userId: string;
  totalAccounts: MockTotalAccounts;
  monthlySpent: MockMonthlySpent;
  budgetHealth: MockBudgetHealth;
  accountReminders: MockAccountReminder[];
  recentTransactions: MockTransaction[];
}

/**
 * Seeded random number generator for deterministic output
 */
class SeededRandom {
  private seed: number;

  constructor(seed: string) {
    // Convert string seed to numeric seed
    this.seed = this.hashString(seed);
  }

  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Returns random number between 0 and 1
  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  // Returns random integer between min and max (inclusive)
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  // Returns random float between min and max
  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  // Returns random item from array
  nextItem<T>(array: T[]): T | undefined {
    if (array.length === 0) return undefined;
    const index = this.nextInt(0, array.length - 1);
    return array[index];
  }
}

/**
 * Generate mock total accounts data
 */
function generateMockTotalAccounts(userId: string, rng: SeededRandom): MockTotalAccounts {
  const idr = rng.nextFloat(10_000_000, 100_000_000);
  const usd = rng.nextFloat(1_000, 10_000);
  const convertedCurrency: 'IDR' | 'USD' = 'IDR';

  // Convert USD to IDR for total (using rate of 15000)
  const rate = 15000;
  const converted = idr + usd * rate;

  return {
    userId,
    idr: String(Math.round(idr)),
    usd: String(Math.round(usd * 100) / 100),
    converted: String(Math.round(converted)),
    convertedCurrency,
  };
}

/**
 * Generate mock monthly spent data
 */
function generateMockMonthlySpent(
  userId: string,
  month: number,
  year: number,
  rng: SeededRandom
): MockMonthlySpent {
  const budget = rng.nextFloat(5_000_000, 15_000_000);
  const percentage = rng.nextFloat(0.4, 1.3); // 40% to 130%
  const total = budget * percentage;
  const remaining = budget - total;

  return {
    userId,
    month,
    year,
    total: String(Math.round(total)),
    budget: String(Math.round(budget)),
    percentage: Math.round(percentage * 100 * 10) / 10, // Round to 1 decimal
    remaining: String(Math.round(remaining)),
  };
}

/**
 * Generate mock budget health data
 */
function generateMockBudgetHealth(
  userId: string,
  month: number,
  year: number,
  rng: SeededRandom
): MockBudgetHealth {
  const categories = [
    'Food & Dining',
    'Transportation',
    'Shopping',
    'Entertainment',
    'Bills & Utilities',
    'Healthcare',
  ];

  const numAlerts = rng.nextInt(0, 4);
  const alerts: BudgetAlert[] = [];

  for (let i = 0; i < numAlerts; i++) {
    const budget = rng.nextFloat(500_000, 3_000_000);
    const percentage = rng.nextFloat(0.8, 1.5); // 80% to 150%
    const spent = budget * percentage;
    const category = categories[i % categories.length];

    if (category) {
      alerts.push({
        category,
        budget: String(Math.round(budget)),
        spent: String(Math.round(spent)),
        percentage: Math.round(percentage * 100 * 10) / 10,
        status: (percentage >= 1 ? 'exceeded' : 'warning') as 'warning' | 'exceeded',
        remaining: String(Math.round(budget - spent)),
        overage: String(Math.round(Math.max(0, spent - budget))),
      });
    }
  }

  // Sort by percentage descending
  alerts.sort((a, b) => b.percentage - a.percentage);

  const hasExceeded = alerts.some((a) => a.status === 'exceeded');
  const hasWarning = alerts.some((a) => a.status === 'warning');

  const status: 'healthy' | 'warning' | 'exceeded' = hasExceeded
    ? 'exceeded'
    : hasWarning
      ? 'warning'
      : 'healthy';

  return {
    userId,
    month,
    year,
    alertCount: numAlerts,
    status,
    alerts,
  };
}

/**
 * Generate mock account reminders
 */
function generateMockAccountReminders(userId: string, rng: SeededRandom): MockAccountReminder[] {
  const accountTypes = ['bank_account', 'mutual_fund', 'bond', 'crypto', 'stock', 'other'] as const;
  const accountNames = [
    'Bank BCA',
    'Bank Mandiri',
    'BCA Syariah',
    'BNP Paribas',
    'Manulife Saham',
    'Sucorinvest',
    'SBN Ritel',
    'Bitcoin',
    'Ethereum',
    'Gojek Stock',
  ];

  const numReminders = rng.nextInt(0, 5);
  const reminders: MockAccountReminder[] = [];

  for (let i = 0; i < numReminders; i++) {
    const daysSinceUpdate = rng.nextInt(8, 60);
    const lastUpdated = new Date(Date.now() - daysSinceUpdate * 24 * 60 * 60 * 1000);

    let priority: 'high' | 'medium' | 'low';
    if (daysSinceUpdate > 30) {
      priority = 'high';
    } else if (daysSinceUpdate > 14) {
      priority = 'medium';
    } else {
      priority = 'low';
    }

    const accountName = accountNames[i % accountNames.length];
    const accountType = accountTypes[i % accountTypes.length];

    if (accountName && accountType) {
      reminders.push({
        accountId: `account-${userId}-${i}`,
        accountName,
        accountType,
        lastUpdated,
        daysSinceUpdate,
        priority,
        currentBalance: String(rng.nextFloat(1_000_000, 50_000_000)),
        currency: 'IDR',
      });
    }
  }

  // Sort by priority (high to low)
  const priorityValue = { high: 3, medium: 2, low: 1 };
  reminders.sort((a, b) => priorityValue[b.priority] - priorityValue[a.priority]);

  return reminders;
}

/**
 * Generate mock recent transactions
 */
function generateMockRecentTransactions(userId: string, rng: SeededRandom): MockTransaction[] {
  const categories = [
    { id: 'cat-1', name: 'Food & Dining' },
    { id: 'cat-2', name: 'Transportation' },
    { id: 'cat-3', name: 'Shopping' },
    { id: 'cat-4', name: 'Entertainment' },
    { id: 'cat-5', name: 'Salary' },
    { id: 'cat-6', name: 'Freelance' },
  ];

  const accounts = [
    { id: 'account-1', name: 'BCA Savings' },
    { id: 'account-2', name: 'Mandiri Checking' },
    { id: 'account-3', name: 'GoPay' },
    { id: 'account-4', name: 'OVO' },
  ];

  const expenseDescriptions = [
    'Lunch at restaurant',
    'Grocery shopping',
    'Gas refill',
    'Movie tickets',
    'Electric bill',
    'Internet bill',
    'Coffee',
    'Taxi fare',
    'Online shopping',
    'Pharmacy',
  ];

  const incomeDescriptions = [
    'Monthly salary',
    'Freelance project',
    'Bonus',
    'Investment return',
    'Dividend',
  ];

  const numTransactions = rng.nextInt(3, 10);
  const transactions: MockTransaction[] = [];

  for (let i = 0; i < numTransactions; i++) {
    const isExpense = rng.next() > 0.2; // 80% expenses, 20% income
    const daysAgo = rng.nextInt(0, 30);
    const transactionDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

    const categoryIndex = isExpense
      ? rng.nextInt(0, 3) // First 4 are expense categories
      : rng.nextInt(4, 5); // Last 2 are income categories

    const category = categories[categoryIndex];
    const descriptions = isExpense ? expenseDescriptions : incomeDescriptions;
    const descriptionIndex = rng.nextInt(0, descriptions.length - 1);
    const accountIndex = rng.nextInt(0, accounts.length - 1);
    const amount = isExpense
      ? rng.nextFloat(20_000, 2_000_000)
      : rng.nextFloat(5_000_000, 20_000_000);

    if (category) {
      const description = descriptions[descriptionIndex];
      transactions.push({
        id: `tx-${userId}-${i}`,
        userId,
        categoryId: category.id,
        categoryName: category.name,
        accountId: accounts[accountIndex]?.id || 'account-default',
        accountName: accounts[accountIndex]?.name || 'Default',
        type: isExpense ? 'expense' : 'income',
        amount: amount.toFixed(2),
        currency: 'IDR',
        description: description || '',
        transactionDate,
        createdAt: transactionDate,
        updatedAt: transactionDate,
      });
    }
  }

  // Sort by date descending
  transactions.sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime());

  return transactions;
}

/**
 * Generate complete mock dashboard data
 *
 * @param userId - User ID for the mock data
 * @param month - Month (1-12, default: current month)
 * @param year - Year (default: current year)
 * @returns Complete mock dashboard data
 *
 * @example
 * const data = generateMockDashboardData('user-123');
 * console.log(data.totalAccounts); // Total accounts data
 * console.log(data.monthlySpent); // Monthly spent data
 * console.log(data.budgetHealth); // Budget health data
 */
export function generateMockDashboardData(
  userId: string,
  month?: number,
  year?: number
): MockDashboardData {
  const now = new Date();
  const currentMonth = month ?? now.getMonth() + 1;
  const currentYear = year ?? now.getFullYear();

  // Create seeded RNG for deterministic output
  const seed = `${userId}-${currentMonth}-${currentYear}`;
  const rng = new SeededRandom(seed);

  return {
    userId,
    totalAccounts: generateMockTotalAccounts(userId, rng),
    monthlySpent: generateMockMonthlySpent(userId, currentMonth, currentYear, rng),
    budgetHealth: generateMockBudgetHealth(userId, currentMonth, currentYear, rng),
    accountReminders: generateMockAccountReminders(userId, rng),
    recentTransactions: generateMockRecentTransactions(userId, rng),
  };
}

/**
 * Generate mock accounts array
 */
export function generateMockAccounts(userId: string, count: number = 5) {
  const rng = new SeededRandom(userId);
  const accountTypes = ['bank_account', 'mutual_fund', 'bond', 'crypto', 'stock', 'other'] as const;
  const accountNames = [
    'Bank BCA',
    'Bank Mandiri',
    'BCA Syariah',
    'Manulife Saham',
    'Sucorinvest',
    'SBN Ritel',
    'Bitcoin',
    'Ethereum',
  ];

  return Array.from({ length: count }, (_, i) => ({
    id: `account-${userId}-${i}`,
    userId,
    name: accountNames[i % accountNames.length],
    type: accountTypes[i % accountTypes.length],
    balance: rng.nextFloat(1_000_000, 50_000_000).toFixed(2),
    currency: 'IDR' as const,
    lastUpdated: new Date(Date.now() - rng.nextInt(0, 60) * 24 * 60 * 60 * 1000),
    deletedAt: null,
    createdAt: new Date(Date.now() - rng.nextInt(60, 365) * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - rng.nextInt(0, 60) * 24 * 60 * 60 * 1000),
  }));
}

/**
 * Generate mock exchange rate
 */
export function generateMockExchangeRate(from: 'IDR' | 'USD', to: 'IDR' | 'USD') {
  return {
    id: `rate-${from}-${to}-${Date.now()}`,
    fromCurrency: from,
    toCurrency: to,
    rate: from === 'USD' && to === 'IDR' ? '15000' : '0.000067',
    effectiveDate: new Date(),
    createdAt: new Date(),
  };
}
