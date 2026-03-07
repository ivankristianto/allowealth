import type { APIRoute } from 'astro';
import { recurringForecastService, RecurringServiceError, ServiceError } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import type { ForecastFilters } from '@/lib/types/recurring';

function parseTypeFilter(value: string | null): ForecastFilters['type'] {
  if (value === 'income' || value === 'expense') return value;
  return undefined;
}

function parseStatusFilter(value: string | null): ForecastFilters['status'] {
  if (value === 'active' || value === 'paused' || value === 'all') return value;
  return 'active';
}

function parseAccountIds(value: string | null): string[] | undefined {
  if (!value) return undefined;
  const ids = value
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  return ids.length > 0 ? ids : undefined;
}

export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const perf = context.locals.perf;

    const type = parseTypeFilter(context.url.searchParams.get('type'));
    const status = parseStatusFilter(context.url.searchParams.get('status'));
    const accountIds = parseAccountIds(context.url.searchParams.get('accounts'));

    const filters: ForecastFilters = {
      ...(type && { type }),
      ...(status && { status }),
      ...(accountIds && { accountIds }),
    };

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
