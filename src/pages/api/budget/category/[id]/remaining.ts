import type { APIRoute } from 'astro';
import { budgetService } from '@/services';
import { successResponse, errorResponse, requireAuth } from '@/lib/api-utils';
import { logError } from '@/lib/utils';

/**
 * GET /api/budget/category/:id/remaining
 * Get remaining budget for a specific category in current month
 */
export const GET: APIRoute = async ({ params, request, url }) => {
  try {
    const userId = await requireAuth({ request, url } as any);
    const { id } = params;

    if (!id) {
      return errorResponse('Category ID is required', 400);
    }

    const remaining = await budgetService.getCategoryRemaining(id, userId);

    return successResponse(remaining);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof Error && error.message === 'Category not found') {
      return errorResponse('Category not found', 404);
    }
    logError('Error fetching category remaining budget', error);
    return errorResponse('Failed to fetch category remaining budget', 500);
  }
};
