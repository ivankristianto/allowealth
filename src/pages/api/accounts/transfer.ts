import type { APIRoute } from 'astro';
import { accountService, transactionService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { ServiceErrorCode } from '@/services/service-errors';
import { check, forward, maxLength, minLength, object, optional, pipe, string } from 'valibot';
import { isValidCurrency } from '@/lib/constants/currency';

const transferSchema = pipe(
  object({
    fromAccountId: pipe(string(), minLength(1)),
    toAccountId: pipe(string(), minLength(1)),
    amount: pipe(
      string(),
      check(
        (value) => /^\d+(\.\d+)?$/.test(value.trim()) && Number.parseFloat(value) > 0,
        'Amount must be a valid positive number'
      )
    ),
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
 * Create a transfer transaction between two accounts
 */
export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const validation = await validateBody(context.request, transferSchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const { fromAccountId, toAccountId, amount, notes } = validation.data;
    const { fromAccount, toAccount } = await accountService.transfer(
      fromAccountId,
      toAccountId,
      amount,
      auth.workspaceId
    );

    if (!fromAccount || !toAccount) {
      return errorResponse('Account not found', 404);
    }

    if (!isValidCurrency(fromAccount.currency)) {
      return errorResponse(`Invalid account currency: ${fromAccount.currency}`, 400);
    }

    const transaction = await transactionService.create({
      workspace_id: auth.workspaceId,
      created_by_user_id: auth.userId,
      type: 'transfer',
      amount,
      currency: fromAccount.currency,
      account_id: fromAccountId,
      to_account_id: toAccountId,
      transaction_date: new Date(),
      description: notes,
    });

    return successResponse(
      {
        fromAccountId,
        toAccountId,
        amount,
        transactionId: transaction?.id ?? null,
      },
      201
    );
  } catch (error) {
    const serviceCode =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code: unknown }).code)
        : null;

    if (error instanceof Error) {
      if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401);
      if (error.message === 'Account not found') return errorResponse('Account not found', 404);
      if (error.message.includes('currency')) return errorResponse(error.message, 400);
      if (error.message.includes('Cannot transfer')) return errorResponse(error.message, 400);
      if (error.message.includes('Transfer amount must be positive')) {
        return errorResponse(error.message, 400);
      }
      if (serviceCode === ServiceErrorCode.ACCOUNT_CLOSED) {
        return errorResponse(error.message, 400, ServiceErrorCode.ACCOUNT_CLOSED);
      }
      if (serviceCode === ServiceErrorCode.ACCOUNT_NOT_FOUND) {
        return errorResponse(error.message, 404, ServiceErrorCode.ACCOUNT_NOT_FOUND);
      }
    }
    logError('Error transferring between accounts', error);
    return errorResponse('Failed to transfer', 500);
  }
};
