import type { APIRoute } from 'astro';
import { z } from 'zod';
import { assetService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  requireAuth,
  isValidationError,
} from '@/lib/api-utils';
import { logError } from '@/lib/utils';

// Validation schemas
const updateAssetSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  type: z.enum(['bank_account', 'mutual_fund', 'bond', 'crypto', 'stock', 'other']).optional(),
  currency: z.enum(['IDR', 'USD']).optional(),
});

/**
 * GET /api/assets/:id
 * Get a single asset by ID
 */
export const GET: APIRoute = async ({ params, request, url }) => {
  try {
    const userId = await requireAuth({ request, url } as any);
    const { id } = params;

    if (!id) {
      return errorResponse('Asset ID is required', 400);
    }

    const asset = await assetService.findById(id, userId);

    if (!asset) {
      return errorResponse('Asset not found', 404);
    }

    return successResponse(asset);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error fetching asset', error);
    return errorResponse('Failed to fetch asset', 500);
  }
};

/**
 * PUT /api/assets/:id
 * Update an asset
 */
export const PUT: APIRoute = async ({ params, request, url }) => {
  try {
    const userId = await requireAuth({ request, url } as any);
    const { id } = params;

    if (!id) {
      return errorResponse('Asset ID is required', 400);
    }

    const validation = await validateBody(request, updateAssetSchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const asset = await assetService.update(id, userId, validation.data);

    if (!asset) {
      return errorResponse('Asset not found', 404);
    }

    return successResponse(asset);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error updating asset', error);
    return errorResponse('Failed to update asset', 500);
  }
};

/**
 * DELETE /api/assets/:id
 * Soft delete an asset
 */
export const DELETE: APIRoute = async ({ params, request, url }) => {
  try {
    const userId = await requireAuth({ request, url } as any);
    const { id } = params;

    if (!id) {
      return errorResponse('Asset ID is required', 400);
    }

    await assetService.delete(id, userId);

    return successResponse({ message: 'Asset deleted successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error deleting asset', error);
    return errorResponse('Failed to delete asset', 500);
  }
};
