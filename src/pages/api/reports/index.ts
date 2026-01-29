import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { reportService } from '@/services';
import type { ReportData } from '@/services/report.service';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { createRenderHelper } from '@/lib/api/renderResponse';
import { safeParseDecimal } from '@/lib/utils/decimal';
import { validatePeriod } from '@/lib/utils/period-validation';

// Import partial components for HTML rendering
import ReportSummaryCardsPartial from '@/components/partials/ReportSummaryCardsPartial.astro';
import ReportChartsPartial from '@/components/partials/ReportChartsPartial.astro';
import CategoryTablePartial from '@/components/partials/CategoryTablePartial.astro';

/**
 * GET /api/reports
 * Get report data for monthly or yearly periods
 *
 * Query params:
 *   - range: 'monthly' | 'yearly' (required)
 *   - period: string (required) - 'YYYY-MM' for monthly, 'YYYY' for yearly
 *   - currency: 'IDR' | 'USD' (optional, defaults to 'IDR')
 *   - _render: 'html' | 'json' (optional, defaults to 'json')
 *   - _partial: 'summary' | 'charts' | 'table' | 'all' (optional, defaults to 'all')
 *
 * Security:
 *   - Requires authentication (validates userId from session)
 *   - Validates period format to prevent SQL injection
 *   - Validates date ranges (month 1-12, year 2000-2100)
 *   - All queries filtered by authenticated userId
 */
export const GET: APIRoute = async (context) => {
  const { url } = context;
  const render = createRenderHelper(url);

  try {
    // 1. Authenticate user
    const userId = getAuthenticatedUser(context);

    // 2. Extract and validate query parameters
    const range = url.searchParams.get('range') as 'monthly' | 'yearly' | null;
    const period = url.searchParams.get('period');
    const currency = (url.searchParams.get('currency') as 'IDR' | 'USD' | null) || 'IDR';

    // Validate _partial parameter
    const VALID_PARTIALS = ['summary', 'charts', 'table', 'all'] as const;
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

    // Validate period format and ranges
    try {
      validatePeriod(period, range);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Invalid period format.';
      // Map error message to appropriate error code
      let errorCode = 'INVALID_PERIOD';
      if (errorMsg.includes('format')) {
        errorCode = 'INVALID_PERIOD_FORMAT';
      } else if (errorMsg.includes('month')) {
        errorCode = 'INVALID_MONTH';
      } else if (errorMsg.includes('year')) {
        errorCode = 'INVALID_YEAR';
      }
      return render.wantsHtml()
        ? render.error(errorMsg, 400)
        : errorResponse(errorMsg, 400, errorCode);
    }

    // Validate currency
    if (currency !== 'IDR' && currency !== 'USD') {
      const errorMsg = "Invalid currency parameter. Must be 'IDR' or 'USD'.";
      return render.wantsHtml()
        ? render.error(errorMsg, 400)
        : errorResponse(errorMsg, 400, 'INVALID_CURRENCY');
    }

    // 3. Call service with userId to fetch report data
    let reportData: ReportData;
    if (range === 'monthly') {
      reportData = await reportService.getMonthlyReport(userId, period, currency);
    } else {
      const year = parseInt(period, 10);
      reportData = await reportService.getYearlyReport(userId, year, currency);
    }

    // 4. Return response based on requested format
    if (render.wantsHtml()) {
      const container = await AstroContainer.create();
      const htmlParts: string[] = [];

      // Keep summary data as strings for formatCurrency utility
      const totalIncome = reportData.totalIncome;
      const totalExpenses = reportData.totalExpenses;
      const netSavings = reportData.netSavings;
      const budgetHealth = reportData.budgetHealth;
      const expenseCategories = reportData.expenseCategories;

      // Convert expenseByCategory (decimal strings to numbers)
      const expenseByCategory = reportData.expenseByCategory.map((cat) => ({
        name: cat.name,
        value: safeParseDecimal(cat.value),
      }));

      // Convert trendData (decimal strings to numbers)
      const trendData = reportData.trendData.map((trend) => ({
        name: trend.name,
        income: safeParseDecimal(trend.income),
        expenses: safeParseDecimal(trend.expenses),
      }));

      // Convert categoryIntelligence (decimal strings to numbers)
      const categories = reportData.categoryIntelligence.map((cat) => ({
        id: cat.id,
        name: cat.name,
        spent: safeParseDecimal(cat.spent),
        budgetLimit: cat.budgetLimit ? safeParseDecimal(cat.budgetLimit) : null,
        icon: cat.icon,
        color: cat.color,
      }));

      // Render summary partial
      if (partial === 'all' || partial === 'summary') {
        const summaryHtml = await container.renderToString(ReportSummaryCardsPartial, {
          props: {
            totalIncome,
            totalExpenses,
            netSavings,
            budgetHealth,
            expenseCategories,
            currency,
          },
        });
        htmlParts.push(`<!-- PARTIAL:summary -->\n${summaryHtml}`);
      }

      // Render charts partial
      if (partial === 'all' || partial === 'charts') {
        const chartsHtml = await container.renderToString(ReportChartsPartial, {
          props: {
            expenseByCategory,
            trendData,
            resourceAllocationSubtitle: range === 'monthly' ? 'EXPENSE MIX' : 'YEARLY EXPENSE MIX',
            financialVelocitySubtitle: range === 'monthly' ? 'TRAILING 3 MONTHS' : 'YEARLY FLOW',
          },
        });
        htmlParts.push(`<!-- PARTIAL:charts -->\n${chartsHtml}`);
      }

      // Render table partial
      if (partial === 'all' || partial === 'table') {
        const tableHtml = await container.renderToString(CategoryTablePartial, {
          props: {
            categories,
            subtitle: 'SORTED BY FUNCTIONAL VOLUME',
          },
        });
        htmlParts.push(`<!-- PARTIAL:table -->\n${tableHtml}`);
      }

      return render.html(htmlParts.join('\n\n'));
    }

    // Default: JSON response
    return successResponse(reportData);
  } catch (error) {
    // Handle authentication errors
    if (error instanceof Error && error.message === 'Unauthorized') {
      return render.wantsHtml()
        ? render.error('Unauthorized', 401)
        : errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }

    // Log and return generic error
    logError('Error fetching report data', error);
    return render.wantsHtml()
      ? render.error('Failed to fetch report data', 500)
      : errorResponse('Failed to fetch report data', 500, 'INTERNAL_ERROR');
  }
};
