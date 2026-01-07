import { z } from 'zod';

/**
 * Validation schemas for Category operations
 */

// Common enums
export const categoryTypeEnum = z.enum(['expense', 'income']);
export const currencyEnum = z.enum(['IDR', 'USD']);

// Schema for creating a category
export const createCategorySchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
  name: z
    .string()
    .min(3, 'Category name must be at least 3 characters')
    .max(100, 'Category name must not exceed 100 characters'),
  type: categoryTypeEnum,
  currency: currencyEnum,
  percentage: z
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
    ),
  budget_amount: z
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
    ),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

// Schema for updating a category (all fields optional)
export const updateCategorySchema = z.object({
  name: z
    .string()
    .min(3, 'Category name must be at least 3 characters')
    .max(100, 'Category name must not exceed 100 characters')
    .optional(),
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

// Schema for category filters
export const categoryFilterSchema = z.object({
  type: categoryTypeEnum.optional(),
  is_active: z.boolean().optional(),
});

export type CategoryFilter = z.infer<typeof categoryFilterSchema>;
