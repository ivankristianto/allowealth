import type { APIRoute } from 'astro';
import { recurringForecastService, RecurringServiceError, ServiceError } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { buildForecastFilters } from '@/lib/utils/recurring-forecast-filters';

export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const perf = context.locals.perf;

    const filters = buildForecastFilters(context.url.searchParams);

    const result = await recurringForecastService.getForecast(auth.workspaceId, filters, 12, perf);

    return successResponse(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }

    if (error instanceof RecurringServiceError || error instanceof ServiceError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }

    return errorResponse('Failed to fetch recurring forecast', 500);
  }
};
