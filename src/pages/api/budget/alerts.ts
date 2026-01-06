import type { APIRoute } from 'astro';
import { budgetService } from '@/services';
import { successResponse, errorResponse, requireAuth } from '@/lib/api-utils';

/**
 * GET /api/budget/alerts
 * Get budget alerts for current month
 * Query params: currency
 */
export const GET: APIRoute = async ({ request, url }) => {
  try {
    const userId = requireAuth({ request, url } as any);

    const currency = (url.searchParams.get('currency') as 'IDR' | 'USD') || 'IDR';

    if (currency !== 'IDR' && currency !== 'USD') {
      return errorResponse('Invalid currency parameter', 400);
    }

    const alerts = await budgetService.getAlerts(userId, currency);

    return successResponse(alerts);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Error fetching budget alerts:', error);
    return errorResponse('Failed to fetch budget alerts', 500);
  }
};
