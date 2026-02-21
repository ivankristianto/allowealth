import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { budgetService, workspaceMetaService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { createRenderHelper } from '@/lib/api/renderResponse';
import { formatCurrency } from '@/lib/formatting';
import { calculateAllocationDistribution } from '@/lib/utils/budget';
import { getCopyBudgetAvailability } from '@/lib/utils/budget-copy';
import { getMonthName } from '@/lib/utils/date';
import { isValidCurrency } from '@/lib/constants/currency';

// Import partial components for HTML rendering
import BudgetSummaryPartial from '@/components/partials/BudgetSummaryPartial.astro';
import BudgetCardGridPartial from '@/components/partials/BudgetCardGridPartial.astro';
import BudgetAdviceBannerPartial from '@/components/partials/BudgetAdviceBannerPartial.astro';
import BudgetCopyActionPartial from '@/components/partials/BudgetCopyActionPartial.astro';
import BudgetTable from '@/components/organisms/BudgetTable.astro';

/**
 * GET /api/budget/overview
 * Get budget overview for a specific month
 * Query params:
 *   - year: number (optional, defaults to current year)
 *   - month: number (optional, defaults to current month)
 *   - currency: Currency (optional, defaults to 'IDR')
 *   - _render: 'html' | 'json' (optional, defaults to 'json')
 *   - _partial: 'summary' | 'cards' | 'advice' | 'all' (optional, defaults to 'all')
 * Note: summary responses also include copy-action HTML for action bar sync.
 */
export const GET: APIRoute = async (context) => {
  const { url } = context;
  const render = createRenderHelper(url);

  try {
    const auth = getAuthenticatedUser(context);
    const perf = context.locals.perf;

    const yearParam = url.searchParams.get('year');
    const monthParam = url.searchParams.get('month');
    const currency = url.searchParams.get('currency') as Currency | null;
    const partial = url.searchParams.get('_partial') || 'all';

    // Default to current month if not specified
    const now = new Date();
    const year = yearParam ? parseInt(yearParam, 10) : now.getFullYear();
    const month = monthParam ? parseInt(monthParam, 10) : now.getMonth() + 1;
    const workspaceCurrencyConfig = await workspaceMetaService.getWorkspaceCurrencies(
      auth.workspaceId
    );
    const allowedCurrencies = [
      workspaceCurrencyConfig.primary,
      ...(workspaceCurrencyConfig.secondary ? [workspaceCurrencyConfig.secondary] : []),
    ];
    const selectedCurrency =
      currency && isValidCurrency(currency) && allowedCurrencies.includes(currency)
        ? currency
        : workspaceCurrencyConfig.primary;

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

    if (currency && (!isValidCurrency(currency) || !allowedCurrencies.includes(currency))) {
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
        const budgetCount =
          budgetData.categories.filter((category) => Number(category.budget_amount) > 0).length ||
          0;
        const nextMonthDate = new Date(year, month, 1);
        const nextMonthYear = nextMonthDate.getFullYear();
        const nextMonth = nextMonthDate.getMonth() + 1;
        const hasNextMonthBudgets = await budgetService.hasBudgetsForMonth(
          auth.workspaceId,
          nextMonthYear,
          nextMonth,
          selectedCurrency
        );
        const copyBudgetAvailability = getCopyBudgetAvailability({
          sourceBudgetCount: budgetCount,
          hasNextMonthBudgets,
        });
        const nextMonthDisplay = `${getMonthName(nextMonth)} ${nextMonthYear}`;
        const copyActionTooltip =
          copyBudgetAvailability.disabledReason === 'target-month-has-budgets'
            ? `Budgets already exist for ${nextMonthDisplay}`
            : '';

        const totalCategories = budgetData.categories.length;
        const overBudgetCount = budgetData.categories.filter(
          (cat) => cat.status === 'exceeded'
        ).length;
        const criticalCount = budgetData.categories.filter(
          (cat) => cat.percentage_used >= 150
        ).length;

        const summaryHtml = await container.renderToString(BudgetSummaryPartial, {
          props: {
            totalAllocated: parseFloat(budgetData.total_budget || '0'),
            totalSpent: parseFloat(budgetData.total_spent || '0'),
            distribution,
            currency: selectedCurrency,
            totalCategories,
            overBudgetCount,
            criticalCount,
          },
        });
        htmlParts.push(`<!-- PARTIAL:summary -->\n${summaryHtml}`);

        const copyActionHtml = await container.renderToString(BudgetCopyActionPartial, {
          props: {
            showCopyAction: copyBudgetAvailability.isVisible,
            disableCopyAction: copyBudgetAvailability.isDisabled,
            copyActionTooltip,
          },
        });
        htmlParts.push(`<!-- PARTIAL:copy-action -->\n${copyActionHtml}`);
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

      // Include category-budget ID mapping so client can update
      // data-expense-categories after DOM injection (needed for inline editing)
      if (partial === 'all' || partial === 'cards') {
        const categoryBudgetMeta = budgetData.categories.map((cat) => ({
          id: cat.category_id,
          budget_id: cat.budget_id,
          budget_amount: cat.budget_amount,
        }));
        htmlParts.push(`<!-- PARTIAL:meta -->\n${JSON.stringify(categoryBudgetMeta)}`);
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
  currency: Currency
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
