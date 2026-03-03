import { defineCommand } from 'citty';
import type { CreateAccountInput, UpdateAccountInput } from '@/services/account.service';
import { ACCOUNT_TYPE_TO_CLASS, type AccountType } from '@/lib/types/account';
import { AVAILABLE_CURRENCIES, type Currency } from '@/lib/constants/currency';
import { commonArgs } from '../lib/common-args';
import { requireDestructiveConfirmation } from '../lib/confirm';
import { createOutput, type OutputWriter } from '../lib/output';

export type AccountListFilters = {
  type?: CreateAccountInput['type'];
  category_id?: string;
  currency?: CreateAccountInput['currency'];
  includeInactive?: boolean;
  owner_user_id?: string;
};

export type AccountsDeps = {
  resolveTarget: (args: Record<string, unknown>) => Promise<unknown>;
  createService: () => Promise<{
    create: (input: CreateAccountInput) => Promise<unknown>;
    findById: (id: string, workspaceId: string) => Promise<unknown>;
    findAll: (workspaceId: string, filters?: AccountListFilters) => Promise<unknown>;
    update: (id: string, workspaceId: string, updateInput: UpdateAccountInput) => Promise<unknown>;
    close: (id: string, workspaceId: string, userId: string) => Promise<unknown>;
  }>;
  createOutput: (args: { json?: unknown }) => OutputWriter;
  requireDestructiveConfirmation: typeof requireDestructiveConfirmation;
};

const defaultDeps: AccountsDeps = {
  async resolveTarget(args) {
    const { resolveTarget } = await import('../lib/target');
    return resolveTarget(args);
  },
  async createService() {
    const [{ db }, { AccountService }] = await Promise.all([
      import('@/db'),
      import('@/services/account.service'),
    ]);
    return new AccountService(db);
  },
  createOutput,
  requireDestructiveConfirmation,
};

const ACCOUNT_TYPES = Object.keys(ACCOUNT_TYPE_TO_CLASS) as AccountType[];

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

function withDefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

function validatedType(value: string): AccountType {
  if ((ACCOUNT_TYPES as string[]).includes(value)) {
    return value as AccountType;
  }
  throw new Error(`Invalid type: ${value}. Allowed values: ${ACCOUNT_TYPES.join(', ')}`);
}

function validatedCurrency(value: string): Currency {
  if ((AVAILABLE_CURRENCIES as readonly string[]).includes(value)) {
    return value as Currency;
  }
  throw new Error(
    `Invalid currency: ${value}. Allowed values: ${(AVAILABLE_CURRENCIES as readonly string[]).join(', ')}`
  );
}

function mapCreatePayload(args: Record<string, unknown>): CreateAccountInput {
  const payload: CreateAccountInput = {
    workspace_id: requiredString(args, 'workspace-id'),
    created_by_user_id: requiredString(args, 'user-id'),
    name: requiredString(args, 'name'),
    type: validatedType(requiredString(args, 'type')),
    balance: requiredString(args, 'balance'),
    currency: validatedCurrency(requiredString(args, 'currency')),
  };

  const categoryId = optionalString(args, 'category-id');
  if (categoryId !== undefined) payload.category_id = categoryId;

  return payload;
}

function mapUpdatePayload(args: Record<string, unknown>): UpdateAccountInput {
  const payload: UpdateAccountInput = {};

  const name = optionalString(args, 'name');
  if (name !== undefined) payload.name = name;

  const type = optionalString(args, 'type');
  if (type !== undefined) payload.type = validatedType(type);

  const categoryId = optionalString(args, 'category-id');
  if (categoryId !== undefined) payload.category_id = categoryId;

  const balance = optionalString(args, 'balance');
  if (balance !== undefined) payload.balance = balance;

  const currency = optionalString(args, 'currency');
  if (currency !== undefined) payload.currency = validatedCurrency(currency);

  return payload;
}

export async function runCreate(args: Record<string, unknown>, deps: AccountsDeps = defaultDeps) {
  await deps.resolveTarget(args);
  const output = deps.createOutput(args);
  const service = await deps.createService();

  const result = await service.create(mapCreatePayload(args));
  output.write(result, (value) => `Created account ${(value as { id?: string }).id ?? ''}`);
}

export async function runGet(args: Record<string, unknown>, deps: AccountsDeps = defaultDeps) {
  await deps.resolveTarget(args);
  const output = deps.createOutput(args);
  const service = await deps.createService();

  const result = await service.findById(
    requiredString(args, 'id'),
    requiredString(args, 'workspace-id')
  );
  output.write(
    result,
    (value) => `Account ${(value as { id?: string } | null | undefined)?.id ?? 'not found'}`
  );
}

export async function runList(args: Record<string, unknown>, deps: AccountsDeps = defaultDeps) {
  await deps.resolveTarget(args);
  const output = deps.createOutput(args);
  const service = await deps.createService();

  const workspaceId = requiredString(args, 'workspace-id');
  const type = optionalString(args, 'type');
  const currency = optionalString(args, 'currency');
  const filters = withDefined<AccountListFilters>({
    type: type !== undefined ? validatedType(type) : undefined,
    category_id: optionalString(args, 'category-id'),
    currency: currency !== undefined ? validatedCurrency(currency) : undefined,
    includeInactive: optionalBoolean(args, 'include-inactive'),
    owner_user_id: optionalString(args, 'owner-user-id'),
  });

  const result = await service.findAll(workspaceId, filters);
  output.write(result, (value) => {
    const rows = Array.isArray(value) ? value : [];
    return `Found ${rows.length} account(s)\n${JSON.stringify(rows, null, 2)}`;
  });
}

export async function runUpdate(args: Record<string, unknown>, deps: AccountsDeps = defaultDeps) {
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

  output.write(result, (value) => `Updated account ${(value as { id?: string }).id ?? ''}`);
}

export async function runDelete(args: Record<string, unknown>, deps: AccountsDeps = defaultDeps) {
  await deps.resolveTarget(args);
  const output = deps.createOutput(args);
  const service = await deps.createService();

  const accountId = requiredString(args, 'id');
  const workspaceId = requiredString(args, 'workspace-id');
  const userId = requiredString(args, 'user-id');

  await deps.requireDestructiveConfirmation({
    yes: args.yes,
    prompt: `Type "DELETE" to confirm deactivating account ${accountId}: `,
    expected: 'DELETE',
  });

  const result = await service.close(accountId, workspaceId, userId);
  output.write(result, 'Account deactivated');
}

export const accountIdArg = { type: 'string' as const, alias: 'i' as const, required: true };
export const accountUserIdArg = { type: 'string' as const, alias: 'u' as const, required: true };
export const accountsCreateArgs = {
  ...commonArgs,
  'user-id': accountUserIdArg,
  name: { type: 'string', required: true },
  type: { type: 'string', required: true },
  balance: { type: 'string', required: true },
  currency: { type: 'string', required: true },
  'category-id': { type: 'string' },
} as const;
export const accountsGetArgs = {
  ...commonArgs,
  id: accountIdArg,
} as const;
export const accountsListArgs = {
  ...commonArgs,
  type: { type: 'string' },
  'category-id': { type: 'string' },
  currency: { type: 'string' },
  'include-inactive': { type: 'boolean' },
  'owner-user-id': { type: 'string' },
} as const;
export const accountsUpdateArgs = {
  ...commonArgs,
  id: accountIdArg,
  name: { type: 'string' },
  type: { type: 'string' },
  balance: { type: 'string' },
  currency: { type: 'string' },
  'category-id': { type: 'string' },
} as const;
export const accountsDeleteArgs = {
  ...commonArgs,
  id: accountIdArg,
  'user-id': accountUserIdArg,
} as const;

export default defineCommand({
  meta: {
    name: 'accounts',
    description: 'Manage accounts',
  },
  subCommands: {
    create: defineCommand({
      meta: { name: 'create', description: 'Create account' },
      args: accountsCreateArgs,
      run: ({ args }) => runCreate(args as Record<string, unknown>),
    }),
    delete: defineCommand({
      meta: { name: 'delete', description: 'Deactivate account' },
      args: accountsDeleteArgs,
      run: ({ args }) => runDelete(args as Record<string, unknown>),
    }),
    get: defineCommand({
      meta: { name: 'get', description: 'Get account by ID' },
      args: accountsGetArgs,
      run: ({ args }) => runGet(args as Record<string, unknown>),
    }),
    list: defineCommand({
      meta: { name: 'list', description: 'List accounts' },
      args: accountsListArgs,
      run: ({ args }) => runList(args as Record<string, unknown>),
    }),
    update: defineCommand({
      meta: { name: 'update', description: 'Update account' },
      args: accountsUpdateArgs,
      run: ({ args }) => runUpdate(args as Record<string, unknown>),
    }),
  },
});
