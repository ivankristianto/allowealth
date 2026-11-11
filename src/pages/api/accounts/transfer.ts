import type { APIRoute } from 'astro';
import { accountService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { ServiceError } from '@/services/service-errors';
import { check, forward, maxLength, minLength, object, optional, pipe, string } from 'valibot';
import { positiveAmountSchema } from '@/lib/validation/amount';

const transferSchema = pipe(
  object({
    fromAccountId: pipe(string(), minLength(1)),
    toAccountId: pipe(string(), minLength(1)),
    amount: positiveAmountSchema(),
    notes: optional(pipe(string(), maxLength(500))),
  }),
  forward(
    check(
      (data) => data.fromAccountId !== data.toAccountId,
      'Source and destination must be different'
    ),
    ['toAccountId'] as const
  )
);

/**
 * POST /api/accounts/transfer
 * Move money between two same-currency accounts and record the transfer transaction
 */
export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const validation = await validateBody(context.request, transferSchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const { fromAccountId, toAccountId, amount, notes } = validation.data;
    const { transactionId } = await accountService.transfer(
      fromAccountId,
      toAccountId,
      amount,
      auth.workspaceId,
      { createdByUserId: auth.userId, description: notes }
    );

    return successResponse({ fromAccountId, toAccountId, amount, transactionId }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof ServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error transferring between accounts', error);
    return errorResponse('Failed to transfer', 500);
  }
};
