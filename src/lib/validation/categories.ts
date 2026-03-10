import {
  boolean,
  check,
  maxLength,
  minLength,
  nullable,
  object,
  optional,
  picklist,
  pipe,
  string,
  transform,
  type InferOutput,
} from 'valibot';
import { categoryTypeEnum } from '@/lib/enums';
import { SUPPORTED_CATEGORY_ICONS } from '@/lib/utils/supportedCategoryIcons';

/**
 * Validation schemas for Category operations
 *
 * Note: Budget-related validations (percentage, budget_amount, currency) have been
 * moved to @/lib/validation/budgets.ts as part of the budget migration.
 */

// Re-export enums from shared location for convenience
export { categoryTypeEnum };

export const incomeSourceTypeEnum = picklist(['active', 'passive', 'other']);

// Common validation for category fields
const requiredId = (message: string) => pipe(string(), minLength(1, message));

const nameValidation = pipe(
  string(),
  minLength(3, 'Category name must be at least 3 characters'),
  maxLength(100, 'Category name must not exceed 100 characters')
);

// Derive allowed icons from the single source of truth
const ALLOWED_ICONS = SUPPORTED_CATEGORY_ICONS.map((icon) => icon.value);

const iconValidation = optional(
  pipe(
    string(),
    minLength(1, 'Icon is required'),
    check(
      (value) => ALLOWED_ICONS.includes(value),
      `Icon must be one of: ${ALLOWED_ICONS.join(', ')}`
    )
  ),
  'tag'
);

const colorValidation = optional(pipe(string(), minLength(1, 'Color is required')), 'bg-neutral');

const descriptionValidation = pipe(
  optional(
    nullable(pipe(string(), maxLength(200, 'Description must not exceed 200 characters'))),
    null
  ),
  transform((value) => value || null)
);

// Update variant: preserves undefined when field is absent so the service's
// `!== undefined` guard correctly skips unset fields
const descriptionUpdateValidation = optional(
  pipe(
    nullable(pipe(string(), maxLength(200, 'Description must not exceed 200 characters'))),
    transform((value) => value || null)
  )
);

// Schema for creating a category (for service layer)
export const createCategorySchema = object({
  workspace_id: requiredId('Workspace ID is required'),
  created_by_user_id: requiredId('Created by user ID is required'),
  name: nameValidation,
  type: categoryTypeEnum,
  income_source_type: optional(incomeSourceTypeEnum),
  description: descriptionValidation,
  icon: iconValidation,
  color: colorValidation,
});

export type CreateCategoryInput = InferOutput<typeof createCategorySchema>;

// Schema for updating a category (for service layer)
export const updateCategorySchema = object({
  name: optional(nameValidation),
  type: optional(categoryTypeEnum),
  income_source_type: optional(incomeSourceTypeEnum),
  description: descriptionUpdateValidation,
  icon: optional(string()),
  color: optional(string()),
  is_active: optional(boolean()),
});

export type UpdateCategoryInput = InferOutput<typeof updateCategorySchema>;

// API-specific schemas that don't include user_id (comes from auth)
export const createCategoryAPISchema = object({
  name: nameValidation,
  type: categoryTypeEnum,
  income_source_type: optional(incomeSourceTypeEnum, 'other'),
  description: descriptionValidation,
  icon: iconValidation,
  color: colorValidation,
});

export const updateCategoryAPISchema = updateCategorySchema; // No user_id in update

// Schema for category filters
export const categoryFilterSchema = object({
  type: optional(categoryTypeEnum),
  is_active: optional(boolean()),
});

export type CategoryFilter = InferOutput<typeof categoryFilterSchema>;
