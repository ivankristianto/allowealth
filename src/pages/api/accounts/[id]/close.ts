import type { APIRoute } from 'astro';
import { accountService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { AccountServiceError } from '@/services/service-errors';
import { getCacheManager, CacheTags } from '@/lib/cache';

/**
 * POST /api/accounts/:id/close
 * Close an account account (requires zero balance)
 */
export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Account ID is required', 400);
    }

    const account = await accountService.close(id, auth.workspaceId, auth.userId);

    // Invalidate cache
    try {
      const cache = getCacheManager();
      await cache.invalidateByTags([
        CacheTags.workspace(auth.workspaceId),
        CacheTags.ACCOUNTS,
        CacheTags.LAYOUT,
      ]);
    } catch (cacheError) {
      logError(
        `Failed to invalidate cache after account close [workspaceId=${auth.workspaceId}, accountId=${id}]`,
        cacheError
      );
    }

    return successResponse({ account, message: 'Account deactivated successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof AccountServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error closing account', error);
    return errorResponse('Failed to deactivate account', 500);
  }
};
