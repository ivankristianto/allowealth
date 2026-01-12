import type { APIRoute } from 'astro';
import { budgetService } from '@/services';
import { successResponse, errorResponse, requireAuth } from '@/lib/api-utils';
import { logError } from '@/lib/utils';

/**
 * GET /api/budget/history
 * Get budget history for multiple months
 * Query params: currency, months (default 12)
 */
export const GET: APIRoute = async ({ request, url }) => {
  try {
    const userId = await requireAuth({ request, url } as any);

    const currency = (url.searchParams.get('currency') as 'IDR' | 'USD') || 'IDR';
    const monthsParam = url.searchParams.get('months');
    const months = monthsParam ? parseInt(monthsParam, 10) : 12;

    if (currency !== 'IDR' && currency !== 'USD') {
      return errorResponse('Invalid currency parameter', 400);
    }

    if (isNaN(months) || months < 1 || months > 24) {
      return errorResponse('Invalid months parameter (must be 1-24)', 400);
    }

    const history = await budgetService.getBudgetHistory(userId, currency, months);

    return successResponse(history);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error fetching budget history', error);
    return errorResponse('Failed to fetch budget history', 500);
  }
};
