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
const createAssetSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(['bank_account', 'mutual_fund', 'bond', 'crypto', 'stock', 'other']),
  balance: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Balance must be a valid number'),
  currency: z.enum(['IDR', 'USD']),
});

/**
 * GET /api/assets
 * List all assets for the user
 */
export const GET: APIRoute = async ({ request, url }) => {
  try {
    const userId = await requireAuth({ request, url } as any);

    const type = url.searchParams.get('type');
    const currency = url.searchParams.get('currency');

    const filters: any = {};
    if (
      type &&
      ['bank_account', 'mutual_fund', 'bond', 'crypto', 'stock', 'other'].includes(type)
    ) {
      filters.type = type;
    }
    if (currency && (currency === 'IDR' || currency === 'USD')) {
      filters.currency = currency;
    }

    const assets = await assetService.findAll(userId, filters);

    return successResponse(assets);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error fetching assets', error);
    return errorResponse('Failed to fetch assets', 500);
  }
};

/**
 * POST /api/assets
 * Create a new asset
 */
export const POST: APIRoute = async ({ request, url }) => {
  try {
    const userId = await requireAuth({ request, url } as any);

    const validation = await validateBody(request, createAssetSchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const asset = await assetService.create({
      user_id: userId,
      name: validation.data.name,
      type: validation.data.type,
      balance: validation.data.balance,
      currency: validation.data.currency,
    });

    return successResponse(asset, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error creating asset', error);
    return errorResponse('Failed to create asset', 500);
  }
};
