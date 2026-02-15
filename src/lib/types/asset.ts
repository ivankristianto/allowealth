/**
 * Asset Types
 *
 * Types for asset management including assets, history, and categories
 */

/**
 * Asset type enum from database schema
 */
export type AssetType =
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
 * Auto-derived from AssetType at creation time.
 */
export type AccountClass = 'liquid' | 'non_liquid' | 'debt';

/**
 * Mapping from granular asset type to account class
 */
export const ASSET_TYPE_TO_CLASS: Record<AssetType, AccountClass> = {
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
 * Derive account class from asset type
 */
export function deriveAccountClass(type: AssetType): AccountClass {
  return ASSET_TYPE_TO_CLASS[type];
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
export type Currency = 'IDR' | 'USD';

/** Asset lifecycle status */
export const ASSET_STATUSES = ['active', 'closed'] as const;
export type AssetStatus = (typeof ASSET_STATUSES)[number];

/**
 * Raw asset from database
 */
export interface Asset {
  id: string;
  workspace_id: string;
  created_by_user_id: string;
  name: string;
  type: AssetType;
  account_class: AccountClass;
  category_id?: string | null;
  balance: string;
  initial_balance: string | null;
  currency: Currency;
  credit_limit: string | null;
  is_cash_account: boolean;
  status: AssetStatus;
  closed_at: Date | null;
  closed_by_user_id: string | null;
  last_updated: Date;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Asset output format for API/UI
 */
export interface AssetOutput {
  id: string;
  name: string;
  type: AssetType;
  account_class: AccountClass;
  category_id?: string | null;
  category_name?: string | null;
  balance: string;
  initial_balance?: string | null;
  currency: Currency;
  credit_limit?: string | null;
  is_cash_account?: boolean;
  status: AssetStatus;
  closed_at: Date | null;
  closed_by_user_id: string | null;
  last_updated: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Asset history entry from database
 */
export interface AssetHistory {
  id: string;
  asset_id: string;
  balance: string;
  notes: string | null;
  recorded_at: Date;
}

/**
 * Asset history output format for API/UI
 */
export interface AssetHistoryOutput {
  id: string;
  asset_id: string;
  balance: string;
  notes: string | null;
  recorded_at: Date;
}

/**
 * Asset summary by currency
 */
export interface AssetSummaryByCurrency {
  currency: Currency;
  total: string;
}

/**
 * Asset summary by type
 */
export interface AssetSummaryByType {
  type: AssetType;
  currency: Currency;
  total: string;
  count: number;
}

/**
 * Asset category (custom or system-defined)
 */
export interface AssetCategory {
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
 * Asset type display names
 */
export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
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
 * Get display label for asset type
 */
export function getAssetTypeLabel(type: AssetType): string {
  return ASSET_TYPE_LABELS[type];
}

/**
 * Format asset type for display (e.g., bank_account -> Bank Account)
 */
export function formatAssetType(type: AssetType): string {
  return getAssetTypeLabel(type);
}
