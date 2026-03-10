import type { APIRoute } from 'astro';
import {
  array,
  integer,
  maxValue,
  minLength,
  minValue,
  number,
  object,
  pipe,
  picklist,
  regex,
  string,
} from 'valibot';
import { budgetService, BudgetServiceError, ServiceErrorCode } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { AVAILABLE_CURRENCIES } from '@/lib/constants/currency';

const batchBudgetSchema = object({
  budgets: array(
    object({
      categoryId: pipe(string(), minLength(1)),
      amount: pipe(string(), regex(/^\d+(\.\d{1,2})?$/)),
      currency: picklist(AVAILABLE_CURRENCIES),
    })
  ),
  month: pipe(number(), integer(), minValue(1), maxValue(12)),
  year: pipe(number(), integer(), minValue(2000), maxValue(2100)),
});

export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const validation = await validateBody(context.request, batchBudgetSchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const { budgets, month, year } = validation.data;

    if (!auth.workspaceId) {
      return errorResponse('Workspace context required', 403);
    }

    let created = 0;
    let updated = 0;

    for (const budget of budgets) {
      if (parseFloat(budget.amount) > 0) {
        try {
          await budgetService.createBudget({
            workspace_id: auth.workspaceId,
            created_by_user_id: auth.userId,
            category_id: budget.categoryId,
            month,
            year,
            budget_amount: budget.amount,
            currency: budget.currency,
          });
          created++;
        } catch (error) {
          // Idempotent onboarding: if budget already exists, update it instead.
          if (
            error instanceof BudgetServiceError &&
            error.code === ServiceErrorCode.BUDGET_ALREADY_EXISTS
          ) {
            const existingBudgets = await budgetService.findAllBudgets(
              auth.workspaceId,
              month,
              year,
              budget.currency
            );
            const existing = existingBudgets.find((item) => item.category_id === budget.categoryId);

            if (!existing) {
              throw error;
            }

            await budgetService.updateBudget(existing.id, auth.workspaceId, {
              budget_amount: budget.amount,
            });
            updated++;
            continue;
          }

          throw error;
        }
      }
    }

    return successResponse({ created, updated }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof BudgetServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error creating onboarding budgets', error);
    return errorResponse('Failed to create budgets', 500);
  }
};
