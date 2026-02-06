import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { budgetService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { createRenderHelper } from '@/lib/api/renderResponse';
import { formatCurrency } from '@/lib/formatting';
import { calculateAllocationDistribution } from '@/lib/utils/budget';

// Import partial components for HTML rendering
import BudgetSummaryPartial from '@/components/partials/BudgetSummaryPartial.astro';
import BudgetCardGridPartial from '@/components/partials/BudgetCardGridPartial.astro';
import BudgetAdviceBannerPartial from '@/components/partials/BudgetAdviceBannerPartial.astro';
import BudgetTable from '@/components/organisms/BudgetTable.astro';

/**
 * GET /api/budget/overview
 * Get budget overview for a specific month
 * Query params:
 *   - year: number (optional, defaults to current year)
 *   - month: number (optional, defaults to current month)
 *   - currency: 'IDR' | 'USD' (optional, defaults to 'IDR')
 *   - _render: 'html' | 'json' (optional, defaults to 'json')
 *   - _partial: 'summary' | 'cards' | 'advice' | 'all' (optional, defaults to 'all')
 */
export const GET: APIRoute = async (context) => {
  const { url } = context;
  const render = createRenderHelper(url);

  try {
    const auth = getAuthenticatedUser(context);
    const perf = context.locals.perf;

    const yearParam = url.searchParams.get('year');
    const monthParam = url.searchParams.get('month');
    const currency = url.searchParams.get('currency') as 'IDR' | 'USD' | null;
    const partial = url.searchParams.get('_partial') || 'all';

    // Default to current month if not specified
    const now = new Date();
    const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();
    const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;
    const selectedCurrency = currency || 'IDR';

    // Validate inputs
    if (isNaN(year) || year < 2000 || year > 2100) {
      return render.wantsHtml()
        ? render.error('Invalid year parameter', 400)
        : errorResponse('Invalid year parameter', 400);
    }

    if (isNaN(month) || month < 1 || month > 12) {
      return render.wantsHtml()
        ? render.error('Invalid month parameter', 400)
        : errorResponse('Invalid month parameter', 400);
    }

    if (selectedCurrency !== 'IDR' && selectedCurrency !== 'USD') {
      return render.wantsHtml()
        ? render.error('Invalid currency parameter', 400)
        : errorResponse('Invalid currency parameter', 400);
    }

    // Fetch budget data
    const budgetData = await budgetService.getMonthlyOverview(
      auth.workspaceId,
      year,
      month,
      selectedCurrency,
      perf
    );

    // Check if HTML rendering is requested
    if (render.wantsHtml()) {
      const container = await AstroContainer.create();
      const htmlParts: string[] = [];

      // Render summary partial
      if (partial === 'all' || partial === 'summary') {
        const distribution = calculateAllocationDistribution(
          budgetData.categories.map((cat) => ({
            name: cat.category_name,
            budget_amount: cat.budget_amount,
            spent_amount: cat.spent_amount,
          }))
        );

        const summaryHtml = await container.renderToString(BudgetSummaryPartial, {
          props: {
            totalAllocated: parseFloat(budgetData.total_budget || '0'),
            totalSpent: parseFloat(budgetData.total_spent || '0'),
            distribution,
            currency: selectedCurrency,
          },
        });
        htmlParts.push(`<!-- PARTIAL:summary -->\n${summaryHtml}`);
      }

      // Render cards partial
      if (partial === 'all' || partial === 'cards') {
        const cardsHtml = await container.renderToString(BudgetCardGridPartial, {
          props: {
            budgets: budgetData.categories,
            currency: selectedCurrency,
            month,
            year,
          },
        });
        htmlParts.push(`<!-- PARTIAL:cards -->\n${cardsHtml}`);

        // Render table partial alongside cards (same data, different view)
        const tableHtml = await container.renderToString(BudgetTable, {
          props: {
            budgets: budgetData.categories,
            currency: selectedCurrency,
            month,
            year,
          },
        });
        htmlParts.push(`<!-- PARTIAL:table -->\n${tableHtml}`);
      }

      // Render advice partial
      if (partial === 'all' || partial === 'advice') {
        // Fetch alerts to generate advice data
        const alerts = await budgetService.getAlerts(auth.workspaceId, selectedCurrency, perf);
        const adviceData = generateAdviceData(alerts, selectedCurrency);

        const adviceHtml = await container.renderToString(BudgetAdviceBannerPartial, {
          props: { adviceData },
        });
        htmlParts.push(`<!-- PARTIAL:advice -->\n${adviceHtml}`);
      }

      return render.html(htmlParts.join('\n\n'));
    }

    // Default: JSON response
    return successResponse(budgetData);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return render.wantsHtml()
        ? render.error('Unauthorized', 401)
        : errorResponse('Unauthorized', 401);
    }
    logError('Error fetching budget overview', error);
    return render.wantsHtml()
      ? render.error('Failed to fetch budget overview', 500)
      : errorResponse('Failed to fetch budget overview', 500);
  }
};

/**
 * Generate structured advice data from budget alerts
 */
interface AdviceData {
  categoryName: string;
  status: 'exceeded' | 'warning';
  amount: string;
  percentageUsed?: number;
}

function generateAdviceData(
  alerts: Awaited<ReturnType<typeof budgetService.getAlerts>>,
  currency: 'IDR' | 'USD'
): AdviceData | null {
  if (alerts.length === 0) return null;

  const exceededCategories = alerts.filter((a) => a.status === 'exceeded');
  const warningCategories = alerts.filter((a) => a.status === 'warning');

  if (exceededCategories.length > 0) {
    const category = exceededCategories[0];
    const overage = formatCurrency(category.overage, currency);
    return {
      categoryName: category.category_name,
      status: 'exceeded',
      amount: overage,
    };
  }

  if (warningCategories.length > 0) {
    const category = warningCategories[0];
    const budgetAmount = parseFloat(category.budget_amount);
    const spentAmount = parseFloat(category.spent_amount);
    const percentageUsed = budgetAmount > 0 ? Math.round((spentAmount / budgetAmount) * 100) : 0;
    const remaining = budgetAmount - spentAmount;
    const remainingFormatted = formatCurrency(Math.max(0, remaining).toString(), currency);
    return {
      categoryName: category.category_name,
      status: 'warning',
      amount: remainingFormatted,
      percentageUsed,
    };
  }

  return null;
}
