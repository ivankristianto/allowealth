import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getAuthContext } from '../auth.js';
import { dashboardService, assetService } from '../context.js';

export const dashboardSchema = z.object({
  month: z.number().min(1).max(12).optional(),
  year: z.number().min(2020).max(2100).optional(),
  currency: z.enum(['IDR', 'USD']).default('IDR'),
});

export const assetSummarySchema = z.object({
  currency: z.enum(['IDR', 'USD']).optional(),
});

export const dashboardTool: Tool = {
  name: 'get_dashboard',
  description:
    'Get a combined financial snapshot: total assets, monthly income/expenses, budget health, top spending categories, and recent transactions.',
  inputSchema: {
    type: 'object',
    properties: {
      month: { type: 'number', description: 'Month (1-12). Defaults to current month.' },
      year: { type: 'number', description: 'Year. Defaults to current year.' },
      currency: { type: 'string', enum: ['IDR', 'USD'], description: 'Currency. Defaults to IDR.' },
    },
  },
};

export const assetSummaryTool: Tool = {
  name: 'get_asset_summary',
  description: 'Get asset totals grouped by currency and by asset type.',
  inputSchema: {
    type: 'object',
    properties: {
      currency: { type: 'string', enum: ['IDR', 'USD'], description: 'Filter by currency' },
    },
  },
};

export async function handleGetDashboard(args: Record<string, unknown>) {
  const { workspaceId } = getAuthContext();
  const input = dashboardSchema.parse(args);

  const now = new Date();
  const month = input.month ?? now.getMonth() + 1;
  const year = input.year ?? now.getFullYear();

  const data = await dashboardService.getDashboardData(workspaceId, month, year, input.currency);

  const result = {
    month,
    year,
    currency: input.currency,
    total_assets: {
      idr: data.totalAssets.idr,
      usd: data.totalAssets.usd,
      converted_total: data.totalAssets.converted,
      converted_currency: data.totalAssets.convertedCurrency,
    },
    monthly_income: data.monthlyIncome.total,
    monthly_expenses: {
      total: data.monthlySpent.total,
      budget: data.monthlySpent.budget,
      percentage: data.monthlySpent.percentage,
      remaining: data.monthlySpent.remaining,
    },
    budget_health: {
      status: data.budgetHealth.status,
      alert_count: data.budgetHealth.alertCount,
      alerts: data.budgetHealth.alerts.slice(0, 5).map((a) => ({
        category: a.category,
        percentage: a.percentage,
        status: a.status,
      })),
    },
    top_expenses: data.topCategoryExpenses.map((c) => ({
      category: c.category,
      amount: c.amount,
      percentage: c.percentage,
    })),
    recent_transactions: data.recentTransactions.slice(0, 5).map((t) => ({
      type: t.type,
      amount: t.amount,
      currency: t.currency,
      category: t.category?.name ?? null,
      date:
        t.transactionDate instanceof Date
          ? t.transactionDate.toISOString().split('T')[0]
          : String(t.transactionDate).split('T')[0],
    })),
  };

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
  };
}

export async function handleGetAssetSummary(args: Record<string, unknown>) {
  const { workspaceId } = getAuthContext();
  const input = assetSummarySchema.parse(args);

  const [byCurrency, byType] = await Promise.all([
    assetService.getTotalByCurrency(workspaceId),
    assetService.getTotalByType(workspaceId),
  ]);

  const result = {
    by_currency: byCurrency
      .filter((c: any) => !input.currency || c.currency === input.currency)
      .map((c: any) => ({
        currency: c.currency,
        total: c.total,
      })),
    by_type: byType
      .filter((t: any) => !input.currency || t.currency === input.currency)
      .map((t: any) => ({
        type: t.type,
        currency: t.currency,
        total: t.total,
        count: t.count,
      })),
  };

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
  };
}
