import type { APIRoute } from 'astro';
import { reportService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { validatePeriod } from '@/lib/utils/period-validation';

/**
 * GET /api/reports/members
 * Get per-member spending summary for a period
 *
 * Query params:
 *   - range: 'monthly' | 'yearly' (required)
 *   - period: string (required) - 'YYYY-MM' for monthly, 'YYYY' for yearly
 *   - currency: 'IDR' | 'USD' (optional, defaults to 'IDR')
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { url } = context;

    const range = url.searchParams.get('range') as 'monthly' | 'yearly' | null;
    const period = url.searchParams.get('period');
    const currency = (url.searchParams.get('currency') as 'IDR' | 'USD' | null) || 'IDR';

    if (!range || (range !== 'monthly' && range !== 'yearly')) {
      return errorResponse("Invalid range. Must be 'monthly' or 'yearly'.", 400, 'INVALID_RANGE');
    }

    if (!period || typeof period !== 'string' || period.trim() === '') {
      return errorResponse('Period parameter is required.', 400, 'MISSING_PERIOD');
    }

    try {
      validatePeriod(period, range);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid period format.';
      return errorResponse(message, 400, 'INVALID_PERIOD');
    }

    if (currency !== 'IDR' && currency !== 'USD') {
      return errorResponse("Invalid currency. Must be 'IDR' or 'USD'.", 400, 'INVALID_CURRENCY');
    }

    const summary = await reportService.getMemberSummary(auth.workspaceId, period, range, currency);

    return successResponse(summary);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }
    logError('Error fetching member summary', error);
    return errorResponse('Failed to fetch member summary', 500, 'INTERNAL_ERROR');
  }
};
