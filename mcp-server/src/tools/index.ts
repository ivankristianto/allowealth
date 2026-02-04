import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { tools as assetTools, handleListCategories, handleListAssets } from './assets.js';
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
  assetSummaryTool,
  handleGetDashboard,
  handleGetAssetSummary,
} from './dashboard.js';

export function registerTools(): Tool[] {
  return [
    ...assetTools,
    listTransactionsTool,
    addExpenseTool,
    addIncomeTool,
    budgetTool,
    dashboardTool,
    assetSummaryTool,
  ];
}

export async function handleToolCall(
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    switch (name) {
      case 'list_categories':
        return await handleListCategories(args);
      case 'list_assets':
        return await handleListAssets(args);
      case 'list_transactions':
        return await handleListTransactions(args);
      case 'add_expense':
        return await handleAddTransaction(args, 'expense');
      case 'add_income':
        return await handleAddTransaction(args, 'income');
      case 'get_budget_summary':
        return await handleGetBudgetSummary(args);
      case 'get_dashboard':
        return await handleGetDashboard(args);
      case 'get_asset_summary':
        return await handleGetAssetSummary(args);
      default:
        return {
          isError: true,
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
        };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      isError: true,
      content: [{ type: 'text', text: `Error: ${message}` }],
    };
  }
}
