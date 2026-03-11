import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { reportService, workspaceMetaService, workspaceService, accountService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import {
  HTML_RENDER_REQUEST_REQUIRED_MESSAGE,
  createRenderHelper,
  isRejectedHtmlRenderRequest,
} from '@/lib/api/renderResponse';
import { safeParseDecimal } from '@/lib/utils/decimal';
import { validatePeriod } from '@/lib/utils/period-validation';
import { formatMonthYear } from '@/lib/utils/date';
import { isValidCurrency } from '@/lib/constants/currency';

import OverviewSummaryCardsPartial from '@/components/partials/OverviewSummaryCardsPartial.astro';
import OverviewChartsPartial from '@/components/partials/OverviewChartsPartial.astro';
import OverviewPreviewCardsPartial from '@/components/partials/OverviewPreviewCardsPartial.astro';
import OverviewWealthPartial from '@/components/partials/OverviewWealthPartial.astro';
import ReportSelectorPartial from '@/components/partials/ReportSelectorPartial.astro';
import {
  calculateAccountTotalsByCurrency,
  calculateDebtTotalsByCurrency,
  calculateAccountAllocation,
} from '@/lib/utils/account';

/**
 * GET /api/reports
 * Overview report endpoint — lightweight summary with preview cards.
 *
 * Query params:
 *   - range: 'monthly' | 'yearly' (required)
 *   - period: string (required) — 'YYYY-MM' for monthly, 'YYYY' for yearly
 *   - currency: Currency (optional, defaults to workspace primary)
 *   - user_id: string (optional) — filter by workspace member
 *   - _render: 'html' | 'json' (optional, defaults to 'json')
 *   - _partial: 'summary' | 'charts' | 'previews' | 'wealth' | 'selector' | 'all' (optional, defaults to 'all')
 */
export const GET: APIRoute = async (context) => {
  const { url } = context;
  const render = createRenderHelper(url, context.request);
  if (isRejectedHtmlRenderRequest(url, context.request)) {
    return render.error(HTML_RENDER_REQUEST_REQUIRED_MESSAGE, 403);
  }

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
    const VALID_PARTIALS = ['summary', 'charts', 'previews', 'wealth', 'selector', 'all'] as const;
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

    // Optional: filter by specific user (validate membership)
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

    // Fetch overview data
    const overviewData = await reportService.getOverviewReport(
      auth.workspaceId,
      period,
      range,
      currency,
      userId
    );

    // Fetch account data for wealth partial (non-blocking for other overview partials)
    let accountTotals: ReturnType<typeof calculateAccountTotalsByCurrency> = [];
    let debtTotals: ReturnType<typeof calculateDebtTotalsByCurrency> = [];
    let accountAllocation: ReturnType<typeof calculateAccountAllocation> = [];
    let latestAccountUpdate: Date | null = null;
    let wealthUnavailable = false;

    if (partial === 'all' || partial === 'wealth') {
      try {
        const accounts = await accountService.findAll(auth.workspaceId);
        const workspaceCurrenciesList = allowedCurrencies;
        accountTotals = calculateAccountTotalsByCurrency(accounts, workspaceCurrenciesList);
        debtTotals = calculateDebtTotalsByCurrency(accounts, workspaceCurrenciesList);
        const allocationCurrency =
          workspaceCurrenciesList.find((c) =>
            accounts.some(
              (a) =>
                a.account_class !== 'debt' && a.currency === c && parseFloat(a.balance || '0') > 0
            )
          ) ?? workspaceCurrenciesList[0];
        accountAllocation = calculateAccountAllocation(accounts, allocationCurrency);
        latestAccountUpdate = accounts.reduce<Date | null>((latest, a) => {
          const d = new Date(a.last_updated);
          return !latest || d > latest ? d : latest;
        }, null);
      } catch (error) {
        wealthUnavailable = true;
        logError('Error fetching wealth data for reports overview', error);
      }
    }

    // Return HTML partials
    if (render.wantsHtml()) {
      const container = await AstroContainer.create();
      const htmlParts: string[] = [];

      if (partial === 'all' || partial === 'summary') {
        const summaryHtml = await container.renderToString(OverviewSummaryCardsPartial, {
          props: {
            totalIncome: overviewData.totalIncome,
            totalExpenses: overviewData.totalExpenses,
            netSavings: overviewData.netSavings,
            savingsRate: overviewData.savingsRate,
            currency,
            state: { range, period, currency },
          },
        });
        htmlParts.push(`<!-- PARTIAL:summary -->\n${summaryHtml}`);
      }

      if (partial === 'all' || partial === 'charts') {
        const trendData = overviewData.trendData.map((trend) => ({
          name: trend.name,
          income: safeParseDecimal(trend.income),
          expenses: safeParseDecimal(trend.expenses),
        }));
        const chartsHtml = await container.renderToString(OverviewChartsPartial, {
          props: {
            trendData,
            currency,
            subtitle: range === 'monthly' ? 'LAST 3 MONTHS' : 'LAST 3 YEARS',
          },
        });
        htmlParts.push(`<!-- PARTIAL:charts -->\n${chartsHtml}`);
      }

      if (partial === 'all' || partial === 'previews') {
        const previewsHtml = await container.renderToString(OverviewPreviewCardsPartial, {
          props: {
            incomePreview: overviewData.incomePreview,
            expensePreview: overviewData.expensePreview,
            currency,
            state: { range, period, currency },
          },
        });
        htmlParts.push(`<!-- PARTIAL:previews -->\n${previewsHtml}`);
      }

      if ((partial === 'all' || partial === 'wealth') && !wealthUnavailable) {
        const wealthHtml = await container.renderToString(OverviewWealthPartial, {
          props: {
            accountTotals,
            debtTotals,
            distribution: accountAllocation,
            latestUpdate: latestAccountUpdate,
          },
        });
        htmlParts.push(`<!-- PARTIAL:wealth -->\n${wealthHtml}`);
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
    return successResponse(overviewData);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return render.wantsHtml()
        ? render.error('Unauthorized', 401)
        : errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }
    logError('Error fetching overview report data', error);
    return render.wantsHtml()
      ? render.error('Failed to fetch overview report data', 500)
      : errorResponse('Failed to fetch overview report data', 500, 'INTERNAL_ERROR');
  }
};
