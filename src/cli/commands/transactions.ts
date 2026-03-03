import { defineCommand } from 'citty';
import type {
  CreateTransactionInput,
  TransactionFilters,
  UpdateTransactionInput,
} from '@/services/transaction.service';
import { AVAILABLE_CURRENCIES } from '@/lib/constants/currency';
import { commonArgs } from '../lib/common-args';
import { requireDestructiveConfirmation } from '../lib/confirm';
import { createOutput, type OutputWriter } from '../lib/output';

export type TransactionsDeps = {
  resolveTarget: (args: Record<string, unknown>) => Promise<unknown>;
  createService: () => Promise<{
    create: (input: CreateTransactionInput) => Promise<unknown>;
    findById: (id: string, workspaceId: string) => Promise<unknown>;
    findAll: (filters: TransactionFilters) => Promise<unknown>;
    update: (
      id: string,
      workspaceId: string,
      updateData: UpdateTransactionInput,
      userId?: string
    ) => Promise<unknown>;
    delete: (id: string, workspaceId: string, userId?: string) => Promise<{ success: true }>;
  }>;
  createOutput: (args: { json?: unknown }) => OutputWriter;
  requireDestructiveConfirmation: typeof requireDestructiveConfirmation;
};

const defaultDeps: TransactionsDeps = {
  async resolveTarget(args) {
    const { resolveTarget } = await import('../lib/target');
    return resolveTarget(args);
  },
  async createService() {
    const [{ db }, { TransactionService }] = await Promise.all([
      import('@/db'),
      import('@/services/transaction.service'),
    ]);
    return new TransactionService(db);
  },
  createOutput,
  requireDestructiveConfirmation,
};

const TRANSACTION_TYPES = ['expense', 'income', 'transfer'] as const;

function requiredString(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required argument: ${key}`);
  }
  return value;
}

function optionalString(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key];
  return typeof value === 'string' ? value : undefined;
}

function dateFromArg(
  value: unknown,
  argName: string,
  options?: { endOfDay?: boolean }
): Date | undefined {
  if (typeof value !== 'string' || value.trim() === '') return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid ${argName}: expected YYYY-MM-DD`);
  }
  const time = options?.endOfDay ? '23:59:59.999' : '00:00:00.000';
  const date = new Date(`${value}T${time}Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(`Invalid ${argName}: expected valid YYYY-MM-DD date`);
  }
  return date;
}

function withDefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

function optionalIntegerArg(
  args: Record<string, unknown>,
  key: string,
  constraints?: { min?: number }
): number | undefined {
  const raw = args[key];
  if (raw === undefined || raw === null || raw === '') return undefined;

  const parsed =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string' && /^-?\d+$/.test(raw.trim())
        ? Number.parseInt(raw, 10)
        : Number.NaN;

  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid ${key}: expected an integer`);
  }
  if (constraints?.min !== undefined && parsed < constraints.min) {
    throw new Error(`Invalid ${key}: expected an integer >= ${constraints.min}`);
  }
  return parsed;
}

function validatedType(value: string): CreateTransactionInput['type'] {
  if ((TRANSACTION_TYPES as readonly string[]).includes(value)) {
    return value as CreateTransactionInput['type'];
  }
  throw new Error(`Invalid type: ${value}. Allowed values: ${TRANSACTION_TYPES.join(', ')}`);
}

function validatedCurrency(value: string): CreateTransactionInput['currency'] {
  if ((AVAILABLE_CURRENCIES as readonly string[]).includes(value)) {
    return value as CreateTransactionInput['currency'];
  }
  throw new Error(
    `Invalid currency: ${value}. Allowed values: ${(AVAILABLE_CURRENCIES as readonly string[]).join(', ')}`
  );
}

function mapCreatePayload(args: Record<string, unknown>): CreateTransactionInput {
  const payload: CreateTransactionInput = {
    workspace_id: requiredString(args, 'workspace-id'),
    created_by_user_id: requiredString(args, 'user-id'),
    type: validatedType(requiredString(args, 'type')),
    amount: requiredString(args, 'amount'),
    currency: validatedCurrency(requiredString(args, 'currency')),
    account_id: requiredString(args, 'account-id'),
    transaction_date: dateFromArg(args['transaction-date'], 'transaction-date') ?? new Date(),
  };
  const categoryId = optionalString(args, 'category-id');
  if (categoryId !== undefined) payload.category_id = categoryId;
  const toAccountId = optionalString(args, 'to-account-id');
  if (toAccountId !== undefined) payload.to_account_id = toAccountId;
  const description = optionalString(args, 'description');
  if (description !== undefined) payload.description = description;
  return payload;
}

function mapUpdatePayload(args: Record<string, unknown>): UpdateTransactionInput {
  const payload: UpdateTransactionInput = {};
  const type = args.type as UpdateTransactionInput['type'] | undefined;
  if (type !== undefined) payload.type = validatedType(type);
  const amount = args.amount as string | undefined;
  if (amount !== undefined) payload.amount = amount;
  const currency = args.currency as UpdateTransactionInput['currency'] | undefined;
  if (currency !== undefined) payload.currency = validatedCurrency(currency);
  const categoryId = args['category-id'] as string | undefined;
  if (categoryId !== undefined) payload.category_id = categoryId;
  const accountId = args['account-id'] as string | undefined;
  if (accountId !== undefined) payload.account_id = accountId;
  const toAccountId = args['to-account-id'] as string | undefined;
  if (toAccountId !== undefined) payload.to_account_id = toAccountId;
  const transactionDate = dateFromArg(args['transaction-date'], 'transaction-date');
  if (transactionDate !== undefined) payload.transaction_date = transactionDate;
  const description = args.description as string | undefined;
  if (description !== undefined) payload.description = description;
  return payload;
}

export async function runCreate(
  args: Record<string, unknown>,
  deps: TransactionsDeps = defaultDeps
) {
  await deps.resolveTarget(args);
  const output = deps.createOutput(args);
  const service = await deps.createService();

  const payload = mapCreatePayload(args);

  const result = await service.create(payload);
  output.write(result, (value) => `Created transaction ${(value as { id?: string }).id ?? ''}`);
}

export async function runGet(args: Record<string, unknown>, deps: TransactionsDeps = defaultDeps) {
  await deps.resolveTarget(args);
  const output = deps.createOutput(args);
  const service = await deps.createService();

  const result = await service.findById(
    requiredString(args, 'id'),
    requiredString(args, 'workspace-id')
  );
  output.write(
    result,
    (value) => `Transaction ${(value as { id?: string } | null | undefined)?.id ?? 'not found'}`
  );
}

export async function runList(args: Record<string, unknown>, deps: TransactionsDeps = defaultDeps) {
  await deps.resolveTarget(args);
  const output = deps.createOutput(args);
  const service = await deps.createService();

  const type = args.type as string | undefined;
  const currency = args.currency as string | undefined;
  const filters = withDefined<TransactionFilters>({
    workspace_id: requiredString(args, 'workspace-id'),
    type: type !== undefined ? validatedType(type) : undefined,
    category_id: optionalString(args, 'category-id'),
    account_id: optionalString(args, 'account-id'),
    created_by_user_id: optionalString(args, 'user-id'),
    currency: currency !== undefined ? validatedCurrency(currency) : undefined,
    start_date: dateFromArg(args['start-date'], 'start-date'),
    end_date: dateFromArg(args['end-date'], 'end-date', { endOfDay: true }),
    search: args.search as string | undefined,
    include_deleted: args['include-deleted'] as boolean | undefined,
    limit: optionalIntegerArg(args, 'limit', { min: 1 }),
    offset: optionalIntegerArg(args, 'offset', { min: 0 }),
  });

  const result = await service.findAll(filters);
  output.write(result, (value) => {
    const rows = Array.isArray(value) ? value : [];
    return `Found ${rows.length} transaction(s)\n${JSON.stringify(rows, null, 2)}`;
  });
}

export async function runUpdate(
  args: Record<string, unknown>,
  deps: TransactionsDeps = defaultDeps
) {
  await deps.resolveTarget(args);
  const output = deps.createOutput(args);
  const service = await deps.createService();

  const updateData = mapUpdatePayload(args);
  if (Object.keys(updateData).length === 0) {
    throw new Error('No update fields provided. Provide at least one mutable field.');
  }

  const result = await service.update(
    requiredString(args, 'id'),
    requiredString(args, 'workspace-id'),
    updateData,
    requiredString(args, 'user-id')
  );

  output.write(result, (value) => `Updated transaction ${(value as { id?: string }).id ?? ''}`);
}

export async function runDelete(
  args: Record<string, unknown>,
  deps: TransactionsDeps = defaultDeps
) {
  await deps.resolveTarget(args);
  const output = deps.createOutput(args);
  const service = await deps.createService();

  await deps.requireDestructiveConfirmation({
    yes: args.yes,
    prompt: `Type "DELETE" to confirm deleting transaction ${requiredString(args, 'id')}: `,
    expected: 'DELETE',
  });

  const result = await service.delete(
    requiredString(args, 'id'),
    requiredString(args, 'workspace-id'),
    requiredString(args, 'user-id')
  );

  output.write(result, 'Transaction deleted');
}

export const transactionIdArg = { type: 'string' as const, alias: 'i' as const, required: true };
export const transactionUserIdArg = {
  type: 'string' as const,
  alias: 'u' as const,
  required: true,
};
export const transactionsCreateArgs = {
  ...commonArgs,
  'user-id': transactionUserIdArg,
  type: { type: 'string', required: true },
  amount: { type: 'string', required: true },
  currency: { type: 'string', required: true },
  'category-id': { type: 'string' },
  'account-id': { type: 'string', required: true },
  'to-account-id': { type: 'string' },
  'transaction-date': { type: 'string' },
  description: { type: 'string' },
} as const;
export const transactionsGetArgs = {
  ...commonArgs,
  id: transactionIdArg,
} as const;
export const transactionsListArgs = {
  ...commonArgs,
  'user-id': { type: 'string', alias: 'u' },
  type: { type: 'string' },
  'category-id': { type: 'string' },
  'account-id': { type: 'string' },
  currency: { type: 'string' },
  'start-date': { type: 'string' },
  'end-date': { type: 'string' },
  search: { type: 'string' },
  'include-deleted': { type: 'boolean' },
  limit: { type: 'string' },
  offset: { type: 'string' },
} as const;
export const transactionsUpdateArgs = {
  ...commonArgs,
  id: transactionIdArg,
  'user-id': transactionUserIdArg,
  type: { type: 'string' },
  amount: { type: 'string' },
  currency: { type: 'string' },
  'category-id': { type: 'string' },
  'account-id': { type: 'string' },
  'to-account-id': { type: 'string' },
  'transaction-date': { type: 'string' },
  description: { type: 'string' },
} as const;
export const transactionsDeleteArgs = {
  ...commonArgs,
  id: transactionIdArg,
  'user-id': transactionUserIdArg,
} as const;

export default defineCommand({
  meta: {
    name: 'transactions',
    description: 'Manage transactions',
  },
  subCommands: {
    create: defineCommand({
      meta: { name: 'create', description: 'Create transaction' },
      args: transactionsCreateArgs,
      run: ({ args }) => runCreate(args as Record<string, unknown>),
    }),
    delete: defineCommand({
      meta: { name: 'delete', description: 'Delete transaction' },
      args: transactionsDeleteArgs,
      run: ({ args }) => runDelete(args as Record<string, unknown>),
    }),
    get: defineCommand({
      meta: { name: 'get', description: 'Get transaction by ID' },
      args: transactionsGetArgs,
      run: ({ args }) => runGet(args as Record<string, unknown>),
    }),
    list: defineCommand({
      meta: { name: 'list', description: 'List transactions' },
      args: transactionsListArgs,
      run: ({ args }) => runList(args as Record<string, unknown>),
    }),
    update: defineCommand({
      meta: { name: 'update', description: 'Update transaction' },
      args: transactionsUpdateArgs,
      run: ({ args }) => runUpdate(args as Record<string, unknown>),
    }),
  },
});
