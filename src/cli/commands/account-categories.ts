import { defineCommand } from 'citty';
import type {
  CreateAccountCategoryInput,
  UpdateAccountCategoryInput,
} from '@/services/account-category.service';
import { commonArgs } from '../lib/common-args';
import { requireDestructiveConfirmation } from '../lib/confirm';
import { createOutput, type OutputWriter } from '../lib/output';

export type AccountCategoryListFilters = {
  is_liability?: boolean;
  is_system?: boolean;
};

export type AccountCategoriesDeps = {
  resolveTarget: (args: Record<string, unknown>) => Promise<unknown>;
  createService: () => Promise<{
    create: (input: CreateAccountCategoryInput) => Promise<unknown>;
    findById: (id: string, workspaceId: string) => Promise<unknown>;
    findAll: (workspaceId: string, filters?: AccountCategoryListFilters) => Promise<unknown>;
    update: (
      id: string,
      workspaceId: string,
      updateInput: UpdateAccountCategoryInput
    ) => Promise<unknown>;
    delete: (id: string, workspaceId: string) => Promise<{ success: boolean }>;
  }>;
  createOutput: (args: { json?: unknown }) => OutputWriter;
  requireDestructiveConfirmation: typeof requireDestructiveConfirmation;
};

const defaultDeps: AccountCategoriesDeps = {
  async resolveTarget(args) {
    const { resolveTarget } = await import('../lib/target');
    return resolveTarget(args);
  },
  async createService() {
    const [{ db }, { AccountCategoryService }] = await Promise.all([
      import('@/db'),
      import('@/services/account-category.service'),
    ]);
    return new AccountCategoryService(db);
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

function requiredBoolean(args: Record<string, unknown>, key: string): boolean {
  const value = args[key];
  if (typeof value !== 'boolean') {
    throw new Error(`Missing required argument: ${key}`);
  }
  return value;
}

function optionalBoolean(args: Record<string, unknown>, key: string): boolean | undefined {
  const value = args[key];
  return typeof value === 'boolean' ? value : undefined;
}

function parseNonNegativeIntegerArg(args: Record<string, unknown>, key: string): number {
  const value = args[key];
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) return value;

  if (typeof value === 'string' && value.trim() !== '' && /^\d+$/.test(value.trim())) {
    return Number.parseInt(value, 10);
  }

  throw new Error(`Invalid ${key}: expected a non-negative integer`);
}

function optionalSortOrder(args: Record<string, unknown>, key: string): number | undefined {
  if (!(key in args)) {
    return undefined;
  }

  return parseNonNegativeIntegerArg(args, key);
}

function withDefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

function mapCreatePayload(args: Record<string, unknown>): CreateAccountCategoryInput {
  const payload: CreateAccountCategoryInput = {
    workspace_id: requiredString(args, 'workspace-id'),
    created_by_user_id: requiredString(args, 'user-id'),
    name: requiredString(args, 'name'),
    is_liability: requiredBoolean(args, 'is-liability'),
    is_system: false,
    sort_order: 0,
  };

  const description = optionalString(args, 'description');
  if (description !== undefined) payload.description = description;

  const sortOrder = optionalSortOrder(args, 'sort-order');
  if (sortOrder !== undefined) payload.sort_order = sortOrder;

  return payload;
}

function mapUpdatePayload(args: Record<string, unknown>): UpdateAccountCategoryInput {
  const payload: UpdateAccountCategoryInput = {};

  const name = optionalString(args, 'name');
  if (name !== undefined) payload.name = name;

  const description = optionalString(args, 'description');
  if (description !== undefined) payload.description = description;

  const isLiability = optionalBoolean(args, 'is-liability');
  if (isLiability !== undefined) payload.is_liability = isLiability;

  const sortOrder = optionalSortOrder(args, 'sort-order');
  if (sortOrder !== undefined) payload.sort_order = sortOrder;

  return payload;
}

export async function runCreate(
  args: Record<string, unknown>,
  deps: AccountCategoriesDeps = defaultDeps
) {
  await deps.resolveTarget(args);
  const output = deps.createOutput(args);
  const service = await deps.createService();

  const result = await service.create(mapCreatePayload(args));
  output.write(
    result,
    (value) => `Created account category ${(value as { id?: string }).id ?? ''}`
  );
}

export async function runGet(
  args: Record<string, unknown>,
  deps: AccountCategoriesDeps = defaultDeps
) {
  await deps.resolveTarget(args);
  const output = deps.createOutput(args);
  const service = await deps.createService();

  const result = await service.findById(
    requiredString(args, 'id'),
    requiredString(args, 'workspace-id')
  );
  output.write(
    result,
    (value) =>
      `Account category ${(value as { id?: string } | null | undefined)?.id ?? 'not found'}`
  );
}

export async function runList(
  args: Record<string, unknown>,
  deps: AccountCategoriesDeps = defaultDeps
) {
  await deps.resolveTarget(args);
  const output = deps.createOutput(args);
  const service = await deps.createService();

  const filters = withDefined<AccountCategoryListFilters>({
    is_liability: optionalBoolean(args, 'is-liability'),
    is_system: optionalBoolean(args, 'is-system'),
  });

  const result = await service.findAll(requiredString(args, 'workspace-id'), filters);
  output.write(result, (value) => {
    const rows = Array.isArray(value) ? value : [];
    return `Found ${rows.length} account category(s)\n${JSON.stringify(rows, null, 2)}`;
  });
}

export async function runUpdate(
  args: Record<string, unknown>,
  deps: AccountCategoriesDeps = defaultDeps
) {
  await deps.resolveTarget(args);
  const output = deps.createOutput(args);
  const service = await deps.createService();

  const updatePayload = mapUpdatePayload(args);
  if (Object.keys(updatePayload).length === 0) {
    throw new Error('No update fields provided. Provide at least one mutable field.');
  }

  const result = await service.update(
    requiredString(args, 'id'),
    requiredString(args, 'workspace-id'),
    updatePayload
  );

  output.write(
    result,
    (value) => `Updated account category ${(value as { id?: string }).id ?? ''}`
  );
}

export async function runDelete(
  args: Record<string, unknown>,
  deps: AccountCategoriesDeps = defaultDeps
) {
  await deps.resolveTarget(args);
  const output = deps.createOutput(args);
  const service = await deps.createService();

  const categoryId = requiredString(args, 'id');
  const workspaceId = requiredString(args, 'workspace-id');

  await deps.requireDestructiveConfirmation({
    yes: args.yes,
    prompt: `Type "DELETE" to confirm deleting account category ${categoryId}: `,
    expected: 'DELETE',
  });

  const result = await service.delete(categoryId, workspaceId);
  output.write(result, 'Account category deleted');
}

export const accountCategoryIdArg = {
  type: 'string' as const,
  alias: 'i' as const,
  required: true,
};
export const accountCategoryUserIdArg = {
  type: 'string' as const,
  alias: 'u' as const,
  required: true,
};

export const accountCategoriesCreateArgs = {
  ...commonArgs,
  'user-id': accountCategoryUserIdArg,
  name: { type: 'string', required: true },
  description: { type: 'string' },
  'is-liability': { type: 'boolean', required: true },
  'sort-order': { type: 'string' },
} as const;

export const accountCategoriesGetArgs = {
  ...commonArgs,
  id: accountCategoryIdArg,
} as const;

export const accountCategoriesListArgs = {
  ...commonArgs,
  'is-liability': { type: 'boolean' },
  'is-system': { type: 'boolean' },
} as const;

export const accountCategoriesUpdateArgs = {
  ...commonArgs,
  id: accountCategoryIdArg,
  name: { type: 'string' },
  description: { type: 'string' },
  'is-liability': { type: 'boolean' },
  'sort-order': { type: 'string' },
} as const;

export const accountCategoriesDeleteArgs = {
  ...commonArgs,
  id: accountCategoryIdArg,
} as const;

export default defineCommand({
  meta: {
    name: 'account-categories',
    description: 'Manage account categories',
  },
  subCommands: {
    create: defineCommand({
      meta: { name: 'create', description: 'Create account category' },
      args: accountCategoriesCreateArgs,
      run: ({ args }) => runCreate(args as Record<string, unknown>),
    }),
    delete: defineCommand({
      meta: { name: 'delete', description: 'Delete account category' },
      args: accountCategoriesDeleteArgs,
      run: ({ args }) => runDelete(args as Record<string, unknown>),
    }),
    get: defineCommand({
      meta: { name: 'get', description: 'Get account category by ID' },
      args: accountCategoriesGetArgs,
      run: ({ args }) => runGet(args as Record<string, unknown>),
    }),
    list: defineCommand({
      meta: { name: 'list', description: 'List account categories' },
      args: accountCategoriesListArgs,
      run: ({ args }) => runList(args as Record<string, unknown>),
    }),
    update: defineCommand({
      meta: { name: 'update', description: 'Update account category' },
      args: accountCategoriesUpdateArgs,
      run: ({ args }) => runUpdate(args as Record<string, unknown>),
    }),
  },
});
