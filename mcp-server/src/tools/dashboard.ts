import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from './types.js';

const SUPPORTED_CURRENCIES = [
  'IDR',
  'USD',
  'SGD',
  'PHP',
  'EUR',
  'GBP',
  'MYR',
  'THB',
  'JPY',
  'AUD',
  'KRW',
  'INR',
] as const;

export const dashboardSchema = z.object({
  month: z.number().min(1).max(12).optional(),
  year: z.number().min(2020).max(2100).optional(),
  currency: z.enum(SUPPORTED_CURRENCIES).default('IDR'),
});

export const accountSummarySchema = z.object({
  currency: z.enum(SUPPORTED_CURRENCIES).optional(),
});

export const dashboardTool: Tool = {
  name: 'get_dashboard',
  description:
    'Get a combined financial snapshot: total accounts, monthly income/expenses, budget health, top spending categories, and recent transactions.',
  inputSchema: {
    type: 'object',
    properties: {
      month: { type: 'number', description: 'Month (1-12). Defaults to current month.' },
      year: { type: 'number', description: 'Year. Defaults to current year.' },
      currency: {
        type: 'string',
        enum: [...SUPPORTED_CURRENCIES],
        description: 'Currency. Defaults to IDR.',
      },
    },
  },
};

export const accountSummaryTool: Tool = {
  name: 'get_account_summary',
  description: 'Get account totals grouped by currency and by account type.',
  inputSchema: {
    type: 'object',
    properties: {
      currency: {
        type: 'string',
        enum: [...SUPPORTED_CURRENCIES],
        description: 'Filter by currency',
      },
    },
  },
};

export async function handleGetDashboard(args: Record<string, unknown>, ctx: ToolContext) {
  const { workspaceId } = ctx.auth;
  const input = dashboardSchema.parse(args);

  const now = new Date();
  const month = input.month ?? now.getMonth() + 1;
  const year = input.year ?? now.getFullYear();

  const data = await ctx.services.dashboard.getDashboardData(
    workspaceId,
    month,
    year,
    input.currency
  );

  const result = {
    month,
    year,
    currency: input.currency,
    total_accounts: data.totalAccounts.byCurrency,
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

export async function handleGetAccountSummary(args: Record<string, unknown>, ctx: ToolContext) {
  const { workspaceId } = ctx.auth;
  const input = accountSummarySchema.parse(args);

  const [byCurrency, byType] = await Promise.all([
    ctx.services.account.getTotalByCurrency(workspaceId),
    ctx.services.account.getTotalByType(workspaceId),
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
