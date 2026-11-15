/**
 * How app password access is offered and shown: the presets, the custom picker's groups and
 * the labels the token list uses. No DB imports, so components and client scripts can share it.
 */

import { APP_PASSWORD_SCOPES, type AppPasswordScope } from '@/lib/mcp-app-password';
import {
  PERMISSIONS,
  expandPermissionGrants,
  type PermissionGrant,
  type PermissionResource,
} from '@/lib/permissions/registry';

interface AppPasswordPresetDefinition {
  label: string;
  description: string;
  /** Wildcards, so a preset keeps covering permissions added later. */
  grants: readonly PermissionGrant[];
}

export const APP_PASSWORD_PRESETS: Readonly<Record<AppPasswordScope, AppPasswordPresetDefinition>> =
  {
    read: {
      label: 'Read only',
      description:
        'Reads accounts, categories, transactions, budgets and the dashboard. Over REST also scheduled items and reports.',
      grants: ['*:read'],
    },
    'read-write': {
      label: 'Read and write',
      description:
        'Also adds expenses and income. Over REST also edits transactions, adds scheduled items and marks bills paid.',
      grants: ['*'],
    },
  };

export type AppPasswordPreset = AppPasswordScope | 'custom';

/** Only the exact stored wildcard is a preset; an explicit list, even of everything, is custom. */
export function deriveAppPasswordPreset(grants: readonly PermissionGrant[]): AppPasswordPreset {
  const preset = APP_PASSWORD_SCOPES.find((scope) => {
    const presetGrants = APP_PASSWORD_PRESETS[scope].grants;
    return (
      grants.length === presetGrants.length &&
      presetGrants.every((grant, index) => grants[index] === grant)
    );
  });
  return preset ?? 'custom';
}

export type AppPasswordAccessDescription =
  | { kind: 'preset'; preset: AppPasswordScope; label: string }
  | { kind: 'custom'; permissionLabels: string[] };

/** What the token list shows: the preset's name, or one label per custom permission. */
export function describeAppPasswordAccess(
  grants: readonly PermissionGrant[]
): AppPasswordAccessDescription {
  const preset = deriveAppPasswordPreset(grants);
  if (preset !== 'custom') {
    return { kind: 'preset', preset, label: APP_PASSWORD_PRESETS[preset].label };
  }
  const granted = new Set<string>(expandPermissionGrants(grants));
  const permissionLabels = PERMISSIONS.filter((permission) => granted.has(permission.id)).map(
    (permission) => permission.label
  );
  return {
    kind: 'custom',
    permissionLabels: permissionLabels.length > 0 ? permissionLabels : ['No permissions'],
  };
}

const RESOURCE_GROUPS = [
  { resource: 'transactions', label: 'Transactions' },
  { resource: 'budgets', label: 'Budgets' },
  { resource: 'recurring', label: 'Recurring bills' },
  { resource: 'accounts', label: 'Accounts' },
  { resource: 'categories', label: 'Categories' },
  { resource: 'settings', label: 'Workspace settings' },
  { resource: 'forecast', label: 'Forecast' },
  { resource: 'reports', label: 'Reports' },
] as const satisfies readonly { resource: PermissionResource; label: string }[];

/** The registry grouped by resource, in registry order, for the custom permission picker. */
export const PERMISSION_GROUPS = RESOURCE_GROUPS.map(({ resource, label }) => ({
  resource,
  label,
  permissions: PERMISSIONS.filter((permission) => permission.id.startsWith(`${resource}:`)),
}));
