import type { APIRoute } from 'astro';
import { z } from 'zod';
import { assetService } from '@/services';
import { successResponse, errorResponse, validateBody, requireAuth } from '@/lib/api-utils';
import { logError } from '@/lib/utils';

// Validation schema
const updateBalanceSchema = z.object({
  balance: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Balance must be a valid number'),
  notes: z.string().optional(),
});

/**
 * POST /api/assets/:id/balance
 * Update asset balance (creates history entry)
 */
export const POST: APIRoute = async ({ params, request, url }) => {
  try {
    const userId = await requireAuth({ request, url } as any);
    const { id } = params;

    if (!id) {
      return errorResponse('Asset ID is required', 400);
    }

    const validation = await validateBody(request, updateBalanceSchema);

    if (!validation.success) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const asset = await assetService.updateBalance(id, userId, validation.data);

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
