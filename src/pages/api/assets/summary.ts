import type { APIRoute } from 'astro';
import { assetService } from '@/services';
import { successResponse, errorResponse, requireAuth } from '@/lib/api-utils';
import { logError } from '@/lib/utils';

/**
 * GET /api/assets/summary
 * Get asset totals by currency and type
 */
export const GET: APIRoute = async ({ request, url }) => {
  try {
    const userId = requireAuth({ request, url } as any);

    const [totalByCurrency, totalByType] = await Promise.all([
      assetService.getTotalByCurrency(userId),
      assetService.getTotalByType(userId),
    ]);

    return successResponse({
      by_currency: totalByCurrency,
      by_type: totalByType,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error fetching asset summary', error);
    return errorResponse('Failed to fetch asset summary', 500);
  }
};
