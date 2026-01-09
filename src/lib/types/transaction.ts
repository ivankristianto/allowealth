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
  user_id: string;
  category_id: string;
  payment_method_id: string;
  type: TransactionType;
  amount: string; // Stored as string for decimal precision
  currency: Currency;
  description: string | null;
  transaction_date: Date;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// Output types (with relations for API responses)
export interface TransactionOutput extends Omit<
  Transaction,
  'user_id' | 'category_id' | 'payment_method_id'
> {
  category: {
    id: string;
    name: string;
    type: TransactionType;
  };
  payment_method: {
    id: string;
    name: string;
    type: string;
  };
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
  by_payment_method: Array<{
    payment_method_id: string;
    payment_method_name: string;
    amount: string;
    percentage: number;
  }>;
}
