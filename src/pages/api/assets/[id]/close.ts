import type { APIRoute } from 'astro';
import { assetService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { AssetServiceError } from '@/services/service-errors';
import { getCacheManager, CacheTags } from '@/lib/cache';

/**
 * POST /api/assets/:id/close
 * Close an asset account (requires zero balance)
 */
export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Asset ID is required', 400);
    }

    const asset = await assetService.close(id, auth.workspaceId, auth.userId);

    // Invalidate cache
    try {
      const cache = getCacheManager();
      await cache.invalidateByTags([
        CacheTags.workspace(auth.workspaceId),
        CacheTags.ASSETS,
        CacheTags.LAYOUT,
      ]);
    } catch (cacheError) {
      logError(
        `Failed to invalidate cache after asset close [workspaceId=${auth.workspaceId}, assetId=${id}]`,
        cacheError
      );
    }

    return successResponse({ asset, message: 'Account deactivated successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof AssetServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error closing asset', error);
    return errorResponse('Failed to deactivate asset', 500);
  }
};
