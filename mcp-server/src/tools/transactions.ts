import { z } from 'zod';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { getAuthContext } from '../auth.js';
import { transactionService, categoryService, assetService } from '../context.js';
import { fuzzyMatch } from '../utils/fuzzy-match.js';

const isoDateString = z.string().refine((val) => !isNaN(new Date(val).getTime()), {
  message: 'Invalid date format. Use YYYY-MM-DD.',
});

export const listTransactionsSchema = z
  .object({
    type: z.enum(['expense', 'income', 'transfer']).optional(),
    start_date: isoDateString.optional(),
    end_date: isoDateString.optional(),
    limit: z.number().min(1).max(50).default(20),
  })
  .refine(
    (data) => {
      if (data.start_date && data.end_date) {
        return new Date(data.start_date) <= new Date(data.end_date);
      }
      return true;
    },
    { message: 'start_date must be before or equal to end_date' }
  );

export const addTransactionSchema = z.object({
  amount: z.number().positive(),
  currency: z.enum(['IDR', 'USD']),
  category_name: z.string(),
  asset_name: z.string(),
  date: isoDateString.optional(),
  description: z.string().max(500).optional(),
});

export const listTransactionsTool: Tool = {
  name: 'list_transactions',
  description: 'List recent transactions with optional filters. Returns up to 50 transactions.',
  inputSchema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        enum: ['expense', 'income', 'transfer'],
        description: 'Filter by transaction type',
      },
      start_date: {
        type: 'string',
        description: 'Start date filter (YYYY-MM-DD)',
      },
      end_date: {
        type: 'string',
        description: 'End date filter (YYYY-MM-DD)',
      },
      limit: {
        type: 'number',
        description: 'Max results (default: 20, max: 50)',
      },
    },
  },
};

export const addExpenseTool: Tool = {
  name: 'add_expense',
  description:
    'Create an expense transaction. Use list_categories and list_assets first if you are unsure of the exact names. Category and asset names are fuzzy-matched.',
  inputSchema: {
    type: 'object',
    properties: {
      amount: { type: 'number', description: 'Amount (positive number)' },
      currency: { type: 'string', enum: ['IDR', 'USD'], description: 'Currency code' },
      category_name: { type: 'string', description: 'Category name (fuzzy matched)' },
      asset_name: { type: 'string', description: 'Asset/account name (fuzzy matched)' },
      date: { type: 'string', description: 'Transaction date (YYYY-MM-DD). Defaults to today.' },
      description: { type: 'string', description: 'Optional description/note' },
    },
    required: ['amount', 'currency', 'category_name', 'asset_name'],
  },
};

export const addIncomeTool: Tool = {
  name: 'add_income',
  description:
    'Create an income transaction. Use list_categories and list_assets first if you are unsure of the exact names. Category and asset names are fuzzy-matched.',
  inputSchema: {
    type: 'object',
    properties: {
      amount: { type: 'number', description: 'Amount (positive number)' },
      currency: { type: 'string', enum: ['IDR', 'USD'], description: 'Currency code' },
      category_name: { type: 'string', description: 'Category name (fuzzy matched)' },
      asset_name: { type: 'string', description: 'Asset/account name (fuzzy matched)' },
      date: { type: 'string', description: 'Transaction date (YYYY-MM-DD). Defaults to today.' },
      description: { type: 'string', description: 'Optional description/note' },
    },
    required: ['amount', 'currency', 'category_name', 'asset_name'],
  },
};

export async function handleListTransactions(args: Record<string, unknown>) {
  const { workspaceId } = await getAuthContext();
  const input = listTransactionsSchema.parse(args);

  const filters: any = {
    workspace_id: workspaceId,
    type: input.type,
    limit: input.limit,
  };

  if (input.start_date) filters.start_date = new Date(input.start_date);
  if (input.end_date) filters.end_date = new Date(input.end_date);

  const transactions = await transactionService.findAll(filters);
  const count = await transactionService.count(filters);

  const result = transactions.map((t: any) => ({
    id: t.id,
    type: t.type,
    amount: t.amount,
    currency: t.currency,
    category: t.category?.name ?? null,
    asset: t.asset?.name ?? null,
    date:
      t.transaction_date instanceof Date
        ? t.transaction_date.toISOString().split('T')[0]
        : String(t.transaction_date).split('T')[0],
    description: t.description,
  }));

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ transactions: result, total_count: count }, null, 2),
      },
    ],
  };
}

async function resolveCategory(name: string, type: 'expense' | 'income', workspaceId: string) {
  const categories = await categoryService.findAll(workspaceId, {
    type,
    is_active: true,
  });
  const names = categories.map((c: any) => c.name);
  const match = fuzzyMatch(name, names);

  if (!match) {
    return { error: `No matching ${type} category for "${name}"`, available: names };
  }

  const category = categories.find((c: any) => c.name === match);
  return { category };
}

async function resolveAsset(name: string, workspaceId: string) {
  const assets = await assetService.findAll(workspaceId);
  const names = assets.map((a: any) => a.name);
  const match = fuzzyMatch(name, names);

  if (!match) {
    return { error: `No matching asset for "${name}"`, available: names };
  }

  const asset = assets.find((a: any) => a.name === match);
  return { asset };
}

export async function handleAddTransaction(
  args: Record<string, unknown>,
  type: 'expense' | 'income'
) {
  const { workspaceId, userId } = await getAuthContext();
  const input = addTransactionSchema.parse(args);

  // Resolve category
  const categoryResult = await resolveCategory(input.category_name, type, workspaceId);
  if ('error' in categoryResult) {
    return {
      isError: true,
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error: categoryResult.error,
            available_categories: categoryResult.available,
          }),
        },
      ],
    };
  }

  // Resolve asset
  const assetResult = await resolveAsset(input.asset_name, workspaceId);
  if ('error' in assetResult) {
    return {
      isError: true,
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error: assetResult.error,
            available_assets: assetResult.available,
          }),
        },
      ],
    };
  }

  const transactionDate = input.date ? new Date(input.date) : new Date();

  const transaction = await transactionService.create({
    workspace_id: workspaceId,
    created_by_user_id: userId,
    type,
    amount: String(input.amount),
    currency: input.currency,
    category_id: categoryResult.category.id,
    asset_id: assetResult.asset.id,
    transaction_date: transactionDate,
    description: input.description ?? undefined,
  });

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(
          {
            id: transaction?.id,
            type: transaction?.type,
            amount: transaction?.amount,
            currency: transaction?.currency,
            category: categoryResult.category.name,
            asset: assetResult.asset.name,
            date: transactionDate.toISOString().split('T')[0],
            description: transaction?.description,
          },
          null,
          2
        ),
      },
    ],
  };
}
