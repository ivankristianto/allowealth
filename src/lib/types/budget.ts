/**
 * Shared TypeScript types for Budget entities
 *
 * NOTE: Input types (CreateBudgetInput, UpdateBudgetInput, CopyBudgetsInput) are
 * exported from @/lib/validation/budgets to maintain a single source of truth.
 * Filter types are also exported from validation to avoid duplication.
 *
 * Import Input types from: @/lib/validation/budgets
 */

import type { Currency } from '@/lib/enums';
import type { CategoryType } from '@/lib/types/category';

// Re-export for convenience
export type { Currency };

// Database model (from schema)
export interface Budget {
  id: string;
  user_id: string;
  category_id: string;
  month: number; // 1-12
  year: number; // e.g., 2025, 2026
  budget_amount: string; // Stored as string for decimal precision
  currency: Currency;
  is_closed: boolean;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

// Budget with related category data (for joined queries)
export interface BudgetWithCategory extends Budget {
  category: {
    id: string;
    name: string;
    type: CategoryType;
    icon: string;
    color: string;
    is_active: boolean;
  };
}

// Output type for API responses (omits user_id)
export interface BudgetOutput extends Omit<Budget, 'user_id'> {
  category_name?: string;
  category_icon?: string;
  category_color?: string;
}

// Budget with computed spending data
export interface BudgetWithSpending extends BudgetOutput {
  spent_amount: string;
  remaining: string;
  percentage_used: number;
  status: 'ok' | 'warning' | 'exceeded';
}

// Summary for monthly overview
export interface MonthlyBudgetSummary {
  month: number;
  year: number;
  currency: Currency;
  total_budgeted: string;
  total_spent: string;
  total_remaining: string;
  overall_percentage: number;
  budgets: BudgetWithSpending[];
}

// Result of copy operation
export interface CopyBudgetsResult {
  copied_count: number;
  skipped_count: number; // Already existing budgets
  target_month: number;
  target_year: number;
}
