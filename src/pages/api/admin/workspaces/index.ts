import type { APIRoute } from 'astro';
import { superAdminService } from '@/services';
import { SuperAdminServiceError } from '@/services/service-errors';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/logger';

/**
 * GET /api/admin/workspaces
 *
 * Lists all workspaces with aggregated counts (members, transactions,
 * accounts, budgets, categories). Supports filtering, sorting, and pagination.
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
    const rawStatus = url.searchParams.get('status');
    const rawSortBy = url.searchParams.get('sortBy');
    const rawSortOrder = url.searchParams.get('sortOrder');
    const rawLimit = Number(url.searchParams.get('limit') ?? '50');
    const rawOffset = Number(url.searchParams.get('offset') ?? '0');

    const validStatuses = new Set(['active', 'inactive'] as const);
    const validSortBys = new Set(['name', 'created_at', 'member_count'] as const);
    const validSortOrders = new Set(['asc', 'desc'] as const);

    const status = validStatuses.has(rawStatus as 'active' | 'inactive')
      ? (rawStatus as 'active' | 'inactive')
      : undefined;
    const sortBy = validSortBys.has(rawSortBy as 'name' | 'created_at' | 'member_count')
      ? (rawSortBy as 'name' | 'created_at' | 'member_count')
      : ('created_at' as const);
    const sortOrder = validSortOrders.has(rawSortOrder as 'asc' | 'desc')
      ? (rawSortOrder as 'asc' | 'desc')
      : ('desc' as const);

    const params = {
      search: url.searchParams.get('search') || undefined,
      status,
      sortBy,
      sortOrder,
      limit: Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 50,
      offset: Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0,
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
