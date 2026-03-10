import type { APIRoute } from 'astro';
import {
  array,
  forward,
  maxLength,
  minLength,
  object,
  optional,
  picklist,
  pipe,
  string,
  check,
} from 'valibot';
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

const bulkActionSchema = pipe(
  object({
    action: picklist(['update_category', 'update_account', 'delete']),
    ids: pipe(
      array(pipe(string(), minLength(1, 'Transaction ID is required'))),
      minLength(1, 'Select at least one transaction'),
      maxLength(100, 'You can update at most 100 transactions at once')
    ),
    payload: optional(
      object({
        category_id: optional(pipe(string(), minLength(1))),
        account_id: optional(pipe(string(), minLength(1))),
      })
    ),
  }),
  forward(
    check(
      (data) => data.action !== 'update_category' || Boolean(data.payload?.category_id),
      'category_id is required for update_category action'
    ),
    ['payload', 'category_id'] as const
  ),
  forward(
    check(
      (data) => data.action !== 'update_account' || Boolean(data.payload?.account_id),
      'account_id is required for update_account action'
    ),
    ['payload', 'account_id'] as const
  )
);

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
        const result = await transactionService.bulkUpdateCategory(
          ids,
          payload!.category_id!,
          auth.workspaceId,
          auth.userId
        );
        return successResponse(result);
      }

      case 'update_account': {
        const result = await transactionService.bulkUpdateAccount(
          ids,
          payload!.account_id!,
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
