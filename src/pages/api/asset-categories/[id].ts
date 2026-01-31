import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
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
import { createRenderHelper } from '@/lib/api/renderResponse';

// Import partial component for HTML rendering
import AssetCategoryTablePartial from '@/components/partials/AssetCategoryTablePartial.astro';

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
    const auth = getAuthenticatedUser(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Category ID is required', 400);
    }

    const category = await assetCategoryService.findById(id, auth.workspaceId);

    if (!category) {
      return errorResponse('Category not found', 404);
    }

    const counts = await assetService.countByCategory(auth.workspaceId);
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
 * Supports ?_render=html for server-rendered HTML fragments
 */
export const PUT: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { id } = context.params;
    const render = createRenderHelper(context.url);

    if (!id) {
      return render.wantsHtml()
        ? render.error('Category ID is required', 400)
        : errorResponse('Category ID is required', 400);
    }

    const validation = await validateBody(context.request, updateAssetCategoryAPISchema);

    if (isValidationError(validation)) {
      return render.wantsHtml()
        ? render.error('Validation failed', 400)
        : errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const category = await assetCategoryService.update(id, auth.workspaceId, {
      name: validation.data.name,
      description: validation.data.description,
      is_liability: validation.data.isLiability,
    });

    // If HTML rendering requested, return updated table
    if (render.wantsHtml()) {
      const container = await AstroContainer.create();

      // Fetch all categories for updated table
      const allCategories = await assetCategoryService.findAll(auth.workspaceId);
      const counts = await assetService.countByCategory(auth.workspaceId);
      const countMap = new Map(counts.map((row) => [row.category_id, row.count]));

      // Get type filter from query params (default: asset)
      const typeFilter = (context.url.searchParams.get('type') as 'asset' | 'liability') || 'asset';

      // Build category data for partial
      const categoryData = allCategories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        isLiability: cat.is_liability,
        isSystem: cat.is_system,
        sortOrder: cat.sort_order,
        assetCount: countMap.get(cat.id) || 0,
      }));

      const tableHtml = await container.renderToString(AssetCategoryTablePartial, {
        props: {
          categories: categoryData,
          typeFilter,
        },
      });

      return render.html(`<!-- PARTIAL:table -->\n${tableHtml}`);
    }

    return successResponse(toAssetCategoryResponse(category));
  } catch (error) {
    const render = createRenderHelper(context.url);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return render.wantsHtml()
        ? render.error('Unauthorized', 401)
        : errorResponse('Unauthorized', 401);
    }
    if (error instanceof ServiceError) {
      return render.wantsHtml()
        ? render.error(error.message, error.statusCode)
        : errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error updating asset category', error);
    return render.wantsHtml()
      ? render.error('Failed to update asset category', 500)
      : errorResponse('Failed to update asset category', 500);
  }
};

/**
 * DELETE /api/asset-categories/:id
 * Delete an asset category
 * Supports ?_render=html for server-rendered HTML fragments
 */
export const DELETE: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { id } = context.params;
    const render = createRenderHelper(context.url);

    if (!id) {
      return render.wantsHtml()
        ? render.error('Category ID is required', 400)
        : errorResponse('Category ID is required', 400);
    }

    await assetCategoryService.delete(id, auth.workspaceId);

    // If HTML rendering requested, return updated table
    if (render.wantsHtml()) {
      const container = await AstroContainer.create();

      // Fetch all categories for updated table
      const allCategories = await assetCategoryService.findAll(auth.workspaceId);
      const counts = await assetService.countByCategory(auth.workspaceId);
      const countMap = new Map(counts.map((row) => [row.category_id, row.count]));

      // Get type filter from query params (default: asset)
      const typeFilter = (context.url.searchParams.get('type') as 'asset' | 'liability') || 'asset';

      // Build category data for partial
      const categoryData = allCategories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        isLiability: cat.is_liability,
        isSystem: cat.is_system,
        sortOrder: cat.sort_order,
        assetCount: countMap.get(cat.id) || 0,
      }));

      const tableHtml = await container.renderToString(AssetCategoryTablePartial, {
        props: {
          categories: categoryData,
          typeFilter,
        },
      });

      return render.html(`<!-- PARTIAL:table -->\n${tableHtml}`);
    }

    return successResponse({ message: 'Category deleted successfully' });
  } catch (error) {
    const render = createRenderHelper(context.url);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return render.wantsHtml()
        ? render.error('Unauthorized', 401)
        : errorResponse('Unauthorized', 401);
    }
    if (error instanceof ServiceError) {
      return render.wantsHtml()
        ? render.error(error.message, error.statusCode)
        : errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error deleting asset category', error);
    return render.wantsHtml()
      ? render.error('Failed to delete asset category', 500)
      : errorResponse('Failed to delete asset category', 500);
  }
};
