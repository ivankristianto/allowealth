import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ValiError } from 'valibot';
import { logError } from '@/lib/logger';
import { isReadPermission, type Permission } from '@/lib/permissions/registry';
import { ServiceError } from '@/services/service-errors';
import type { ToolContext } from './types.js';
import { tools as accountTools, handleListCategories, handleListAccounts } from './accounts.js';
import {
  listTransactionsTool,
  addExpenseTool,
  addIncomeTool,
  handleListTransactions,
  handleAddTransaction,
} from './transactions.js';
import { tool as budgetTool, handleGetBudgetSummary } from './budget.js';
import {
  dashboardTool,
  accountSummaryTool,
  handleGetDashboard,
  handleGetAccountSummary,
} from './dashboard.js';

/** Permissions a token needs, all of them, to call each tool. */
export const TOOL_PERMISSIONS: Readonly<Record<string, readonly Permission[]>> = {
  list_categories: ['categories:read'],
  list_accounts: ['accounts:read'],
  list_transactions: ['transactions:read'],
  add_expense: ['transactions:create'],
  add_income: ['transactions:create'],
  get_budget_summary: ['budgets:read'],
  get_dashboard: ['accounts:read', 'transactions:read', 'budgets:read'],
  get_account_summary: ['accounts:read'],
};

// Still an allowlist: a tool missing from TOOL_PERMISSIONS stays off-limits to read-only tokens.
export const READ_ONLY_TOOLS: ReadonlySet<string> = new Set(
  Object.entries(TOOL_PERMISSIONS)
    .filter(([, permissions]) => permissions.length > 0 && permissions.every(isReadPermission))
    .map(([name]) => name)
);

export function isToolAllowed(name: string, auth: Pick<ToolContext['auth'], 'scope'>): boolean {
  return auth.scope !== 'read' || READ_ONLY_TOOLS.has(name);
}

export function registerTools(auth?: Pick<ToolContext['auth'], 'scope'>): Tool[] {
  const tools = [
    ...accountTools,
    listTransactionsTool,
    addExpenseTool,
    addIncomeTool,
    budgetTool,
    dashboardTool,
    accountSummaryTool,
  ];
  return auth ? tools.filter((tool) => isToolAllowed(tool.name, auth)) : tools;
}

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  if (!isToolAllowed(name, ctx.auth)) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Tool ${name} needs a read-write token.` }],
    };
  }

  try {
    switch (name) {
      case 'list_categories':
        return await handleListCategories(args, ctx);
      case 'list_accounts':
        return await handleListAccounts(args, ctx);
      case 'list_transactions':
        return await handleListTransactions(args, ctx);
      case 'add_expense':
        return await handleAddTransaction(args, 'expense', ctx);
      case 'add_income':
        return await handleAddTransaction(args, 'income', ctx);
      case 'get_budget_summary':
        return await handleGetBudgetSummary(args, ctx);
      case 'get_dashboard':
        return await handleGetDashboard(args, ctx);
      case 'get_account_summary':
        return await handleGetAccountSummary(args, ctx);
      default:
        return {
          isError: true,
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        };
    }
  } catch (error) {
    // Agents need validation detail to fix their arguments; anything else may carry SQL and params.
    if (error instanceof ServiceError || error instanceof ValiError) {
      return { isError: true, content: [{ type: 'text', text: `Error: ${error.message}` }] };
    }
    const errorId = logError(`MCP tool ${name} failed`, error);
    return {
      isError: true,
      content: [{ type: 'text', text: `Error: tool ${name} failed (errorId ${errorId}).` }],
    };
  }
}

export type { ToolContext } from './types.js';
