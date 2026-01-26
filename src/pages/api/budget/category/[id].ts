import type { APIRoute } from 'astro';
import { categoryService, type UpdateCategoryInput } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { z } from 'zod';
import { CategoryServiceError } from '@/services/service-errors';
import { updateCategorySchema } from '@/lib/validation/categories';

/**
 * Validation schema for budget category updates
 * Only budget_amount is required; percentage is auto-calculated
 */
const updateBudgetSchema = updateCategorySchema
  .pick({
    budget_amount: true,
    currency: true,
  })
  .refine(
    (data) => {
      if (!data.budget_amount) return false;
      const num = parseFloat(data.budget_amount);
      return !isNaN(num) && num >= 0;
    },
    { message: 'Budget amount must be a valid non-negative number' }
  );

type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;

/**
 * PATCH /api/budget/category/:id
 * Update budget allocation for a category
 *
 * Request body:
 * {
 *   "budget_amount": "5000000", // Required: >= 0
 *   "currency": "IDR"           // Optional: must match existing category currency
 * }
 *
 * Percentage is auto-calculated from budget_amount relative to total budget.
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "id": "abc123",
 *     "name": "Food & Groceries",
 *     "percentage": "15.50",
 *     "budget_amount": "5000000",
 *     "currency": "IDR"
 *   }
 * }
 */
export const PATCH: APIRoute = async (context) => {
  try {
    const userId = getAuthenticatedUser(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Category ID is required', 400);
    }

    // Validate request body
    const validation = await validateBody(context.request, updateBudgetSchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
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

    // Auto-calculate percentage from budget_amount
    // Get all active expense categories for the user with the same currency
    const allCategories = await categoryService.findAll(userId, {
      type: 'expense',
      is_active: true,
    });

    // Filter categories by currency (matching the category being updated)
    const sameCurrencyCategories = allCategories.filter((c) => c.currency === category.currency);

    // Calculate total budget amount EXCLUDING the category being updated
    // This ensures the percentage is based on what the total will be AFTER the update
    const totalBudgetAmount = sameCurrencyCategories.reduce(
      (sum, cat) => sum + (cat.id === id ? 0 : parseFloat(cat.budget_amount || '0')),
      0
    );

    // The new total will be the current total (excluding this category) + new budget amount
    const newTotalBudgetAmount = totalBudgetAmount + parseFloat(input.budget_amount || '0');

    // Calculate percentage: (category_budget_amount / new_total_budget_amount) * 100
    const calculatedPercentage =
      newTotalBudgetAmount > 0
        ? (parseFloat(input.budget_amount || '0') / newTotalBudgetAmount) * 100
        : 0;

    // Build update data with budget_amount and calculated percentage
    const updateData: UpdateCategoryInput = {
      budget_amount: input.budget_amount,
      percentage: calculatedPercentage.toFixed(2),
    };

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
