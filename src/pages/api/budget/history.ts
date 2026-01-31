import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { budgetService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { createRenderHelper } from '@/lib/api/renderResponse';

// Import partial component for HTML rendering
import BudgetHistoryTablePartial from '@/components/partials/BudgetHistoryTablePartial.astro';

/**
 * GET /api/budget/history
 * Get budget history for multiple months
 * Query params:
 *   - currency: 'IDR' | 'USD' (default: 'IDR')
 *   - months: number (default: 12, max: 24)
 *   - year: number (optional, filters to specific year)
 *   - _render: 'html' | 'json' (default: 'json')
 *   - _partial: 'table' | 'all' (default: 'table')
 */
export const GET: APIRoute = async (context) => {
  const { url } = context;
  const render = createRenderHelper(url);

  try {
    const auth = getAuthenticatedUser(context);

    const currency = (url.searchParams.get('currency') as 'IDR' | 'USD') || 'IDR';
    const monthsParam = url.searchParams.get('months');
    const yearParam = url.searchParams.get('year');

    // Default to 24 months to get enough history for year filtering
    const months = monthsParam ? parseInt(monthsParam, 10) : 24;

    if (currency !== 'IDR' && currency !== 'USD') {
      return render.wantsHtml()
        ? render.error('Invalid currency parameter', 400)
        : errorResponse('Invalid currency parameter', 400);
    }

    if (isNaN(months) || months < 1 || months > 24) {
      return render.wantsHtml()
        ? render.error('Invalid months parameter (must be 1-24)', 400)
        : errorResponse('Invalid months parameter (must be 1-24)', 400);
    }

    // Get full history
    let history = await budgetService.getBudgetHistory(auth.workspaceId, currency, months);

    // Filter by year if specified
    if (yearParam) {
      const year = parseInt(yearParam, 10);
      if (isNaN(year) || year < 2000 || year > 2100) {
        return render.wantsHtml()
          ? render.error('Invalid year parameter', 400)
          : errorResponse('Invalid year parameter', 400);
      }
      history = history.filter((h) => h.year === year);
    }

    // Current month info for highlighting
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Check if HTML rendering is requested
    if (render.wantsHtml()) {
      // Render HTML fragments using Astro Container API
      const container = await AstroContainer.create();

      const tableHtml = await container.renderToString(BudgetHistoryTablePartial, {
        props: {
          history,
          currency,
          currentMonth,
          currentYear,
        },
      });

      return render.html(`<!-- PARTIAL:table -->\n${tableHtml}`);
    }

    return successResponse(history);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return render.wantsHtml()
        ? render.error('Unauthorized', 401)
        : errorResponse('Unauthorized', 401);
    }
    logError('Error fetching budget history', error);
    return render.wantsHtml()
      ? render.error('Failed to fetch budget history', 500)
      : errorResponse('Failed to fetch budget history', 500);
  }
};
