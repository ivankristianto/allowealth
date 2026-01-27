import { z } from 'zod';
import { categoryTypeEnum } from '@/lib/enums';

/**
 * Validation schemas for Category operations
 *
 * Note: Budget-related validations (percentage, budget_amount, currency) have been
 * moved to @/lib/validation/budgets.ts as part of the budget migration.
 */

// Re-export enums from shared location for convenience
export { categoryTypeEnum };

// Common validation for category fields
const nameValidation = z
  .string()
  .min(3, 'Category name must be at least 3 characters')
  .max(100, 'Category name must not exceed 100 characters');

// Allowed Lucide icon names for security
const ALLOWED_ICONS = [
  'home',
  'shopping-basket',
  'shopping-cart',
  'utensils',
  'car',
  'plane',
  'zap',
  'heart',
  'smile',
  'banknote',
  'trending-up',
  'tag',
  'briefcase',
  'wallet',
  'user',
  'users',
  'package',
  'hammer',
  'shield',
  'repeat',
  'circle-dot',
] as const;

const iconValidation = z
  .string()
  .min(1, 'Icon is required')
  .refine((val) => ALLOWED_ICONS.includes(val as any), {
    message: `Icon must be one of: ${ALLOWED_ICONS.join(', ')}`,
  })
  .optional()
  .default('tag')
  .transform((val) => val || 'tag');

const colorValidation = z
  .string()
  .min(1, 'Color is required')
  .optional()
  .default('bg-neutral')
  .transform((val) => val || 'bg-neutral');

// Schema for creating a category (for service layer)
export const createCategorySchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
  name: nameValidation,
  type: categoryTypeEnum,
  icon: iconValidation,
  color: colorValidation,
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

// Schema for updating a category (for service layer)
export const updateCategorySchema = z.object({
  name: nameValidation.optional(),
  type: categoryTypeEnum.optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  is_active: z.boolean().optional(),
});

export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

// API-specific schemas that don't include user_id (comes from auth)
export const createCategoryAPISchema = z.object({
  name: nameValidation,
  type: categoryTypeEnum,
  icon: iconValidation,
  color: colorValidation,
});

export const updateCategoryAPISchema = updateCategorySchema; // No user_id in update

// Schema for category filters
export const categoryFilterSchema = z.object({
  type: categoryTypeEnum.optional(),
  is_active: z.boolean().optional(),
});

export type CategoryFilter = z.infer<typeof categoryFilterSchema>;
