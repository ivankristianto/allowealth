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
import { ASSET_TYPE_LABELS, type AssetType } from '@/lib/types/asset';

// Valid asset types derived from the canonical source of truth
const VALID_ASSET_TYPES = Object.keys(ASSET_TYPE_LABELS) as [AssetType, ...AssetType[]];

// Validation schemas using the shared asset types
const createAssetSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(VALID_ASSET_TYPES),
  balance: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Balance must be a valid number'),
  currency: z.enum(['IDR', 'USD']),
});

/**
 * GET /api/assets
 * List all assets for the user
 */
export const GET: APIRoute = async (context) => {
  try {
    const userId = getAuthenticatedUser(context);
    const { url } = context;

    const type = url.searchParams.get('type');
    const currency = url.searchParams.get('currency');

    const filters: any = {};
    if (type && VALID_ASSET_TYPES.includes(type as AssetType)) {
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
export const POST: APIRoute = async (context) => {
  try {
    const userId = getAuthenticatedUser(context);

    const validation = await validateBody(context.request, createAssetSchema);

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
