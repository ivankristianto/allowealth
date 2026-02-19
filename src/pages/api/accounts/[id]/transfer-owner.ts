import type { APIRoute } from 'astro';
import { z } from 'zod';
import { accountService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { AccountServiceError } from '@/services/service-errors';
import { getCacheManager, CacheTags } from '@/lib/cache';

const transferOwnerSchema = z.object({
  owner_user_id: z.string().min(1, 'Owner user ID is required'),
});

/**
 * PATCH /api/accounts/:id/transfer-owner
 * Transfer account ownership to another workspace member.
 * Admin only.
 */
export const PATCH: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Account ID is required', 400);
    }

    if (auth.role !== 'admin') {
      return errorResponse(
        'Only workspace admins can transfer account ownership',
        403,
        'ADMIN_REQUIRED'
      );
    }

    const validation = await validateBody(context.request, transferOwnerSchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    await accountService.transferOwnership(id, validation.data.owner_user_id, auth.workspaceId);

    // Invalidate layout cache (best-effort)
    try {
      const cache = getCacheManager();
      await cache.invalidateByTags([
        CacheTags.workspace(auth.workspaceId),
        CacheTags.ACCOUNTS,
        CacheTags.LAYOUT,
      ]);
    } catch (cacheError) {
      logError(
        `Failed to invalidate cache after ownership transfer [workspaceId=${auth.workspaceId}, accountId=${id}]`,
        cacheError
      );
    }

    return successResponse({ message: 'Ownership transferred successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof AccountServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error transferring account ownership', error);
    return errorResponse('Failed to transfer ownership', 500);
  }
};
