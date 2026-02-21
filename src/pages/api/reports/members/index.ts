import type { APIRoute } from 'astro';
import { reportService, workspaceMetaService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { validatePeriod } from '@/lib/utils/period-validation';
import { isValidCurrency } from '@/lib/constants/currency';

/**
 * GET /api/reports/members
 * Get per-member spending summary for a period
 *
 * Query params:
 *   - range: 'monthly' | 'yearly' (required)
 *   - period: string (required) - 'YYYY-MM' for monthly, 'YYYY' for yearly
 *   - currency: Currency (optional, defaults to 'IDR')
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { url } = context;

    const range = url.searchParams.get('range') as 'monthly' | 'yearly' | null;
    const period = url.searchParams.get('period');
    const currencyParam = url.searchParams.get('currency');
    const workspaceCurrencyConfig = await workspaceMetaService.getWorkspaceCurrencies(
      auth.workspaceId
    );
    const allowedCurrencies = [
      workspaceCurrencyConfig.primary,
      ...(workspaceCurrencyConfig.secondary ? [workspaceCurrencyConfig.secondary] : []),
    ];
    const currency =
      currencyParam && isValidCurrency(currencyParam) && allowedCurrencies.includes(currencyParam)
        ? currencyParam
        : workspaceCurrencyConfig.primary;

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

    if (
      currencyParam &&
      (!isValidCurrency(currencyParam) || !allowedCurrencies.includes(currencyParam))
    ) {
      return errorResponse(
        'Invalid currency. Must match this workspace configured currencies.',
        400,
        'INVALID_CURRENCY'
      );
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
