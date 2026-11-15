import type { Tool, ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import { ValiError } from 'valibot';
import { ANY_VALID_TOKEN } from '@/lib/app-password-rest-access';
import { auditActorFromAuth, runWithAuditActor } from '@/lib/audit-actor';
import { createLogger, logError } from '@/lib/logger';
import { recordTokenDenial } from '@/lib/token-denial-audit';
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
import { tokenInfoTool, handleGetTokenInfo } from './token-info.js';

type ToolPermissions = readonly Permission[] | typeof ANY_VALID_TOKEN;

const log = createLogger('mcp-tools');
const MAX_RECORDED_TOOL_NAME_LENGTH = 100;

/** Permissions a token needs, all of them, to call each tool; ANY_VALID_TOKEN for tools without workspace data. */
export const TOOL_PERMISSIONS: Readonly<Record<string, ToolPermissions>> = {
  list_categories: ['categories:read'],
  list_accounts: ['accounts:read'],
  list_transactions: ['transactions:read'],
  add_expense: ['transactions:create'],
  add_income: ['transactions:create'],
  get_budget_summary: ['budgets:read'],
  get_dashboard: ['accounts:read', 'transactions:read', 'budgets:read'],
  get_account_summary: ['accounts:read'],
  get_token_info: ANY_VALID_TOKEN,
};

// Creating or confirming adds a record and overwrites nothing.
function isAdditivePermission(permission: Permission): boolean {
  return permission.endsWith(':create') || permission.endsWith(':confirm');
}

/** Hints set explicitly, because MCP clients treat a write without `destructiveHint` as destructive. */
export function toolAnnotations(permissions: readonly Permission[]): ToolAnnotations {
  if (permissions.length > 0 && permissions.every(isReadPermission)) return { readOnlyHint: true };
  const writes = permissions.filter((permission) => !isReadPermission(permission));
  const additiveOnly = writes.length > 0 && writes.every(isAdditivePermission);
  return { readOnlyHint: false, destructiveHint: !additiveOnly };
}

// Own keys only: a client-chosen name such as `constructor` would otherwise hit Object.prototype.
function toolPermissions(name: string): ToolPermissions {
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
  tokenInfoTool,
].map((tool) => {
  const required = toolPermissions(tool.name);
  // A tool open to any token reads no workspace data, so it cannot change any either.
  const annotations =
    required === ANY_VALID_TOKEN ? { readOnlyHint: true } : toolAnnotations(required);
  return { ...tool, annotations };
});

interface ToolDenial {
  message: string;
  /** Empty for a tool with no permission entry, which no grant could unlock. */
  missing: Permission[];
}

/** Why the token may not call the tool, or null when it may. */
function toolDenial(name: string, granted: readonly Permission[]): ToolDenial | null {
  const required = toolPermissions(name);
  if (required === ANY_VALID_TOKEN) return null;
  // With no entry nothing is missing, so an unmapped tool has to be refused here.
  if (required.length === 0) return { message: `Tool ${name} is not available.`, missing: [] };
  const missing = required.filter((permission) => !granted.includes(permission));
  if (missing.length === 0) return null;
  const noun = missing.length === 1 ? 'permission' : 'permissions';
  return { message: `Tool ${name} needs the ${missing.join(', ')} ${noun}.`, missing };
}

/** Every tool without `auth`; with it, only the tools that token may call. */
export function registerTools(auth?: Pick<ToolContext['auth'], 'permissions'>): Tool[] {
  return auth
    ? TOOLS.filter((tool) => toolDenial(tool.name, auth.permissions) === null)
    : [...TOOLS];
}

type ToolCallResult = { content: Array<{ type: string; text: string }>; isError?: boolean };

/** Runs a tool for the token in `ctx`; audit rows its writes produce name that token. */
export function handleToolCall(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<ToolCallResult> {
  return runWithAuditActor(auditActorFromAuth(ctx.auth), () => runToolCall(name, args, ctx));
}

async function runToolCall(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext
): Promise<ToolCallResult> {
  const denial = toolDenial(name, ctx.auth.permissions);
  if (denial) {
    const tool = name.slice(0, MAX_RECORDED_TOOL_NAME_LENGTH);
    log.warn('MCP tool call denied', { tokenId: ctx.auth.tokenId, tool, missing: denial.missing });
    // Unmapped names are client-chosen, so they share one subject to keep the dedupe key bounded.
    await recordTokenDenial(ctx.auth, {
      subject: denial.missing.length > 0 ? `tool:${name}` : 'tool:unknown',
      details: denial.missing.length > 0 ? { tool, missing: denial.missing } : { tool },
    });
    return { isError: true, content: [{ type: 'text', text: denial.message }] };
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
      case 'get_token_info':
        return await handleGetTokenInfo(args, ctx);
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
