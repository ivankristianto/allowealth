import type { Tool, ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { ValiError } from 'valibot';
import { logError } from '@/lib/logger';
import { isDeletePermission, isReadPermission, type Permission } from '@/lib/permissions/registry';
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

export function toolAnnotations(permissions: readonly Permission[]): ToolAnnotations {
  if (permissions.length > 0 && permissions.every(isReadPermission)) return { readOnlyHint: true };
  if (permissions.some(isDeletePermission)) return { destructiveHint: true };
  return {};
}

// Own keys only: a client-chosen name such as `constructor` would otherwise hit Object.prototype.
function toolPermissions(name: string): readonly Permission[] {
  return Object.hasOwn(TOOL_PERMISSIONS, name) ? TOOL_PERMISSIONS[name] : [];
}

const TOOLS: readonly Tool[] = [
  ...accountTools,
  listTransactionsTool,
  addExpenseTool,
  addIncomeTool,
  budgetTool,
  dashboardTool,
  accountSummaryTool,
].map((tool) => ({ ...tool, annotations: toolAnnotations(toolPermissions(tool.name)) }));

/** Why the token may not call the tool, or null when it may. */
function toolDenial(name: string, granted: readonly Permission[]): string | null {
  const required = toolPermissions(name);
  // With no entry nothing is missing, so an unmapped tool has to be refused here.
  if (required.length === 0) return `Tool ${name} is not available.`;
  const missing = required.filter((permission) => !granted.includes(permission));
  if (missing.length === 0) return null;
  const noun = missing.length === 1 ? 'permission' : 'permissions';
  return `Tool ${name} needs the ${missing.join(', ')} ${noun}.`;
}

/** Every tool without `auth`; with it, only the tools that token may call. */
export function registerTools(auth?: Pick<ToolContext['auth'], 'permissions'>): Tool[] {
  return auth
    ? TOOLS.filter((tool) => toolDenial(tool.name, auth.permissions) === null)
    : [...TOOLS];
}

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  const denial = toolDenial(name, ctx.auth.permissions);
  if (denial) return { isError: true, content: [{ type: 'text', text: denial }] };

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
