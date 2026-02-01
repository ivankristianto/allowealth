import type { APIRoute } from 'astro';
import { budgetService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';

/**
 * GET /api/budget/alerts
 * Get budget alerts for current month
 * Query params: currency
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { url } = context;

    const currency = (url.searchParams.get('currency') as 'IDR' | 'USD') || 'IDR';

    if (currency !== 'IDR' && currency !== 'USD') {
      return errorResponse('Invalid currency parameter', 400);
    }

    const alerts = await budgetService.getAlerts(auth.workspaceId, currency);

    return successResponse(alerts);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error fetching budget alerts', error);
    return errorResponse('Failed to fetch budget alerts', 500);
  }
};
