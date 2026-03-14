import {
  check,
  forward,
  maxLength,
  maxValue,
  minValue,
  number,
  object,
  optional,
  parse,
  picklist,
  pipe,
  string,
} from 'valibot';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { ToolContext } from './types.js';
import { fuzzyMatch } from '../utils/fuzzy-match.js';

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

const isoDateString = pipe(
  string(),
  check((value) => !Number.isNaN(new Date(value).getTime()), 'Invalid date format. Use YYYY-MM-DD.')
);

export const listTransactionsSchema = pipe(
  object({
    type: optional(picklist(['expense', 'income', 'transfer'])),
    start_date: optional(isoDateString),
    end_date: optional(isoDateString),
    limit: optional(pipe(number(), minValue(1), maxValue(50)), 20),
  }),
  forward(
    check((data) => {
      if (data.start_date && data.end_date) {
        return new Date(data.start_date) <= new Date(data.end_date);
      }
      return true;
    }, 'start_date must be before or equal to end_date'),
    ['end_date'] as const
  )
);

export const addTransactionSchema = object({
  amount: pipe(
    number(),
    check((value) => value > 0, 'Amount must be greater than 0')
  ),
  currency: picklist(SUPPORTED_CURRENCIES),
  category_name: string(),
  account_name: string(),
  date: optional(isoDateString),
  description: optional(pipe(string(), maxLength(500))),
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
    'Create an expense transaction. Use list_categories and list_accounts first if you are unsure of the exact names. Category and account names are fuzzy-matched.',
  inputSchema: {
    type: 'object',
    properties: {
      amount: { type: 'number', description: 'Amount (positive number)' },
      currency: { type: 'string', enum: [...SUPPORTED_CURRENCIES], description: 'Currency code' },
      category_name: { type: 'string', description: 'Category name (fuzzy matched)' },
      account_name: { type: 'string', description: 'Account/account name (fuzzy matched)' },
      date: { type: 'string', description: 'Transaction date (YYYY-MM-DD). Defaults to today.' },
      description: { type: 'string', description: 'Optional description/note' },
    },
    required: ['amount', 'currency', 'category_name', 'account_name'],
  },
};

export const addIncomeTool: Tool = {
  name: 'add_income',
  description:
    'Create an income transaction. Use list_categories and list_accounts first if you are unsure of the exact names. Category and account names are fuzzy-matched.',
  inputSchema: {
    type: 'object',
    properties: {
      amount: { type: 'number', description: 'Amount (positive number)' },
      currency: { type: 'string', enum: [...SUPPORTED_CURRENCIES], description: 'Currency code' },
      category_name: { type: 'string', description: 'Category name (fuzzy matched)' },
      account_name: { type: 'string', description: 'Account/account name (fuzzy matched)' },
      date: { type: 'string', description: 'Transaction date (YYYY-MM-DD). Defaults to today.' },
      description: { type: 'string', description: 'Optional description/note' },
    },
    required: ['amount', 'currency', 'category_name', 'account_name'],
  },
};

export async function handleListTransactions(args: Record<string, unknown>, ctx: ToolContext) {
  const { workspaceId } = ctx.auth;
  const input = parse(listTransactionsSchema, args);

  const filters: any = {
    workspace_id: workspaceId,
    type: input.type,
    limit: input.limit,
  };

  if (input.start_date) filters.start_date = new Date(input.start_date);
  if (input.end_date) filters.end_date = new Date(input.end_date);

  const transactions = await ctx.services.transaction.findAll(filters);
  const count = await ctx.services.transaction.count(filters);

  const result = transactions.map((t: any) => ({
    id: t.id,
    type: t.type,
    amount: t.amount,
    currency: t.currency,
    category: t.category?.name ?? null,
    account: t.account?.name ?? null,
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

async function resolveCategory(
  name: string,
  type: 'expense' | 'income',
  workspaceId: string,
  ctx: ToolContext
) {
  const categories = await ctx.services.category.findAll(workspaceId, {
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

async function resolveAccount(name: string, workspaceId: string, ctx: ToolContext) {
  const accounts = await ctx.services.account.findAll(workspaceId);
  const names = accounts.map((a: any) => a.name);
  const match = fuzzyMatch(name, names);

  if (!match) {
    return { error: `No matching account for "${name}"`, available: names };
  }

  const account = accounts.find((a: any) => a.name === match);
  return { account };
}

export async function handleAddTransaction(
  args: Record<string, unknown>,
  type: 'expense' | 'income',
  ctx: ToolContext
) {
  const { workspaceId, userId } = ctx.auth;
  const input = parse(addTransactionSchema, args);

  // Resolve category
  const categoryResult = await resolveCategory(input.category_name, type, workspaceId, ctx);
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

  // Resolve account
  const accountResult = await resolveAccount(input.account_name, workspaceId, ctx);
  if ('error' in accountResult) {
    return {
      isError: true,
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            error: accountResult.error,
            available_accounts: accountResult.available,
          }),
        },
      ],
    };
  }

  const transactionDate = input.date ? new Date(input.date) : new Date();

  const transaction = await ctx.services.transaction.create({
    workspace_id: workspaceId,
    created_by_user_id: userId,
    type,
    amount: String(input.amount),
    currency: input.currency,
    category_id: categoryResult.category.id,
    account_id: accountResult.account.id,
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
            account: accountResult.account.name,
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
