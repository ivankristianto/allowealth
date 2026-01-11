import type { APIRoute } from 'astro';
import { budgetService } from '@/services';
import { successResponse, errorResponse, requireAuth } from '@/lib/api-utils';
import { logError } from '@/lib/utils';

/**
 * GET /api/budget/overview
 * Get budget overview for a specific month
 * Query params: year, month, currency
 */
export const GET: APIRoute = async ({ request, url }) => {
  try {
    const userId = requireAuth({ request, url } as any);

    const yearParam = url.searchParams.get('year');
    const monthParam = url.searchParams.get('month');
    const currency = url.searchParams.get('currency') as 'IDR' | 'USD' | null;

    // Default to current month if not specified
    const now = new Date();
    const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();
    const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;
    const selectedCurrency = currency || 'IDR';

    // Validate inputs
    if (isNaN(year) || year < 2000 || year > 2100) {
      return errorResponse('Invalid year parameter', 400);
    }

    if (isNaN(month) || month < 1 || month > 12) {
      return errorResponse('Invalid month parameter', 400);
    }

    if (selectedCurrency !== 'IDR' && selectedCurrency !== 'USD') {
      return errorResponse('Invalid currency parameter', 400);
    }

    const overview = await budgetService.getMonthlyOverview(userId, year, month, selectedCurrency);

    return successResponse(overview);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error fetching budget overview', error);
    return errorResponse('Failed to fetch budget overview', 500);
  }
};
