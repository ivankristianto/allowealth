import type { APIRoute } from 'astro';
import { assetService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { AssetServiceError, ServiceErrorCode } from '@/services/service-errors';
import { getCacheManager, CacheTags } from '@/lib/cache';

/**
 * POST /api/assets/:id/reopen
 * Reopen a closed asset account (admin only)
 */
export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Asset ID is required', 400);
    }

    // Admin-only permission check
    if (auth.role !== 'admin') {
      return errorResponse(
        'Only workspace admins can reopen accounts',
        403,
        ServiceErrorCode.INSUFFICIENT_PERMISSIONS
      );
    }

    const asset = await assetService.reopen(id, auth.workspaceId);

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
        `Failed to invalidate cache after asset reopen [workspaceId=${auth.workspaceId}, assetId=${id}]`,
        cacheError
      );
    }

    return successResponse({ asset, message: 'Account reopened successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof AssetServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error reopening asset', error);
    return errorResponse('Failed to reopen asset', 500);
  }
};
