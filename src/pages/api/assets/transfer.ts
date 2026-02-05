import type { APIRoute } from 'astro';
import { assetService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { z } from 'zod';

const transferSchema = z
  .object({
    fromAssetId: z.string().min(1),
    toAssetId: z.string().min(1),
    amount: z.string().refine((v) => parseFloat(v) > 0, 'Amount must be positive'),
    notes: z.string().max(500).optional(),
  })
  .refine((d) => d.fromAssetId !== d.toAssetId, {
    message: 'Source and destination must be different',
    path: ['toAssetId'],
  });

/**
 * POST /api/assets/transfer
 * Transfer balance between two assets
 */
export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const validation = await validateBody(context.request, transferSchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const { fromAssetId, toAssetId, amount, notes } = validation.data;
    const result = await assetService.transfer(
      fromAssetId,
      toAssetId,
      amount,
      notes,
      auth.workspaceId
    );

    return successResponse(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Unauthorized') return errorResponse('Unauthorized', 401);
      if (error.message === 'Asset not found') return errorResponse('Asset not found', 404);
      if (error.message === 'Insufficient balance')
        return errorResponse('Insufficient balance', 400);
      if (error.message.includes('currency')) return errorResponse(error.message, 400);
    }
    logError('Error transferring between assets', error);
    return errorResponse('Failed to transfer', 500);
  }
};
