/**
 * Shared TypeScript types for Category entities
 */

// Enums
export type CategoryType = 'expense' | 'income';
export type Currency = 'IDR' | 'USD';

// Database model (from schema)
export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  percentage: string; // Stored as string for decimal precision
  budget_amount: string; // Stored as string for decimal precision
  currency: Currency;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// Input types (for forms/API)
export interface CategoryCreateInput {
  user_id: string;
  name: string;
  type: CategoryType;
  currency: Currency;
  percentage?: string;
  budget_amount?: string;
}

export interface CategoryUpdateInput {
  name?: string;
  type?: CategoryType;
  currency?: Currency;
  percentage?: string;
  budget_amount?: string;
  is_active?: boolean;
}

// Filter types (for queries)
export interface CategoryFilter {
  type?: CategoryType;
  is_active?: boolean;
}

// Output types (with computed fields for API responses)
export interface CategoryOutput extends Omit<Category, 'user_id'> {
  transaction_count?: number; // Number of transactions using this category
}

// Budget status for a category
export interface CategoryBudgetStatus {
  category_id: string;
  category_name: string;
  budget_amount: string;
  spent_amount: string;
  remaining: string;
  percentage_used: number;
  status: 'ok' | 'warning' | 'exceeded';
}
