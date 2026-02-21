import type { Currency } from '@/lib/constants/currency';

/**
 * Account Types
 *
 * Types for account management including accounts, history, and categories
 */

/**
 * Account type enum from database schema
 */
export type AccountType =
  | 'cash'
  | 'bank_account'
  | 'e_wallet'
  | 'mutual_fund'
  | 'bond'
  | 'crypto'
  | 'stock'
  | 'other'
  | 'credit_card'
  | 'loan';

/**
 * Account classification for transaction rules and portfolio grouping.
 * Auto-derived from AccountType at creation time.
 */
export type AccountClass = 'liquid' | 'non_liquid' | 'debt';

/**
 * Mapping from granular account type to account class
 */
export const ACCOUNT_TYPE_TO_CLASS: Record<AccountType, AccountClass> = {
  cash: 'liquid',
  bank_account: 'liquid',
  e_wallet: 'liquid',
  mutual_fund: 'non_liquid',
  bond: 'non_liquid',
  crypto: 'non_liquid',
  stock: 'non_liquid',
  other: 'non_liquid',
  credit_card: 'debt',
  loan: 'debt',
};

/**
 * Derive account class from account type
 */
export function deriveAccountClass(type: AccountType): AccountClass {
  return ACCOUNT_TYPE_TO_CLASS[type];
}

/**
 * Display labels for account classes
 */
export const ACCOUNT_CLASS_LABELS: Record<AccountClass, string> = {
  liquid: 'Liquid',
  non_liquid: 'Non-Liquid',
  debt: 'Debt',
};

/**
 * Currency type (same as in other modules)
 */
export type { Currency };

/** Account lifecycle status */
export const ACCOUNT_STATUSES = ['active', 'closed'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

/**
 * Raw account from database
 */
export interface Account {
  id: string;
  workspace_id: string;
  created_by_user_id: string;
  name: string;
  type: AccountType;
  account_class: AccountClass;
  category_id?: string | null;
  balance: string;
  initial_balance: string | null;
  currency: Currency;
  credit_limit: string | null;
  is_cash_account: boolean;
  status: AccountStatus;
  closed_at: Date | null;
  closed_by_user_id: string | null;
  last_updated: Date;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Account output format for API/UI
 */
export interface AccountOutput {
  id: string;
  created_by_user_id?: string;
  name: string;
  type: AccountType;
  account_class: AccountClass;
  category_id?: string | null;
  category_name?: string | null;
  balance: string;
  initial_balance?: string | null;
  currency: Currency;
  credit_limit?: string | null;
  is_cash_account?: boolean;
  status: AccountStatus;
  closed_at: Date | null;
  closed_by_user_id: string | null;
  last_updated: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Account history entry from database
 */
export interface AccountHistory {
  id: string;
  account_id: string;
  balance: string;
  notes: string | null;
  recorded_at: Date;
}

/**
 * Account history output format for API/UI
 */
export interface AccountHistoryOutput {
  id: string;
  account_id: string;
  balance: string;
  notes: string | null;
  recorded_at: Date;
}

/**
 * Account summary by currency
 */
export interface AccountSummaryByCurrency {
  currency: Currency;
  total: string;
}

/**
 * Account summary by type
 */
export interface AccountSummaryByType {
  type: AccountType;
  currency: Currency;
  total: string;
  count: number;
}

/**
 * Account category (custom or system-defined)
 */
export interface AccountCategory {
  id: string;
  workspace_id: string;
  created_by_user_id: string;
  name: string;
  description: string | null;
  is_liability: boolean;
  is_system: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Account type display names
 */
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: 'Cash',
  bank_account: 'Bank Account',
  e_wallet: 'E-Wallet',
  mutual_fund: 'Mutual Fund',
  bond: 'Bond',
  crypto: 'Cryptocurrency',
  stock: 'Stock',
  other: 'Other',
  credit_card: 'Credit Card',
  loan: 'Loan',
};

/**
 * Get display label for account type
 */
export function getAccountTypeLabel(type: AccountType): string {
  return ACCOUNT_TYPE_LABELS[type];
}

/**
 * Format account type for display (e.g., bank_account -> Bank Account)
 */
export function formatAccountType(type: AccountType): string {
  return getAccountTypeLabel(type);
}
