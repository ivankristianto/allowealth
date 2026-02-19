import type { APIRoute } from 'astro';
import { z } from 'zod';
import { accountService, accountCategoryService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { DEFAULT_ACCOUNT_CATEGORIES } from '@/lib/constants';
import { getCacheManager, CacheTags } from '@/lib/cache';
import { AccountServiceError } from '@/services/service-errors';

// Validation schemas
const LEGACY_TYPE_BY_NAME = new Map(
  DEFAULT_ACCOUNT_CATEGORIES.map((category) => [category.name, category.legacyType])
);
const LEGACY_NAME_BY_TYPE = new Map(
  DEFAULT_ACCOUNT_CATEGORIES.map((category) => [category.legacyType, category.name])
);

const updateAccountSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  categoryId: z.string().min(1).optional(),
  type: z
    .enum([
      'cash',
      'bank_account',
      'e_wallet',
      'mutual_fund',
      'bond',
      'crypto',
      'stock',
      'other',
      'credit_card',
      'loan',
    ])
    .optional(),
  currency: z.enum(['IDR', 'USD']).optional(),
});

/**
 * GET /api/accounts/:id
 * Get a single account by ID
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Account ID is required', 400);
    }

    const account = await accountService.findById(id, auth.workspaceId);

    if (!account) {
      return errorResponse('Account not found', 404);
    }

    return successResponse(account);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error fetching account', error);
    return errorResponse('Failed to fetch account', 500);
  }
};

/**
 * PUT /api/accounts/:id
 * Update an account
 */
export const PUT: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Account ID is required', 400);
    }

    const validation = await validateBody(context.request, updateAccountSchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    let resolvedType = validation.data.type;
    let resolvedCategoryId: string | null | undefined = undefined;

    if (validation.data.categoryId) {
      const category = await accountCategoryService.findById(
        validation.data.categoryId,
        auth.workspaceId
      );
      if (!category) {
        return errorResponse('Category not found', 404);
      }
      resolvedCategoryId = category.id;
      resolvedType = category.is_system
        ? LEGACY_TYPE_BY_NAME.get(category.name) || 'other'
        : 'other';
    } else if (validation.data.type) {
      const categoryName = LEGACY_NAME_BY_TYPE.get(validation.data.type);
      if (categoryName) {
        const category = await accountCategoryService.findByName(categoryName, auth.workspaceId);
        resolvedCategoryId = category?.id || null;
      }
    }

    const account = await accountService.update(id, auth.workspaceId, {
      name: validation.data.name,
      currency: validation.data.currency,
      type: resolvedType,
      category_id: resolvedCategoryId,
    });

    if (!account) {
      return errorResponse('Account not found', 404);
    }

    // Invalidate layout cache since accounts changed (best-effort)
    try {
      const cache = getCacheManager();
      await cache.invalidateByTags([
        CacheTags.workspace(auth.workspaceId),
        CacheTags.ACCOUNTS,
        CacheTags.LAYOUT,
      ]);
    } catch (cacheError) {
      logError(
        `Failed to invalidate cache after account update [workspaceId=${auth.workspaceId}, accountId=${id}]`,
        cacheError
      );
    }

    return successResponse(account);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof AccountServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error updating account', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(message, 500);
  }
};

/**
 * DELETE /api/accounts/:id
 * Close an account account (DELETE alias for backwards compatibility)
 */
export const DELETE: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Account ID is required', 400);
    }

    await accountService.close(id, auth.workspaceId, auth.userId);

    // Invalidate layout cache since accounts changed (best-effort)
    try {
      const cache = getCacheManager();
      await cache.invalidateByTags([
        CacheTags.workspace(auth.workspaceId),
        CacheTags.ACCOUNTS,
        CacheTags.LAYOUT,
      ]);
    } catch (cacheError) {
      logError(
        `Failed to invalidate cache after account delete [workspaceId=${auth.workspaceId}, accountId=${id}]`,
        cacheError
      );
    }

    return successResponse({ message: 'Account deactivated successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof AccountServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error closing account', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(message, 500);
  }
};
