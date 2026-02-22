import type { APIRoute } from 'astro';
import { z } from 'zod';
import { budgetService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { AVAILABLE_CURRENCIES } from '@/lib/constants/currency';

const batchBudgetSchema = z.object({
  budgets: z.array(
    z.object({
      categoryId: z.string().min(1),
      amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
      currency: z.enum(AVAILABLE_CURRENCIES),
    })
  ),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const validation = await validateBody(context.request, batchBudgetSchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const { budgets, month, year } = validation.data;
    let created = 0;

    for (const budget of budgets) {
      if (parseFloat(budget.amount) > 0) {
        await budgetService.createBudget({
          workspace_id: auth.workspaceId!,
          created_by_user_id: auth.userId,
          category_id: budget.categoryId,
          month,
          year,
          budget_amount: budget.amount,
          currency: budget.currency,
        });
        created++;
      }
    }

    return successResponse({ created }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error creating onboarding budgets', error);
    return errorResponse('Failed to create budgets', 500);
  }
};
