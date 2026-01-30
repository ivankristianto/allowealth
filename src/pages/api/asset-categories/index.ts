import type { APIRoute } from 'astro';
import { assetCategoryService, assetService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { createAssetCategoryAPISchema } from '@/lib/validation';
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
 * GET /api/asset-categories
 * List all asset categories for the user
 */
export const GET: APIRoute = async (context) => {
  try {
    const userId = getAuthenticatedUser(context);

    const isLiabilityParam = context.url.searchParams.get('isLiability');
    const isSystemParam = context.url.searchParams.get('isSystem');

    const filters: { is_liability?: boolean; is_system?: boolean } = {};
    if (isLiabilityParam !== null) {
      filters.is_liability = isLiabilityParam === 'true';
    }
    if (isSystemParam !== null) {
      filters.is_system = isSystemParam === 'true';
    }

    const categories = await assetCategoryService.findAll(userId, filters);
    const counts = await assetService.countByCategory(userId);
    const countMap = new Map(counts.map((row) => [row.category_id, row.count]));

    return successResponse(
      categories.map((category) =>
        toAssetCategoryResponse(category, countMap.get(category.id) || 0)
      )
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error fetching asset categories', error);
    return errorResponse('Failed to fetch asset categories', 500);
  }
};

/**
 * POST /api/asset-categories
 * Create a new asset category
 */
export const POST: APIRoute = async (context) => {
  try {
    const userId = getAuthenticatedUser(context);

    const validation = await validateBody(context.request, createAssetCategoryAPISchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const category = await assetCategoryService.create({
      user_id: userId,
      name: validation.data.name,
      description: validation.data.description,
      is_liability: validation.data.isLiability,
      is_system: false,
      sort_order: 0,
    });

    return successResponse(toAssetCategoryResponse(category), 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof ServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error creating asset category', error);
    return errorResponse('Failed to create asset category', 500);
  }
};
