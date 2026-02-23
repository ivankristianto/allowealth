/**
 * Default expense categories for onboarding.
 * Created automatically when a new user goes through the onboarding wizard
 * and has no expense categories yet.
 */
export const DEFAULT_EXPENSE_CATEGORIES = [
  { name: 'Food & Groceries', icon: 'utensils', color: 'bg-warning', budgetPercent: 20 },
  { name: 'Housing', icon: 'home', color: 'bg-primary', budgetPercent: 30 },
  { name: 'Transportation', icon: 'car', color: 'bg-accent', budgetPercent: 10 },
  { name: 'Utilities', icon: 'zap', color: 'bg-secondary', budgetPercent: 5 },
  { name: 'Entertainment', icon: 'tv', color: 'bg-info', budgetPercent: 5 },
  { name: 'Savings', icon: 'piggy-bank', color: 'bg-success', budgetPercent: 15 },
  { name: 'Health', icon: 'heart-pulse', color: 'bg-error', budgetPercent: 5 },
  { name: 'Personal', icon: 'user', color: 'bg-neutral', budgetPercent: 10 },
] as const;

export type DefaultExpenseCategory = (typeof DEFAULT_EXPENSE_CATEGORIES)[number];
