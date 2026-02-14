import type { APIRoute } from 'astro';
import { superAdminService } from '@/services';
import { SuperAdminServiceError } from '@/services/service-errors';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/logger';

/**
 * GET /api/admin/workspaces
 *
 * Lists all workspaces with aggregated counts (members, transactions,
 * assets, budgets, categories). Supports filtering, sorting, and pagination.
 * Super admin only.
 *
 * Query params:
 * - search: Filter by workspace name (partial match)
 * - status: Filter by status ('active' | 'inactive')
 * - sortBy: Sort field ('name' | 'created_at' | 'member_count'), default 'created_at'
 * - sortOrder: Sort direction ('asc' | 'desc'), default 'desc'
 * - limit: Page size (default 50, max 100)
 * - offset: Pagination offset (default 0)
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    if (auth.role !== 'super_admin') {
      return errorResponse('Super admin access required', 403);
    }

    const { url } = context;
    const params = {
      search: url.searchParams.get('search') || undefined,
      status: (url.searchParams.get('status') as 'active' | 'inactive') || undefined,
      sortBy:
        (url.searchParams.get('sortBy') as 'name' | 'created_at' | 'member_count') || 'created_at',
      sortOrder: (url.searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      limit: Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10), 1), 100),
      offset: Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0),
    };

    const result = await superAdminService.listAllWorkspaces(params);
    return successResponse(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    if (error instanceof SuperAdminServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    logError('Error listing workspaces', error);
    return errorResponse('Failed to list workspaces', 500);
  }
};
