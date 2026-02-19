import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { accountCategoryService, accountService } from '@/services';
import {
  successResponse,
  errorResponse,
  validateBody,
  getAuthenticatedUser,
  isValidationError,
} from '@/lib/api-utils';
import { updateAccountCategoryAPISchema } from '@/lib/validation';
import { logError } from '@/lib/utils';
import { ServiceError } from '@/services/service-errors';
import { createRenderHelper } from '@/lib/api/renderResponse';

// Import partial component for HTML rendering
import AccountCategoryTablePartial from '@/components/partials/AccountCategoryTablePartial.astro';

const toAccountCategoryResponse = (category: any, accountCount = 0) => ({
  id: category.id,
  name: category.name,
  description: category.description,
  isLiability: category.is_liability,
  isSystem: category.is_system,
  sortOrder: category.sort_order,
  createdAt: category.created_at,
  updatedAt: category.updated_at,
  accountCount,
});

/**
 * GET /api/account-categories/:id
 * Get a single account category by ID
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { id } = context.params;

    if (!id) {
      return errorResponse('Category ID is required', 400);
    }

    const category = await accountCategoryService.findById(id, auth.workspaceId);

    if (!category) {
      return errorResponse('Category not found', 404);
    }

    const counts = await accountService.countByCategory(auth.workspaceId);
    const accountCount = counts.find((row) => row.category_id === category.id)?.count || 0;

    return successResponse(toAccountCategoryResponse(category, accountCount));
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error fetching account category', error);
    return errorResponse('Failed to fetch account category', 500);
  }
};

/**
 * PUT /api/account-categories/:id
 * Update an account category
 * Supports ?_render=html for server-rendered HTML fragments
 */
export const PUT: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { id } = context.params;
    const render = createRenderHelper(context.url);

    if (!id) {
      return render.wantsHtml()
        ? render.error('Category ID is required', 400)
        : errorResponse('Category ID is required', 400);
    }

    const validation = await validateBody(context.request, updateAccountCategoryAPISchema);

    if (isValidationError(validation)) {
      return render.wantsHtml()
        ? render.error('Validation failed', 400)
        : errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const category = await accountCategoryService.update(id, auth.workspaceId, {
      name: validation.data.name,
      description: validation.data.description,
      is_liability: validation.data.isLiability,
    });

    // If HTML rendering requested, return updated table
    if (render.wantsHtml()) {
      const container = await AstroContainer.create();

      // Fetch all categories for updated table
      const allCategories = await accountCategoryService.findAll(auth.workspaceId);
      const counts = await accountService.countByCategory(auth.workspaceId);
      const countMap = new Map(counts.map((row) => [row.category_id, row.count]));

      // Get type filter from query params (default: account)
      const typeFilter =
        (context.url.searchParams.get('type') as 'account' | 'liability') || 'account';

      // Build category data for partial
      const categoryData = allCategories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        isLiability: cat.is_liability,
        isSystem: cat.is_system,
        sortOrder: cat.sort_order,
        accountCount: countMap.get(cat.id) || 0,
      }));

      const tableHtml = await container.renderToString(AccountCategoryTablePartial, {
        props: {
          categories: categoryData,
          typeFilter,
        },
      });

      return render.html(`<!-- PARTIAL:table -->\n${tableHtml}`);
    }

    return successResponse(toAccountCategoryResponse(category));
  } catch (error) {
    const render = createRenderHelper(context.url);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return render.wantsHtml()
        ? render.error('Unauthorized', 401)
        : errorResponse('Unauthorized', 401);
    }
    if (error instanceof ServiceError) {
      return render.wantsHtml()
        ? render.error(error.message, error.statusCode)
        : errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error updating account category', error);
    return render.wantsHtml()
      ? render.error('Failed to update account category', 500)
      : errorResponse('Failed to update account category', 500);
  }
};

/**
 * DELETE /api/account-categories/:id
 * Delete an account category
 * Supports ?_render=html for server-rendered HTML fragments
 */
export const DELETE: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { id } = context.params;
    const render = createRenderHelper(context.url);

    if (!id) {
      return render.wantsHtml()
        ? render.error('Category ID is required', 400)
        : errorResponse('Category ID is required', 400);
    }

    await accountCategoryService.delete(id, auth.workspaceId);

    // If HTML rendering requested, return updated table
    if (render.wantsHtml()) {
      const container = await AstroContainer.create();

      // Fetch all categories for updated table
      const allCategories = await accountCategoryService.findAll(auth.workspaceId);
      const counts = await accountService.countByCategory(auth.workspaceId);
      const countMap = new Map(counts.map((row) => [row.category_id, row.count]));

      // Get type filter from query params (default: account)
      const typeFilter =
        (context.url.searchParams.get('type') as 'account' | 'liability') || 'account';

      // Build category data for partial
      const categoryData = allCategories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        isLiability: cat.is_liability,
        isSystem: cat.is_system,
        sortOrder: cat.sort_order,
        accountCount: countMap.get(cat.id) || 0,
      }));

      const tableHtml = await container.renderToString(AccountCategoryTablePartial, {
        props: {
          categories: categoryData,
          typeFilter,
        },
      });

      return render.html(`<!-- PARTIAL:table -->\n${tableHtml}`);
    }

    return successResponse({ message: 'Category deleted successfully' });
  } catch (error) {
    const render = createRenderHelper(context.url);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return render.wantsHtml()
        ? render.error('Unauthorized', 401)
        : errorResponse('Unauthorized', 401);
    }
    if (error instanceof ServiceError) {
      return render.wantsHtml()
        ? render.error(error.message, error.statusCode)
        : errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error deleting account category', error);
    return render.wantsHtml()
      ? render.error('Failed to delete account category', 500)
      : errorResponse('Failed to delete account category', 500);
  }
};
