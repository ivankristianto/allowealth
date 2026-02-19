import type { APIRoute } from 'astro';
import { accountService } from '@/services';
import {
  successResponse,
  errorResponse,
  getAuthenticatedUser,
  getQueryParams,
} from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { ACCOUNT_TYPE_LABELS, type AccountType, type Currency } from '@/lib/types/account';

/**
 * GET /api/accounts/closed
 * Get all closed accounts for a workspace
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const params = getQueryParams(new URL(context.request.url));

    const validTypes = Object.keys(ACCOUNT_TYPE_LABELS);
    const validCurrencies = ['IDR', 'USD'];

    const filters: { type?: AccountType; currency?: Currency } = {};
    if (params.type && validTypes.includes(params.type)) filters.type = params.type as AccountType;
    if (params.currency && validCurrencies.includes(params.currency))
      filters.currency = params.currency as Currency;

    const accounts = await accountService.findAllClosed(auth.workspaceId, filters);

    return successResponse(accounts);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error fetching closed accounts', error);
    return errorResponse('Failed to fetch closed accounts', 500);
  }
};
