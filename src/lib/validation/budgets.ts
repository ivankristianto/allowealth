import { z } from 'zod';
import { currencyEnum } from '@/lib/enums';

/**
 * Validation schemas for Budget operations
 */

// Re-export currency enum for convenience
export { currencyEnum };

// Month validation (1-12)
const monthValidation = z
  .number()
  .int('Month must be an integer')
  .min(1, 'Month must be between 1 and 12')
  .max(12, 'Month must be between 1 and 12');

// Year validation (reasonable range)
// P3: TODO - Consider making year range configurable via constants
const yearValidation = z
  .number()
  .int('Year must be an integer')
  .min(2000, 'Year must be 2000 or later')
  .max(2100, 'Year must be 2100 or earlier');

// Budget amount validation (required, positive decimal as string)
const budgetAmountValidation = z
  .string()
  .min(1, 'Budget amount is required')
  .refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    },
    { message: 'Budget amount must be a positive number' }
  );

// Budget amount for update (optional but must be positive if provided)
const budgetAmountUpdateValidation = z
  .string()
  .optional()
  .refine(
    (val) => {
      if (val === undefined || val === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    },
    { message: 'Budget amount must be a positive number' }
  );

// Notes validation (optional, max length)
const notesValidation = z
  .string()
  .max(500, 'Notes must not exceed 500 characters')
  .optional()
  .nullable()
  .transform((val) => val || null);

// Schema for creating a budget (for service layer)
export const createBudgetSchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
  category_id: z.string().min(1, 'Category ID is required'),
  month: monthValidation,
  year: yearValidation,
  budget_amount: budgetAmountValidation,
  currency: currencyEnum,
  notes: notesValidation,
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;

// Schema for updating a budget (for service layer)
export const updateBudgetSchema = z.object({
  budget_amount: budgetAmountUpdateValidation,
  notes: notesValidation,
  is_closed: z.boolean().optional(),
});

export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;

// Schema for copying budgets to another month (for service layer)
export const copyBudgetsSchema = z
  .object({
    user_id: z.string().min(1, 'User ID is required'),
    source_month: monthValidation,
    source_year: yearValidation,
    target_month: monthValidation,
    target_year: yearValidation,
  })
  .refine(
    (data) => {
      // Cannot copy to the same month/year
      return data.source_month !== data.target_month || data.source_year !== data.target_year;
    },
    { message: 'Target month/year must be different from source' }
  );

export type CopyBudgetsInput = z.infer<typeof copyBudgetsSchema>;

// API-specific schemas that don't include user_id (comes from auth)
export const createBudgetAPISchema = z.object({
  category_id: z.string().min(1, 'Category ID is required'),
  month: monthValidation,
  year: yearValidation,
  budget_amount: budgetAmountValidation,
  currency: currencyEnum,
  notes: notesValidation,
});

export type CreateBudgetAPIInput = z.infer<typeof createBudgetAPISchema>;

export const updateBudgetAPISchema = updateBudgetSchema;

export type UpdateBudgetAPIInput = z.infer<typeof updateBudgetAPISchema>;

export const copyBudgetsAPISchema = z
  .object({
    source_month: monthValidation,
    source_year: yearValidation,
    target_month: monthValidation,
    target_year: yearValidation,
  })
  .refine(
    (data) => {
      return data.source_month !== data.target_month || data.source_year !== data.target_year;
    },
    { message: 'Target month/year must be different from source' }
  );

export type CopyBudgetsAPIInput = z.infer<typeof copyBudgetsAPISchema>;

// Schema for budget filters (query parameters)
export const budgetFilterSchema = z.object({
  month: monthValidation,
  year: yearValidation,
  currency: currencyEnum.optional(),
  category_id: z.string().optional(),
});

export type BudgetFilter = z.infer<typeof budgetFilterSchema>;
