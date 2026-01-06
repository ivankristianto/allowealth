import type { APIRoute } from 'astro';
import { z } from 'zod';
import { categoryService } from '@/services';
import { successResponse, errorResponse, validateBody, requireAuth } from '@/lib/api-utils';

// Validation schema
const updateCategorySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: z.enum(['expense', 'income']).optional(),
  currency: z.enum(['IDR', 'USD']).optional(),
  percentage: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional(),
  budget_amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional(),
  is_active: z.boolean().optional(),
});

/**
 * GET /api/categories/:id
 * Get a single category by ID
 */
export const GET: APIRoute = async ({ params, request, url }) => {
  try {
    const userId = requireAuth({ request, url } as any);
    const { id } = params;

    if (!id) {
      return errorResponse('Category ID is required', 400);
    }

    const category = await categoryService.findById(id, userId);

    if (!category) {
      return errorResponse('Category not found', 404);
    }

    return successResponse(category);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Error fetching category:', error);
    return errorResponse('Failed to fetch category', 500);
  }
};

/**
 * PUT /api/categories/:id
 * Update a category
 */
export const PUT: APIRoute = async ({ params, request, url }) => {
  try {
    const userId = requireAuth({ request, url } as any);
    const { id } = params;

    if (!id) {
      return errorResponse('Category ID is required', 400);
    }

    const validation = await validateBody(request, updateCategorySchema);

    if (!validation.success) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    // Check if name is being updated and if it conflicts
    if (validation.data.name) {
      const exists = await categoryService.existsByName(validation.data.name, userId, id);
      if (exists) {
        return errorResponse('Category with this name already exists', 409, 'DUPLICATE_NAME');
      }
    }

    const category = await categoryService.update(id, userId, validation.data);

    if (!category) {
      return errorResponse('Category not found', 404);
    }

    return successResponse(category);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Error updating category:', error);
    return errorResponse('Failed to update category', 500);
  }
};

/**
 * DELETE /api/categories/:id
 * Soft delete a category (mark as inactive)
 */
export const DELETE: APIRoute = async ({ params, request, url }) => {
  try {
    const userId = requireAuth({ request, url } as any);
    const { id } = params;

    if (!id) {
      return errorResponse('Category ID is required', 400);
    }

    await categoryService.delete(id, userId);

    return successResponse({ message: 'Category deleted successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Error deleting category:', error);
    return errorResponse('Failed to delete category', 500);
  }
};
