import type { APIRoute } from 'astro';
import { getAuthenticatedUser } from '@/lib/api-utils';
import { errorResponse, successResponse } from '@/lib/api-utils';
import { diagnosticsService } from '@/services';
import { logError } from '@/lib/logger';

/**
 * GET /api/admin/diagnostics
 * Get system diagnostics information (super_admin only)
 *
 * Returns runtime, database, cache, environment, and configuration data.
 * All sensitive data is sanitized/masked.
 *
 * Requires super_admin role.
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    // Require super_admin role
    if (auth.role !== 'super_admin') {
      return errorResponse('Super admin access required', 403, 'SUPER_ADMIN_REQUIRED');
    }

    // Fetch diagnostics data
    const diagnostics = await diagnosticsService.getDiagnostics();

    return successResponse(diagnostics);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }

    // Drizzle messages carry SQL and params, so even super admins get only the error class.
    const errorId = logError('Diagnostics API error', error);
    return errorResponse('Failed to fetch diagnostics', 500, 'DIAGNOSTICS_ERROR', {
      errorId,
      errorName: error instanceof Error ? error.name : typeof error,
    });
  }
};
