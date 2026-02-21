/**
 * Dashboard Mock Data
 *
 * Mock data for dashboard UI components and Storybook stories.
 * All data follows the project's type definitions.
 */

import type { TransactionOutput } from '@/lib/types/transaction';

// ============================================================================
// SUMMARY CARDS MOCK DATA
// ============================================================================

export interface SummaryCardsData {
  totalAccounts: {
    byCurrency: Array<{
      currency: Currency;
      amount: number;
    }>;
  };
  monthlySpent: {
    spent: number;
    budget: number;
    currency: Currency;
    percentage: number;
  };
  budgetHealth: {
    alertCount: number;
    status: 'healthy' | 'warning' | 'exceeded';
  };
}

export const mockSummaryCardsData: SummaryCardsData = {
  totalAccounts: {
    byCurrency: [
      { currency: 'IDR', amount: 150_000_000 },
      { currency: 'USD', amount: 10_000 },
    ],
  },
  monthlySpent: {
    spent: 40_647_000,
    budget: 101_942_000,
    currency: 'IDR',
    percentage: 39.86,
  },
  budgetHealth: {
    alertCount: 2,
    status: 'warning',
  },
};

// Alternative states
export const mockSummaryCardsHealthy: SummaryCardsData = {
  totalAccounts: {
    byCurrency: [
      { currency: 'IDR', amount: 150_000_000 },
      { currency: 'USD', amount: 10_000 },
    ],
  },
  monthlySpent: {
    spent: 40_000_000,
    budget: 101_942_000,
    currency: 'IDR',
    percentage: 39.2,
  },
  budgetHealth: {
    alertCount: 0,
    status: 'healthy',
  },
};

export const mockSummaryCardsExceeded: SummaryCardsData = {
  totalAccounts: {
    byCurrency: [
      { currency: 'IDR', amount: 150_000_000 },
      { currency: 'USD', amount: 10_000 },
    ],
  },
  monthlySpent: {
    spent: 95_000_000,
    budget: 101_942_000,
    currency: 'IDR',
    percentage: 93.2,
  },
  budgetHealth: {
    alertCount: 5,
    status: 'exceeded',
  },
};

export const mockSummaryCardsEmpty: SummaryCardsData = {
  totalAccounts: {
    byCurrency: [],
  },
  monthlySpent: {
    spent: 0,
    budget: 0,
    currency: 'IDR',
    percentage: 0,
  },
  budgetHealth: {
    alertCount: 0,
    status: 'healthy',
  },
};

// ============================================================================
// ACCOUNT UPDATE TODO LIST MOCK DATA
// ============================================================================

export interface AccountUpdateTodoItem {
  id: string;
  name: string;
  type: 'bank_account' | 'mutual_fund' | 'bond' | 'crypto' | 'stock' | 'other';
  balance: number;
  currency: Currency;
  daysSinceUpdate: number;
  lastUpdated: Date;
  priority: 'high' | 'medium' | 'low' | 'none';
}

export const mockAccountUpdateTodos: AccountUpdateTodoItem[] = [
  {
    id: '1',
    name: 'BCA Mutual Fund',
    type: 'mutual_fund',
    balance: 20_000_000,
    currency: 'IDR',
    daysSinceUpdate: 45,
    lastUpdated: new Date('2025-11-20'),
    priority: 'high',
  },
  {
    id: '2',
    name: 'Crypto Wallet',
    type: 'crypto',
    balance: 500,
    currency: 'USD',
    daysSinceUpdate: 18,
    lastUpdated: new Date('2025-12-18'),
    priority: 'medium',
  },
  {
    id: '3',
    name: 'Stocks Portfolio',
    type: 'stock',
    balance: 10_000_000,
    currency: 'IDR',
    daysSinceUpdate: 10,
    lastUpdated: new Date('2025-12-26'),
    priority: 'low',
  },
];

export const mockAccountUpdateTodosEmpty: AccountUpdateTodoItem[] = [];

export const mockAccountUpdateTodosAllUpdated: AccountUpdateTodoItem[] = [
  {
    id: '4',
    name: 'BCA Savings',
    type: 'bank_account',
    balance: 45_000_000,
    currency: 'IDR',
    daysSinceUpdate: 1,
    lastUpdated: new Date(Date.now() - 24 * 60 * 60 * 1000),
    priority: 'none',
  },
  {
    id: '5',
    name: 'USD Savings Account',
    type: 'bank_account',
    balance: 5_000,
    currency: 'USD',
    daysSinceUpdate: 2,
    lastUpdated: new Date(Date.now() - 48 * 60 * 60 * 1000),
    priority: 'none',
  },
];

// ============================================================================
// RECENT TRANSACTIONS MOCK DATA
// ============================================================================

export const mockRecentTransactions: TransactionOutput[] = [
  {
    id: '1',
    category: {
      id: 'cat1',
      name: 'Food & Groceries',
      type: 'expense',
      icon: 'shopping-basket',
      color: 'bg-info',
    },
    account: {
      id: 'pm1',
      name: 'Cash',
      type: 'cash',
    },
    type: 'expense',
    amount: '250000',
    currency: 'IDR',
    description: 'Weekly groceries shopping',
    transaction_date: new Date('2026-01-05'),
    updated_by_user_id: null,
    deleted_by_user_id: null,
    deleted_at: null,
    created_at: new Date('2026-01-05'),
    updated_at: new Date('2026-01-05'),
  },
  {
    id: '2',
    category: {
      id: 'cat2',
      name: 'Reina Expenses',
      type: 'expense',
      icon: 'user',
      color: 'bg-secondary',
    },
    account: {
      id: 'pm2',
      name: 'BCA',
      type: 'bank_transfer',
    },
    type: 'expense',
    amount: '2800000',
    currency: 'IDR',
    description: null,
    transaction_date: new Date('2026-01-02'),
    updated_by_user_id: null,
    deleted_by_user_id: null,
    deleted_at: null,
    created_at: new Date('2026-01-02'),
    updated_at: new Date('2026-01-02'),
  },
  {
    id: '3',
    category: {
      id: 'cat3',
      name: 'Monthly Salary',
      type: 'income',
      icon: 'banknote',
      color: 'bg-success',
    },
    account: {
      id: 'pm3',
      name: 'Bank Transfer',
      type: 'bank_transfer',
    },
    type: 'income',
    amount: '15000000',
    currency: 'IDR',
    description: null,
    transaction_date: new Date('2026-01-01'),
    updated_by_user_id: null,
    deleted_by_user_id: null,
    deleted_at: null,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
  },
  {
    id: '4',
    category: {
      id: 'cat4',
      name: 'Transportation',
      type: 'expense',
      icon: 'car',
      color: 'bg-secondary',
    },
    account: {
      id: 'pm4',
      name: 'E-Wallet',
      type: 'e_wallet',
    },
    type: 'expense',
    amount: '50000',
    currency: 'IDR',
    description: 'Gojek ride to office',
    transaction_date: new Date('2026-01-04'),
    updated_by_user_id: null,
    deleted_by_user_id: null,
    deleted_at: null,
    created_at: new Date('2026-01-04'),
    updated_at: new Date('2026-01-04'),
  },
  {
    id: '5',
    category: {
      id: 'cat5',
      name: 'Dine Out',
      type: 'expense',
      icon: 'utensils',
      color: 'bg-warning',
    },
    account: {
      id: 'pm5',
      name: 'Credit Card',
      type: 'credit_card',
    },
    type: 'expense',
    amount: '450000',
    currency: 'IDR',
    description: 'Dinner at restaurant',
    transaction_date: new Date('2026-01-03'),
    updated_by_user_id: null,
    deleted_by_user_id: null,
    deleted_at: null,
    created_at: new Date('2026-01-03'),
    updated_at: new Date('2026-01-03'),
  },
];

export const mockRecentTransactionsEmpty: TransactionOutput[] = [];

// ============================================================================
// BUDGET HEALTH WIDGET MOCK DATA
// ============================================================================

export interface BudgetAlertItem {
  categoryId: string;
  categoryName: string;
  budgetAmount: number;
  spentAmount: number;
  remaining: number;
  percentage: number;
  status: 'ok' | 'warning' | 'exceeded';
}

export interface BudgetHealthData {
  alertCount: number;
  status: 'healthy' | 'warning' | 'exceeded';
  alerts: BudgetAlertItem[];
}

export const mockBudgetHealthData: BudgetHealthData = {
  alertCount: 3,
  status: 'warning',
  alerts: [
    {
      categoryId: 'cat17',
      categoryName: 'Belanja Rumah',
      budgetAmount: 500_000,
      spentAmount: 1_679_000,
      remaining: -1_179_000,
      percentage: 335.8,
      status: 'exceeded',
    },
    {
      categoryId: 'cat16',
      categoryName: 'Ivan Expenses',
      budgetAmount: 5_000_000,
      spentAmount: 4_050_000,
      remaining: 950_000,
      percentage: 81.0,
      status: 'warning',
    },
    {
      categoryId: 'cat15',
      categoryName: 'Utilities',
      budgetAmount: 1_000_000,
      spentAmount: 850_000,
      remaining: 150_000,
      percentage: 85.0,
      status: 'warning',
    },
  ],
};

export const mockBudgetHealthHealthy: BudgetHealthData = {
  alertCount: 0,
  status: 'healthy',
  alerts: [],
};

export const mockBudgetHealthExceeded: BudgetHealthData = {
  alertCount: 5,
  status: 'exceeded',
  alerts: [
    {
      categoryId: 'cat1',
      categoryName: 'Holiday',
      budgetAmount: 10_000_000,
      spentAmount: 11_500_000,
      remaining: -1_500_000,
      percentage: 115.0,
      status: 'exceeded',
    },
    {
      categoryId: 'cat2',
      categoryName: 'Dine Out',
      budgetAmount: 1_000_000,
      spentAmount: 1_200_000,
      remaining: -200_000,
      percentage: 120.0,
      status: 'exceeded',
    },
    {
      categoryId: 'cat3',
      categoryName: 'Transportation',
      budgetAmount: 2_000_000,
      spentAmount: 1_900_000,
      remaining: 100_000,
      percentage: 95.0,
      status: 'warning',
    },
    {
      categoryId: 'cat4',
      categoryName: 'Entertainment',
      budgetAmount: 1_500_000,
      spentAmount: 1_350_000,
      remaining: 150_000,
      percentage: 90.0,
      status: 'warning',
    },
    {
      categoryId: 'cat5',
      categoryName: 'Shopping',
      budgetAmount: 3_000_000,
      spentAmount: 2_700_000,
      remaining: 300_000,
      percentage: 90.0,
      status: 'warning',
    },
  ],
};

// ============================================================================
// LOADING STATES
// ============================================================================

export const mockLoadingState = {
  loading: true,
};

export const mockErrorState = {
  error: 'Failed to load data',
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get account priority based on days since update
 */
export function getAccountPriority(daysSinceUpdate: number): 'high' | 'medium' | 'low' | 'none' {
  if (daysSinceUpdate > 30) return 'high';
  if (daysSinceUpdate > 14) return 'medium';
  if (daysSinceUpdate > 7) return 'low';
  return 'none';
}

/**
 * Get budget status based on percentage
 */
export function getBudgetStatus(percentage: number): 'ok' | 'warning' | 'exceeded' {
  if (percentage >= 100) return 'exceeded';
  if (percentage >= 80) return 'warning';
  return 'ok';
}

/**
 * Get budget health overall status from alert count
 */
export function getBudgetHealthStatus(alertCount: number): 'healthy' | 'warning' | 'exceeded' {
  if (alertCount === 0) return 'healthy';
  if (alertCount >= 3) return 'exceeded';
  return 'warning';
}
