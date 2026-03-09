import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { reportService, budgetService, workspaceMetaService, workspaceService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { createRenderHelper } from '@/lib/api/renderResponse';
import { safeParseDecimal } from '@/lib/utils/decimal';
import { validatePeriod } from '@/lib/utils/period-validation';
import { formatMonthYear } from '@/lib/utils/date';
import { isValidCurrency } from '@/lib/constants/currency';
import { calculateAllocationDistribution } from '@/lib/utils/budget';

import BudgetSummaryPartial from '@/components/partials/BudgetSummaryPartial.astro';
import ReportChartsPartial from '@/components/partials/ReportChartsPartial.astro';
import CategoryTablePartial from '@/components/partials/CategoryTablePartial.astro';
import MemberSpendingTablePartial from '@/components/partials/MemberSpendingTablePartial.astro';
import ReportSelectorPartial from '@/components/partials/ReportSelectorPartial.astro';

/**
 * GET /api/reports/expenses
 * Expense detail report — summary, charts, category table, member spending.
 */
export const GET: APIRoute = async (context) => {
  const { url } = context;
  const render = createRenderHelper(url);

  try {
    const auth = getAuthenticatedUser(context);

    const range = url.searchParams.get('range') as 'monthly' | 'yearly' | null;
    const period = url.searchParams.get('period');
    const currencyParam = url.searchParams.get('currency');
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

    // Validate _partial
    const VALID_PARTIALS = ['summary', 'charts', 'table', 'members', 'selector', 'all'] as const;
    type PartialType = (typeof VALID_PARTIALS)[number];
    const partialParam = url.searchParams.get('_partial') || 'all';
    if (!VALID_PARTIALS.includes(partialParam as PartialType)) {
      const errorMsg = `Invalid _partial parameter. Must be one of: ${VALID_PARTIALS.join(', ')}.`;
      return render.wantsHtml()
        ? render.error(errorMsg, 400)
        : errorResponse(errorMsg, 400, 'INVALID_PARTIAL');
    }
    const partial = partialParam as PartialType;

    // Validate range
    if (!range || (range !== 'monthly' && range !== 'yearly')) {
      const errorMsg = "Invalid range parameter. Must be 'monthly' or 'yearly'.";
      return render.wantsHtml()
        ? render.error(errorMsg, 400)
        : errorResponse(errorMsg, 400, 'INVALID_RANGE');
    }

    // Validate period
    if (!period || typeof period !== 'string' || period.trim() === '') {
      const errorMsg = 'Period parameter is required.';
      return render.wantsHtml()
        ? render.error(errorMsg, 400)
        : errorResponse(errorMsg, 400, 'MISSING_PERIOD');
    }

    try {
      validatePeriod(period, range);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Invalid period format.';
      let errorCode = 'INVALID_PERIOD';
      if (errorMsg.includes('format')) errorCode = 'INVALID_PERIOD_FORMAT';
      else if (errorMsg.includes('month')) errorCode = 'INVALID_MONTH';
      else if (errorMsg.includes('year')) errorCode = 'INVALID_YEAR';
      return render.wantsHtml()
        ? render.error(errorMsg, 400)
        : errorResponse(errorMsg, 400, errorCode);
    }

    // Validate currency
    if (
      currencyParam &&
      (!isValidCurrency(currencyParam) || !allowedCurrencies.includes(currencyParam))
    ) {
      const errorMsg = 'Invalid currency parameter for this workspace.';
      return render.wantsHtml()
        ? render.error(errorMsg, 400)
        : errorResponse(errorMsg, 400, 'INVALID_CURRENCY');
    }

    // Optional: validate user_id membership
    const userId = url.searchParams.get('user_id') || undefined;
    if (userId) {
      const members = await workspaceService.getMembers(auth.workspaceId);
      const isMember = members.some((m) => m.id === userId);
      if (!isMember) {
        const errorMsg = 'Invalid user_id: not a member of this workspace.';
        return render.wantsHtml()
          ? render.error(errorMsg, 400)
          : errorResponse(errorMsg, 400, 'INVALID_USER_ID');
      }
    }

    // Fetch expense report data
    const expenseData = await reportService.getExpenseReport(
      auth.workspaceId,
      period,
      range,
      currency,
      userId
    );

    let totalAllocated = 0;
    let totalSpent = 0;
    let budgetDistribution: ReturnType<typeof calculateAllocationDistribution> = [];
    let totalCategories = 0;
    let overBudgetCount = 0;
    let criticalCount = 0;

    try {
      const [yearPart, monthPart] = period.split('-');
      const year = parseInt(yearPart, 10);
      const month = range === 'monthly' ? parseInt(monthPart, 10) : new Date().getMonth() + 1;
      const budgetData = await budgetService.getMonthlyOverview(
        auth.workspaceId,
        year,
        month,
        currency
      );
      totalAllocated = parseFloat(budgetData.total_budget || '0');
      totalSpent = parseFloat(budgetData.total_spent || '0');
      totalCategories = budgetData.categories.length;
      overBudgetCount = budgetData.categories.filter(
        (category) => category.status === 'exceeded'
      ).length;
      criticalCount = budgetData.categories.filter(
        (category) => category.percentage_used >= 150
      ).length;
      budgetDistribution = calculateAllocationDistribution(
        budgetData.categories.map((category) => ({
          name: category.category_name,
          budget_amount: category.budget_amount,
          spent_amount: category.spent_amount,
        }))
      );
    } catch {
      // Non-critical
    }

    if (render.wantsHtml()) {
      const container = await AstroContainer.create();
      const htmlParts: string[] = [];

      if (partial === 'all' || partial === 'summary') {
        const summaryHtml = await container.renderToString(BudgetSummaryPartial, {
          props: {
            totalAllocated,
            totalSpent,
            distribution: budgetDistribution,
            currency,
            totalCategories,
            overBudgetCount,
            criticalCount,
          },
        });
        htmlParts.push(`<!-- PARTIAL:summary -->\n${summaryHtml}`);
      }

      if (partial === 'all' || partial === 'charts') {
        const expenseByCategory = expenseData.expenseByCategory.map((cat) => ({
          name: cat.name,
          value: safeParseDecimal(cat.value),
        }));
        const trendData = expenseData.trendData.map((trend) => ({
          name: trend.name,
          income: safeParseDecimal(trend.income),
          expenses: safeParseDecimal(trend.expenses),
        }));
        const recurringBreakdownData = expenseData.recurringBreakdown
          ? {
              recurringTotal: safeParseDecimal(expenseData.recurringBreakdown.recurringTotal),
              oneTimeTotal: safeParseDecimal(expenseData.recurringBreakdown.oneTimeTotal),
            }
          : undefined;

        const chartsHtml = await container.renderToString(ReportChartsPartial, {
          props: {
            expenseByCategory,
            trendData,
            recurringBreakdown: recurringBreakdownData,
            currency,
            resourceAllocationSubtitle: range === 'monthly' ? 'EXPENSE MIX' : 'YEARLY EXPENSE MIX',
            financialVelocitySubtitle: range === 'monthly' ? 'LAST 3 MONTHS' : 'MONTHLY BREAKDOWN',
          },
        });
        htmlParts.push(`<!-- PARTIAL:charts -->\n${chartsHtml}`);
      }

      if (partial === 'all' || partial === 'table') {
        const categories = expenseData.categoryIntelligence.map((cat) => ({
          id: cat.id,
          name: cat.name,
          spent: safeParseDecimal(cat.spent),
          budgetLimit: cat.budgetLimit ? safeParseDecimal(cat.budgetLimit) : null,
          icon: cat.icon,
          color: cat.color,
        }));
        const tableHtml = await container.renderToString(CategoryTablePartial, {
          props: {
            categories,
            subtitle: 'SORTED BY AMOUNT SPENT',
            range,
          },
        });
        htmlParts.push(`<!-- PARTIAL:table -->\n${tableHtml}`);
      }

      if (partial === 'all' || partial === 'members') {
        const memberTotals = expenseData.memberSummary.reduce(
          (acc, row) => ({
            income: acc.income + (safeParseDecimal(row.totalIncome) || 0),
            expenses: acc.expenses + (safeParseDecimal(row.totalExpenses) || 0),
            count: acc.count + row.transactionCount,
          }),
          { income: 0, expenses: 0, count: 0 }
        );
        const membersHtml = await container.renderToString(MemberSpendingTablePartial, {
          props: {
            members: expenseData.memberSummary,
            totals: memberTotals,
            currency,
            range,
            period,
          },
        });
        htmlParts.push(`<!-- PARTIAL:members -->\n${membersHtml}`);
      }

      if (partial === 'selector') {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;
        const monthlyPeriods = Array.from({ length: 12 }, (_, i) => {
          const date = new Date(currentYear, currentMonth - 1 - i, 1);
          const year = date.getFullYear();
          const month = date.getMonth() + 1;
          return {
            key: `${year}-${month.toString().padStart(2, '0')}`,
            label: formatMonthYear(date),
          };
        });
        const yearlyPeriods = Array.from({ length: 4 }, (_, i) => {
          const year = currentYear - i;
          return { key: year.toString(), label: year.toString() };
        });
        const selectorHtml = await container.renderToString(ReportSelectorPartial, {
          props: {
            selectedRange: range,
            selectedPeriod: period || '',
            monthlyPeriods,
            yearlyPeriods,
          },
        });
        htmlParts.push(`<!-- PARTIAL:selector -->\n${selectorHtml}`);
      }

      return render.html(htmlParts.join('\n\n'));
    }

    // Default: JSON response
    return successResponse(expenseData);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return render.wantsHtml()
        ? render.error('Unauthorized', 401)
        : errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }
    logError('Error fetching expense report data', error);
    return render.wantsHtml()
      ? render.error('Failed to fetch expense report data', 500)
      : errorResponse('Failed to fetch expense report data', 500, 'INTERNAL_ERROR');
  }
};
