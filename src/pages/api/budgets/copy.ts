import type { APIRoute } from 'astro';
import { budgetService, BudgetServiceError } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { copyBudgetsAPISchema } from '@/lib/validation';
import { logError } from '@/lib/utils';

/**
 * POST /api/budgets/copy
 * Copy all budgets from source month/year to target month/year
 * P2: TODO - Consider adding rate limiting to prevent abuse
 */
export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    const validation = await validateBody(context.request, copyBudgetsAPISchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const result = await budgetService.copyBudgetsToMonth({
      workspace_id: auth.workspaceId,
      created_by_user_id: auth.userId,
      ...validation.data,
    });

    return successResponse(result, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof BudgetServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error copying budgets', error);
    return errorResponse('Failed to copy budgets', 500);
  }
};
