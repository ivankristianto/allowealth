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
import { ACCOUNT_TYPE_LABELS, type AccountType } from '@/lib/types/account';
import { DEFAULT_ACCOUNT_CATEGORIES } from '@/lib/constants';
import { getCacheManager, CacheTags } from '@/lib/cache';

// Valid account types derived from the canonical source of truth
const VALID_ACCOUNT_TYPES = Object.keys(ACCOUNT_TYPE_LABELS) as [AccountType, ...AccountType[]];

const LEGACY_TYPE_BY_NAME = new Map(
  DEFAULT_ACCOUNT_CATEGORIES.map((category) => [category.name, category.legacyType])
);
const LEGACY_NAME_BY_TYPE = new Map(
  DEFAULT_ACCOUNT_CATEGORIES.map((category) => [category.legacyType, category.name])
);

// Validation schemas using the shared account types
const createAccountSchema = z
  .object({
    name: z.string().min(1).max(255),
    categoryId: z.string().min(1).optional(),
    type: z.enum(VALID_ACCOUNT_TYPES).optional(),
    balance: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Balance must be a valid number'),
    currency: z.enum(['IDR', 'USD']),
  })
  .refine((data) => data.categoryId || data.type, {
    message: 'Category or type is required',
    path: ['categoryId'],
  });

/**
 * GET /api/accounts
 * List all accounts for the user
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const perf = context.locals.perf;
    const { url } = context;

    const type = url.searchParams.get('type');
    const categoryId = url.searchParams.get('categoryId');
    const currency = url.searchParams.get('currency');
    const owner = url.searchParams.get('owner');

    const filters: any = {};
    if (type && VALID_ACCOUNT_TYPES.includes(type as AccountType)) {
      filters.type = type;
    }
    if (categoryId) {
      filters.category_id = categoryId;
    }
    if (currency && (currency === 'IDR' || currency === 'USD')) {
      filters.currency = currency;
    }
    if (owner) {
      if (owner !== auth.userId && auth.role !== 'admin') {
        return errorResponse(
          'Only admins can filter accounts by another owner',
          403,
          'INSUFFICIENT_PERMISSIONS'
        );
      }
      filters.owner_user_id = owner;
    }

    const accounts = await accountService.findAll(auth.workspaceId, filters, perf);

    return successResponse(accounts);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error fetching accounts', error);
    return errorResponse('Failed to fetch accounts', 500);
  }
};

/**
 * POST /api/accounts
 * Create a new account
 */
export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    const validation = await validateBody(context.request, createAccountSchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    let resolvedType = validation.data.type;
    let resolvedCategoryId: string | null = null;

    if (validation.data.categoryId) {
      const category = await accountCategoryService.findById(
        validation.data.categoryId,
        auth.workspaceId
      );
      if (!category) {
        return errorResponse('Category not found', 404);
      }
      resolvedCategoryId = category.id;
      // Custom categories always map to 'other' type since they don't have legacy type mappings.
      // System categories use their defined legacy type from DEFAULT_ACCOUNT_CATEGORIES.
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

    if (!resolvedType) {
      return errorResponse('Account type is required', 400);
    }

    const account = await accountService.create({
      workspace_id: auth.workspaceId,
      created_by_user_id: auth.userId,
      name: validation.data.name,
      type: resolvedType,
      category_id: resolvedCategoryId,
      balance: validation.data.balance,
      currency: validation.data.currency,
    });

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
        `Failed to invalidate cache after account create [workspaceId=${auth.workspaceId}, accountId=${account.id}]`,
        cacheError
      );
    }

    return successResponse(account, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error creating account', error);
    return errorResponse('Failed to create account', 500);
  }
};
