import type { APIRoute } from 'astro';
import { z } from 'zod';
import { categoryService } from '@/services';
import { successResponse, errorResponse, validateBody, requireAuth } from '@/lib/api-utils';

// Validation schemas
const createCategorySchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['expense', 'income']),
  currency: z.enum(['IDR', 'USD']),
  percentage: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional()
    .default('0')
    .transform((val) => val ?? '0'),
  budget_amount: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/)
    .optional()
    .default('0')
    .transform((val) => val ?? '0'),
});

/**
 * GET /api/categories
 * List all categories for the user
 */
export const GET: APIRoute = async ({ request, url }) => {
  try {
    const userId = requireAuth({ request, url } as any);

    const type = url.searchParams.get('type');
    const isActiveParam = url.searchParams.get('is_active');

    const filters: any = {};
    if (type && (type === 'expense' || type === 'income')) {
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
    console.error('Error fetching categories:', error);
    return errorResponse('Failed to fetch categories', 500);
  }
};

/**
 * POST /api/categories
 * Create a new category
 */
export const POST: APIRoute = async ({ request, url }) => {
  try {
    const userId = requireAuth({ request, url } as any);

    const validation = await validateBody(request, createCategorySchema);

    if (!validation.success) {
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
    console.error('Error creating category:', error);
    return errorResponse('Failed to create category', 500);
  }
};
