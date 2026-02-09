import type { APIRoute } from 'astro';
import { assetService } from '@/services';
import {
  successResponse,
  errorResponse,
  getAuthenticatedUser,
  getQueryParams,
} from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { ASSET_TYPE_LABELS, type AssetType, type Currency } from '@/lib/types/asset';

/**
 * GET /api/assets/closed
 * Get all closed assets for a workspace
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const params = getQueryParams(new URL(context.request.url));

    const validTypes = Object.keys(ASSET_TYPE_LABELS);
    const validCurrencies = ['IDR', 'USD'];

    const filters: { type?: AssetType; currency?: Currency } = {};
    if (params.type && validTypes.includes(params.type)) filters.type = params.type as AssetType;
    if (params.currency && validCurrencies.includes(params.currency))
      filters.currency = params.currency as Currency;

    const assets = await assetService.findAllClosed(auth.workspaceId, filters);

    return successResponse(assets);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error fetching closed assets', error);
    return errorResponse('Failed to fetch closed assets', 500);
  }
};
