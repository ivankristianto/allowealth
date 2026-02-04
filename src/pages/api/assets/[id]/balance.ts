import type { APIRoute } from 'astro';
import { z } from 'zod';
import { assetService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { logError } from '@/lib/utils';

// Validation schema
const updateBalanceSchema = z.object({
  balance: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Balance must be a valid number'),
  notes: z.string().optional(),
  recorded_at: z.string().datetime().optional(),
});

/**
 * POST /api/assets/:id/balance
 * Update asset balance (creates history entry)
 */
export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Asset ID is required', 400);
    }

    const validation = await validateBody(context.request, updateBalanceSchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const serviceInput = {
      ...validation.data,
      recorded_at: validation.data.recorded_at ? new Date(validation.data.recorded_at) : undefined,
    };
    const asset = await assetService.updateBalance(id, auth.workspaceId, serviceInput);

    if (!asset) {
      return errorResponse('Asset not found', 404);
    }

    return successResponse(asset);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error updating asset balance', error);
    return errorResponse('Failed to update asset balance', 500);
  }
};
