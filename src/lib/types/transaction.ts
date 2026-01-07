/**
 * Shared TypeScript types for Transaction entities
 */

// Enums
export type TransactionType = 'expense' | 'income';
export type Currency = 'IDR' | 'USD';

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

// Input types (for forms/API)
export interface TransactionCreateInput {
  user_id: string;
  type: TransactionType;
  amount: string;
  currency: Currency;
  category_id: string;
  payment_method_id: string;
  transaction_date: Date;
  description?: string;
}

export interface TransactionUpdateInput {
  type?: TransactionType;
  amount?: string;
  currency?: Currency;
  category_id?: string;
  payment_method_id?: string;
  transaction_date?: Date;
  description?: string;
}

// Filter types (for queries)
export interface TransactionFilter {
  type?: TransactionType;
  category_id?: string;
  payment_method_id?: string;
  currency?: Currency;
  start_date?: Date;
  end_date?: Date;
  limit?: number;
  offset?: number;
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
