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
import { createAccountCategoryAPISchema } from '@/lib/validation';
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
 * GET /api/account-categories
 * List all account categories for the user
 * Supports ?_render=html for server-rendered HTML fragments
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const { url } = context;

    const isLiabilityParam = url.searchParams.get('isLiability');
    const isSystemParam = url.searchParams.get('isSystem');

    const filters: { is_liability?: boolean; is_system?: boolean } = {};
    if (isLiabilityParam !== null) {
      filters.is_liability = isLiabilityParam === 'true';
    }
    if (isSystemParam !== null) {
      filters.is_system = isSystemParam === 'true';
    }

    const categories = await accountCategoryService.findAll(auth.workspaceId, filters);
    const counts = await accountService.countByCategory(auth.workspaceId);
    const countMap = new Map(counts.map((row) => [row.category_id, row.count]));

    // Check if HTML rendering is requested
    const render = createRenderHelper(url);

    if (render.wantsHtml()) {
      // Render HTML fragments using Astro Container API
      const container = await AstroContainer.create();

      // Get type filter from query params (default: account)
      const typeFilter = (url.searchParams.get('type') as 'account' | 'liability') || 'account';

      // Get the requested partial (_partial param: table, or all for future)
      const partial = url.searchParams.get('_partial') || 'table';

      // Build category data for partial
      const categoryData = categories.map((category) => ({
        id: category.id,
        name: category.name,
        description: category.description,
        isLiability: category.is_liability,
        isSystem: category.is_system,
        sortOrder: category.sort_order,
        accountCount: countMap.get(category.id) || 0,
      }));

      const htmlParts: string[] = [];

      // Render table partial
      if (partial === 'all' || partial === 'table') {
        const tableHtml = await container.renderToString(AccountCategoryTablePartial, {
          props: {
            categories: categoryData,
            typeFilter,
          },
        });
        htmlParts.push(`<!-- PARTIAL:table -->\n${tableHtml}`);
      }

      return render.html(htmlParts.join('\n'));
    }

    // Default: Return JSON response
    return successResponse(
      categories.map((category) =>
        toAccountCategoryResponse(category, countMap.get(category.id) || 0)
      )
    );
  } catch (error) {
    const render = createRenderHelper(context.url);

    if (error instanceof Error && error.message === 'Unauthorized') {
      return render.wantsHtml()
        ? render.error('Unauthorized', 401)
        : errorResponse('Unauthorized', 401);
    }
    logError('Error fetching account categories', error);
    return render.wantsHtml()
      ? render.error('Failed to fetch account categories', 500)
      : errorResponse('Failed to fetch account categories', 500);
  }
};

/**
 * POST /api/account-categories
 * Create a new account category
 * Supports ?_render=html for server-rendered HTML fragments
 */
export const POST: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const render = createRenderHelper(context.url);

    const validation = await validateBody(context.request, createAccountCategoryAPISchema);

    if (isValidationError(validation)) {
      return render.wantsHtml()
        ? render.error('Validation failed', 400)
        : errorResponse('Validation failed', 400, 'VALIDATION_ERROR', validation.error.issues);
    }

    const category = await accountCategoryService.create({
      workspace_id: auth.workspaceId,
      created_by_user_id: auth.userId,
      name: validation.data.name,
      description: validation.data.description,
      is_liability: validation.data.isLiability,
      is_system: false,
      sort_order: 0,
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

    return successResponse(toAccountCategoryResponse(category), 201);
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
    logError('Error creating account category', error);
    return render.wantsHtml()
      ? render.error('Failed to create account category', 500)
      : errorResponse('Failed to create account category', 500);
  }
};
