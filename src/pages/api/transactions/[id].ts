import type { APIRoute } from 'astro';
import { transactionService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { updateTransactionAPISchema, transactionIdSchema } from '@/lib/validation/transactions';
import { logError, transformTransaction } from '@/lib/utils';
import { ServiceError } from '@/services/service-errors';

/**
 * GET /api/transactions/:id
 * Get a single transaction by ID
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { id } = context.params;

    // Validate transaction ID format
    const idValidation = transactionIdSchema.safeParse(id);
    if (!idValidation.success) {
      return errorResponse('Invalid transaction ID format', 400);
    }

    // Now we know id is a valid string
    const rawTransaction = await transactionService.findById(idValidation.data, auth.workspaceId);

    if (!rawTransaction) {
      return errorResponse('Transaction not found', 404);
    }

    return successResponse(transformTransaction(rawTransaction));
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof ServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error fetching transaction', error);
    return errorResponse('Failed to fetch transaction', 500);
  }
};

/**
 * PUT /api/transactions/:id
 * Update a transaction
 */
export const PUT: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { id } = context.params;
    const { request } = context;

    // Validate transaction ID format
    const idValidation = transactionIdSchema.safeParse(id);
    if (!idValidation.success) {
      return errorResponse('Invalid transaction ID format', 400);
    }

    // Validate Content-Type header
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return errorResponse('Content-Type must be application/json', 415, 'UNSUPPORTED_MEDIA_TYPE');
    }

    const validation = await validateBody(request, updateTransactionAPISchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const updateData: any = {};
    if (validation.data.type !== undefined) updateData.type = validation.data.type;
    if (validation.data.amount !== undefined) updateData.amount = validation.data.amount;
    if (validation.data.currency !== undefined) updateData.currency = validation.data.currency;
    if (validation.data.category_id !== undefined)
      updateData.category_id = validation.data.category_id;
    if (validation.data.asset_id !== undefined) updateData.asset_id = validation.data.asset_id;
    if (validation.data.to_asset_id !== undefined)
      updateData.to_asset_id = validation.data.to_asset_id;
    if (validation.data.transaction_date !== undefined) {
      // Convert date string (YYYY-MM-DD) to Date object
      // The validation ensures the string is in the correct format
      updateData.transaction_date = new Date(validation.data.transaction_date + 'T00:00:00.000Z');
    }
    if (validation.data.description !== undefined)
      updateData.description = validation.data.description;

    const rawTransaction = await transactionService.update(
      idValidation.data,
      auth.workspaceId,
      updateData
    );

    if (!rawTransaction) {
      return errorResponse('Transaction not found', 404);
    }

    return successResponse(transformTransaction(rawTransaction));
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof ServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error updating transaction', error);
    return errorResponse('Failed to update transaction', 500);
  }
};

/**
 * DELETE /api/transactions/:id
 * Soft delete a transaction
 */
export const DELETE: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { id } = context.params;

    // Validate transaction ID format
    const idValidation = transactionIdSchema.safeParse(id);
    if (!idValidation.success) {
      return errorResponse('Invalid transaction ID format', 400);
    }

    await transactionService.delete(idValidation.data, auth.workspaceId);

    return successResponse({ message: 'Transaction deleted successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof ServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error deleting transaction', error);
    return errorResponse('Failed to delete transaction', 500);
  }
};
