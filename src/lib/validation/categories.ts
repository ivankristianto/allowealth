import { z } from 'zod';
import { categoryTypeEnum, currencyEnum } from '@/lib/enums';

/**
 * Validation schemas for Category operations
 */

// Re-export enums from shared location for convenience
export { categoryTypeEnum, currencyEnum };

// Common validation for category fields
const nameValidation = z
  .string()
  .min(3, 'Category name must be at least 3 characters')
  .max(100, 'Category name must not exceed 100 characters');

const percentageValidation = z
  .string()
  .optional()
  .default('0')
  .transform((val) => val || '0')
  .refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0 && num <= 100;
    },
    { message: 'Percentage must be between 0 and 100' }
  );

const budgetAmountValidation = z
  .string()
  .optional()
  .default('0')
  .transform((val) => val || '0')
  .refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num >= 0;
    },
    { message: 'Budget amount must be a positive number' }
  );

// Schema for creating a category (for service layer)
export const createCategorySchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
  name: nameValidation,
  type: categoryTypeEnum,
  currency: currencyEnum,
  percentage: percentageValidation,
  budget_amount: budgetAmountValidation,
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

// Schema for updating a category (for service layer)
export const updateCategorySchema = z.object({
  name: nameValidation.optional(),
  type: categoryTypeEnum.optional(),
  currency: currencyEnum.optional(),
  percentage: z
    .string()
    .optional()
    .transform((val) => val ?? '0')
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0 && num <= 100;
      },
      { message: 'Percentage must be between 0 and 100' }
    )
    .optional(),
  budget_amount: z
    .string()
    .optional()
    .transform((val) => val ?? '0')
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && num >= 0;
      },
      { message: 'Budget amount must be a positive number' }
    )
    .optional(),
  is_active: z.boolean().optional(),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

// API-specific schemas that don't include user_id (comes from auth)
export const createCategoryAPISchema = z.object({
  name: nameValidation,
  type: categoryTypeEnum,
  currency: currencyEnum,
  percentage: percentageValidation,
  budget_amount: budgetAmountValidation,
});

export const updateCategoryAPISchema = updateCategorySchema; // No user_id in update

// Schema for category filters
export const categoryFilterSchema = z.object({
  type: categoryTypeEnum.optional(),
  is_active: z.boolean().optional(),
});

export type CategoryFilter = z.infer<typeof categoryFilterSchema>;
