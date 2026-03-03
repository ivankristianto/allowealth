import { defineCommand } from 'citty';
import {
  currencyEnum,
  type CreateBudgetInput,
  type UpdateBudgetInput,
} from '@/lib/validation/budgets';
import { commonArgs } from '../lib/common-args';
import { requireDestructiveConfirmation } from '../lib/confirm';
import { createOutput, type OutputWriter } from '../lib/output';

export type BudgetsDeps = {
  resolveTarget: (args: Record<string, unknown>) => Promise<unknown>;
  createService: () => Promise<{
    createBudget: (input: CreateBudgetInput) => Promise<unknown>;
    getBudgetById: (id: string, workspaceId: string) => Promise<unknown>;
    findAllBudgets: (
      workspaceId: string,
      month: number,
      year: number,
      currency?: CreateBudgetInput['currency']
    ) => Promise<unknown>;
    updateBudget: (
      id: string,
      workspaceId: string,
      updateInput: UpdateBudgetInput
    ) => Promise<unknown>;
    deleteBudget: (id: string, workspaceId: string) => Promise<{ success: boolean }>;
  }>;
  createOutput: (args: { json?: unknown }) => OutputWriter;
  requireDestructiveConfirmation: typeof requireDestructiveConfirmation;
};

const defaultDeps: BudgetsDeps = {
  async resolveTarget(args) {
    const { resolveTarget } = await import('../lib/target');
    return resolveTarget(args);
  },
  async createService() {
    const [{ db }, { BudgetService }] = await Promise.all([
      import('@/db'),
      import('@/services/budget.service'),
    ]);
    return new BudgetService(db);
  },
  createOutput,
  requireDestructiveConfirmation,
};

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

function optionalBoolean(args: Record<string, unknown>, key: string): boolean | undefined {
  const value = args[key];
  return typeof value === 'boolean' ? value : undefined;
}

function parseIntegerArg(args: Record<string, unknown>, key: string): number {
  const value = args[key];
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && /^-?\d+$/.test(value.trim())) {
    return Number.parseInt(value, 10);
  }
  throw new Error(`Invalid ${key}: expected an integer`);
}

function requiredMonth(args: Record<string, unknown>): number {
  const month = parseIntegerArg(args, 'month');
  if (month < 1 || month > 12) {
    throw new Error('Invalid month: expected an integer between 1 and 12');
  }
  return month;
}

function requiredYear(args: Record<string, unknown>): number {
  const year = parseIntegerArg(args, 'year');
  if (year < 2000 || year > 2100) {
    throw new Error('Invalid year: expected an integer between 2000 and 2100');
  }
  return year;
}

function optionalCurrency(
  args: Record<string, unknown>,
  key: string
): CreateBudgetInput['currency'] | undefined {
  const value = optionalString(args, key);
  if (value === undefined) return undefined;
  const parsed = currencyEnum.safeParse(value);
  if (parsed.success) return parsed.data;
  throw new Error(`Invalid currency: expected one of ${currencyEnum.options.join(', ')}`);
}

function requiredCurrency(
  args: Record<string, unknown>,
  key: string
): CreateBudgetInput['currency'] {
  const value = requiredString(args, key);
  const parsed = currencyEnum.safeParse(value);
  if (parsed.success) return parsed.data;
  throw new Error(`Invalid currency: expected one of ${currencyEnum.options.join(', ')}`);
}

function mapCreatePayload(args: Record<string, unknown>): CreateBudgetInput {
  const payload: CreateBudgetInput = {
    workspace_id: requiredString(args, 'workspace-id'),
    created_by_user_id: requiredString(args, 'user-id'),
    category_id: requiredString(args, 'category-id'),
    month: requiredMonth(args),
    year: requiredYear(args),
    budget_amount: requiredString(args, 'budget-amount'),
    currency: requiredCurrency(args, 'currency'),
  };

  const notes = optionalString(args, 'notes');
  if (notes !== undefined) payload.notes = notes;

  return payload;
}

function mapUpdatePayload(args: Record<string, unknown>): UpdateBudgetInput {
  const payload: UpdateBudgetInput = {};

  const budgetAmount = optionalString(args, 'budget-amount');
  if (budgetAmount !== undefined) payload.budget_amount = budgetAmount;

  const notes = optionalString(args, 'notes');
  if (notes !== undefined) payload.notes = notes;

  const isClosed = optionalBoolean(args, 'is-closed');
  if (isClosed !== undefined) payload.is_closed = isClosed;

  return payload;
}

export async function runCreate(args: Record<string, unknown>, deps: BudgetsDeps = defaultDeps) {
  await deps.resolveTarget(args);
  const output = deps.createOutput(args);
  const service = await deps.createService();

  const result = await service.createBudget(mapCreatePayload(args));
  output.write(result, (value) => `Created budget ${(value as { id?: string }).id ?? ''}`);
}

export async function runGet(args: Record<string, unknown>, deps: BudgetsDeps = defaultDeps) {
  await deps.resolveTarget(args);
  const output = deps.createOutput(args);
  const service = await deps.createService();

  const result = await service.getBudgetById(
    requiredString(args, 'id'),
    requiredString(args, 'workspace-id')
  );
  output.write(result, (value) => `Budget ${(value as { id?: string }).id ?? 'not found'}`);
}

export async function runList(args: Record<string, unknown>, deps: BudgetsDeps = defaultDeps) {
  await deps.resolveTarget(args);
  const output = deps.createOutput(args);
  const service = await deps.createService();

  const result = await service.findAllBudgets(
    requiredString(args, 'workspace-id'),
    requiredMonth(args),
    requiredYear(args),
    optionalCurrency(args, 'currency')
  );
  output.write(result, (value) => {
    const count = Array.isArray(value) ? value.length : 0;
    return `Found ${count} budget(s)`;
  });
}

export async function runUpdate(args: Record<string, unknown>, deps: BudgetsDeps = defaultDeps) {
  await deps.resolveTarget(args);
  const output = deps.createOutput(args);
  const service = await deps.createService();
  const updatePayload = mapUpdatePayload(args);
  if (Object.keys(updatePayload).length === 0) {
    throw new Error('No update fields provided. Provide at least one mutable field.');
  }

  const result = await service.updateBudget(
    requiredString(args, 'id'),
    requiredString(args, 'workspace-id'),
    updatePayload
  );
  output.write(result, (value) => `Updated budget ${(value as { id?: string }).id ?? ''}`);
}

export async function runDelete(args: Record<string, unknown>, deps: BudgetsDeps = defaultDeps) {
  await deps.resolveTarget(args);
  const output = deps.createOutput(args);
  const service = await deps.createService();

  const budgetId = requiredString(args, 'id');
  const workspaceId = requiredString(args, 'workspace-id');

  await deps.requireDestructiveConfirmation({
    yes: args.yes,
    prompt: `Type "DELETE" to confirm deleting budget ${budgetId}: `,
    expected: 'DELETE',
  });

  const result = await service.deleteBudget(budgetId, workspaceId);
  output.write(result, 'Budget deleted');
}

export const budgetIdArg = { type: 'string' as const, alias: 'i' as const, required: true };
export const budgetUserIdArg = { type: 'string' as const, alias: 'u' as const, required: true };
export const budgetsCreateArgs = {
  ...commonArgs,
  'user-id': budgetUserIdArg,
  'category-id': { type: 'string', required: true },
  month: { type: 'string', required: true },
  year: { type: 'string', required: true },
  'budget-amount': { type: 'string', required: true },
  currency: { type: 'string', required: true },
  notes: { type: 'string' },
} as const;
export const budgetsGetArgs = {
  ...commonArgs,
  id: budgetIdArg,
} as const;
export const budgetsListArgs = {
  ...commonArgs,
  month: { type: 'string', required: true },
  year: { type: 'string', required: true },
  currency: { type: 'string' },
} as const;
export const budgetsUpdateArgs = {
  ...commonArgs,
  id: budgetIdArg,
  'budget-amount': { type: 'string' },
  notes: { type: 'string' },
  'is-closed': { type: 'boolean' },
} as const;
export const budgetsDeleteArgs = {
  ...commonArgs,
  id: budgetIdArg,
} as const;

export default defineCommand({
  meta: {
    name: 'budgets',
    description: 'Manage budgets',
  },
  subCommands: {
    create: defineCommand({
      meta: { name: 'create', description: 'Create budget' },
      args: budgetsCreateArgs,
      run: ({ args }) => runCreate(args as Record<string, unknown>),
    }),
    get: defineCommand({
      meta: { name: 'get', description: 'Get budget by ID' },
      args: budgetsGetArgs,
      run: ({ args }) => runGet(args as Record<string, unknown>),
    }),
    list: defineCommand({
      meta: { name: 'list', description: 'List budgets' },
      args: budgetsListArgs,
      run: ({ args }) => runList(args as Record<string, unknown>),
    }),
    update: defineCommand({
      meta: { name: 'update', description: 'Update budget' },
      args: budgetsUpdateArgs,
      run: ({ args }) => runUpdate(args as Record<string, unknown>),
    }),
    delete: defineCommand({
      meta: { name: 'delete', description: 'Delete budget' },
      args: budgetsDeleteArgs,
      run: ({ args }) => runDelete(args as Record<string, unknown>),
    }),
  },
});
