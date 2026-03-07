import type { APIRoute } from 'astro';
import { accountService, reportService, workspaceMetaService } from '@/services';
import { successResponse, errorResponse, getAuthenticatedUser } from '@/lib/api-utils';
import { logError } from '@/lib/utils';
import {
  aggregateAccountHistory,
  buildForecastRealityCheck,
  type AccountWithHistory,
} from '@/lib/forecast';

function monthKeyToDateRange(monthKey: string): { startDate: Date; endDate: Date } {
  const [year, month] = monthKey.split('-').map(Number);
  return {
    startDate: new Date(year, month - 1, 1),
    endDate: new Date(year, month, 0, 23, 59, 59),
  };
}

/**
 * GET /api/forecast
 * Build and return the saved-assumption forecast reality-check view.
 */
export const GET: APIRoute = async (context) => {
  try {
    const auth = getAuthenticatedUser(context);
    const settings = await workspaceMetaService.getSettings(auth.workspaceId);
    const assumptions = {
      monthlyTopup: settings.forecastMonthlyTopup,
      annualRate: settings.forecastAnnualRate,
    };

    // Fetch workspace's accounts with history
    const accountsWithHistory = await accountService.findAllWithHistory(auth.workspaceId);

    // Scope forecast to workspace primary currency and exclude debt accounts.
    const forecastAccounts: AccountWithHistory[] = accountsWithHistory
      .filter(
        (account) => account.currency === settings.currency && account.account_class !== 'debt'
      )
      .map((account) => ({
        balance: parseFloat(account.balance),
        currency: settings.currency,
        accountClass: account.account_class,
        history: account.history,
      }));

    const actualBalanceTimeline = aggregateAccountHistory(forecastAccounts);

    if (actualBalanceTimeline.length === 0) {
      return successResponse({
        assumptions,
        ...buildForecastRealityCheck({
          accounts: [],
          actualNetSavings: [],
          monthlyTopup: assumptions.monthlyTopup,
          annualRate: assumptions.annualRate,
        }),
      });
    }

    const firstHistoricalMonth = actualBalanceTimeline[0].key;
    const latestHistoricalMonth = actualBalanceTimeline[actualBalanceTimeline.length - 1].key;
    const { startDate } = monthKeyToDateRange(firstHistoricalMonth);
    const { endDate } = monthKeyToDateRange(latestHistoricalMonth);
    const actualNetSavingsByMonth = await reportService.getMonthlyNetSavingsByMonth(
      auth.workspaceId,
      startDate,
      endDate,
      settings.currency
    );

    const actualNetSavings = Array.from(actualNetSavingsByMonth.entries()).map(([key, row]) => ({
      key,
      income: Number(row.income),
      expenses: Number(row.expenses),
      netSavings: Number(row.netSavings),
    }));

    const result = {
      assumptions,
      ...buildForecastRealityCheck({
        accounts: forecastAccounts,
        actualNetSavings,
        monthlyTopup: assumptions.monthlyTopup,
        annualRate: assumptions.annualRate,
      }),
    };

    return successResponse(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return errorResponse('Unauthorized', 401);
    }
    logError('Error calculating forecast', error);
    return errorResponse('Failed to calculate forecast', 500);
  }
};
