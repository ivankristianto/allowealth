import { object, optional, parse, picklist } from 'valibot';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from './types.js';

export const listCategoriesSchema = object({
  type: optional(picklist(['expense', 'income'])),
});

export const listAccountsSchema = object({});

export const tools: Tool[] = [
  {
    name: 'list_categories',
    description:
      'List all active budget categories. Call this to see valid category names before adding transactions.',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['expense', 'income'],
          description: 'Filter by category type',
        },
      },
    },
  },
  {
    name: 'list_accounts',
    description:
      'List all active accounts (bank accounts, e-wallets, cash, etc.) with current balances.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

export async function handleListCategories(args: Record<string, unknown>, ctx: ToolContext) {
  const { workspaceId } = ctx.auth;
  const input = parse(listCategoriesSchema, args);

  const categories = await ctx.services.category.findAll(workspaceId, {
    type: input.type,
    is_active: true,
  });

  const result = categories.map((c: any) => ({
    name: c.name,
    type: c.type,
    icon: c.icon,
  }));

  return {
    content: [{ type: 'text' as const, text: JSON.stringify({ categories: result }, null, 2) }],
  };
}

export async function handleListAccounts(_args: Record<string, unknown>, ctx: ToolContext) {
  const { workspaceId } = ctx.auth;
  parse(listAccountsSchema, _args);

  const accounts = await ctx.services.account.findAll(workspaceId);

  const result = accounts.map((a: any) => ({
    name: a.name,
    type: a.type,
    currency: a.currency,
    balance: a.balance,
  }));

  return {
    content: [{ type: 'text' as const, text: JSON.stringify({ accounts: result }, null, 2) }],
  };
}
