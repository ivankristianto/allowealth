import type { APIRoute } from 'astro';
import { transactionService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  requireAuth,
  isValidDate,
} from '@/lib/api-utils';
import { updateTransactionAPISchema } from '@/lib/validation';

/**
 * GET /api/transactions/:id
 * Get a single transaction by ID
 */
export const GET: APIRoute = async ({ params, request, url }) => {
  try {
    const userId = requireAuth({ request, url } as any);
    const { id } = params;

    if (!id) {
      return errorResponse('Transaction ID is required', 400);
    }

    const transaction = await transactionService.findById(id, userId);

    if (!transaction) {
      return errorResponse('Transaction not found', 404);
    }

    return successResponse(transaction);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Error fetching transaction:', error);
    return errorResponse('Failed to fetch transaction', 500);
  }
};

/**
 * PUT /api/transactions/:id
 * Update a transaction
 */
export const PUT: APIRoute = async ({ params, request, url }) => {
  try {
    const userId = requireAuth({ request, url } as any);
    const { id } = params;

    if (!id) {
      return errorResponse('Transaction ID is required', 400);
    }

    const validation = await validateBody(request, updateTransactionAPISchema);

    if (!validation.success) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const updateData: any = {};
    if (validation.data.type !== undefined) updateData.type = validation.data.type;
    if (validation.data.amount !== undefined) updateData.amount = validation.data.amount;
    if (validation.data.currency !== undefined) updateData.currency = validation.data.currency;
    if (validation.data.category_id !== undefined)
      updateData.category_id = validation.data.category_id;
    if (validation.data.payment_method_id !== undefined)
      updateData.payment_method_id = validation.data.payment_method_id;
    if (validation.data.transaction_date !== undefined) {
      const transactionDate = new Date(validation.data.transaction_date);
      if (!isValidDate(transactionDate)) {
        return errorResponse('Invalid transaction_date', 400);
      }
      updateData.transaction_date = transactionDate;
    }
    if (validation.data.description !== undefined)
      updateData.description = validation.data.description;

    const transaction = await transactionService.update(id, userId, updateData);

    if (!transaction) {
      return errorResponse('Transaction not found', 404);
    }

    return successResponse(transaction);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Error updating transaction:', error);
    return errorResponse('Failed to update transaction', 500);
  }
};

/**
 * DELETE /api/transactions/:id
 * Soft delete a transaction
 */
export const DELETE: APIRoute = async ({ params, request, url }) => {
  try {
    const userId = requireAuth({ request, url } as any);
    const { id } = params;

    if (!id) {
      return errorResponse('Transaction ID is required', 400);
    }

    await transactionService.delete(id, userId);

    return successResponse({ message: 'Transaction deleted successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    console.error('Error deleting transaction:', error);
    return errorResponse('Failed to delete transaction', 500);
  }
};
