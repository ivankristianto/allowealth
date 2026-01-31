import type { APIRoute } from 'astro';
import { z } from 'zod';
import { assetService, assetCategoryService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { DEFAULT_ASSET_CATEGORIES } from '@/lib/constants';

// Validation schemas
const LEGACY_TYPE_BY_NAME = new Map(
  DEFAULT_ASSET_CATEGORIES.map((category) => [category.name, category.legacyType])
);
const LEGACY_NAME_BY_TYPE = new Map(
  DEFAULT_ASSET_CATEGORIES.map((category) => [category.legacyType, category.name])
);

const updateAssetSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  categoryId: z.string().min(1).optional(),
  type: z
    .enum([
      'cash',
      'bank_account',
      'e_wallet',
      'mutual_fund',
      'bond',
      'crypto',
      'stock',
      'other',
      'credit_card',
      'loan',
    ])
    .optional(),
  currency: z.enum(['IDR', 'USD']).optional(),
});

/**
 * GET /api/assets/:id
 * Get a single asset by ID
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Asset ID is required', 400);
    }

    const asset = await assetService.findById(id, auth.workspaceId);

    if (!asset) {
      return errorResponse('Asset not found', 404);
    }

    return successResponse(asset);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error fetching asset', error);
    return errorResponse('Failed to fetch asset', 500);
  }
};

/**
 * PUT /api/assets/:id
 * Update an asset
 */
export const PUT: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Asset ID is required', 400);
    }

    const validation = await validateBody(context.request, updateAssetSchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    let resolvedType = validation.data.type;
    let resolvedCategoryId: string | null | undefined = undefined;

    if (validation.data.categoryId) {
      const category = await assetCategoryService.findById(
        validation.data.categoryId,
        auth.workspaceId
      );
      if (!category) {
        return errorResponse('Category not found', 404);
      }
      resolvedCategoryId = category.id;
      resolvedType = category.is_system
        ? LEGACY_TYPE_BY_NAME.get(category.name) || 'other'
        : 'other';
    } else if (validation.data.type) {
      const categoryName = LEGACY_NAME_BY_TYPE.get(validation.data.type);
      if (categoryName) {
        const category = await assetCategoryService.findByName(categoryName, auth.workspaceId);
        resolvedCategoryId = category?.id || null;
      }
    }

    const asset = await assetService.update(id, auth.workspaceId, {
      name: validation.data.name,
      currency: validation.data.currency,
      type: resolvedType,
      category_id: resolvedCategoryId,
    });

    if (!asset) {
      return errorResponse('Asset not found', 404);
    }

    return successResponse(asset);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error updating asset', error);
    return errorResponse('Failed to update asset', 500);
  }
};

/**
 * DELETE /api/assets/:id
 * Soft delete an asset
 */
export const DELETE: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Asset ID is required', 400);
    }

    await assetService.delete(id, auth.workspaceId);

    return successResponse({ message: 'Asset deleted successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error deleting asset', error);
    return errorResponse('Failed to delete asset', 500);
  }
};
