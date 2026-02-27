import type { APIRoute } from 'astro';
import { recurringOccurrenceService, RecurringServiceError, ServiceError } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { confirmOccurrenceAPISchema } from '@/lib/validation/recurring';

export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const id = context.params.id;

    if (!id) {
      return errorResponse('Recurring occurrence ID is required', 400);
    }

    const contentType = context.request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return errorResponse('Content-Type must be application/json', 415, 'UNSUPPORTED_MEDIA_TYPE');
    }

    const validation = await validateBody(context.request, confirmOccurrenceAPISchema);
    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const transaction = await recurringOccurrenceService.confirm(id, auth.workspaceId, {
      amount: validation.data.amount,
      transaction_date: new Date(`${validation.data.transaction_date}T00:00:00.000Z`),
      category_id: validation.data.category_id,
      account_id: validation.data.account_id,
      userId: auth.userId,
    });

    return successResponse(transaction, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }

    if (error instanceof RecurringServiceError || error instanceof ServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }

    return errorResponse('Failed to confirm recurring occurrence', 500);
  }
};
