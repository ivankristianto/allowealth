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
import { z } from 'zod';

const transferSchema = z
  .object({
    fromAccountId: z.string().min(1),
    toAccountId: z.string().min(1),
    amount: z
      .string()
      .refine(
        (v) => /^\d+(\.\d+)?$/.test(v.trim()) && parseFloat(v) > 0,
        'Amount must be a valid positive number'
      ),
    notes: z.string().max(500).optional(),
  })
  .refine((d) => d.fromAccountId !== d.toAccountId, {
    message: 'Source and destination must be different',
    path: ['toAccountId'],
  });

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
