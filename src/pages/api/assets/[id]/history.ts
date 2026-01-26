import type { APIRoute } from 'astro';
import { assetService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';

/**
 * GET /api/assets/:id/history
 * Get asset balance history
 */
export const GET: APIRoute = async (context) => {
  try {
    const userId = getAuthenticatedUser(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Asset ID is required', 400);
    }

    const history = await assetService.getHistory(id, userId);

    return successResponse(history);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof Error && error.message === 'Asset not found') {
      return errorResponse('Asset not found', 404);
    }
    logError('Error fetching asset history', error);
    return errorResponse('Failed to fetch asset history', 500);
  }
};
