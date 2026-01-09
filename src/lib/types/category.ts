/**
 * Shared TypeScript types for Category entities
 *
 * NOTE: Input types (CreateCategoryInput, UpdateCategoryInput) are now
 * exported from @/lib/validation to maintain a single source of truth.
 * Filter types are also exported from validation to avoid duplication.
 *
 * Import Input types from: @/lib/validation
 */

import type { CategoryType, Currency } from '@/lib/enums';

// Re-export enums from validation for convenience
export type { CategoryType, Currency };

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
