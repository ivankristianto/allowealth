import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getAuthContext } from '../auth.js';
import { budgetService } from '../context.js';

export const budgetSummarySchema = z.object({
  month: z.number().min(1).max(12).optional(),
  year: z.number().min(2020).max(2100).optional(),
  currency: z.enum(['IDR', 'USD']).default('IDR'),
});

export const tool: Tool = {
  name: 'get_budget_summary',
  description:
    'Get budget overview for a month. Shows total budget, total spent, remaining, and per-category breakdown with status (ok/warning/exceeded). Defaults to current month.',
  inputSchema: {
    type: 'object',
    properties: {
      month: { type: 'number', description: 'Month number (1-12). Defaults to current month.' },
      year: { type: 'number', description: 'Year. Defaults to current year.' },
      currency: { type: 'string', enum: ['IDR', 'USD'], description: 'Currency. Defaults to IDR.' },
    },
  },
};

export async function handleGetBudgetSummary(args: Record<string, unknown>) {
  const { workspaceId } = await getAuthContext();
  const input = budgetSummarySchema.parse(args);

  const now = new Date();
  const month = input.month ?? now.getMonth() + 1;
  const year = input.year ?? now.getFullYear();

  const overview = await budgetService.getMonthlyOverview(workspaceId, year, month, input.currency);

  const result = {
    month,
    year,
    currency: input.currency,
    total_budget: overview.total_budget,
    total_spent: overview.total_spent,
    total_remaining: overview.total_balance,
    categories_warning: overview.categories_warning,
    categories_exceeded: overview.categories_exceeded,
    categories: overview.categories.map((c) => ({
      name: c.category_name,
      budget: c.budget_amount,
      spent: c.spent_amount,
      remaining: c.balance,
      status: c.status,
      percent_used: c.percentage_used,
    })),
  };

  return {
    content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
  };
}
