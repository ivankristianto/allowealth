import type { APIRoute } from 'astro';
import { categoryService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { updateCategoryAPISchema } from '@/lib/validation';
import { logError } from '@/lib/utils';
import { getCacheManager, CacheTags } from '@/lib/cache';

/**
 * GET /api/categories/:id
 * Get a single category by ID
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Category ID is required', 400);
    }

    const category = await categoryService.findById(id, auth.workspaceId);

    if (!category) {
      return errorResponse('Category not found', 404);
    }

    return successResponse(category);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error fetching category', error);
    return errorResponse('Failed to fetch category', 500);
  }
};

/**
 * PUT /api/categories/:id
 * Update a category
 */
export const PUT: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Category ID is required', 400);
    }

    const validation = await validateBody(context.request, updateCategoryAPISchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    // Check if name is being updated and if it conflicts
    if (validation.data.name) {
      const exists = await categoryService.existsByName(validation.data.name, auth.workspaceId, id);
      if (exists) {
        return errorResponse('Category with this name already exists', 409, 'DUPLICATE_NAME');
      }
    }

    const category = await categoryService.update(id, auth.workspaceId, validation.data);

    if (!category) {
      return errorResponse('Category not found', 404);
    }

    // Invalidate layout cache since categories changed
    const cache = getCacheManager();
    await cache.invalidateByTags([
      CacheTags.workspace(auth.workspaceId),
      CacheTags.CATEGORIES,
      CacheTags.LAYOUT,
    ]);

    return successResponse(category);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error updating category', error);
    return errorResponse('Failed to update category', 500);
  }
};

/**
 * DELETE /api/categories/:id
 * Soft delete a category (mark as inactive)
 */
export const DELETE: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Category ID is required', 400);
    }

    await categoryService.delete(id, auth.workspaceId);

    // Invalidate layout cache since categories changed
    const cache = getCacheManager();
    await cache.invalidateByTags([
      CacheTags.workspace(auth.workspaceId),
      CacheTags.CATEGORIES,
      CacheTags.LAYOUT,
    ]);

    return successResponse({ message: 'Category deleted successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error deleting category', error);
    return errorResponse('Failed to delete category', 500);
  }
};
