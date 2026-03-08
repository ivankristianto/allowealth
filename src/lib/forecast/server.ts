import { accountService, reportService, workspaceMetaService } from '@/services';
import { aggregateAccountHistory, buildForecastRealityCheck } from './calculations';
import type { AccountWithHistory, ForecastRealityCheckData } from './types';

function monthKeyToDateRange(monthKey: string): { startDate: Date; endDate: Date } {
  const [year, month] = monthKey.split('-').map(Number);
  return {
    startDate: new Date(year, month - 1, 1),
    endDate: new Date(year, month, 0, 23, 59, 59),
  };
}

export async function getForecastRealityCheckData(
  workspaceId: string
): Promise<ForecastRealityCheckData> {
  const settings = await workspaceMetaService.getSettings(workspaceId);
  const assumptions = {
    monthlyTopup: settings.forecastMonthlyTopup,
    annualRate: settings.forecastAnnualRate,
  };

  const accountsWithHistory = await accountService.findAllWithHistoryForForecast(
    workspaceId,
    settings.currency
  );

  const forecastAccounts: AccountWithHistory[] = accountsWithHistory.map((account) => ({
    balance: parseFloat(account.balance),
    currency: settings.currency,
    accountClass: account.account_class,
    history: account.history,
  }));

  const actualBalanceTimeline = aggregateAccountHistory(forecastAccounts);

  if (actualBalanceTimeline.length === 0) {
    return {
      assumptions,
      ...buildForecastRealityCheck({
        accounts: [],
        actualBalanceTimeline: [],
        actualNetSavings: [],
        monthlyTopup: assumptions.monthlyTopup,
        annualRate: assumptions.annualRate,
      }),
    };
  }

  const firstHistoricalMonth = actualBalanceTimeline[0].key;
  const latestHistoricalMonth = actualBalanceTimeline[actualBalanceTimeline.length - 1].key;
  const { startDate } = monthKeyToDateRange(firstHistoricalMonth);
  const { endDate } = monthKeyToDateRange(latestHistoricalMonth);
  const actualNetSavingsByMonth = await reportService.getMonthlyNetSavingsByMonth(
    workspaceId,
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

  return {
    assumptions,
    ...buildForecastRealityCheck({
      accounts: forecastAccounts,
      actualBalanceTimeline,
      actualNetSavings,
      monthlyTopup: assumptions.monthlyTopup,
      annualRate: assumptions.annualRate,
    }),
  };
}
