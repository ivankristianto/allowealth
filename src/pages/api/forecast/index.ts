import type { APIRoute } from 'astro';
import { getForecastRealityCheckData } from '@/lib/forecast/server';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';

/**
 * GET /api/forecast
 * Build and return the saved-assumption forecast reality-check view.
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const result = await getForecastRealityCheckData(auth.workspaceId);
    return successResponse(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error calculating forecast', error);
    return errorResponse('Failed to calculate forecast', 500);
  }
};
