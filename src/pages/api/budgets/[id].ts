import type { APIRoute } from 'astro';
import { budgetService, BudgetServiceError } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { updateBudgetAPISchema } from '@/lib/validation';
import { logError } from '@/lib/utils';

/**
 * GET /api/budgets/:id
 * Get a single budget by ID
 */
export const GET: APIRoute = async (context) => {
  try {
    const userId = getAuthenticatedUser(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Budget ID is required', 400);
    }

    const budget = await budgetService.getBudgetById(id, userId);

    if (!budget) {
      return errorResponse('Budget not found', 404);
    }

    return successResponse(budget);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error fetching budget', error);
    return errorResponse('Failed to fetch budget', 500);
  }
};

/**
 * PUT /api/budgets/:id
 * Update a budget record
 */
export const PUT: APIRoute = async (context) => {
  try {
    const userId = getAuthenticatedUser(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Budget ID is required', 400);
    }

    const validation = await validateBody(context.request, updateBudgetAPISchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const budget = await budgetService.updateBudget(id, userId, validation.data);

    return successResponse(budget);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof BudgetServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error updating budget', error);
    return errorResponse('Failed to update budget', 500);
  }
};

/**
 * DELETE /api/budgets/:id
 * Delete a budget record
 */
export const DELETE: APIRoute = async (context) => {
  try {
    const userId = getAuthenticatedUser(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Budget ID is required', 400);
    }

    await budgetService.deleteBudget(id, userId);

    return successResponse({ message: 'Budget deleted successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof BudgetServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error deleting budget', error);
    return errorResponse('Failed to delete budget', 500);
  }
};
