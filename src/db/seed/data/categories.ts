/**
 * Category Data Templates
 *
 * Icon, color, and description mapping for categories (Lucide icons + DaisyUI semantic colors)
 */

export const CATEGORY_STYLES: Record<
  string,
  { icon: string; color: string; description?: string }
> = {
  // Expense categories
  Holiday: {
    icon: 'plane',
    color: 'bg-secondary',
    description: 'Travel and vacations',
  },
  'Food & Groceries': {
    icon: 'shopping-basket',
    color: 'bg-info',
    description: 'Groceries and daily food',
  },
  'Dine Out': {
    icon: 'utensils',
    color: 'bg-warning',
    description: 'Restaurant meals and takeout',
  },
  'Work Support': { icon: 'briefcase', color: 'bg-neutral', description: 'Work-related expenses' },
  'Pocket Money': {
    icon: 'wallet',
    color: 'bg-secondary',
    description: 'Personal spending and allowances',
  },
  'Kids Expenses': {
    icon: 'user',
    color: 'bg-secondary',
    description: "Children's education, activities, and supplies",
  },
  'Utility Bills': {
    icon: 'zap',
    color: 'bg-info',
    description: 'Electricity, water, internet, and phone bills',
  },
  'Misc. Cost': {
    icon: 'package',
    color: 'bg-neutral',
    description: 'Uncategorized expenses',
  },
  Entertainment: {
    icon: 'smile',
    color: 'bg-secondary',
    description: 'Movies, games, and recreation',
  },
  'Housekeeper Salary': {
    icon: 'users',
    color: 'bg-accent',
    description: 'Household staff salaries',
  },
  Transportation: {
    icon: 'car',
    color: 'bg-secondary',
    description: 'Fuel, transit, and parking',
  },
  'Installment Debt': {
    icon: 'home',
    color: 'bg-error',
    description: 'Mortgage and loan payments',
  },
  'House Expenses': {
    icon: 'shopping-cart',
    color: 'bg-success',
    description: 'Household supplies and maintenance',
  },
  'House Renovation': {
    icon: 'hammer',
    color: 'bg-warning',
    description: 'Home improvements and renovations',
  },
  Insurance: {
    icon: 'shield',
    color: 'bg-info',
    description: 'Health, life, and property insurance premiums',
  },
  // Income categories
  'Dad Salary': { icon: 'banknote', color: 'bg-success', description: 'Monthly salary income' },
  'Mom Salary': { icon: 'banknote', color: 'bg-success', description: 'Monthly salary income' },
  Bonds: {
    icon: 'badge-percent',
    color: 'bg-success',
    description: 'Bond coupons',
  },
  'Fixed Deposits': {
    icon: 'piggy-bank',
    color: 'bg-success',
    description: 'Time deposit interest',
  },
  Dividends: {
    icon: 'chart-column',
    color: 'bg-success',
    description: 'Equity dividends',
  },
  'Other Side Income': {
    icon: 'banknote',
    color: 'bg-success',
    description: 'Freelance work and side projects',
  },
};

// Expense categories with their budgets
export const EXPENSE_CATEGORIES = [
  { name: 'Holiday', budget: 3000000 },
  { name: 'Food & Groceries', budget: 7000000 },
  { name: 'Dine Out', budget: 1800000 },
  { name: 'Utility Bills', budget: 2500000 },
  { name: 'Misc. Cost', budget: 1500000 },
  { name: 'Entertainment', budget: 1200000 },
  { name: 'Housekeeper Salary', budget: 3000000 },
  { name: 'Transportation', budget: 2200000 },
  { name: 'Installment Debt', budget: 15000000 },
  { name: 'House Expenses', budget: 3200000 },
  { name: 'House Renovation', budget: 5000000 },
  { name: 'Insurance', budget: 2200000 },
  { name: 'Kids Expenses', budget: 6500000 },
  { name: 'Pocket Money', budget: 1200000 },
  { name: 'Work Support', budget: 1200000 },
];

// Income categories
export const INCOME_CATEGORIES = [
  { name: 'Dad Salary', budget: 0, incomeSourceType: 'active' as const },
  { name: 'Mom Salary', budget: 0, incomeSourceType: 'active' as const },
  { name: 'Bonds', budget: 0, incomeSourceType: 'passive' as const },
  { name: 'Fixed Deposits', budget: 0, incomeSourceType: 'passive' as const },
  { name: 'Dividends', budget: 0, incomeSourceType: 'passive' as const },
  { name: 'Other Side Income', budget: 0, incomeSourceType: 'active' as const },
];
