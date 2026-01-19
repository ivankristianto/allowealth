import type { APIRoute } from 'astro';
import { categoryService, type UpdateCategoryInput } from '@/services';
import { successResponse, errorResponse, validateBody, requireAuth } from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { z } from 'zod';
import { CategoryServiceError } from '@/services/service-errors';
import { updateCategorySchema } from '@/lib/validation/categories';

/**
 * Validation schema for budget category updates
 * At least one of percentage or budget_amount must be provided
 */
const updateBudgetSchema = updateCategorySchema
  .pick({
    percentage: true,
    budget_amount: true,
    currency: true,
  })
  .refine((data) => data.percentage !== undefined || data.budget_amount !== undefined, {
    message: 'At least one of percentage or budget_amount must be provided',
  });

type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;

/**
 * PATCH /api/budget/category/:id
 * Update budget allocation for a category
 *
 * Request body:
 * {
 *   "percentage": "5.00",      // Optional: 0-100
 *   "budget_amount": "5000000", // Optional: >= 0
 *   "currency": "IDR"           // Optional: must match existing category currency
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "abc123",
 *     "name": "Food & Groceries",
 *     "percentage": "5.00",
 *     "budget_amount": "5000000",
 *     "currency": "IDR"
 *   }
 * }
 */
export const PATCH: APIRoute = async (context) => {
  try {
    const userId = await requireAuth(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Category ID is required', 400);
    }

    // Validate request body
    const validation = await validateBody(context.request, updateBudgetSchema);

    if (!validation.success) {
      return errorResponse(
        'Validation failed',
        400,
        'VALIDATION_ERROR',
        (validation as any).error.issues
      );
    }

    const input = validation.data as UpdateBudgetInput;

    // Fetch the category first to validate currency constraint
    // This is safe because we're just reading, and the service layer handles the ownership check during update
    const category = await categoryService.findById(id, userId);

    if (!category) {
      return errorResponse('Category not found', 404, 'CATEGORY_NOT_FOUND');
    }

    // If currency is provided, verify it matches the existing category currency
    if (input.currency && input.currency !== category.currency) {
      return errorResponse(
        `Currency must match category currency (${category.currency})`,
        400,
        'VALIDATION_ERROR'
      );
    }

    // Build update data with only the fields we want to update
    const updateData: UpdateCategoryInput = {};

    if (input.percentage !== undefined) {
      updateData.percentage = input.percentage;
    }

    if (input.budget_amount !== undefined) {
      updateData.budget_amount = input.budget_amount;
    }

    // Update the category using the category service
    // The service layer handles ownership verification via WHERE clause
    const updatedCategory = await categoryService.update(id, userId, updateData);

    if (!updatedCategory) {
      return errorResponse('Category not found', 404, 'CATEGORY_NOT_FOUND');
    }

    return successResponse({
      id: updatedCategory.id,
      name: updatedCategory.name,
      type: updatedCategory.type,
      percentage: updatedCategory.percentage,
      budget_amount: updatedCategory.budget_amount,
      currency: updatedCategory.currency,
      is_active: updatedCategory.is_active,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }

    // Handle CategoryServiceError
    if (error instanceof CategoryServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }

    logError('Error updating budget category', error);
    return errorResponse('Failed to update budget category', 500);
  }
};
