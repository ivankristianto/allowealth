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

export const createAssetCategorySchema = z.object({
  workspace_id: z.string().min(1, 'Workspace ID is required'),
  created_by_user_id: z.string().min(1, 'Created by user ID is required'),
  name: nameValidation,
  description: descriptionValidation,
  is_liability: z.boolean(),
  is_system: z.boolean().optional().default(false),
  sort_order: sortOrderValidation.optional().default(0),
});

export type CreateAssetCategoryInput = z.infer<typeof createAssetCategorySchema>;

export const updateAssetCategorySchema = z.object({
  name: nameValidation.optional(),
  description: descriptionValidation,
  is_liability: z.boolean().optional(),
  sort_order: sortOrderValidation.optional(),
});

export type UpdateAssetCategoryInput = z.infer<typeof updateAssetCategorySchema>;

export const createAssetCategoryAPISchema = z.object({
  name: nameValidation,
  description: descriptionValidation,
  isLiability: z.boolean(),
});

export const updateAssetCategoryAPISchema = z.object({
  name: nameValidation.optional(),
  description: descriptionValidation,
  isLiability: z.boolean().optional(),
});

export const assetCategoryFilterSchema = z.object({
  isLiability: z.boolean().optional(),
  isSystem: z.boolean().optional(),
});

export type AssetCategoryFilter = z.infer<typeof assetCategoryFilterSchema>;
