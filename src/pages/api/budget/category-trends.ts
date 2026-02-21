import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { budgetService, workspaceMetaService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { createRenderHelper } from '@/lib/api/renderResponse';
import { isValidCurrency } from '@/lib/constants/currency';

import BudgetCategoryTrendsPartial from '@/components/partials/BudgetCategoryTrendsPartial.astro';

/**
 * GET /api/budget/category-trends
 * Get category trend data (categories × months matrix)
 * Query params:
 *   - currency: Currency (default: workspace primary)
 *   - months: 3 | 6 | 12 (default: 6)
 *   - _render: 'html' | 'json' (default: 'json')
 */
export const GET: APIRoute = async (context) => {
  const { url } = context;
  const render = createRenderHelper(url);

  try {
    const auth = getAuthenticatedUser(context);
    const perf = context.locals.perf;

    const currencyParam = url.searchParams.get('currency');
    const monthsParam = url.searchParams.get('months');
    const months = monthsParam ? parseInt(monthsParam, 10) : 6;

    const workspaceCurrencyConfig = await workspaceMetaService.getWorkspaceCurrencies(
      auth.workspaceId
    );
    const allowedCurrencies = [
      workspaceCurrencyConfig.primary,
      ...(workspaceCurrencyConfig.secondary ? [workspaceCurrencyConfig.secondary] : []),
    ];
    const currency =
      currencyParam && isValidCurrency(currencyParam) && allowedCurrencies.includes(currencyParam)
        ? currencyParam
        : workspaceCurrencyConfig.primary;

    if (
      currencyParam &&
      (!isValidCurrency(currencyParam) || !allowedCurrencies.includes(currencyParam))
    ) {
      return render.wantsHtml()
        ? render.error('Invalid currency parameter', 400)
        : errorResponse('Invalid currency parameter', 400);
    }

    const validMonths = [3, 6, 12];
    if (!validMonths.includes(months)) {
      return render.wantsHtml()
        ? render.error('Invalid months parameter (must be 3, 6, or 12)', 400)
        : errorResponse('Invalid months parameter (must be 3, 6, or 12)', 400);
    }

    const trends = await budgetService.getCategoryTrends(auth.workspaceId, currency, months, perf);

    if (render.wantsHtml()) {
      const container = await AstroContainer.create();
      const html = await container.renderToString(BudgetCategoryTrendsPartial, {
        props: { trends, currency },
      });
      return render.html(`<!-- PARTIAL:table -->\n${html}`);
    }

    return successResponse(trends);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return render.wantsHtml()
        ? render.error('Unauthorized', 401)
        : errorResponse('Unauthorized', 401);
    }
    logError('Error fetching category trends', error);
    return render.wantsHtml()
      ? render.error('Failed to fetch category trends', 500)
      : errorResponse('Failed to fetch category trends', 500);
  }
};
