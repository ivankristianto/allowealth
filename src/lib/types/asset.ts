/**
 * Asset Types
 *
 * Types for asset management including assets, history, and categories
 */

/**
 * Asset type enum from database schema
 */
export type AssetType = 'bank_account' | 'mutual_fund' | 'bond' | 'crypto' | 'stock' | 'other';

/**
 * Currency type (same as in other modules)
 */
export type Currency = 'IDR' | 'USD';

/**
 * Raw asset from database
 */
export interface Asset {
  id: string;
  user_id: string;
  name: string;
  type: AssetType;
  balance: string;
  currency: Currency;
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
  balance: string;
  currency: Currency;
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
 * Asset type display names
 */
export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  bank_account: 'Bank Account',
  mutual_fund: 'Mutual Fund',
  bond: 'Bond',
  crypto: 'Cryptocurrency',
  stock: 'Stock',
  other: 'Other',
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
