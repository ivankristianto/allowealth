import type { APIRoute } from 'astro';
import { getAuthenticatedUser } from '@/lib/api-utils';
import { errorResponse, successResponse } from '@/lib/api-utils';
import { diagnosticsService } from '@/services';

/**
 * GET /api/admin/diagnostics
 * Get system diagnostics information (admin-only)
 *
 * Returns runtime, database, cache, environment, and configuration data.
 * All sensitive data is sanitized/masked.
 *
 * Requires admin role.
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);

    // Require admin role
    if (auth.role !== 'admin') {
      return errorResponse('Admin access required', 403, 'ADMIN_REQUIRED');
    }

    // Fetch diagnostics data
    const diagnostics = await diagnosticsService.getDiagnostics();

    return successResponse(diagnostics);
  } catch (error) {
    console.error('Diagnostics API error:', error);

    // Handle authentication errors
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }

    return errorResponse('Failed to fetch diagnostics', 500, 'DIAGNOSTICS_ERROR', {
      message: error instanceof Error ? error.message : String(error),
    });
  }
};
