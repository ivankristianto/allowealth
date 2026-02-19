import type { APIRoute } from 'astro';
import { accountService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { AccountServiceError, ServiceErrorCode } from '@/services/service-errors';
import { getCacheManager, CacheTags } from '@/lib/cache';

/**
 * POST /api/accounts/:id/reopen
 * Reopen a closed account account (admin only)
 */
export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Account ID is required', 400);
    }

    // Admin-only permission check
    if (auth.role !== 'admin') {
      return errorResponse(
        'Only workspace admins can reopen accounts',
        403,
        ServiceErrorCode.INSUFFICIENT_PERMISSIONS
      );
    }

    const account = await accountService.reopen(id, auth.workspaceId);

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
        `Failed to invalidate cache after account reopen [workspaceId=${auth.workspaceId}, accountId=${id}]`,
        cacheError
      );
    }

    return successResponse({ account, message: 'Account reopened successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof AccountServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error reopening account', error);
    return errorResponse('Failed to reopen account', 500);
  }
};
