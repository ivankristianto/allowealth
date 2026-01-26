import type { APIRoute } from 'astro';
import { categoryService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { createCategoryAPISchema } from '@/lib/validation';
import { logError } from '@/lib/utils';

/**
 * GET /api/categories
 * List all categories for the user
 */
export const GET: APIRoute = async (context) => {
  try {
    const userId = getAuthenticatedUser(context);

    const type = context.url.searchParams.get('type');
    const isActiveParam = context.url.searchParams.get('is_active');

    const filters: { type?: 'expense' | 'income'; is_active?: boolean } = {};
    if (type === 'expense' || type === 'income') {
      filters.type = type;
    }
    if (isActiveParam !== null) {
      filters.is_active = isActiveParam === 'true';
    }

    const categories = await categoryService.findAll(userId, filters);

    return successResponse(categories);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error fetching categories', error);
    return errorResponse('Failed to fetch categories', 500);
  }
};

/**
 * POST /api/categories
 * Create a new category
 */
export const POST: APIRoute = async (context) => {
  try {
    const userId = getAuthenticatedUser(context);

    const validation = await validateBody(context.request, createCategoryAPISchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    // Check if category name already exists
    const exists = await categoryService.existsByName(validation.data.name, userId);
    if (exists) {
      return errorResponse('Category with this name already exists', 409, 'DUPLICATE_NAME');
    }

    const category = await categoryService.create({
      user_id: userId,
      ...validation.data,
    });

    return successResponse(category, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error creating category', error);
    return errorResponse('Failed to create category', 500);
  }
};
