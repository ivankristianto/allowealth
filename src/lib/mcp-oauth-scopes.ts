/**
 * OAuth scopes for MCP clients: one `allowealth:<permission>` scope per registry permission, and
 * how requested and granted scopes map to permissions. No DB imports.
 */

import { PERMISSION_GROUPS } from '@/lib/app-password-access';
import { createLogger } from '@/lib/logger';
import { PERMISSIONS, PERMISSION_IDS, type Permission } from '@/lib/permissions/registry';

const log = createLogger('mcp-oauth-scopes');

const PERMISSION_SCOPE_PREFIX = 'allowealth:';

export type PermissionScope = `${typeof PERMISSION_SCOPE_PREFIX}${Permission}`;

export function toPermissionScope(permission: Permission): PermissionScope {
  return `${PERMISSION_SCOPE_PREFIX}${permission}`;
}

export const PERMISSION_OAUTH_SCOPES: readonly PermissionScope[] =
  PERMISSION_IDS.map(toPermissionScope);

/** Always granted when requested; the consent page cannot untick them. */
export const REQUIRED_OAUTH_SCOPES = ['openid', 'mcp'] as const;

const REQUIRED_SCOPE_SET: ReadonlySet<string> = new Set(REQUIRED_OAUTH_SCOPES);

function isPermissionScope(scope: string): boolean {
  return scope.startsWith(PERMISSION_SCOPE_PREFIX);
}

/** Splits a space-separated OAuth `scope` value, dropping blanks and repeats. */
export function splitScopes(value: string | null | undefined): string[] {
  return [...new Set((value ?? '').split(' ').filter(Boolean))];
}

/** Reads a token's `scopes` column, which the Better Auth adapter stores as JSON text on SQLite. */
export function parseStoredScopes(value: unknown): string[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((scope): scope is string => typeof scope === 'string');
    }
  } catch {
    // Falls through to the warning; a malformed column grants nothing.
  }
  log.warn('Ignoring OAuth token scopes that are not a JSON array');
  return [];
}

/** A token holds exactly its `allowealth:` scopes, in registry order; unknown ones grant nothing. */
export function oauthPermissionsFromScopes(scopes: readonly string[]): Permission[] {
  const granted = new Set(scopes);
  return PERMISSION_IDS.filter((permission) => granted.has(toPermissionScope(permission)));
}

/** Registry labels of the permissions a token's scopes grant, in registry order. */
export function permissionLabelsFromScopes(scopes: readonly string[]): string[] {
  const granted = new Set<string>(oauthPermissionsFromScopes(scopes));
  return PERMISSIONS.filter((permission) => granted.has(permission.id)).map(
    (permission) => permission.label
  );
}

export interface ConsentScopeChoices {
  /** Requested scopes the user cannot untick. */
  required: string[];
  /** Requested non-permission scopes the user may untick, such as `email`. */
  optional: string[];
  /** Requested permission scopes, grouped as the app password picker groups them. */
  permissionGroups: Array<{
    label: string;
    permissions: Array<{ scope: PermissionScope; label: string; description: string }>;
  }>;
}

export function getConsentScopeChoices(requested: readonly string[]): ConsentScopeChoices {
  const requestedSet = new Set(requested);
  const permissionGroups = PERMISSION_GROUPS.map((group) => ({
    label: group.label,
    permissions: group.permissions
      .filter((permission) => requestedSet.has(toPermissionScope(permission.id)))
      .map((permission) => ({
        scope: toPermissionScope(permission.id),
        label: permission.label,
        description: permission.description,
      })),
  })).filter((group) => group.permissions.length > 0);

  return {
    required: [...requestedSet].filter((scope) => REQUIRED_SCOPE_SET.has(scope)),
    optional: [...requestedSet].filter(
      (scope) => !REQUIRED_SCOPE_SET.has(scope) && !isPermissionScope(scope)
    ),
    permissionGroups,
  };
}

/** Grants the requested required scopes plus the ticked scopes that were requested. */
export function resolveConsentScopes(
  requested: readonly string[],
  ticked: readonly string[]
): string[] {
  const tickedSet = new Set(ticked);
  return [...new Set(requested)].filter(
    (scope) => REQUIRED_SCOPE_SET.has(scope) || tickedSet.has(scope)
  );
}
