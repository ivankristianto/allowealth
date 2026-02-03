import type { APIRoute } from 'astro';
import { z } from 'zod';
import { assetService, assetCategoryService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { ASSET_TYPE_LABELS, type AssetType } from '@/lib/types/asset';
import { DEFAULT_ASSET_CATEGORIES } from '@/lib/constants';
import { invalidateWorkspaceLayoutCache } from '@/lib/cache/layout-cache';

// Valid asset types derived from the canonical source of truth
const VALID_ASSET_TYPES = Object.keys(ASSET_TYPE_LABELS) as [AssetType, ...AssetType[]];

const LEGACY_TYPE_BY_NAME = new Map(
  DEFAULT_ASSET_CATEGORIES.map((category) => [category.name, category.legacyType])
);
const LEGACY_NAME_BY_TYPE = new Map(
  DEFAULT_ASSET_CATEGORIES.map((category) => [category.legacyType, category.name])
);

// Validation schemas using the shared asset types
const createAssetSchema = z
  .object({
    name: z.string().min(1).max(255),
    categoryId: z.string().min(1).optional(),
    type: z.enum(VALID_ASSET_TYPES).optional(),
    balance: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Balance must be a valid number'),
    currency: z.enum(['IDR', 'USD']),
  })
  .refine((data) => data.categoryId || data.type, {
    message: 'Category or type is required',
    path: ['categoryId'],
  });

/**
 * GET /api/assets
 * List all assets for the user
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { url } = context;

    const type = url.searchParams.get('type');
    const categoryId = url.searchParams.get('categoryId');
    const currency = url.searchParams.get('currency');

    const filters: any = {};
    if (type && VALID_ASSET_TYPES.includes(type as AssetType)) {
      filters.type = type;
    }
    if (categoryId) {
      filters.category_id = categoryId;
    }
    if (currency && (currency === 'IDR' || currency === 'USD')) {
      filters.currency = currency;
    }

    const assets = await assetService.findAll(auth.workspaceId, filters);

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
    const auth = getAuthenticatedUser(context);

    const validation = await validateBody(context.request, createAssetSchema);

    if (isValidationError(validation)) {
      return errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    let resolvedType = validation.data.type;
    let resolvedCategoryId: string | null = null;

    if (validation.data.categoryId) {
      const category = await assetCategoryService.findById(
        validation.data.categoryId,
        auth.workspaceId
      );
      if (!category) {
        return errorResponse('Category not found', 404);
      }
      resolvedCategoryId = category.id;
      // Custom categories always map to 'other' type since they don't have legacy type mappings.
      // System categories use their defined legacy type from DEFAULT_ASSET_CATEGORIES.
      resolvedType = category.is_system
        ? LEGACY_TYPE_BY_NAME.get(category.name) || 'other'
        : 'other';
    } else if (validation.data.type) {
      const categoryName = LEGACY_NAME_BY_TYPE.get(validation.data.type);
      if (categoryName) {
        const category = await assetCategoryService.findByName(categoryName, auth.workspaceId);
        resolvedCategoryId = category?.id || null;
      }
    }

    if (!resolvedType) {
      return errorResponse('Asset type is required', 400);
    }

    const asset = await assetService.create({
      workspace_id: auth.workspaceId,
      created_by_user_id: auth.userId,
      name: validation.data.name,
      type: resolvedType,
      category_id: resolvedCategoryId,
      balance: validation.data.balance,
      currency: validation.data.currency,
    });

    // Invalidate layout cache since assets changed
    invalidateWorkspaceLayoutCache(auth.workspaceId);

    return successResponse(asset, 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error creating asset', error);
    return errorResponse('Failed to create asset', 500);
  }
};
