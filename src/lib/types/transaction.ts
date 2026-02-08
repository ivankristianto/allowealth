/**
 * Shared TypeScript types for Transaction entities
 *
 * NOTE: Input types (CreateTransactionInput, UpdateTransactionInput) are now
 * exported from @/lib/validation to maintain a single source of truth.
 * Filter types are also exported from validation to avoid duplication.
 *
 * Import Input types from: @/lib/validation
 */

import type { TransactionType, Currency } from '@/lib/enums';

// Re-export enums from validation for convenience
export type { TransactionType, Currency };

// Database model (from schema)
export interface Transaction {
  id: string;
  workspace_id: string;
  created_by_user_id: string;
  category_id: string | null; // Nullable for transfers
  asset_id: string;
  to_asset_id: string | null; // For transfers only
  type: TransactionType | 'transfer';
  amount: string; // Stored as string for decimal precision
  currency: Currency;
  description: string | null;
  transaction_date: Date;
  updated_by_user_id: string | null;
  deleted_by_user_id: string | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// Output types (with relations for API responses)
export interface TransactionOutput extends Omit<
  Transaction,
  'workspace_id' | 'created_by_user_id' | 'category_id' | 'asset_id' | 'to_asset_id'
> {
  category: {
    id: string;
    name: string;
    type: TransactionType;
    icon: string;
    color: string;
  } | null;
  asset: {
    id: string;
    name: string;
    type: string;
  };
  toAsset?: {
    id: string;
    name: string;
    type: string;
  } | null;
  has_history?: boolean;
  created_by_user_name?: string;
}

/**
 * Data structure for edit transaction drawer form population.
 * Represents the serialized transaction data passed via data-transaction-data attribute.
 */
export interface TransactionFormData {
  id: string;
  type: 'expense' | 'income';
  title: string;
  amount: string;
  currency: string;
  category_id: string;
  asset_id: string;
  transaction_date: string;
}

// Audit history entry for transaction timeline
export interface TransactionHistoryEntry {
  id: string;
  action: 'create' | 'update' | 'delete';
  userName: string;
  userId: string;
  createdAt: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
}

export interface TransactionHistoryResponse {
  history: TransactionHistoryEntry[];
  totalEdits: number;
  showingEdits: number;
}

// Summary types for dashboard
export interface TransactionSummary {
  total_income: string;
  total_expenses: string;
  net_savings: string;
  transaction_count: number;
  by_category: Array<{
    category_id: string;
    category_name: string;
    amount: string;
    percentage: number;
  }>;
  by_asset: Array<{
    asset_id: string;
    asset_name: string;
    amount: string;
    percentage: number;
  }>;
}
