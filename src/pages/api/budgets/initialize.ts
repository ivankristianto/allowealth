import type { APIRoute } from 'astro';
import { budgetService, BudgetServiceError } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { initializeBudgetsAPISchema } from '@/lib/validation';
import { logError } from '@/lib/utils';

/**
 * POST /api/budgets/initialize
 * Initialize budgets for all uninitialized expense categories with amount=0
 */
export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    const validation = await validateBody(context.request, initializeBudgetsAPISchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const result = await budgetService.initializeAllBudgets({
      workspace_id: auth.workspaceId,
      created_by_user_id: auth.userId,
      ...validation.data,
    });

    return successResponse(result, 200);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof BudgetServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error initializing budgets', error);
    const message = error instanceof Error ? error.message : 'Failed to initialize budgets';
    return errorResponse(message, 500);
  }
};
