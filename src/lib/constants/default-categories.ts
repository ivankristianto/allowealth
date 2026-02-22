/**
 * Default expense categories for onboarding.
 * Created automatically when a new user goes through the onboarding wizard
 * and has no expense categories yet.
 */
export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Food & Groceries', icon: 'utensils', color: 'bg-orange-500', budgetPercent: 20 },
  { name: 'Housing', icon: 'home', color: 'bg-blue-500', budgetPercent: 30 },
  { name: 'Transportation', icon: 'car', color: 'bg-yellow-500', budgetPercent: 10 },
  { name: 'Utilities', icon: 'zap', color: 'bg-purple-500', budgetPercent: 5 },
  { name: 'Entertainment', icon: 'tv', color: 'bg-pink-500', budgetPercent: 5 },
  { name: 'Savings', icon: 'piggy-bank', color: 'bg-emerald-500', budgetPercent: 15 },
  { name: 'Health', icon: 'heart-pulse', color: 'bg-red-500', budgetPercent: 5 },
  { name: 'Personal', icon: 'user', color: 'bg-indigo-500', budgetPercent: 10 },
] as const;

export type DefaultExpenseCategory = (typeof DEFAULT_EXPENSE_CATEGORIES)[number];
