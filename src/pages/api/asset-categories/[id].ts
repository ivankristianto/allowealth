import type { APIRoute } from 'astro';
import { assetCategoryService, assetService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { updateAssetCategoryAPISchema } from '@/lib/validation';
import { logError } from '@/lib/utils';
import { ServiceError } from '@/services/service-errors';

const toAssetCategoryResponse = (category: any, assetCount = 0) => ({
  id: category.id,
  name: category.name,
  description: category.description,
  isLiability: category.is_liability,
  isSystem: category.is_system,
  sortOrder: category.sort_order,
  createdAt: category.created_at,
  updatedAt: category.updated_at,
  assetCount,
});

/**
 * GET /api/asset-categories/:id
 * Get a single asset category by ID
 */
export const GET: APIRoute = async (context) => {
  try {
    const userId = getAuthenticatedUser(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Category ID is required', 400);
    }

    const category = await assetCategoryService.findById(id, userId);

    if (!category) {
      return errorResponse('Category not found', 404);
    }

    const counts = await assetService.countByCategory(userId);
    const assetCount = counts.find((row) => row.category_id === category.id)?.count || 0;

    return successResponse(toAssetCategoryResponse(category, assetCount));
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error fetching asset category', error);
    return errorResponse('Failed to fetch asset category', 500);
  }
};

/**
 * PUT /api/asset-categories/:id
 * Update an asset category
 */
export const PUT: APIRoute = async (context) => {
  try {
    const userId = getAuthenticatedUser(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Category ID is required', 400);
    }

    const validation = await validateBody(context.request, updateAssetCategoryAPISchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const category = await assetCategoryService.update(id, userId, {
      name: validation.data.name,
      description: validation.data.description,
      is_liability: validation.data.isLiability,
    });

    return successResponse(toAssetCategoryResponse(category));
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof ServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error updating asset category', error);
    return errorResponse('Failed to update asset category', 500);
  }
};

/**
 * DELETE /api/asset-categories/:id
 * Delete an asset category
 */
export const DELETE: APIRoute = async (context) => {
  try {
    const userId = getAuthenticatedUser(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Category ID is required', 400);
    }

    await assetCategoryService.delete(id, userId);

    return successResponse({ message: 'Category deleted successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof ServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error deleting asset category', error);
    return errorResponse('Failed to delete asset category', 500);
  }
};
