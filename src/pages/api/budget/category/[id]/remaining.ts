import type { APIRoute } from 'astro';
import { budgetService, workspaceMetaService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { isValidCurrency } from '@/lib/constants/currency';

/**
 * GET /api/budget/category/:id/remaining
 * Get remaining budget for a specific category in current month
 *
 * Query params:
 * - currency: Currency (required) - Currency to use for budget lookup
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Category ID is required', 400);
    }

    // Get currency from query param (required since categories no longer have currency)
    const currency = context.url.searchParams.get('currency');
    const workspaceCurrencyConfig = await workspaceMetaService.getWorkspaceCurrencies(
      auth.workspaceId
    );
    const allowedCurrencies = [
      workspaceCurrencyConfig.primary,
      ...(workspaceCurrencyConfig.secondary ? [workspaceCurrencyConfig.secondary] : []),
    ];
    if (!currency || !isValidCurrency(currency) || !allowedCurrencies.includes(currency)) {
      return errorResponse(
        'Currency is required and must match this workspace configured currencies',
        400
      );
    }

    const remaining = await budgetService.getCategoryRemaining(id, auth.workspaceId, currency);

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
