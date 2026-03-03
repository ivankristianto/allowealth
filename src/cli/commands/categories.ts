import { defineCommand } from 'citty';
import type { CreateCategoryInput, UpdateCategoryInput } from '@/services/category.service';
import { commonArgs } from '../lib/common-args';
import { requireDestructiveConfirmation } from '../lib/confirm';
import { createOutput, type OutputWriter } from '../lib/output';

export type CategoryListFilters = {
  type?: CreateCategoryInput['type'];
  is_active?: boolean;
};

export type CategoriesDeps = {
  resolveTarget: (args: Record<string, unknown>) => Promise<unknown>;
  createService: () => Promise<{
    create: (input: CreateCategoryInput) => Promise<unknown>;
    findById: (id: string, workspaceId: string) => Promise<unknown>;
    findAll: (workspaceId: string, filters?: CategoryListFilters) => Promise<unknown>;
    update: (id: string, workspaceId: string, updateInput: UpdateCategoryInput) => Promise<unknown>;
    delete: (id: string, workspaceId: string) => Promise<{ success: boolean }>;
  }>;
  createOutput: (args: { json?: unknown }) => OutputWriter;
  requireDestructiveConfirmation: typeof requireDestructiveConfirmation;
};

const defaultDeps: CategoriesDeps = {
  async resolveTarget(args) {
    const { resolveTarget } = await import('../lib/target');
    return resolveTarget(args);
  },
  async createService() {
    const [{ db }, { CategoryService }] = await Promise.all([
      import('@/db'),
      import('@/services/category.service'),
    ]);
    return new CategoryService(db);
  },
  createOutput,
  requireDestructiveConfirmation,
};

const CATEGORY_TYPES = ['expense', 'income'] as const;

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

function validatedType(value: string): CreateCategoryInput['type'] {
  if ((CATEGORY_TYPES as readonly string[]).includes(value)) {
    return value as CreateCategoryInput['type'];
  }

  throw new Error(`Invalid type: ${value}. Allowed values: ${CATEGORY_TYPES.join(', ')}`);
}

function mapCreatePayload(args: Record<string, unknown>): CreateCategoryInput {
  const payload: CreateCategoryInput = {
    workspace_id: requiredString(args, 'workspace-id'),
    created_by_user_id: requiredString(args, 'user-id'),
    name: requiredString(args, 'name'),
    type: validatedType(requiredString(args, 'type')),
  };

  const description = optionalString(args, 'description');
  if (description !== undefined) payload.description = description;

  const icon = optionalString(args, 'icon');
  if (icon !== undefined) payload.icon = icon;

  const color = optionalString(args, 'color');
  if (color !== undefined) payload.color = color;

  return payload;
}

function mapUpdatePayload(args: Record<string, unknown>): UpdateCategoryInput {
  const payload: UpdateCategoryInput = {};

  const name = optionalString(args, 'name');
  if (name !== undefined) payload.name = name;

  const type = optionalString(args, 'type');
  if (type !== undefined) payload.type = validatedType(type);

  const description = optionalString(args, 'description');
  if (description !== undefined) payload.description = description;

  const icon = optionalString(args, 'icon');
  if (icon !== undefined) payload.icon = icon;

  const color = optionalString(args, 'color');
  if (color !== undefined) payload.color = color;

  const isActive = optionalBoolean(args, 'is-active');
  if (isActive !== undefined) payload.is_active = isActive;

  return payload;
}

export async function runCreate(args: Record<string, unknown>, deps: CategoriesDeps = defaultDeps) {
  await deps.resolveTarget(args);
  const output = deps.createOutput(args);
  const service = await deps.createService();

  const result = await service.create(mapCreatePayload(args));
  output.write(result, (value) => `Created category ${(value as { id?: string }).id ?? ''}`);
}

export async function runGet(args: Record<string, unknown>, deps: CategoriesDeps = defaultDeps) {
  await deps.resolveTarget(args);
  const output = deps.createOutput(args);
  const service = await deps.createService();

  const result = await service.findById(
    requiredString(args, 'id'),
    requiredString(args, 'workspace-id')
  );
  output.write(
    result,
    (value) => `Category ${(value as { id?: string } | null | undefined)?.id ?? 'not found'}`
  );
}

export async function runList(args: Record<string, unknown>, deps: CategoriesDeps = defaultDeps) {
  await deps.resolveTarget(args);
  const output = deps.createOutput(args);
  const service = await deps.createService();

  const workspaceId = requiredString(args, 'workspace-id');
  const type = optionalString(args, 'type');
  const filters = withDefined<CategoryListFilters>({
    type: type !== undefined ? validatedType(type) : undefined,
    is_active: optionalBoolean(args, 'is-active'),
  });

  const result = await service.findAll(workspaceId, filters);
  output.write(result, (value) => {
    const rows = Array.isArray(value) ? value : [];
    return `Found ${rows.length} category(s)\n${JSON.stringify(rows, null, 2)}`;
  });
}

export async function runUpdate(args: Record<string, unknown>, deps: CategoriesDeps = defaultDeps) {
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
    (value) => `Updated category ${(value as { id?: string } | null | undefined)?.id ?? ''}`
  );
}

export async function runDelete(args: Record<string, unknown>, deps: CategoriesDeps = defaultDeps) {
  await deps.resolveTarget(args);
  const output = deps.createOutput(args);
  const service = await deps.createService();

  const categoryId = requiredString(args, 'id');
  const workspaceId = requiredString(args, 'workspace-id');

  await deps.requireDestructiveConfirmation({
    yes: args.yes,
    prompt: `Type "DELETE" to confirm deleting category ${categoryId}: `,
    expected: 'DELETE',
  });

  const result = await service.delete(categoryId, workspaceId);
  output.write(result, 'Category deleted');
}

export const categoryIdArg = { type: 'string' as const, alias: 'i' as const, required: true };
export const categoryUserIdArg = { type: 'string' as const, alias: 'u' as const, required: true };

export const categoriesCreateArgs = {
  ...commonArgs,
  'user-id': categoryUserIdArg,
  name: { type: 'string', required: true },
  type: { type: 'string', required: true },
  description: { type: 'string' },
  icon: { type: 'string' },
  color: { type: 'string' },
} as const;

export const categoriesGetArgs = {
  ...commonArgs,
  id: categoryIdArg,
} as const;

export const categoriesListArgs = {
  ...commonArgs,
  type: { type: 'string' },
  'is-active': { type: 'boolean' },
} as const;

export const categoriesUpdateArgs = {
  ...commonArgs,
  id: categoryIdArg,
  name: { type: 'string' },
  type: { type: 'string' },
  description: { type: 'string' },
  icon: { type: 'string' },
  color: { type: 'string' },
  'is-active': { type: 'boolean' },
} as const;

export const categoriesDeleteArgs = {
  ...commonArgs,
  id: categoryIdArg,
} as const;

export default defineCommand({
  meta: {
    name: 'categories',
    description: 'Manage budget categories',
  },
  subCommands: {
    create: defineCommand({
      meta: { name: 'create', description: 'Create category' },
      args: categoriesCreateArgs,
      run: ({ args }) => runCreate(args as Record<string, unknown>),
    }),
    delete: defineCommand({
      meta: { name: 'delete', description: 'Delete category' },
      args: categoriesDeleteArgs,
      run: ({ args }) => runDelete(args as Record<string, unknown>),
    }),
    get: defineCommand({
      meta: { name: 'get', description: 'Get category by ID' },
      args: categoriesGetArgs,
      run: ({ args }) => runGet(args as Record<string, unknown>),
    }),
    list: defineCommand({
      meta: { name: 'list', description: 'List categories' },
      args: categoriesListArgs,
      run: ({ args }) => runList(args as Record<string, unknown>),
    }),
    update: defineCommand({
      meta: { name: 'update', description: 'Update category' },
      args: categoriesUpdateArgs,
      run: ({ args }) => runUpdate(args as Record<string, unknown>),
    }),
  },
});
