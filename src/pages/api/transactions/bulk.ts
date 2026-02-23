import type { APIRoute } from 'astro';
import { z } from 'zod';
import { transactionService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { ServiceError } from '@/services/service-errors';

const bulkActionSchema = z.object({
  action: z.enum(['update_category', 'update_account', 'delete']),
  ids: z.array(z.string().min(1)).min(1).max(100),
  payload: z
    .object({
      category_id: z.string().min(1).optional(),
      account_id: z.string().min(1).optional(),
    })
    .optional(),
});

/**
 * POST /api/transactions/bulk
 * Execute bulk actions for transactions: category update, account update, or delete.
 */
export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { request } = context;

    if (!auth.workspaceId) {
      return errorResponse('Unauthorized', 401);
    }

    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return errorResponse('Content-Type must be application/json', 415, 'UNSUPPORTED_MEDIA_TYPE');
    }

    const validation = await validateBody(request, bulkActionSchema);
    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const { action, ids, payload } = validation.data;

    switch (action) {
      case 'update_category': {
        if (!payload?.category_id) {
          return errorResponse('category_id is required for update_category action', 400);
        }

        const result = await transactionService.bulkUpdateCategory(
          ids,
          payload.category_id,
          auth.workspaceId,
          auth.userId
        );
        return successResponse(result);
      }

      case 'update_account': {
        if (!payload?.account_id) {
          return errorResponse('account_id is required for update_account action', 400);
        }

        const result = await transactionService.bulkUpdateAccount(
          ids,
          payload.account_id,
          auth.workspaceId,
          auth.userId
        );
        return successResponse(result);
      }

      case 'delete': {
        const result = await transactionService.bulkDelete(ids, auth.workspaceId, auth.userId);
        return successResponse(result);
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof ServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error in bulk transaction operation', error);
    return errorResponse('Failed to process bulk operation', 500);
  }
};
