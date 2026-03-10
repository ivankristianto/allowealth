import {
  boolean,
  check,
  integer,
  maxLength,
  maxValue,
  minLength,
  minValue,
  nullable,
  number,
  object,
  optional,
  pipe,
  regex,
  string,
  transform,
  union,
  type InferOutput,
} from 'valibot';
import { currencyEnum } from '@/lib/enums';

/**
 * Validation schemas for Budget operations
 */

// Re-export currency enum for convenience
export { currencyEnum };

// Month validation (1-12)
const requiredId = (message: string) => pipe(string(), minLength(1, message));

const monthValidation = pipe(
  number(),
  integer('Month must be an integer'),
  minValue(1, 'Month must be between 1 and 12'),
  maxValue(12, 'Month must be between 1 and 12')
);

// Year validation (reasonable range)
// P3: TODO - Consider making year range configurable via constants
const yearValidation = pipe(
  number(),
  integer('Year must be an integer'),
  minValue(2000, 'Year must be 2000 or later'),
  maxValue(2100, 'Year must be 2100 or earlier')
);

const monthApiValidation = pipe(
  union([
    monthValidation,
    pipe(
      string(),
      regex(/^-?\d+$/, 'Month must be an integer'),
      transform((value) => Number(value))
    ),
  ]),
  integer('Month must be an integer'),
  minValue(1, 'Month must be between 1 and 12'),
  maxValue(12, 'Month must be between 1 and 12')
);

const yearApiValidation = pipe(
  union([
    yearValidation,
    pipe(
      string(),
      regex(/^-?\d+$/, 'Year must be an integer'),
      transform((value) => Number(value))
    ),
  ]),
  integer('Year must be an integer'),
  minValue(2000, 'Year must be 2000 or later'),
  maxValue(2100, 'Year must be 2100 or earlier')
);

// Budget amount validation (required, positive decimal as string)
const budgetAmountValidation = pipe(
  string(),
  minLength(1, 'Budget amount is required'),
  check((value) => {
    const parsedAmount = Number.parseFloat(value);
    return !Number.isNaN(parsedAmount) && parsedAmount > 0;
  }, 'Budget amount must be a positive number')
);

// Budget amount for update (optional but must be positive if provided)
const budgetAmountUpdateValidation = optional(
  pipe(
    string(),
    check((value) => {
      if (value === '') return true;

      const parsedAmount = Number.parseFloat(value);
      return !Number.isNaN(parsedAmount) && parsedAmount > 0;
    }, 'Budget amount must be a positive number')
  )
);

// Notes validation (optional, max length)
const notesValidation = pipe(
  optional(nullable(pipe(string(), maxLength(500, 'Notes must not exceed 500 characters'))), null),
  transform((value) => value || null)
);

// Schema for creating a budget (for service layer)
export const createBudgetSchema = object({
  workspace_id: requiredId('Workspace ID is required'),
  created_by_user_id: requiredId('Created by user ID is required'),
  category_id: requiredId('Category ID is required'),
  month: monthValidation,
  year: yearValidation,
  budget_amount: budgetAmountValidation,
  currency: currencyEnum,
  notes: notesValidation,
});

export type CreateBudgetInput = InferOutput<typeof createBudgetSchema>;

// Schema for updating a budget (for service layer)
export const updateBudgetSchema = object({
  budget_amount: budgetAmountUpdateValidation,
  notes: notesValidation,
  is_closed: optional(boolean()),
});

export type UpdateBudgetInput = InferOutput<typeof updateBudgetSchema>;

// Schema for copying budgets to another month (for service layer)
export const copyBudgetsSchema = pipe(
  object({
    workspace_id: requiredId('Workspace ID is required'),
    created_by_user_id: requiredId('Created by user ID is required'),
    source_month: monthValidation,
    source_year: yearValidation,
    target_month: monthValidation,
    target_year: yearValidation,
  }),
  check(
    (data) => data.source_month !== data.target_month || data.source_year !== data.target_year,
    'Target month/year must be different from source'
  )
);

export type CopyBudgetsInput = InferOutput<typeof copyBudgetsSchema>;

// API-specific schemas that don't include user_id (comes from auth)
export const createBudgetAPISchema = object({
  category_id: requiredId('Category ID is required'),
  month: monthApiValidation,
  year: yearApiValidation,
  budget_amount: budgetAmountValidation,
  currency: currencyEnum,
  notes: notesValidation,
});

export type CreateBudgetAPIInput = InferOutput<typeof createBudgetAPISchema>;

export const updateBudgetAPISchema = updateBudgetSchema;

export type UpdateBudgetAPIInput = InferOutput<typeof updateBudgetAPISchema>;

export const copyBudgetsAPISchema = pipe(
  object({
    source_month: monthApiValidation,
    source_year: yearApiValidation,
    target_month: monthApiValidation,
    target_year: yearApiValidation,
  }),
  check(
    (data) => data.source_month !== data.target_month || data.source_year !== data.target_year,
    'Target month/year must be different from source'
  )
);

export type CopyBudgetsAPIInput = InferOutput<typeof copyBudgetsAPISchema>;

// Schema for budget filters (query parameters)
export const budgetFilterSchema = object({
  month: monthApiValidation,
  year: yearApiValidation,
  currency: optional(currencyEnum),
  category_id: optional(string()),
});

export type BudgetFilter = InferOutput<typeof budgetFilterSchema>;

// Schema for initializing all budgets (for service layer)
export const initializeBudgetsSchema = object({
  workspace_id: requiredId('Workspace ID is required'),
  created_by_user_id: requiredId('Created by user ID is required'),
  month: monthValidation,
  year: yearValidation,
  currency: currencyEnum,
});

export type InitializeBudgetsInput = InferOutput<typeof initializeBudgetsSchema>;

// API-specific schema (workspace_id and user_id come from auth context)
export const initializeBudgetsAPISchema = object({
  month: monthApiValidation,
  year: yearApiValidation,
  currency: currencyEnum,
});

export type InitializeBudgetsAPIInput = InferOutput<typeof initializeBudgetsAPISchema>;
