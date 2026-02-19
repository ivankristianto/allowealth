import { z } from 'zod';

const nameValidation = z
  .string()
  .trim()
  .min(1, 'Category name is required')
  .max(100, 'Category name must not exceed 100 characters');

const descriptionValidation = z
  .string()
  .trim()
  .max(500, 'Description must not exceed 500 characters')
  .nullable()
  .optional()
  .transform((val) => (val && val.length > 0 ? val : null));

const sortOrderValidation = z.number().int().min(0, 'Sort order must be 0 or greater');

export const createAccountCategorySchema = z.object({
  workspace_id: z.string().min(1, 'Workspace ID is required'),
  created_by_user_id: z.string().min(1, 'Created by user ID is required'),
  name: nameValidation,
  description: descriptionValidation,
  is_liability: z.boolean(),
  is_system: z.boolean().optional().default(false),
  sort_order: sortOrderValidation.optional().default(0),
});

export type CreateAccountCategoryInput = z.infer<typeof createAccountCategorySchema>;

export const updateAccountCategorySchema = z.object({
  name: nameValidation.optional(),
  description: descriptionValidation,
  is_liability: z.boolean().optional(),
  sort_order: sortOrderValidation.optional(),
});

export type UpdateAccountCategoryInput = z.infer<typeof updateAccountCategorySchema>;

export const createAccountCategoryAPISchema = z.object({
  name: nameValidation,
  description: descriptionValidation,
  isLiability: z.boolean(),
});

export const updateAccountCategoryAPISchema = z.object({
  name: nameValidation.optional(),
  description: descriptionValidation,
  isLiability: z.boolean().optional(),
});

export const accountCategoryFilterSchema = z.object({
  isLiability: z.boolean().optional(),
  isSystem: z.boolean().optional(),
});

export type AccountCategoryFilter = z.infer<typeof accountCategoryFilterSchema>;
