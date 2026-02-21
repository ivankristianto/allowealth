import type { APIRoute } from 'astro';
import { budgetService, BudgetServiceError, workspaceMetaService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { createBudgetAPISchema } from '@/lib/validation';
import { logError } from '@/lib/utils';
import { isValidCurrency } from '@/lib/constants/currency';

/**
 * GET /api/budgets
 * List all budgets for the user for a specific month/year
 * Query params: month (required), year (required), currency (optional)
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    // Parse required query params
    const monthParam = context.url.searchParams.get('month');
    const yearParam = context.url.searchParams.get('year');
    const currency = context.url.searchParams.get('currency');

    // Validate required params
    if (!monthParam || !yearParam) {
      return errorResponse('month and year are required query parameters', 400, 'MISSING_PARAMS');
    }

    const month = parseInt(monthParam, 10);
    const year = parseInt(yearParam, 10);

    // Validate month and year
    if (isNaN(month) || month < 1 || month > 12) {
      return errorResponse('month must be between 1 and 12', 400, 'INVALID_MONTH');
    }

    if (isNaN(year) || year < 2000 || year > 2100) {
      return errorResponse('year must be between 2000 and 2100', 400, 'INVALID_YEAR');
    }

    // Validate currency if provided
    let currencyFilter: Currency | undefined;
    if (currency) {
      const workspaceCurrencyConfig = await workspaceMetaService.getWorkspaceCurrencies(
        auth.workspaceId
      );
      const allowedCurrencies = [
        workspaceCurrencyConfig.primary,
        ...(workspaceCurrencyConfig.secondary ? [workspaceCurrencyConfig.secondary] : []),
      ];
      if (!isValidCurrency(currency) || !allowedCurrencies.includes(currency)) {
        return errorResponse(
          'currency must match this workspace configured currencies',
          400,
          'INVALID_CURRENCY'
        );
      }
      currencyFilter = currency;
    }

    const budgets = await budgetService.findAllBudgets(
      auth.workspaceId,
      month,
      year,
      currencyFilter
    );

    return successResponse(budgets);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error fetching budgets', error);
    return errorResponse('Failed to fetch budgets', 500);
  }
};

/**
 * POST /api/budgets
 * Create a new budget record
 */
export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    const validation = await validateBody(context.request, createBudgetAPISchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const budget = await budgetService.createBudget({
      workspace_id: auth.workspaceId,
      created_by_user_id: auth.userId,
      ...validation.data,
    });

    return successResponse(budget, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof BudgetServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error creating budget', error);
    return errorResponse('Failed to create budget', 500);
  }
};
