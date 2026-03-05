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
export const EXPENSE_CATEGORIES = [
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
export const INCOME_CATEGORIES = [{ name: 'Other Income', budget: 0 }];
