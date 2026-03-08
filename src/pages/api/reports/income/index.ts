import type { APIRoute } from 'astro';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { reportService, workspaceMetaService, workspaceService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import { createRenderHelper } from '@/lib/api/renderResponse';
import { safeParseDecimal } from '@/lib/utils/decimal';
import { validatePeriod } from '@/lib/utils/period-validation';
import { formatMonthYear } from '@/lib/utils/date';
import { isValidCurrency } from '@/lib/constants/currency';
import { isValidNanoid } from '@/lib/validation/nanoid';
import { PAGINATION } from '@/lib/constants/pagination';

import IncomeSummaryCardsPartial from '@/components/partials/IncomeSummaryCardsPartial.astro';
import IncomeChartsPartial from '@/components/partials/IncomeChartsPartial.astro';
import IncomeSourceTablePartial from '@/components/partials/IncomeSourceTablePartial.astro';
import IncomeMemberTablePartial from '@/components/partials/IncomeMemberTablePartial.astro';
import IncomeHistoryTablePartial from '@/components/partials/IncomeHistoryTablePartial.astro';
import ReportSelectorPartial from '@/components/partials/ReportSelectorPartial.astro';

/**
 * GET /api/reports/income
 * Income detail report — summary, charts, source table, member breakdown, history.
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
    const VALID_PARTIALS = [
      'summary',
      'charts',
      'sources',
      'members',
      'history',
      'selector',
      'all',
    ] as const;
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

    // Parse pagination and filter params
    const pageParam = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSizeParam = parseInt(
      url.searchParams.get('pageSize') || String(PAGINATION.DEFAULT_PAGE_SIZE),
      10
    );
    const page = Math.max(1, isNaN(pageParam) ? 1 : pageParam);
    const pageSize = Math.min(
      PAGINATION.MAX_PAGE_SIZE,
      Math.max(1, isNaN(pageSizeParam) ? PAGINATION.DEFAULT_PAGE_SIZE : pageSizeParam)
    );

    const VALID_SOURCE_TYPES = ['active', 'passive', 'other'] as const;
    const sourceTypeParam = url.searchParams.get('source_type');
    const sourceType =
      sourceTypeParam && VALID_SOURCE_TYPES.includes(sourceTypeParam as any)
        ? (sourceTypeParam as 'active' | 'passive' | 'other')
        : undefined;
    const categoryIdParam = url.searchParams.get('category_id');
    const categoryId =
      categoryIdParam && isValidNanoid(categoryIdParam) ? categoryIdParam : undefined;

    // Fetch income report data
    const incomeData = await reportService.getIncomeReport(
      auth.workspaceId,
      period,
      range,
      currency,
      {
        userId,
        sourceType,
        categoryId,
        page,
        pageSize,
      }
    );

    if (render.wantsHtml()) {
      const container = await AstroContainer.create();
      const htmlParts: string[] = [];

      if (partial === 'all' || partial === 'summary') {
        const summaryHtml = await container.renderToString(IncomeSummaryCardsPartial, {
          props: {
            totalIncome: incomeData.summary.totalIncome,
            activeIncome: incomeData.summary.activeIncome,
            passiveIncome: incomeData.summary.passiveIncome,
            otherIncome: incomeData.summary.otherIncome,
            growthVsPreviousPeriod: incomeData.summary.growthVsPreviousPeriod,
            currency,
          },
        });
        htmlParts.push(`<!-- PARTIAL:summary -->\n${summaryHtml}`);
      }

      if (partial === 'all' || partial === 'charts') {
        const sourceMix = incomeData.sourceMix.map((s) => ({
          name: s.name,
          value: safeParseDecimal(s.value),
        }));
        const sourceGroupTrend = incomeData.sourceGroupTrend.map((t) => ({
          name: t.name,
          active: safeParseDecimal(t.active),
          passive: safeParseDecimal(t.passive),
          other: safeParseDecimal(t.other),
        }));

        const chartsHtml = await container.renderToString(IncomeChartsPartial, {
          props: {
            sourceMix,
            sourceGroupTrend,
            currency,
            sourceMixSubtitle: range === 'monthly' ? 'INCOME SOURCE MIX' : 'YEARLY SOURCE MIX',
            trendSubtitle: range === 'monthly' ? 'SOURCE GROUP TREND' : 'YEARLY TREND',
          },
        });
        htmlParts.push(`<!-- PARTIAL:charts -->\n${chartsHtml}`);
      }

      if (partial === 'all' || partial === 'sources') {
        const categories = incomeData.sourceMix.map((s) => ({
          name: s.name,
          value: s.value,
          sourceType: s.sourceType,
        }));
        const sourcesHtml = await container.renderToString(IncomeSourceTablePartial, {
          props: {
            categories,
            currency,
            subtitle: 'SORTED BY AMOUNT',
          },
        });
        htmlParts.push(`<!-- PARTIAL:sources -->\n${sourcesHtml}`);
      }

      if (partial === 'all' || partial === 'members') {
        const membersHtml = await container.renderToString(IncomeMemberTablePartial, {
          props: {
            members: incomeData.members,
            currency,
            totalIncome: incomeData.summary.totalIncome,
          },
        });
        htmlParts.push(`<!-- PARTIAL:members -->\n${membersHtml}`);
      }

      if (partial === 'all' || partial === 'history') {
        const historyHtml = await container.renderToString(IncomeHistoryTablePartial, {
          props: {
            transactions: incomeData.history.transactions,
            total: incomeData.history.total,
            page: incomeData.history.page,
            pageSize: incomeData.history.pageSize,
            currency,
            appliedFilters: incomeData.history.appliedFilters,
          },
        });
        htmlParts.push(`<!-- PARTIAL:history -->\n${historyHtml}`);
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
    return successResponse(incomeData);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return render.wantsHtml()
        ? render.error('Unauthorized', 401)
        : errorResponse('Unauthorized', 401, 'UNAUTHORIZED');
    }
    logError('Error fetching income report data', error);
    return render.wantsHtml()
      ? render.error('Failed to fetch income report data', 500)
      : errorResponse('Failed to fetch income report data', 500, 'INTERNAL_ERROR');
  }
};
