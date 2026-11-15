/**
 * Permissions an app password can hold, as `resource:action`. REST allowlist rules and MCP tools
 * name the permission they need. No DB imports, so client scripts can share this module.
 */

import { APP_PASSWORD_SCOPES, type AppPasswordScope } from '@/lib/mcp-app-password';

export const PERMISSIONS = [
  {
    id: 'transactions:read',
    label: 'Read transactions',
    description: 'List and view transactions and their edit history.',
  },
  {
    id: 'transactions:create',
    label: 'Add transactions',
    description: 'Record new expenses and income.',
  },
  {
    id: 'transactions:update',
    label: 'Edit transactions',
    description: 'Change existing transactions.',
  },
  {
    id: 'transactions:delete',
    label: 'Delete transactions',
    description: 'Delete transactions.',
  },
  {
    id: 'budgets:read',
    label: 'Read budgets',
    description: 'View budgets, budget history and category spending trends.',
  },
  {
    id: 'recurring:read',
    label: 'Read recurring bills',
    description: 'View recurring bills, their upcoming occurrences, calendar and stats.',
  },
  {
    id: 'recurring:write',
    label: 'Manage recurring bills',
    description: 'Create and edit recurring bills.',
  },
  {
    id: 'recurring:confirm',
    label: 'Confirm recurring bills',
    description: 'Confirm a due occurrence, which records its transaction.',
  },
  {
    id: 'accounts:read',
    label: 'Read accounts',
    description: 'View accounts, balances and account totals.',
  },
  {
    id: 'categories:read',
    label: 'Read categories',
    description: 'View budget categories and account categories.',
  },
  {
    id: 'settings:read',
    label: 'Read workspace settings',
    description: 'View workspace settings such as currency and timezone.',
  },
  {
    id: 'forecast:read',
    label: 'Read forecast',
    description: 'View the cash flow forecast.',
  },
  {
    id: 'reports:read',
    label: 'Read reports',
    description: 'View expense, income, member and category reports.',
  },
] as const satisfies readonly { id: `${string}:${string}`; label: string; description: string }[];

export type Permission = (typeof PERMISSIONS)[number]['id'];

type PermissionResource = Permission extends `${infer Resource}:${string}` ? Resource : never;

const RESOURCE_LABELS: Readonly<Record<PermissionResource, string>> = {
  transactions: 'Transactions',
  budgets: 'Budgets',
  recurring: 'Recurring bills',
  accounts: 'Accounts',
  categories: 'Categories',
  settings: 'Workspace settings',
  forecast: 'Forecast',
  reports: 'Reports',
};

export interface PermissionGroup {
  resource: PermissionResource;
  label: string;
  permissions: (typeof PERMISSIONS)[number][];
}

/** The registry grouped by resource, in registry order, for the custom permission picker. */
export const PERMISSION_GROUPS: readonly PermissionGroup[] = PERMISSIONS.reduce<PermissionGroup[]>(
  (groups, permission) => {
    const resource = permission.id.split(':')[0] as PermissionResource;
    const group = groups.find((existing) => existing.resource === resource);
    if (group) group.permissions.push(permission);
    else groups.push({ resource, label: RESOURCE_LABELS[resource], permissions: [permission] });
    return groups;
  },
  []
);

/** Stored grants may also be wildcards, expanded against the registry when a token is verified. */
export type PermissionGrant = Permission | '*' | '*:read';

export const PERMISSION_IDS: readonly Permission[] = PERMISSIONS.map((permission) => permission.id);

const PERMISSION_ID_SET: ReadonlySet<string> = new Set(PERMISSION_IDS);

export function isPermission(value: unknown): value is Permission {
  return typeof value === 'string' && PERMISSION_ID_SET.has(value);
}

export function isReadPermission(permission: Permission): boolean {
  return permission.endsWith(':read');
}

/** The grants each legacy scope stands for; wildcards keep them covering permissions added later. */
export const SCOPE_PERMISSION_GRANTS: Readonly<
  Record<AppPasswordScope, readonly PermissionGrant[]>
> = {
  read: ['*:read'],
  'read-write': ['*'],
};

export type AppPasswordPreset = AppPasswordScope | 'custom';

/** Only the exact stored wildcard is a preset; an explicit list, even of everything, is custom. */
export function deriveAppPasswordPreset(grants: readonly unknown[]): AppPasswordPreset {
  const preset = APP_PASSWORD_SCOPES.find((scope) => {
    const presetGrants = SCOPE_PERMISSION_GRANTS[scope];
    return (
      grants.length === presetGrants.length &&
      presetGrants.every((grant, index) => grants[index] === grant)
    );
  });
  return preset ?? 'custom';
}

const PRESET_LABELS: Readonly<Record<AppPasswordScope, string>> = {
  read: 'Read only',
  'read-write': 'Read and write',
};

/** What the token list shows: the preset's name, or one label per custom permission. */
export function describeAppPasswordAccess(grants: readonly unknown[]): {
  preset: AppPasswordPreset;
  labels: string[];
} {
  const preset = deriveAppPasswordPreset(grants);
  if (preset !== 'custom') return { preset, labels: [PRESET_LABELS[preset]] };
  const granted = new Set<string>(expandPermissionGrants(grants));
  const labels = PERMISSIONS.filter((permission) => granted.has(permission.id)).map(
    (permission) => permission.label
  );
  return { preset, labels: labels.length > 0 ? labels : ['No permissions'] };
}

/**
 * Expands stored grants to concrete permissions in registry order. Unknown values are dropped
 * rather than thrown, so a permission removed from the registry denies instead of failing auth.
 */
export function expandPermissionGrants(grants: unknown): Permission[] {
  if (!Array.isArray(grants)) return [];
  const granted = new Set<unknown>(grants);
  return PERMISSION_IDS.filter(
    (permission) =>
      granted.has('*') ||
      granted.has(permission) ||
      (granted.has('*:read') && isReadPermission(permission))
  );
}
