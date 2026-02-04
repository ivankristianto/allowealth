import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getAuthContext } from '../auth.js';
import { categoryService, assetService } from '../context.js';

export const listCategoriesSchema = z.object({
  type: z.enum(['expense', 'income']).optional(),
});

export const listAssetsSchema = z.object({});

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
    name: 'list_assets',
    description:
      'List all active assets (bank accounts, e-wallets, cash, etc.) with current balances.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

export async function handleListCategories(args: Record<string, unknown>) {
  const { workspaceId } = getAuthContext();
  const input = listCategoriesSchema.parse(args);

  const categories = await categoryService.findAll(workspaceId, {
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

export async function handleListAssets(_args: Record<string, unknown>) {
  const { workspaceId } = getAuthContext();
  listAssetsSchema.parse(_args);

  const assets = await assetService.findAll(workspaceId);

  const result = assets.map((a: any) => ({
    name: a.name,
    type: a.type,
    currency: a.currency,
    balance: a.balance,
  }));

  return {
    content: [{ type: 'text' as const, text: JSON.stringify({ assets: result }, null, 2) }],
  };
}
